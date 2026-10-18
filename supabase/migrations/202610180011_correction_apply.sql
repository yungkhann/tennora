begin;
alter table public.team_matches add column superseded_by uuid references public.team_matches(id) on delete restrict deferrable initially deferred;
alter table public.team_matches drop constraint team_matches_group_id_match_no_key;
create unique index current_match_position on public.team_matches(group_id,match_no) where superseded_by is null;
create policy current_attempt_read on public.team_matches as restrictive for select to authenticated using(superseded_by is null);
create index correction_game_lookup on public.result_correction_requests(game_id);
create index correction_event_lookup on public.result_correction_events(request_id);
-- Old match/results/lineups/points remain intact. Only current graph edges advance.
create table public.correction_attempts(
 request_id uuid not null references public.result_correction_requests(id) on delete restrict,
 old_match_id uuid not null unique references public.team_matches(id) on delete restrict,
 new_match_id uuid not null unique references public.team_matches(id) on delete restrict deferrable initially deferred,
 original jsonb not null,
 created_at timestamptz not null default clock_timestamp(),
 primary key(request_id,old_match_id)
);
alter table public.correction_attempts enable row level security;
revoke all on public.correction_attempts from anon,authenticated;
grant select on public.correction_attempts to authenticated;
create policy manager_attempt_read on public.correction_attempts for select to authenticated using(private.manages_all_teams());
create function public.apply_result_correction(command_id uuid,request_id uuid,expected_digest text,resolve_started boolean,reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare req public.result_correction_requests;state public.result_correction_states;old_event public.result_correction_events;g public.singles_games;m public.team_matches;original public.singles_results;plan jsonb;payload jsonb;summary jsonb;result uuid;team_result uuid;child public.team_matches;mapping jsonb:='{}';new_id uuid;item jsonb;edge public.match_sources;replayed jsonb;role_name public.staff_role;result_snapshot jsonb;
begin
 perform private.require_match_manager();perform pg_advisory_xact_lock(170002);perform pg_advisory_xact_lock(170005);perform pg_advisory_xact_lock(170040::bigint);
 select * into req from public.result_correction_requests where id=request_id;
 select * into g from public.singles_games where id=req.game_id;
 select * into m from public.team_matches where id=g.match_id;
 if req.id is null then raise exception 'Correction required' using errcode='22023';end if;
 perform private.draw_command_lock(m.draw_id);
 payload:=jsonb_build_object('request_id',request_id,'digest',expected_digest,'resolve_started',resolve_started,'reason',btrim(reason));
 select * into old_event from public.result_correction_events where id=command_id;
 if found then
  if old_event.kind<>'applied' or old_event.actor_id<>auth.uid() or old_event.payload<>payload then raise exception 'Correction command ID conflict' using errcode='22023';end if;
  return old_event.after_state;
 end if;
 if command_id is null or expected_digest is null or resolve_started is null or reason is null or length(btrim(reason)) not between 1 and 500 then raise exception 'Reviewed correction and reason required' using errcode='22023';end if;
 select * into state from public.result_correction_states where public.result_correction_states.request_id=apply_result_correction.request_id for update;
 if state.status<>'review' then raise exception 'Correction is no longer in review' using errcode='55000';end if;
 plan:=private.correction_preview(request_id);
 if coalesce((plan->>'stale')::boolean,true) or plan->>'digest' is distinct from expected_digest then raise exception 'Correction review version conflict' using errcode='40001';end if;
 if (plan->>'requires_organizer')::boolean and (not private.has_staff_role('organizer') or not resolve_started) then raise exception 'Explicit Organizer resolution required' using errcode='42501';end if;
 if m.superseded_by is not null then raise exception 'Current match attempt required' using errcode='55000';end if;
 select * into original from public.singles_results where id=req.base_result_id;
 -- Allocate fresh graph IDs first, preserving every old attempt and its sources.
 for item in select value from jsonb_array_elements(plan->'affected_matches') loop
  new_id:=gen_random_uuid();mapping:=mapping||jsonb_build_object(item->>'id',new_id);
 end loop;
 for child in select * from public.team_matches where id in(select key::uuid from jsonb_each(mapping)) order by id for update loop
  new_id:=(mapping->>child.id::text)::uuid;
  insert into public.correction_attempts(request_id,old_match_id,new_match_id,original) values(request_id,child.id,new_id,jsonb_build_object('match',to_jsonb(child),'sources',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from public.match_sources s where match_id=child.id)));
  update public.team_matches set superseded_by=new_id,status='cancelled',version=version+1 where id=child.id;
  insert into public.team_matches(id,draw_id,stage_id,group_id,match_no,round_no,placement_from,placement_to,subteam_a,subteam_b) values(new_id,child.draw_id,child.stage_id,child.group_id,child.match_no,child.round_no,child.placement_from,child.placement_to,child.subteam_a,child.subteam_b);
 end loop;
 for edge in select s.* from public.match_sources s where s.match_id in(select key::uuid from jsonb_each(mapping)) order by match_id,side loop
  new_id:=(mapping->>edge.match_id::text)::uuid;
  insert into public.match_sources(match_id,side,source_group_id,source_place,source_match_id,outcome,source_snapshot_id,source_result_id) values(new_id,edge.side,edge.source_group_id,edge.source_place,coalesce((mapping->>edge.source_match_id::text)::uuid,edge.source_match_id),edge.outcome,edge.source_snapshot_id,case when mapping ? edge.source_match_id::text then null else edge.source_result_id end);
  if mapping ? edge.source_match_id::text or edge.source_match_id=m.id or (m.placement_from is null and edge.source_group_id=m.group_id) then update public.team_matches set subteam_a=case when edge.side='a' then null else subteam_a end,subteam_b=case when edge.side='b' then null else subteam_b end where id=new_id;end if;
 end loop;
 -- Any current consumer of a superseded parent now waits for the new attempt.
 update public.match_sources s set source_match_id=(mapping->>s.source_match_id::text)::uuid,source_result_id=null where mapping ? s.source_match_id::text and exists(select 1 from public.team_matches current where current.id=s.match_id and current.superseded_by is null) and not exists(select 1 from public.correction_attempts a where a.request_id=apply_result_correction.request_id and a.new_match_id=s.match_id);
 -- Interrupted actual play still starts the physical rest clock.
 insert into public.player_end_events(game_id,player_id,ended_at,created_by)
 select game.id,players.id,clock_timestamp(),auth.uid() from public.singles_games game cross join lateral unnest(array[game.player_a,game.player_b]) players(id) where game.status='in_progress' and (game.match_id in(select key::uuid from jsonb_each(mapping)) or game.id in(select (v->>'id')::uuid from jsonb_array_elements(plan->'trailing_games') v)) on conflict(game_id,player_id) do nothing;
 insert into public.player_rest_heads(player_id,last_ended_at) select e.player_id,max(e.ended_at) from public.player_end_events e join public.singles_games game on game.id=e.game_id where game.match_id in(select key::uuid from jsonb_each(mapping)) or game.id in(select (v->>'id')::uuid from jsonb_array_elements(plan->'trailing_games') v) group by e.player_id on conflict(player_id) do update set last_ended_at=greatest(public.player_rest_heads.last_ended_at,excluded.last_ended_at);
 update public.singles_games set status='cancelled',ended_at=clock_timestamp(),score_version=score_version+1,timeout_until=null,timeout_side=null where status='in_progress' and match_id in(select key::uuid from jsonb_each(mapping));
 delete from public.live_players where match_id=m.id or match_id in(select key::uuid from jsonb_each(mapping));
 delete from public.live_subteams where match_id=m.id or match_id in(select key::uuid from jsonb_each(mapping));
 delete from public.match_table_leases where match_id=m.id or match_id in(select key::uuid from jsonb_each(mapping));
 delete from public.tour_placements where source_result_id in(select id from public.team_match_results where match_id=m.id or match_id in(select key::uuid from jsonb_each(mapping)));
 -- An amendment inherits its original completion position, K and physical end.
 update public.singles_games set score_state=req.proposed_state,score_version=score_version+1,timeout_until=null,timeout_side=null where id=g.id;
 summary:=private.score_summary(req.proposed_state);
 insert into public.singles_results(game_id,revision,previous_result_id,completion_order,kind,winner,player_a,player_b,player_a_name,player_b_name,actual_sets,sets_a,sets_b,points_a,points_b,settings_id,k_factor,ended_at,created_by)
 values(g.id,g.result_revision+1,g.result_id,g.completion_order,req.proposed_kind,req.proposed_winner,g.player_a,g.player_b,original.player_a_name,original.player_b_name,req.proposed_state->'sets',case when req.proposed_kind='played' then (summary->>'sets_a')::integer when req.proposed_winner='a' then 3 else 0 end,case when req.proposed_kind='played' then (summary->>'sets_b')::integer when req.proposed_winner='b' then 3 else 0 end,case when req.proposed_kind='played' then (select sum((v->>'a')::bigint) from jsonb_array_elements(req.proposed_state->'sets') v) when req.proposed_winner='a' then 33 else 0 end,case when req.proposed_kind='played' then (select sum((v->>'b')::bigint) from jsonb_array_elements(req.proposed_state->'sets') v) when req.proposed_winner='b' then 33 else 0 end,original.settings_id,original.k_factor,original.ended_at,auth.uid()) returning id into result;
 update public.singles_games set result_id=result,result_revision=result_revision+1 where id=g.id;
 perform private.project_game_sets(g.id);
 update public.singles_games set status='cancelled',score_version=score_version+1,timeout_until=null,timeout_side=null where match_id=m.id and (id in(select (v->>'id')::uuid from jsonb_array_elements(plan->'trailing_games') v) or ((plan->>'team_complete')::boolean and status='pending'));
 update public.singles_games set status='pending',score_version=score_version+1 where id in(select (v->>'id')::uuid from jsonb_array_elements(plan->'reactivate_games') v);
 update public.singles_games set status='finished',score_version=score_version+1 where id in(select (v->>'id')::uuid from jsonb_array_elements(plan->'restore_games') v);
 if (plan->>'team_complete')::boolean then
  insert into public.team_match_results(match_id,revision,previous_result_id,winner,kind,games_a,games_b,sets_a,sets_b,points_a,points_b,created_by) values(m.id,m.result_revision+1,m.result_id,(plan->>'team_winner')::uuid,'played',(plan->>'games_a')::integer,(plan->>'games_b')::integer,(plan->>'sets_a')::integer,(plan->>'sets_b')::integer,(plan->>'points_a')::bigint,(plan->>'points_b')::bigint,auth.uid()) returning id into team_result;
  update public.team_matches set status='finished',result_id=team_result,result_revision=result_revision+1,version=version+1,lineup_version=lineup_version+1 where id=m.id;
  perform private.advance_team_result(m.id);
 else
  update public.team_matches set status='scheduled',completed_at=null,start_blocked=null,version=version+1,lineup_version=lineup_version+1 where id=m.id;
  if m.placement_from is null then perform private.rebuild_group_standings(m.group_id);else
   for edge in select s.* from public.match_sources s join public.team_matches current on current.id=s.match_id where s.source_match_id=m.id and current.superseded_by is null loop perform private.set_match_source(edge.match_id,edge.side,null,null,null);end loop;
  end if;
 end if;
 replayed:=private.replay_effective_ratings();
 update public.result_correction_states set status='applied',version=version+1,updated_by=auth.uid(),updated_at=clock_timestamp() where public.result_correction_states.request_id=apply_result_correction.request_id;
 role_name:=case when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'main_judge'::public.staff_role end;
 result_snapshot:=jsonb_build_object('request_id',request_id,'status','applied','result_id',result,'match_id',m.id,'replacements',mapping,'replay',replayed);
 insert into public.result_correction_events(id,request_id,kind,actor_id,actor_role,payload,before_state,after_state) values(command_id,request_id,'applied',auth.uid(),role_name,payload,plan,result_snapshot);
 perform private.league_audit('correction.applied',request_id,'result_correction',plan,result_snapshot||jsonb_build_object('reason',btrim(reason)));
 return result_snapshot;
end;$$;
revoke all on function public.apply_result_correction(uuid,uuid,text,boolean,text) from public,anon;
grant execute on function public.apply_result_correction(uuid,uuid,text,boolean,text) to authenticated;

create or replace function private.rebuild_group_standings(group_uuid uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare g public.stage_groups; members text[]; results jsonb; ranked jsonb; subset jsonb; receipt public.group_tie_draws; lots jsonb:='{}'; used jsonb:='[]'; sources jsonb; fingerprint text; done boolean; head public.group_standing_snapshots; snapshot uuid; edge public.match_sources;
begin
 select * into g from public.stage_groups where id=group_uuid;
 if not found or not exists(select 1 from public.stages where id=g.stage_id and kind='round_robin') or not exists(select 1 from public.draw_revisions where id=g.draw_id and published_at is not null) then raise exception 'Published round-robin group required' using errcode='22023';end if;
 perform private.draw_command_lock(g.draw_id);
 select array_agg(subteam_id::text order by subteam_id::text) into members from public.draw_entries where group_id=g.id;
 select coalesce(jsonb_agg(jsonb_build_object('a',m.subteam_a,'b',m.subteam_b,'winner',r.winner,'gamesA',r.games_a,'gamesB',r.games_b,'setsA',r.sets_a,'setsB',r.sets_b,'pointsA',r.points_a,'pointsB',r.points_b) order by m.id),'[]') into results from public.team_matches m join public.team_match_results r on r.id=m.result_id where m.group_id=g.id and m.superseded_by is null and m.status='finished';
 select count(*)=cardinality(members)*(cardinality(members)-1)/2 and bool_and(status='finished' and result_id is not null),jsonb_agg(jsonb_build_object('match',id,'status',status,'result',result_id) order by id) into done,sources from public.team_matches where group_id=g.id and superseded_by is null;
 ranked:=private.rank_group(members,results);
 if done then
  for subset in select value from jsonb_array_elements(ranked->'unresolved') loop
   select * into receipt from public.group_tie_draws td where td.group_id=g.id and td.members=subset;
   if found then lots:=lots||receipt.lots;used:=used||jsonb_build_array(receipt.id);end if;
  end loop;
  ranked:=private.rank_group(members,results,lots);
 end if;
 fingerprint:=md5(jsonb_build_object('sources',sources,'lots',used)::text);
 select s.* into head from public.group_standing_heads h join public.group_standing_snapshots s on s.id=h.snapshot_id where h.group_id=g.id;
 if found and head.source_digest=fingerprint then return head.id;end if;
 insert into public.group_standing_snapshots(group_id,revision,source_digest,complete,data,created_by) values(g.id,coalesce(head.revision,0)+1,fingerprint,coalesce(done,false),ranked||jsonb_build_object('sources',sources,'tie_draws',used),auth.uid()) returning id into snapshot;
 insert into public.group_standing_heads(group_id,snapshot_id) values(g.id,snapshot) on conflict(group_id) do update set snapshot_id=excluded.snapshot_id;
 for edge in select e.* from public.match_sources e join public.team_matches current on current.id=e.match_id where current.superseded_by is null and e.source_group_id=g.id order by match_id,side loop
  perform private.set_match_source(edge.match_id,edge.side,case when done and jsonb_array_length(ranked->'unresolved')=0 then (ranked->'order'->>(edge.source_place-1))::uuid else null end,snapshot,null);
 end loop;
 perform private.league_audit('standings.refreshed',g.id,'stage_group',case when head.id is null then null else jsonb_build_object('snapshot',head.id) end,jsonb_build_object('snapshot',snapshot,'complete',done,'unresolved',ranked->'unresolved'));
 return snapshot;
end;$$;

create or replace function private.advance_team_result(match uuid)
returns void language plpgsql security definer set search_path='' as $$
declare m public.team_matches; r public.team_match_results; edge public.match_sources; loser uuid; offset_places integer;
begin
 select * into m from public.team_matches where id=match;
 perform private.draw_command_lock(m.draw_id);
 if m.status<>'finished' or m.result_id is null then raise exception 'Completed current result required' using errcode='22023';end if;
 select * into r from public.team_match_results where id=m.result_id;
 if r.match_id<>m.id or r.revision<>m.result_revision then raise exception 'Consistent result pointer required' using errcode='22023';end if;
 if m.placement_from is null then perform private.rebuild_group_standings(m.group_id);return;end if;
 loser:=case when r.winner=m.subteam_a then m.subteam_b else m.subteam_a end;
 for edge in select e.* from public.match_sources e join public.team_matches current on current.id=e.match_id where current.superseded_by is null and e.source_match_id=m.id order by match_id,side loop
  perform private.set_match_source(edge.match_id,edge.side,case edge.outcome when 'winner' then r.winner else loser end,null,r.id);
 end loop;
 if m.placement_to=m.placement_from+1 then
  select coalesce(sum((s.configuration->>'size')::integer),0)::integer into offset_places from public.stages s join public.stages current on current.id=m.stage_id where s.plan_id=current.plan_id and s.kind='knockout' and s.ordinal<current.ordinal;
  -- Current projection only; immutable result revisions retain placement history.
  delete from public.tour_placements where draw_id=m.draw_id and source_result_id in(select id from public.team_match_results where match_id=m.id);
  insert into public.tour_placements(draw_id,subteam_id,place,source_result_id) values(m.draw_id,r.winner,offset_places+m.placement_from,r.id),(m.draw_id,loser,offset_places+m.placement_to,r.id);
 end if;
end;$$;
create function public.resume_corrected_match(command_id uuid,match uuid,expected_version integer,reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.team_matches;cfg public.tournament_settings;lease public.match_table_leases;owner public.table_day_heads;assignment public.table_judge_assignments;t public.tours;old public.match_commands;payload jsonb;before_value jsonb;after_value jsonb;
begin
 perform private.require_match_manager();perform pg_advisory_xact_lock(170005);perform private.scoring_replay_barrier();
 perform private.draw_command_lock((select draw_id from public.team_matches where id=match));
 select * into m from public.team_matches where id=match for update;
 payload:=jsonb_build_object('operation','resume','version',expected_version,'reason',btrim(reason));
 select * into old from public.match_commands where id=command_id;
 if found then
  if old.match_id<>match or old.actor_id<>auth.uid() or old.request<>payload then raise exception 'Match command ID conflict' using errcode='22023';end if;
  return private.match_operation_snapshot(match);
 end if;
 if command_id is null or reason is null or length(btrim(reason)) not between 1 and 500 then raise exception 'Resume reason required' using errcode='22023';end if;
 if m.version is distinct from expected_version then raise exception 'Match version conflict' using errcode='40001';end if;
 if m.status not in('scheduled','called') or m.superseded_by is not null or m.started_at is null or not exists(select 1 from public.result_correction_requests r join public.result_correction_states s on s.request_id=r.id join public.singles_games g on g.id=r.game_id where g.match_id=match and s.status='applied') or not private.match_dependencies_ready(match) then raise exception 'Corrected unfinished match required' using errcode='55000';end if;
 select tour.* into t from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id join public.tours tour on tour.id=p.tour_id where d.id=m.draw_id and d.published_at is not null;
 select * into cfg from public.tournament_settings where tour_id=t.id order by revision desc limit 1;
 select * into lease from public.match_table_leases where match_id=match;
 if lease.match_id is null or lease.venue_day<>(clock_timestamp() at time zone cfg.venue_timezone)::date or lease.venue_day not between t.starts_on and t.ends_on then raise exception 'Current-day table required' using errcode='55000';end if;
 select * into owner from public.table_day_heads where venue_day=lease.venue_day and table_number=lease.table_number for share;
 select * into assignment from public.table_judge_assignments where id=owner.assignment_id;
 if owner.staff_id is null or not exists(select 1 from public.staff_accounts a join public.staff_roles r on r.user_id=a.id where a.id=owner.staff_id and a.active and ((assignment.mode='line_judge' and r.role='line_judge') or (assignment.mode='takeover' and r.role in('organizer','main_judge')))) then raise exception 'Active table scoring owner required' using errcode='55000';end if;
 if not exists(select 1 from public.singles_games where match_id=match and status in('pending','in_progress')) then raise exception 'Pending continuation required' using errcode='55000';end if;
 perform p.id from public.players p where p.id in(select player_a from public.singles_games where match_id=match and status in('pending','in_progress') union select player_b from public.singles_games where match_id=match and status in('pending','in_progress')) order by p.id for update;
 if exists(select 1 from public.singles_games g where g.match_id=match and g.status='pending' and (not private.eligible_lineup_player(g.player_a,m.subteam_a,t.season_id,g.slot) or not private.eligible_lineup_player(g.player_b,m.subteam_b,t.season_id,g.slot))) then raise exception 'Eligible continuation players required' using errcode='55000';end if;
 perform private.assert_match_resources(match,false,cfg.rest_minutes);
 if exists(select 1 from public.player_rest_heads r where r.player_id in(select player_a from public.singles_games where match_id=match and status in('pending','in_progress') union select player_b from public.singles_games where match_id=match and status='pending') and r.last_ended_at+make_interval(mins=>cfg.rest_minutes)>clock_timestamp()) then raise exception 'Player rest incomplete' using errcode='55000';end if;
 before_value:=private.match_operation_snapshot(match);
 insert into public.live_subteams(subteam_id,match_id) values(m.subteam_a,match),(m.subteam_b,match);
 insert into public.live_players(player_id,match_id) select player_a,match from public.singles_games where match_id=match and status in('pending','in_progress') union select player_b,match from public.singles_games where match_id=match and status='pending';
 update public.team_matches set status='in_progress',version=version+1 where id=match;
 after_value:=private.match_operation_snapshot(match);
 insert into public.match_commands(id,match_id,actor_id,kind,request,before_state,after_state) values(command_id,match,auth.uid(),'start',payload,before_value,after_value);
 perform private.league_audit('match.resumed',match,'team_match',before_value,after_value||jsonb_build_object('reason',btrim(reason)));
 return after_value;
end;$$;
revoke all on function public.resume_corrected_match(uuid,uuid,integer,text) from public,anon;
grant execute on function public.resume_corrected_match(uuid,uuid,integer,text) to authenticated;
create or replace function private.correction_preview(target uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare req public.result_correction_requests;g public.singles_games;m public.team_matches;game public.singles_games;result public.singles_results;summary jsonb;winner text;wins_a integer:=0;wins_b integer:=0;sets_a integer:=0;sets_b integer:=0;points_a bigint:=0;points_b bigint:=0;team_winner uuid;complete boolean:=false;trailing_data jsonb:='[]';reactivate jsonb:='[]';restore jsonb:='[]';members text[];results jsonb;ranked jsonb;subset jsonb;receipt public.group_tie_draws;lots jsonb:='{}';group_complete boolean;edge public.match_sources;expected uuid;current_side uuid;direct uuid[]:='{}';affected jsonb;needs_organizer boolean;plan jsonb;
begin
 select * into req from public.result_correction_requests where id=target;
 select * into g from public.singles_games where id=req.game_id;
 select * into m from public.team_matches where id=g.match_id;
 if req.id is null then raise exception 'Correction required' using errcode='22023';end if;
 if g.result_id is distinct from req.base_result_id or g.status<>'finished' or m.status='cancelled' or m.superseded_by is not null then return jsonb_build_object('stale',true,'game_id',g.id,'match_id',m.id);end if;
 for game in select * from public.singles_games where match_id=m.id order by slot loop
  if complete then
   if game.status in('in_progress','finished') then trailing_data:=trailing_data||jsonb_build_array(jsonb_build_object('id',game.id,'slot',game.slot,'status',game.status,'version',game.score_version,'started',game.started_at is not null));end if;
   continue;
  end if;
  if game.id=g.id then
   winner:=req.proposed_winner;
   if req.proposed_kind='played' then
    summary:=private.score_summary(req.proposed_state);sets_a:=sets_a+(summary->>'sets_a')::integer;sets_b:=sets_b+(summary->>'sets_b')::integer;
    select points_a+sum((v->>'a')::bigint),points_b+sum((v->>'b')::bigint) into points_a,points_b from jsonb_array_elements(req.proposed_state->'sets') v;
   else sets_a:=sets_a+case winner when 'a' then 3 else 0 end;sets_b:=sets_b+case winner when 'b' then 3 else 0 end;points_a:=points_a+case winner when 'a' then 33 else 0 end;points_b:=points_b+case winner when 'b' then 33 else 0 end;
   end if;
  elsif game.status='finished' or (game.status='cancelled' and game.result_id is not null) then
   if game.status='cancelled' then restore:=restore||jsonb_build_array(jsonb_build_object('id',game.id,'slot',game.slot,'version',game.score_version));end if;
   select * into result from public.singles_results where id=game.result_id;
   winner:=result.winner;sets_a:=sets_a+result.sets_a;sets_b:=sets_b+result.sets_b;points_a:=points_a+result.points_a;points_b:=points_b+result.points_b;
  else
   if game.status='cancelled' and game.started_at is null then reactivate:=reactivate||jsonb_build_array(jsonb_build_object('id',game.id,'slot',game.slot,'version',game.score_version));end if;
   continue;
  end if;
  if winner='a' then wins_a:=wins_a+1;else wins_b:=wins_b+1;end if;
  if wins_a=3 or wins_b=3 then complete:=true;team_winner:=case when wins_a=3 then m.subteam_a else m.subteam_b end;end if;
 end loop;
 if m.placement_from is null then
  select array_agg(subteam_id::text order by subteam_id::text) into members from public.draw_entries where group_id=m.group_id;
  select coalesce(jsonb_agg(jsonb_build_object('a',tm.subteam_a,'b',tm.subteam_b,'winner',r.winner,'gamesA',r.games_a,'gamesB',r.games_b,'setsA',r.sets_a,'setsB',r.sets_b,'pointsA',r.points_a,'pointsB',r.points_b) order by tm.id),'[]'::jsonb) into results from public.team_matches tm join public.team_match_results r on r.id=tm.result_id where tm.group_id=m.group_id and tm.superseded_by is null and tm.id<>m.id and tm.status='finished';
  if complete then results:=results||jsonb_build_array(jsonb_build_object('a',m.subteam_a,'b',m.subteam_b,'winner',team_winner,'gamesA',wins_a,'gamesB',wins_b,'setsA',sets_a,'setsB',sets_b,'pointsA',points_a,'pointsB',points_b));end if;
  select count(*)=cardinality(members)*(cardinality(members)-1)/2 and bool_and(case when id=m.id then complete else status='finished' and result_id is not null end) into group_complete from public.team_matches where group_id=m.group_id and superseded_by is null;
  ranked:=private.rank_group(members,results);
  if group_complete then
   for subset in select value from jsonb_array_elements(ranked->'unresolved') loop
    select * into receipt from public.group_tie_draws where group_id=m.group_id and public.group_tie_draws.members=subset;
    if found then lots:=lots||receipt.lots;end if;
   end loop;
   ranked:=private.rank_group(members,results,lots);
  end if;
 end if;
 for edge in select e.* from public.match_sources e join public.team_matches current on current.id=e.match_id where current.superseded_by is null and (source_match_id=m.id or (m.placement_from is null and source_group_id=m.group_id)) order by match_id,side loop
  if edge.source_match_id=m.id then expected:=case when not complete then null when edge.outcome='winner' then team_winner when team_winner=m.subteam_a then m.subteam_b else m.subteam_a end;
  else expected:=case when group_complete and jsonb_array_length(ranked->'unresolved')=0 then (ranked->'order'->>(edge.source_place-1))::uuid else null end;
  end if;
  select case when edge.side='a' then subteam_a else subteam_b end into current_side from public.team_matches where id=edge.match_id;
  if current_side is distinct from expected then direct:=array_append(direct,edge.match_id);end if;
 end loop;
 with recursive impacted(id) as(select unnest(direct) union select e.match_id from public.match_sources e join impacted i on e.source_match_id=i.id)
 select coalesce(jsonb_agg(jsonb_build_object('id',tm.id,'status',tm.status,'version',tm.version,'lineup_version',tm.lineup_version,'has_lineup',exists(select 1 from public.lineups where match_id=tm.id),'started',tm.started_at is not null) order by tm.id),'[]'::jsonb) into affected from public.team_matches tm join impacted i on i.id=tm.id;
 needs_organizer:=exists(select 1 from jsonb_array_elements(affected||trailing_data) v where (v->>'started')::boolean or v->>'status' in('in_progress','finished'));
 plan:=jsonb_build_object('stale',false,'game_id',g.id,'game_version',g.score_version,'base_result_id',g.result_id,'match_id',m.id,'match_version',m.version,'team_complete',complete,'team_winner',team_winner,'games_a',wins_a,'games_b',wins_b,'sets_a',sets_a,'sets_b',sets_b,'points_a',points_a,'points_b',points_b,'trailing_games',trailing_data,'restore_games',restore,'reactivate_games',case when complete then '[]'::jsonb else reactivate end,'direct_dependencies',to_jsonb(direct),'affected_matches',affected,'requires_organizer',needs_organizer,'group',case when m.placement_from is null then jsonb_build_object('complete',group_complete,'order',ranked->'order','unresolved',ranked->'unresolved','current_snapshot',(select snapshot_id from public.group_standing_heads where group_id=m.group_id)) else null end);
 return plan||jsonb_build_object('digest',md5(plan::text));
end;$$;
commit;
