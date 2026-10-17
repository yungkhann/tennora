begin;
alter table public.team_matches add column started_at timestamptz;
alter table public.team_matches add column completed_at timestamptz;
alter table public.team_matches add column start_blocked text check(start_blocked in('both_unavailable'));
create table public.match_table_leases(
 match_id uuid primary key references public.team_matches(id) on delete restrict,
 table_number integer not null unique references public.league_tables(number) on delete restrict,
 venue_day date not null,
 assigned_by uuid not null references public.staff_accounts(id) on delete restrict,
 assigned_at timestamptz not null default clock_timestamp()
);
create table public.live_subteams(
 subteam_id uuid primary key references public.subteams(id) on delete restrict,
 match_id uuid not null references public.team_matches(id) on delete restrict,
 leased_at timestamptz not null default clock_timestamp()
);
create table public.live_players(
 player_id uuid primary key references public.players(id) on delete restrict,
 match_id uuid not null references public.team_matches(id) on delete restrict,
 leased_at timestamptz not null default clock_timestamp()
);
create table public.player_rest_heads(
 player_id uuid primary key references public.players(id) on delete restrict,
 last_ended_at timestamptz not null
);
create table public.match_commands(
 id uuid primary key,
 match_id uuid not null references public.team_matches(id) on delete restrict,
 actor_id uuid not null references public.staff_accounts(id) on delete restrict,
 kind text not null check(kind in('assign','release','call','start')),
 request jsonb not null,before_state jsonb not null,after_state jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
create function private.can_read_match_operation(target uuid)
returns boolean language sql volatile security definer set search_path='' as $$
 select private.has_staff_role() and exists(select 1 from public.team_matches m join public.draw_revisions d on d.id=m.draw_id join public.tour_stage_plans p on p.id=d.plan_id left join public.match_table_leases l on l.match_id=m.id where m.id=target and d.published_at is not null and (private.manages_all_teams() or private.owns_scoring_table(l.table_number,p.tour_id)));
$$;
revoke all on function private.can_read_match_operation(uuid) from public,anon;
grant execute on function private.can_read_match_operation(uuid) to authenticated;
do $$declare relation text;begin
 foreach relation in array array['match_table_leases','live_subteams','live_players','player_rest_heads','match_commands'] loop
  execute format('alter table public.%I enable row level security',relation);
  execute format('revoke all on public.%I from anon,authenticated',relation);
  execute format('grant select on public.%I to authenticated',relation);
 end loop;
end;$$;
create policy table_leases_read on public.match_table_leases for select to authenticated using(private.can_read_match_operation(match_id));
create policy live_subteams_read on public.live_subteams for select to authenticated using(private.can_read_match_operation(match_id));
create policy live_players_read on public.live_players for select to authenticated using(private.can_read_match_operation(match_id));
create policy player_rest_read on public.player_rest_heads for select to authenticated using(private.can_manage_player(player_id));
create policy match_commands_read on public.match_commands for select to authenticated using(private.manages_all_teams());
-- All score commands share this barrier; E3 replay will take it exclusively.
create function private.scoring_replay_barrier() returns void language plpgsql set search_path='' as $$
begin perform pg_advisory_xact_lock_shared(170040::bigint);end;$$;
revoke all on function private.scoring_replay_barrier() from public,anon,authenticated;
create function private.match_operation_snapshot(target uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('match_id',m.id,'status',m.status,'version',m.version,'started_at',m.started_at,'completed_at',m.completed_at,'start_blocked',m.start_blocked,'table_number',l.table_number,'venue_day',l.venue_day,'lineups',private.lineup_status_data(m.id),'result_id',m.result_id,'singles',case when m.lineups_revealed_at is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'slot',g.slot,'status',g.status) order by g.slot) from public.singles_games g where g.match_id=m.id),'[]'::jsonb) end) from public.team_matches m left join public.match_table_leases l on l.match_id=m.id where m.id=target;
$$;
revoke all on function private.match_operation_snapshot(uuid) from public,anon,authenticated;
create function public.get_match_operation(match uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 if not private.can_read_match_operation(match) then raise exception 'Match operation access required' using errcode='42501';end if;
 return private.match_operation_snapshot(match);
end;$$;
revoke all on function public.get_match_operation(uuid) from public,anon;
grant execute on function public.get_match_operation(uuid) to authenticated;
create function private.usable_starting_lineup(target uuid,subteam uuid,season uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.lineups l join public.lineup_slots s on s.lineup_id=l.id where l.match_id=target and l.subteam_id=subteam group by l.id having count(*)=5 and bool_and(private.eligible_lineup_player(s.player_id,subteam,season,s.slot)));
$$;
revoke all on function private.usable_starting_lineup(uuid,uuid,uuid) from public,anon,authenticated;
create function private.assert_match_resources(target uuid,check_rest boolean,rest_minutes integer)
returns void language plpgsql security definer set search_path='' as $$
declare m public.team_matches;
begin
 select * into m from public.team_matches where id=target;
 if exists(select 1 from public.live_subteams where subteam_id in(m.subteam_a,m.subteam_b) and match_id<>target) then raise exception 'Subteam already playing' using errcode='55000';end if;
 if exists(select 1 from public.live_players live join public.lineup_slots s on s.player_id=live.player_id join public.lineups l on l.id=s.lineup_id where l.match_id=target and live.match_id<>target) then raise exception 'Player already playing' using errcode='55000';end if;
 if check_rest and exists(select 1 from public.player_rest_heads r join public.lineup_slots s on s.player_id=r.player_id join public.lineups l on l.id=s.lineup_id where l.match_id=target and r.last_ended_at+make_interval(mins=>rest_minutes)>clock_timestamp()) then raise exception 'Player rest incomplete' using errcode='55000';end if;
end;$$;
revoke all on function private.assert_match_resources(uuid,boolean,integer) from public,anon,authenticated;
create function public.manage_match(command_id uuid,match uuid,operation text,table_no integer,expected_version integer,reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.team_matches;t public.tours;settings public.tournament_settings;lease public.match_table_leases;head public.table_day_heads;assignment public.table_judge_assignments;old public.match_commands;payload jsonb;before_value jsonb;after_value jsonb;today date;table_lock integer;a_ready boolean;b_ready boolean;result uuid;
begin
 perform private.require_match_manager();
 perform pg_advisory_xact_lock(170005);
 perform private.scoring_replay_barrier();
 perform private.draw_command_lock((select draw_id from public.team_matches where id=match));
 select * into m from public.team_matches where id=match for update;
 if not found or not exists(select 1 from public.draw_revisions where id=m.draw_id and published_at is not null) then raise exception 'Published match required' using errcode='22023';end if;
 payload:=jsonb_build_object('operation',operation,'table_no',table_no,'version',expected_version,'reason',btrim(reason));
 select * into old from public.match_commands where id=command_id;
 if found then
  if old.match_id=match and old.actor_id=auth.uid() and old.request=payload then return private.match_operation_snapshot(match);end if;
  raise exception 'Match command ID conflict' using errcode='22023';
 end if;
 if command_id is null or coalesce(operation,'') not in('assign','release','call','start') or reason is null or length(btrim(reason)) not between 1 and 500 or (operation<>'assign' and table_no is not null) then raise exception 'Valid match operation and reason required' using errcode='22023';end if;
 if expected_version is distinct from m.version then raise exception 'Match version conflict' using errcode='40001';end if;
 if m.status not in('scheduled','called') then raise exception 'Match lifecycle locked' using errcode='55000';end if;
 if operation<>'release' and (m.subteam_a is null or m.subteam_b is null or not private.match_dependencies_ready(match)) then raise exception 'Match sources are not ready' using errcode='55000';end if;
 select tour.* into t from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id join public.tours tour on tour.id=p.tour_id where d.id=m.draw_id;
 select * into settings from public.tournament_settings where tour_id=t.id order by revision desc limit 1;
 today:=(clock_timestamp() at time zone settings.venue_timezone)::date;
 if settings.id is null or (operation<>'release' and today not between t.starts_on and t.ends_on) then raise exception 'Current event day required' using errcode='55000';end if;
 select * into lease from public.match_table_leases where match_id=match;
 before_value:=private.match_operation_snapshot(match);
 if operation='assign' then
  if table_no is null or table_no not between 1 and settings.table_count then raise exception 'Configured table required' using errcode='22023';end if;
  for table_lock in select distinct n from unnest(array[lease.table_number,table_no]) n where n is not null order by n loop perform pg_advisory_xact_lock(170060,table_lock);end loop;
  if exists(select 1 from public.match_table_leases where table_number=table_no and match_id<>match) then raise exception 'Table already assigned' using errcode='55000';end if;
  perform private.assert_match_resources(match,false,settings.rest_minutes);
  insert into public.match_table_leases(match_id,table_number,venue_day,assigned_by) values(match,table_no,today,auth.uid()) on conflict(match_id) do update set table_number=excluded.table_number,venue_day=excluded.venue_day,assigned_by=excluded.assigned_by,assigned_at=clock_timestamp();
  update public.team_matches set status='scheduled',start_blocked=null,version=version+1 where id=match;
 elsif operation='release' then
  if lease.match_id is null then raise exception 'Assigned table required' using errcode='22023';end if;
  perform pg_advisory_xact_lock(170060,lease.table_number);
  delete from public.match_table_leases where match_id=match;
  update public.team_matches set status='scheduled',start_blocked=null,version=version+1 where id=match;
 else
  if lease.match_id is null or lease.venue_day<>today then raise exception 'Assigned table for current venue day required' using errcode='55000';end if;
  perform private.assert_match_resources(match,false,settings.rest_minutes);
  if operation='call' then
   if m.status<>'scheduled' then raise exception 'Scheduled match required' using errcode='55000';end if;
   update public.team_matches set status='called',start_blocked=null,version=version+1 where id=match;
  else
   a_ready:=private.usable_starting_lineup(match,m.subteam_a,t.season_id);b_ready:=private.usable_starting_lineup(match,m.subteam_b,t.season_id);
   if not a_ready and not b_ready then
    update public.team_matches set start_blocked='both_unavailable',version=version+1 where id=match;
   elsif not a_ready or not b_ready then
    insert into public.team_match_results(match_id,revision,previous_result_id,winner,kind,games_a,games_b,sets_a,sets_b,points_a,points_b,created_by) values(match,m.result_revision+1,m.result_id,case when a_ready then m.subteam_a else m.subteam_b end,'team_forfeit',case when a_ready then 3 else 0 end,case when b_ready then 3 else 0 end,case when a_ready then 9 else 0 end,case when b_ready then 9 else 0 end,case when a_ready then 99 else 0 end,case when b_ready then 99 else 0 end,auth.uid()) returning id into result;
    update public.team_matches set status='finished',completed_at=clock_timestamp(),result_id=result,result_revision=result_revision+1,start_blocked=null,version=version+1,lineup_version=lineup_version+1 where id=match;
    update public.singles_games set status='cancelled' where match_id=match and status='pending';
    delete from public.match_table_leases where match_id=match;
    perform private.advance_team_result(match);
   else
   select * into head from public.table_day_heads where venue_day=today and table_number=lease.table_number for share;
   select * into assignment from public.table_judge_assignments where id=head.assignment_id;
   if head.staff_id is null or not exists(select 1 from public.staff_accounts a join public.staff_roles r on r.user_id=a.id where a.id=head.staff_id and a.active and ((assignment.mode='line_judge' and r.role='line_judge') or (assignment.mode='takeover' and r.role in('organizer','main_judge')))) then raise exception 'Active table scoring owner required' using errcode='55000';end if;
    if m.lineups_revealed_at is null or (select count(*) from public.singles_games where match_id=match and status='pending')<>5 then raise exception 'Jointly revealed full lineups required' using errcode='55000';end if;
    perform p.id from public.players p join public.lineup_slots s on s.player_id=p.id join public.lineups l on l.id=s.lineup_id where l.match_id=match order by p.id for update of p;
    perform private.assert_match_resources(match,true,settings.rest_minutes);
    insert into public.live_subteams(subteam_id,match_id) values(m.subteam_a,match),(m.subteam_b,match);
    insert into public.live_players(player_id,match_id) select s.player_id,match from public.lineups l join public.lineup_slots s on s.lineup_id=l.id where l.match_id=match;
    update public.team_matches set status='in_progress',started_at=clock_timestamp(),start_blocked=null,version=version+1 where id=match;
   end if;
  end if;
 end if;
 after_value:=private.match_operation_snapshot(match);
 insert into public.match_commands(id,match_id,actor_id,kind,request,before_state,after_state) values(command_id,match,auth.uid(),operation,payload,before_value,after_value);
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state) values(auth.uid(),case when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'main_judge'::public.staff_role end,'match.'||operation,match,'team_match',before_value,after_value);
 return after_value;
end;$$;
revoke all on function public.manage_match(uuid,uuid,text,integer,integer,text) from public,anon;
grant execute on function public.manage_match(uuid,uuid,text,integer,integer,text) to authenticated;

-- Transfers can make historical submissions name the same player on both sides.
-- Preserve atomic reveal without leaking the hidden selection through an error.
alter table public.singles_games drop constraint singles_games_check;
alter table public.singles_games add constraint singles_opponents check(player_a<>player_b or status='cancelled');

create or replace function public.submit_lineup(lineup_id uuid,match uuid,subteam uuid,players uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare value public.team_matches; old public.lineups; season uuid; i integer;
begin
 perform pg_advisory_xact_lock(170002);
 perform pg_advisory_xact_lock(170005);
 if not private.is_subteam_trainer(subteam) then raise exception 'Assigned Trainer required' using errcode='42501'; end if;
 perform private.scoring_replay_barrier();
 perform private.draw_command_lock((select draw_id from public.team_matches where id=match));
 select * into value from public.team_matches where id=match for update;
 if not found or subteam is null or subteam not in(value.subteam_a,value.subteam_b) or value.subteam_a is null or value.subteam_b is null or not exists(select 1 from public.draw_revisions where id=value.draw_id and published_at is not null) then raise exception 'Published participant match required' using errcode='22023'; end if;
 select * into old from public.lineups where id=lineup_id;
 if found then
  if old.match_id=match and old.subteam_id=subteam and old.original_players=players then return private.lineup_status_data(match); end if;
  raise exception 'Lineup ID conflict' using errcode='22023';
 end if;
 if not private.match_dependencies_ready(match) then raise exception 'Match sources are not ready' using errcode='55000';end if;
 if value.status not in('scheduled','called') or value.lineups_revealed_at is not null or exists(select 1 from public.lineups l where l.match_id=match and l.subteam_id=subteam) then raise exception 'Lineup already locked' using errcode='22023'; end if;
 if lineup_id is null or players is null or cardinality(players)<>5 or array_ndims(players)<>1 or array_lower(players,1)<>1 or array_position(players,null) is not null or (select count(distinct p) from unnest(players) p)<>5 then raise exception 'Five distinct lineup players required' using errcode='22023'; end if;
 select t.season_id into season from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id join public.tours t on t.id=p.tour_id where d.id=value.draw_id;
 for i in 1..5 loop
  if not private.eligible_lineup_player(players[i],subteam,season,i) then raise exception 'Eligible gendered roster player required' using errcode='22023'; end if;
 end loop;
 insert into public.lineups(id,match_id,subteam_id,original_players,submitted_by) values(lineup_id,match,subteam,players,auth.uid());
 insert into public.lineup_slots(lineup_id,slot,player_id,player_name,gender) select lineup_id,position,p.id,p.first_name||' '||p.last_name,p.gender from unnest(players) with ordinality selected(id,position) join public.players p on p.id=selected.id;
 -- Before reveal even an Organizer must not recover identities from audit hashes.
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),'trainer','lineup.submitted',lineup_id,'lineup',jsonb_build_object('match_id',match,'subteam_id',subteam,'submitted',true));
 update public.team_matches set version=version+1,lineup_version=lineup_version+1 where id=match;
 if (select count(*) from public.lineups l where l.match_id=match)=2 then
  insert into public.singles_games(match_id,slot,player_a,player_b,status)
  select match,a.slot,a.player_id,b.player_id,case when a.player_id=b.player_id then 'cancelled' else 'pending' end::public.singles_game_status from public.lineups la join public.lineup_slots a on a.lineup_id=la.id join public.lineups lb on lb.match_id=la.match_id and lb.subteam_id=value.subteam_b join public.lineup_slots b on b.lineup_id=lb.id and b.slot=a.slot where la.match_id=match and la.subteam_id=value.subteam_a;
  update public.team_matches set lineups_revealed_at=clock_timestamp(),lineups_reveal_version=lineup_version where id=match;
  insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),'trainer','lineups.revealed',match,'team_match',jsonb_build_object('lineup_version',value.lineup_version+1));
 end if;
 return private.lineup_status_data(match);
end;$$;


create or replace function public.replace_lineup_player(replacement_id uuid,match uuid,subteam uuid,slot integer,player uuid,reason text,expected_lineup_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare value public.team_matches; lineup public.lineups; old public.lineup_slots; previous public.lineup_replacements; game public.singles_games; season uuid; new_name text; settings public.tournament_settings;
begin
 perform private.require_draw_manager();
 perform pg_advisory_xact_lock(170005);
 perform private.scoring_replay_barrier();
 perform private.draw_command_lock((select draw_id from public.team_matches where id=match));
 select * into value from public.team_matches where id=match for update;
 if not found or value.lineups_revealed_at is null then raise exception 'Revealed active match required' using errcode='22023'; end if;
 select * into previous from public.lineup_replacements where id=replacement_id;
 if found then
  if previous.match_id=match and previous.slot=slot and previous.new_player_id=player and previous.reason=btrim(reason) and exists(select 1 from public.lineups l where l.id=previous.lineup_id and l.subteam_id=subteam) then return private.lineup_status_data(match); end if;
  raise exception 'Replacement ID conflict' using errcode='22023';
 end if;
 if value.status not in('scheduled','called','in_progress') then raise exception 'Revealed active match required' using errcode='22023'; end if;
 if expected_lineup_version is distinct from value.lineup_version then raise exception 'Lineup revision conflict' using errcode='22023'; end if;
 select * into lineup from public.lineups l where l.match_id=match and l.subteam_id=subteam;
 select * into old from public.lineup_slots where lineup_id=lineup.id and lineup_slots.slot=replace_lineup_player.slot;
 select * into game from public.singles_games g where g.match_id=match and g.slot=replace_lineup_player.slot for update;
 if replacement_id is null or old.player_id is null or not coalesce(game.status='pending' or (game.status='cancelled' and game.player_a=game.player_b and value.status in('scheduled','called')),false) or reason is null or char_length(btrim(reason)) not between 1 and 500 then raise exception 'Pending singles and reason required' using errcode='22023'; end if;
 if old.player_id=player or exists(select 1 from public.lineup_slots s where s.lineup_id=lineup.id and s.player_id=player) then raise exception 'Distinct replacement player required' using errcode='22023'; end if;
 select t.season_id into season from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id join public.tours t on t.id=p.tour_id where d.id=value.draw_id;
 if not private.eligible_lineup_player(player,subteam,season,slot) then raise exception 'Eligible gendered roster player required' using errcode='22023'; end if;
 if exists(select 1 from public.lineup_slots s join public.lineups l on l.id=s.lineup_id where l.match_id=match and s.player_id=player) then raise exception 'Distinct replacement player required' using errcode='22023';end if;
 if value.status='in_progress' then
  perform p.id from public.players p where p.id in(old.player_id,player) order by p.id for update;
  if exists(select 1 from public.live_players where player_id=player) then raise exception 'Player already playing' using errcode='55000';end if;
  select cfg.* into settings from public.draw_revisions d join public.tour_stage_plans plan on plan.id=d.plan_id join public.tournament_settings cfg on cfg.tour_id=plan.tour_id where d.id=value.draw_id order by cfg.revision desc limit 1;
  if exists(select 1 from public.player_rest_heads where player_id=player and last_ended_at+make_interval(mins=>settings.rest_minutes)>clock_timestamp()) then raise exception 'Player rest incomplete' using errcode='55000';end if;
  delete from public.live_players where player_id=old.player_id and match_id=match;
  insert into public.live_players(player_id,match_id) values(player,match);
 end if;
 select first_name||' '||last_name into new_name from public.players where id=player;
 insert into public.lineup_replacements(id,match_id,lineup_id,slot,old_player_id,new_player_id,old_player_name,new_player_name,reason,changed_by) values(replacement_id,match,lineup.id,slot,old.player_id,player,old.player_name,new_name,btrim(reason),auth.uid());
 update public.lineup_slots set player_id=player,player_name=new_name where lineup_id=lineup.id and lineup_slots.slot=replace_lineup_player.slot;
 update public.singles_games set status='pending',player_a=case when subteam=value.subteam_a then player else player_a end,player_b=case when subteam=value.subteam_b then player else player_b end where id=game.id;
 update public.team_matches set version=version+1,lineup_version=lineup_version+1 where id=match;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),(case when private.has_staff_role('organizer') then 'organizer' else 'main_judge' end)::public.staff_role,'lineup.replaced',replacement_id,'lineup_replacement',jsonb_build_object('match_id',match,'lineup_id',lineup.id,'slot',slot,'reason',btrim(reason)));
 return private.lineup_status_data(match);
end;$$;
create or replace function public.transfer_player(player uuid,new_club uuid,reason text)
returns void language plpgsql security definer set search_path='' as $$
declare old public.players;
begin
 perform pg_advisory_xact_lock(170005);
 if not private.has_staff_role('organizer') then raise exception 'Organizer required' using errcode='42501'; end if;
 select * into old from public.players where id=player for update;
 if not found or new_club is null or new_club=old.team_id or not exists(select 1 from public.teams where id=new_club) or reason is null or char_length(btrim(reason)) not between 1 and 500 then raise exception 'Transfer details required' using errcode='22023'; end if;
 if exists(select 1 from public.live_players where player_id=player) then raise exception 'Player reserved in live match' using errcode='55000';end if;
 update public.roster_memberships set ended_at=now(),ended_reason='transfer: '||btrim(reason) where player_id=player and ended_at is null;
 update public.players set team_id=new_club where id=player;
 perform private.league_audit('player.transferred',player,'player',to_jsonb(old),jsonb_build_object('team_id',new_club,'reason',btrim(reason)));
end;
$$;

commit;
