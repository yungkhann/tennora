begin;
create table public.hall_commands(
 id uuid primary key,
 tour_id uuid not null references public.tours(id) on delete restrict,
 actor_id uuid not null references public.staff_accounts(id) on delete restrict,
 request jsonb not null,
 response jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
alter table public.hall_commands enable row level security;
revoke all on public.hall_commands from anon,authenticated;
grant select on public.hall_commands to authenticated;
create policy hall_manager_read on public.hall_commands for select to authenticated using(private.manages_all_teams());
-- Reservation checks apply to manual and automatic assignment alike.
create function private.validate_table_reservation() returns trigger language plpgsql security definer set search_path='' as $$
declare m public.team_matches;rest integer;
begin
 perform pg_advisory_xact_lock(170005);
 select * into m from public.team_matches where id=new.match_id;
 select cfg.rest_minutes into rest from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id join lateral(select rest_minutes from public.tournament_settings where tour_id=p.tour_id order by revision desc limit 1) cfg on true where d.id=m.draw_id;
 if exists(select 1 from public.match_table_leases l join public.team_matches other on other.id=l.match_id where other.id<>m.id and (other.subteam_a in(m.subteam_a,m.subteam_b) or other.subteam_b in(m.subteam_a,m.subteam_b))) then raise exception 'Subteam already assigned' using errcode='55000';end if;
 if exists(select 1 from public.match_table_leases l join public.singles_games other on other.match_id=l.match_id join public.singles_games selected on selected.match_id=m.id and (selected.player_a in(other.player_a,other.player_b) or selected.player_b in(other.player_a,other.player_b)) where l.match_id<>m.id and other.status in('pending','in_progress') and selected.status in('pending','in_progress')) then raise exception 'Player already assigned' using errcode='55000';end if;
 if exists(select 1 from public.player_rest_heads r join public.singles_games g on r.player_id in(g.player_a,g.player_b) where g.match_id=m.id and g.status='pending' and r.last_ended_at+make_interval(mins=>rest)>clock_timestamp()) then raise exception 'Player rest incomplete' using errcode='55000';end if;
 return new;
end;$$;
revoke all on function private.validate_table_reservation() from public,anon,authenticated;
create trigger validate_table_reservation before insert or update on public.match_table_leases for each row execute function private.validate_table_reservation();
create function public.get_hall_snapshot(tournament uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg public.tournament_settings;t public.tours;tables jsonb;matches jsonb;judges jsonb;
begin
 perform private.require_match_manager();
 select * into t from public.tours where id=tournament;
 select * into cfg from public.tournament_settings where tour_id=t.id order by revision desc limit 1;
 if cfg.id is null then raise exception 'Configured tournament required' using errcode='22023';end if;
 select coalesce(jsonb_agg(jsonb_build_object('number',n,'match_id',l.match_id,'owner',h.staff_id,'owner_name',a.display_name,'assignment_version',coalesce(h.version,0)) order by n),'[]') into tables from generate_series(1,cfg.table_count) n left join public.match_table_leases l on l.table_number=n left join public.table_day_heads h on h.table_number=n and h.venue_day=(clock_timestamp() at time zone cfg.venue_timezone)::date left join public.staff_accounts a on a.id=h.staff_id;
 select coalesce(jsonb_agg(value order by priority,round_no,match_no,id),'[]') into matches from (
 select m.id,m.round_no,m.match_no,case when cfg.finals_priority and m.placement_from=1 and m.placement_to=2 then 0 else 1 end priority,
 jsonb_build_object('id',m.id,'version',m.version,'status',m.status,'started',m.started_at is not null,'age_group',p.age_group,'round',m.round_no,'number',m.match_no,'final',m.placement_from=1 and m.placement_to=2,'team_a',a.name,'team_b',b.name,'table',l.table_number,'sources_ready',private.match_dependencies_ready(m.id),'a_submitted',exists(select 1 from public.lineups where match_id=m.id and subteam_id=m.subteam_a),'b_submitted',exists(select 1 from public.lineups where match_id=m.id and subteam_id=m.subteam_b),'revealed',m.lineups_revealed_at is not null,'rest_until',(select max(r.last_ended_at+make_interval(mins=>cfg.rest_minutes)) from public.player_rest_heads r join public.singles_games g on r.player_id in(g.player_a,g.player_b) where g.match_id=m.id and g.status='pending'),'blocked',m.start_blocked,'completed_at',m.completed_at) value
 from public.team_matches m join public.draw_revisions d on d.id=m.draw_id join public.tour_stage_plans p on p.id=d.plan_id left join public.subteams sa on sa.id=m.subteam_a left join public.teams a on a.id=sa.team_id left join public.subteams sb on sb.id=m.subteam_b left join public.teams b on b.id=sb.team_id left join public.match_table_leases l on l.match_id=m.id where p.tour_id=t.id and d.published_at is not null and m.superseded_by is null and m.status<>'cancelled'
 ) listed;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.display_name) order by a.display_name,a.id),'[]') into judges from public.staff_accounts a where a.active and exists(select 1 from public.staff_roles r where r.user_id=a.id and r.role='line_judge');
 return jsonb_build_object('tour_id',t.id,'name',t.name,'venue_day',(clock_timestamp() at time zone cfg.venue_timezone)::date,'event_day',(clock_timestamp() at time zone cfg.venue_timezone)::date between t.starts_on and t.ends_on,'timezone',cfg.venue_timezone,'rest_minutes',cfg.rest_minutes,'tables',tables,'matches',matches,'judges',judges,'server_now',clock_timestamp());
end;$$;
revoke all on function public.get_hall_snapshot(uuid) from public,anon;
grant execute on function public.get_hall_snapshot(uuid) to authenticated;
create function public.run_hall_command(command_id uuid,tournament uuid,operation text,reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.hall_commands;payload jsonb;outcomes jsonb:='[]';m public.team_matches;cfg public.tournament_settings;t public.tours;table_no integer;response jsonb;outcome jsonb;child_id uuid;blocked_code text;
begin
 perform private.require_match_manager();perform pg_advisory_xact_lock(170005);perform private.scoring_replay_barrier();
 payload:=jsonb_build_object('tour',tournament,'operation',operation,'reason',btrim(reason));
 select * into old from public.hall_commands where id=command_id;
 if found then
  if old.actor_id<>auth.uid() or old.request<>payload then raise exception 'Hall command ID conflict' using errcode='22023';end if;
  return old.response;
 end if;
 if command_id is null or coalesce(operation,'') not in('allocate','start_all') or reason is null or length(btrim(reason)) not between 1 and 500 then raise exception 'Valid hall operation and reason required' using errcode='22023';end if;
 select * into t from public.tours where id=tournament;
 select * into cfg from public.tournament_settings where tour_id=t.id order by revision desc limit 1;
 if cfg.id is null or (clock_timestamp() at time zone cfg.venue_timezone)::date not between t.starts_on and t.ends_on then raise exception 'Current event day required' using errcode='55000';end if;
 -- Consistent draw lock ordering, before any individual match/resource lock.
 for m in select distinct on(q.draw_id) q.* from public.team_matches q join public.draw_revisions d on d.id=q.draw_id join public.tour_stage_plans p on p.id=d.plan_id where p.tour_id=t.id and d.published_at is not null order by q.draw_id,q.id loop perform private.draw_command_lock(m.draw_id);end loop;
 for m in select match.* from public.team_matches match join public.draw_revisions d on d.id=match.draw_id join public.tour_stage_plans p on p.id=d.plan_id where p.tour_id=t.id and d.published_at is not null and match.superseded_by is null and match.status in('scheduled','called') order by case when cfg.finals_priority and match.placement_from=1 and match.placement_to=2 then 0 else 1 end,match.round_no,match.match_no,match.id loop
  if operation='allocate' then
   if exists(select 1 from public.match_table_leases where match_id=m.id) or m.lineups_revealed_at is null or not private.match_dependencies_ready(m.id) then continue;end if;
   select n into table_no from generate_series(1,cfg.table_count) n where not exists(select 1 from public.match_table_leases where table_number=n) order by n limit 1;
   if table_no is null then exit;end if;
  else
   if not exists(select 1 from public.match_table_leases where match_id=m.id) then continue;end if;
  end if;
  child_id:=gen_random_uuid();
  begin
   if operation='allocate' then outcome:=public.manage_match(child_id,m.id,'assign',table_no,m.version,reason);
   elsif m.started_at is not null then outcome:=public.resume_corrected_match(child_id,m.id,m.version,reason);
   else outcome:=public.manage_match(child_id,m.id,'start',null,m.version,reason);end if;
   outcomes:=outcomes||jsonb_build_array(jsonb_build_object('match_id',m.id,'status',outcome->>'status','ok',true));
  exception when sqlstate '55000' or unique_violation then
   get stacked diagnostics blocked_code=returned_sqlstate;
   outcomes:=outcomes||jsonb_build_array(jsonb_build_object('match_id',m.id,'ok',false,'code',blocked_code));
  end;
 end loop;
 response:=jsonb_build_object('operation',operation,'outcomes',outcomes);
 insert into public.hall_commands(id,tour_id,actor_id,request,response) values(command_id,t.id,auth.uid(),payload,response);
 perform private.league_audit('hall.'||operation,t.id,'tour',null,response||jsonb_build_object('reason',btrim(reason)));
 return response;
end;$$;
revoke all on function public.run_hall_command(uuid,uuid,text,text) from public,anon;
grant execute on function public.run_hall_command(uuid,uuid,text,text) to authenticated;
create function private.validate_reserved_replacement() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.match_table_leases where match_id=new.match_id) and exists(select 1 from public.match_table_leases l join public.singles_games g on g.match_id=l.match_id where l.match_id<>new.match_id and g.status in('pending','in_progress') and (new.player_a in(g.player_a,g.player_b) or new.player_b in(g.player_a,g.player_b))) then raise exception 'Player already assigned' using errcode='55000';end if;
 return new;
end;$$;
revoke all on function private.validate_reserved_replacement() from public,anon,authenticated;
create trigger validate_reserved_replacement before update of player_a,player_b on public.singles_games for each row when(old.player_a is distinct from new.player_a or old.player_b is distinct from new.player_b) execute function private.validate_reserved_replacement();
commit;
