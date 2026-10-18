begin;
alter table public.tours add column placement_weight numeric not null default 1 check(placement_weight>0 and placement_weight<=1000 and placement_weight=round(placement_weight,3));
create function public.configure_tour_weight(tournament uuid,weight numeric) returns void language plpgsql security definer set search_path='' as $$
declare t public.tours;
begin
 perform private.require_organizer();
 select * into t from public.tours where id=tournament for update;
 if t.id is null or not exists(select 1 from public.seasons where id=t.season_id and status='draft') then raise exception 'Draft season required' using errcode='55000';end if;
 if weight is null or weight<=0 or weight>1000 or weight<>round(weight,3) then raise exception 'Valid tour weight required' using errcode='22023';end if;
 update public.tours set placement_weight=weight where id=t.id;
 perform private.league_audit('tour.weight',t.id,'tour',jsonb_build_object('weight',t.placement_weight),jsonb_build_object('weight',weight));
end;$$;
revoke all on function public.configure_tour_weight(uuid,numeric) from public,anon;
grant execute on function public.configure_tour_weight(uuid,numeric) to authenticated;
create table public.public_match_snapshots(
 match_id uuid primary key references public.team_matches(id) on delete cascade,
 tour_id uuid not null references public.tours(id) on delete cascade,
 version bigint not null default 1 check(version>0),
 data jsonb not null,
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.public_match_snapshots enable row level security;
revoke all on public.public_match_snapshots from anon,authenticated;
grant select on public.public_match_snapshots to anon,authenticated;
create policy published_snapshot_read on public.public_match_snapshots for select to anon,authenticated using(true);
create function private.project_public_match(target uuid) returns void language plpgsql security definer set search_path='' as $$
declare m public.team_matches;d public.draw_revisions;p public.tour_stage_plans;value jsonb;games jsonb;result jsonb;
begin
 select * into m from public.team_matches where id=target;
 select * into d from public.draw_revisions where id=m.draw_id;
 if m.id is null or m.superseded_by is not null or d.published_at is null or m.status='cancelled' then delete from public.public_match_snapshots where match_id=target;return;end if;
 select * into p from public.tour_stage_plans where id=d.plan_id;
 select jsonb_build_object('winner',r.winner,'kind',r.kind,'games_a',r.games_a,'games_b',r.games_b,'sets_a',r.sets_a,'sets_b',r.sets_b,'points_a',r.points_a,'points_b',r.points_b) into result from public.team_match_results r where r.id=m.result_id and m.status='finished';
 if m.lineups_revealed_at is not null then
  select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'slot',g.slot,'status',g.status,'a',jsonb_build_object('id',g.player_a,'name',coalesce(g.player_a_name,(select s.player_name from public.lineup_slots s join public.lineups l on l.id=s.lineup_id where l.match_id=m.id and l.subteam_id=m.subteam_a and s.slot=g.slot))),'b',jsonb_build_object('id',g.player_b,'name',coalesce(g.player_b_name,(select s.player_name from public.lineup_slots s join public.lineups l on l.id=s.lineup_id where l.match_id=m.id and l.subteam_id=m.subteam_b and s.slot=g.slot))),'sets',coalesce(g.score_state->'sets','[]'::jsonb),'summary',case when g.score_state is null then null else private.score_summary(g.score_state)||case when g.status='finished' then jsonb_build_object('sets_a',r.sets_a,'sets_b',r.sets_b,'server',null) else '{}'::jsonb end end,'winner',case when g.status='finished' then r.winner else null end,'kind',case when g.status='finished' then r.kind else null end,'timeout_until',g.timeout_until) order by g.slot),'[]'::jsonb) into games from public.singles_games g left join public.singles_results r on r.id=g.result_id where g.match_id=m.id;
 else games:='[]';end if;
 value:=jsonb_build_object('id',m.id,'tour_id',p.tour_id,'season_id',(select season_id from public.tours where id=p.tour_id),'draw_id',m.draw_id,'group_id',m.group_id,'age_group',p.age_group,'round',m.round_no,'number',m.match_no,'placement_from',m.placement_from,'placement_to',m.placement_to,'status',m.status,'a',jsonb_build_object('id',m.subteam_a,'name',(select t.name from public.subteams s join public.teams t on t.id=s.team_id where s.id=m.subteam_a)),'b',jsonb_build_object('id',m.subteam_b,'name',(select t.name from public.subteams s join public.teams t on t.id=s.team_id where s.id=m.subteam_b)),'table',(select table_number from public.match_table_leases where match_id=m.id),'started_at',m.started_at,'completed_at',m.completed_at,'revealed',m.lineups_revealed_at is not null,'singles',games,'result',result);
 insert into public.public_match_snapshots(match_id,tour_id,data) values(target,p.tour_id,value) on conflict(match_id) do update set version=public.public_match_snapshots.version+1,data=excluded.data,updated_at=clock_timestamp() where public.public_match_snapshots.data is distinct from excluded.data;
end;$$;
revoke all on function private.project_public_match(uuid) from public,anon,authenticated;
create function private.public_match_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='team_matches' then perform private.project_public_match(case when tg_op='DELETE' then old.id else new.id end);
 elsif tg_table_name='draw_revisions' then perform private.project_public_match(id) from public.team_matches where draw_id=new.id;
 elsif tg_table_name='teams' then perform private.project_public_match(m.id) from public.team_matches m join public.subteams s on s.id in(m.subteam_a,m.subteam_b) where s.team_id=new.id;
 else perform private.project_public_match(case when tg_op='DELETE' then old.match_id else new.match_id end);end if;
 return null;
end;$$;
revoke all on function private.public_match_trigger() from public,anon,authenticated;
create constraint trigger public_match_changed after insert or update or delete on public.team_matches deferrable initially deferred for each row execute function private.public_match_trigger();
create constraint trigger public_singles_changed after insert or update or delete on public.singles_games deferrable initially deferred for each row execute function private.public_match_trigger();
create constraint trigger public_table_changed after insert or update or delete on public.match_table_leases deferrable initially deferred for each row execute function private.public_match_trigger();
create constraint trigger public_draw_changed after update on public.draw_revisions deferrable initially deferred for each row execute function private.public_match_trigger();
create constraint trigger public_team_changed after update on public.teams deferrable initially deferred for each row execute function private.public_match_trigger();
-- Explicit safe columns; no base-table grants or staff-session dependent views.
create view public.public_league_players as
 select distinct on(p.id) p.id,p.first_name,p.last_name,p.current_rating as rating,t.id as team_id,t.name as team_name,s.age_group,exists(select 1 from public.public_player_photos photo where photo.player_id=p.id) as has_photo
 from public.players p join public.teams t on t.id=p.team_id join public.roster_memberships r on r.player_id=p.id and r.ended_at is null join public.subteams s on s.id=r.subteam_id
 where exists(select 1 from public.tours tour join public.tour_stage_plans plan on plan.tour_id=tour.id join public.draw_revisions d on d.plan_id=plan.id where tour.season_id=r.season_id and plan.age_group=s.age_group and d.published_at is not null)
 order by p.id,r.joined_at desc;
revoke all on public.public_league_players from anon,authenticated;
grant select on public.public_league_players to anon,authenticated;
create function public.get_public_directory() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'seasons',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'year',s.year,'starts_on',s.starts_on,'ends_on',s.ends_on) order by s.year desc,s.id),'[]') from public.seasons s where exists(select 1 from public.tours t join public.tour_stage_plans p on p.tour_id=t.id join public.draw_revisions d on d.plan_id=p.id where t.season_id=s.id and d.published_at is not null)),
 'tours',(select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'season_id',t.season_id,'name',t.name,'ordinal',t.ordinal,'starts_on',t.starts_on,'ends_on',t.ends_on,'weight',t.placement_weight) order by t.starts_on desc,t.ordinal),'[]') from public.tours t where exists(select 1 from public.tour_stage_plans p join public.draw_revisions d on d.plan_id=p.id where p.tour_id in(select id from public.tours where season_id=t.season_id) and d.published_at is not null)),
 'draws',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'tour_id',p.tour_id,'age_group',p.age_group,'groups',(select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.label,'kind',s.kind,'size',(s.configuration->>case when s.kind='knockout' then 'size' else 'group_size' end)::integer,'ordinal',g.ordinal,'stage',s.ordinal,'entries',(select coalesce(jsonb_agg(jsonb_build_object('subteam_id',e.subteam_id,'team_name',t.name,'seed',e.seed,'rating',e.rating_total) order by e.seed),'[]') from public.draw_entries e join public.subteams st on st.id=e.subteam_id join public.teams t on t.id=st.team_id where e.group_id=g.id),'standings',(select jsonb_build_object('complete',snapshot.complete,'order',snapshot.data->'order','rows',snapshot.data->'rows','evidence',snapshot.data->'evidence','unresolved',snapshot.data->'unresolved') from public.group_standing_heads h join public.group_standing_snapshots snapshot on snapshot.id=h.snapshot_id where h.group_id=g.id)) order by s.ordinal,g.ordinal),'[]') from public.stage_groups g join public.stages s on s.id=g.stage_id where g.draw_id=d.id)) order by p.tour_id,p.age_group),'[]') from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id where d.published_at is not null));
$$;
revoke all on function public.get_public_directory() from public;
grant execute on function public.get_public_directory() to anon,authenticated;
create function public.get_public_player_history(player uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('game_id',g.id,'match_id',m.id,'tour_id',p.tour_id,'tour_name',tour.name,'ended_at',r.ended_at,'winner',r.winner,'side',case when r.player_a=player then 'a' else 'b' end,'opponent_name',case when r.player_a=player then r.player_b_name else r.player_a_name end,'opponent_rating',case when r.player_a=player then c.b_before else c.a_before end,'sets',r.actual_sets,'kind',r.kind,'before',case when r.player_a=player then c.a_before else c.b_before end,'after',case when r.player_a=player then c.a_after else c.b_after end,'k',case when c.id is not null then r.k_factor else null end) order by r.completion_order),'[]') from public.singles_games g join public.team_matches m on m.id=g.match_id join public.draw_revisions d on d.id=m.draw_id join public.tour_stage_plans p on p.id=d.plan_id join public.tours tour on tour.id=p.tour_id join public.singles_results r on r.id=g.result_id left join public.rating_calculation_heads h on h.game_id=g.id left join public.rating_calculations c on c.id=h.calculation_id where g.status='finished' and m.status<>'cancelled' and m.superseded_by is null and m.lineups_revealed_at is not null and d.published_at is not null and player in(r.player_a,r.player_b);
$$;
revoke all on function public.get_public_player_history(uuid) from public;
grant execute on function public.get_public_player_history(uuid) to anon,authenticated;
create or replace function private.season_readiness(parent_season uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare problems text[]:='{}'; clubs integer; tour_count integer;
begin
 select count(*) into clubs from public.season_team_entries where season_id=parent_season;
 select count(*) into tour_count from public.tours where season_id=parent_season;
 if tour_count=0 then problems:=array_append(problems,'no_tours'); end if;
 if exists(select 1 from public.tours t where t.season_id=parent_season and not exists(select 1 from public.tournament_settings s where s.tour_id=t.id)) then problems:=array_append(problems,'missing_settings'); end if;
 if exists(select 1 from public.tours t cross join unnest(enum_range(null::public.age_group)) age where t.season_id=parent_season and not exists(select 1 from public.tour_stage_plans p where p.tour_id=t.id and p.age_group=age)) then problems:=array_append(problems,'missing_stage_plans'); end if;
 if exists(select 1 from public.tours t join public.tour_stage_plans p on p.tour_id=t.id join public.stage_templates f on f.id=p.template_id where t.season_id=parent_season and p.revision=(select max(q.revision) from public.tour_stage_plans q where q.tour_id=t.id and q.age_group=p.age_group) and f.entry_count<>(select count(*) from public.season_team_entries e join public.subteams sub on sub.team_id=e.team_id and sub.age_group=p.age_group where e.season_id=parent_season)) then problems:=array_append(problems,'entry_count_mismatch'); end if;
 if exists(select 1 from public.tours t join public.tour_stage_plans p on p.tour_id=t.id join public.stages stage on stage.plan_id=p.id where t.season_id=parent_season and p.revision=(select max(revision) from public.tour_stage_plans where tour_id=t.id and age_group=p.age_group) and stage.kind='round_robin' and (stage.configuration->>'group_count')::integer>1 and not exists(select 1 from public.stages child where child.plan_id=p.id and child.ordinal>stage.ordinal)) then problems:=array_append(problems,'unsupported_final_groups');end if;
 return jsonb_build_object('ready',cardinality(problems)=0,'problems',to_jsonb(problems),'club_count',clubs,'tour_count',tour_count);
end;$$;
create or replace function public.start_season(season_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare parent public.seasons; snapshot jsonb;
begin
 perform private.require_organizer();
 select * into parent from public.seasons where id=season_id for update;
 if not found then raise exception 'Unknown season' using errcode='22023'; end if;
 if parent.status='started' then return; end if;
 if not (private.season_readiness(season_id)->>'ready')::boolean then raise exception 'Stage and settings readiness required' using errcode='22023'; end if;
 select jsonb_build_object('tours',jsonb_agg(jsonb_build_object('tour_id',t.id,'placement_weight',t.placement_weight,'settings_id',(select s.id from public.tournament_settings s where s.tour_id=t.id order by s.revision desc limit 1),'plan_ids',(select jsonb_agg(p.id order by p.age_group) from public.tour_stage_plans p where p.tour_id=t.id and p.revision=(select max(q.revision) from public.tour_stage_plans q where q.tour_id=t.id and q.age_group=p.age_group))) order by t.ordinal)) into snapshot from public.tours t where t.season_id=start_season.season_id;
 insert into public.season_configuration_snapshots(season_id,configuration,created_by) values(season_id,snapshot,auth.uid());
 update public.seasons set status='started',started_at=clock_timestamp() where id=season_id;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state) values(auth.uid(),'organizer','season.started',season_id,'season',to_jsonb(parent),snapshot);
end;$$;
alter table public.tour_placements add column source_snapshot_id uuid references public.group_standing_snapshots(id) on delete restrict;
create function private.project_group_tour_placements(target uuid) returns void language plpgsql security definer set search_path='' as $$
declare g public.stage_groups;s public.stages;snapshot public.group_standing_snapshots;source uuid;
begin
 select * into g from public.stage_groups where id=target;
 select * into s from public.stages where id=g.stage_id;
 if s.kind<>'round_robin' or (select count(*) from public.stage_groups where draw_id=g.draw_id)<>1 or exists(select 1 from public.stages where plan_id=s.plan_id and ordinal>s.ordinal) then return;end if;
 select h.* into snapshot from public.group_standing_heads head join public.group_standing_snapshots h on h.id=head.snapshot_id where head.group_id=g.id;
 delete from public.tour_placements where draw_id=g.draw_id;
 if not coalesce(snapshot.complete,false) or jsonb_array_length(snapshot.data->'unresolved')<>0 then return;end if;
 select m.result_id into source from public.team_matches m join public.team_match_results r on r.id=m.result_id where m.group_id=g.id and m.status='finished' and m.superseded_by is null order by r.created_at desc,r.id limit 1;
 insert into public.tour_placements(draw_id,subteam_id,place,source_result_id,source_snapshot_id) select g.draw_id,value::uuid,ordinality::integer,source,snapshot.id from jsonb_array_elements_text(snapshot.data->'order') with ordinality;
end;$$;
revoke all on function private.project_group_tour_placements(uuid) from public,anon,authenticated;
create function private.group_placement_trigger() returns trigger language plpgsql security definer set search_path='' as $$begin perform private.project_group_tour_placements(new.group_id);return null;end;$$;
revoke all on function private.group_placement_trigger() from public,anon,authenticated;
create trigger group_placement_changed after insert or update on public.group_standing_heads for each row execute function private.group_placement_trigger();
do $$declare g record;begin for g in select group_id from public.group_standing_heads loop perform private.project_group_tour_placements(g.group_id);end loop;end;$$;
create function public.get_public_season_standings(season uuid) returns jsonb language sql stable security definer set search_path='' as $$
 with entries as(
 select st.id as subteam_id,st.age_group,t.name as team_name from public.season_team_entries e join public.subteams st on st.team_id=e.team_id join public.teams t on t.id=e.team_id where e.season_id=season and exists(select 1 from public.tours tour join public.tour_stage_plans p on p.tour_id=tour.id join public.draw_revisions d on d.plan_id=p.id where tour.season_id=season and d.published_at is not null)
 ), tour_status as(
 select t.id,t.ordinal,t.placement_weight,p.age_group,d.id as draw_id,count(distinct de.subteam_id) as expected,count(distinct place.subteam_id) as placed,max(place.place) as last_place
 from public.tours t join public.tour_stage_plans p on p.tour_id=t.id join public.draw_revisions d on d.plan_id=p.id and d.published_at is not null join public.draw_entries de on de.draw_id=d.id left join public.tour_placements place on place.draw_id=d.id where t.season_id=season group by t.id,p.age_group,d.id
 ), totals as(
 select e.*,coalesce(sum(case when place.place is not null then place.place*t.placement_weight when ts.expected>0 and ts.expected=ts.placed then (ts.last_place+1)*t.placement_weight else 0 end),0) as score,
 coalesce(bool_and(coalesce(ts.expected>0 and ts.expected=ts.placed,false)),false) as complete,
 jsonb_agg(jsonb_build_object('tour_id',t.id,'place',place.place,'weight',t.placement_weight,'missed',place.place is null and ts.expected>0 and ts.expected=ts.placed,'final',coalesce(ts.expected>0 and ts.expected=ts.placed,false)) order by t.ordinal) as tours
 from entries e join public.tours t on t.season_id=season left join tour_status ts on ts.id=t.id and ts.age_group=e.age_group left join public.tour_placements place on place.draw_id=ts.draw_id and place.subteam_id=e.subteam_id group by e.subteam_id,e.age_group,e.team_name
 ), tied as(
 select total.*, (select count(*) from public.team_matches m join public.team_match_results r on r.id=m.result_id join public.draw_revisions d on d.id=m.draw_id join public.tour_stage_plans p on p.id=d.plan_id join public.tours t on t.id=p.tour_id where t.season_id=season and d.published_at is not null and m.superseded_by is null and m.status='finished' and r.winner=total.subteam_id and exists(select 1 from totals other where other.subteam_id<>total.subteam_id and other.age_group=total.age_group and other.score=total.score and other.subteam_id in(m.subteam_a,m.subteam_b))) as head_to_head_wins from totals total
 ), ranked as(
 select *,rank() over(partition by age_group order by score,head_to_head_wins desc) as rank,count(*) over(partition by age_group,score,head_to_head_wins)>1 as unresolved from tied
 ) select coalesce(jsonb_agg(jsonb_build_object('subteam_id',subteam_id,'team_name',team_name,'age_group',age_group,'score',score,'rank',rank,'head_to_head_wins',head_to_head_wins,'unresolved',unresolved,'provisional',not complete,'tours',tours) order by age_group,rank,team_name,subteam_id),'[]') from ranked;
$$;
revoke all on function public.get_public_season_standings(uuid) from public;
grant execute on function public.get_public_season_standings(uuid) to anon,authenticated;
do $$declare m record;begin for m in select id from public.team_matches loop perform private.project_public_match(m.id);end loop;end;$$;
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='public_match_snapshots') then alter publication supabase_realtime add table public.public_match_snapshots;end if;
end;$$;
commit;
