begin;
-- Extend the existing immutable review/audit workflow to team-level forfeits.
alter table public.result_correction_requests add column match_id uuid references public.team_matches(id) on delete restrict;
alter table public.result_correction_requests add column base_team_result_id uuid references public.team_match_results(id) on delete restrict;
alter table public.result_correction_requests alter column game_id drop not null;
alter table public.result_correction_requests alter column base_result_id drop not null;
alter table public.result_correction_requests alter column proposed_winner drop not null;
alter table public.result_correction_requests drop constraint result_correction_requests_proposed_kind_check;
alter table public.result_correction_requests add constraint correction_target_kind check(
 (game_id is not null and base_result_id is not null and match_id is null and base_team_result_id is null and proposed_kind in('played','withdrawal') and proposed_winner is not null)
 or (game_id is null and base_result_id is null and match_id is not null and base_team_result_id is not null and ((proposed_kind='team_forfeit' and proposed_winner is not null) or (proposed_kind='reopen' and proposed_winner is null)))
);
create index team_correction_lookup on public.result_correction_requests(match_id);
create or replace function public.score_command(command_id uuid,game uuid,kind text,side text,expected_version integer,note text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.singles_games;m public.team_matches;lease public.match_table_leases;head public.table_day_heads;assignment public.table_judge_assignments;old public.score_events;tour uuid;cfg public.tournament_settings;payload jsonb;before_value jsonb;after_value jsonb;state jsonb;summary jsonb;point public.active_score_points;command_now timestamptz;actual_kind text;actual_role public.staff_role;set_no integer;result uuid;a_ready boolean;b_ready boolean;winner_side text;scoring_day date;
begin
 if not private.has_staff_role() then raise exception 'Scoring access required' using errcode='42501';end if;
 -- Starts validate the roster; roster edits use the same low-frequency lock.
 -- Ordinary points/undo/timeouts never take the league administration locks.
 if kind='start' then perform pg_advisory_xact_lock(170005);end if;
 perform private.scoring_replay_barrier();
 select * into g from public.singles_games where id=game;
 select * into m from public.team_matches where id=g.match_id;
 perform private.draw_command_lock(m.draw_id);
 select * into m from public.team_matches where id=g.match_id for update;
 select * into g from public.singles_games where id=game for update;
 select p.tour_id into tour from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id where d.id=m.draw_id and d.published_at is not null;
 if g.id is null or tour is null or m.lineups_revealed_at is null then raise exception 'Scoring access required' using errcode='42501';end if;
 payload:=jsonb_build_object('kind',kind,'side',side,'version',expected_version,'note',btrim(note));
 select * into old from public.score_events where id=command_id;
 if found then
  if old.game_id<>game or old.actor_id<>auth.uid() or old.request<>payload then raise exception 'Score command ID conflict' using errcode='22023';end if;
  if old.authority<>'table' or not private.owns_scoring_table(old.table_number,tour) then raise exception 'Scoring access required' using errcode='42501';end if;
  return private.game_score_snapshot(game);
 end if;
 select * into lease from public.match_table_leases where match_id=m.id;
 if lease.match_id is null or not private.owns_scoring_table(lease.table_number,tour) then raise exception 'Scoring access required' using errcode='42501';end if;
 select * into cfg from public.tournament_settings where tour_id=tour order by revision desc limit 1;
 scoring_day:=(clock_timestamp() at time zone cfg.venue_timezone)::date;
 select * into head from public.table_day_heads where venue_day=scoring_day and table_number=lease.table_number for share;
 select * into assignment from public.table_judge_assignments where id=head.assignment_id;
 -- Recheck after waiting for ownership; a takeover must disable the old tablet.
 if head.staff_id is distinct from auth.uid() or not private.owns_scoring_table(lease.table_number,tour) then raise exception 'Scoring access required' using errcode='42501';end if;
 if command_id is null or coalesce(kind,'') not in('start','point','undo_point','undo_set','timeout','resume_timeout','withdrawal') or note is null or length(note)>500 or (kind in('start','point','timeout') and coalesce(side,'') not in('a','b')) or (kind in('undo_point','undo_set','resume_timeout') and side is not null) or (kind='withdrawal' and side is not null and side not in('a','b')) then raise exception 'Invalid score command' using errcode='22023';end if;
 if kind='withdrawal' and side is not null and length(btrim(note))=0 then raise exception 'Retirement reason required' using errcode='22023';end if;
 if expected_version is distinct from g.score_version then raise exception 'Score version conflict' using errcode='40001';end if;
 if m.status<>'in_progress' or not private.match_dependencies_ready(m.id) then raise exception 'Live source-ready match required' using errcode='55000';end if;
 command_now:=clock_timestamp();
 if scoring_day<>(command_now at time zone cfg.venue_timezone)::date then raise exception 'Venue day changed; refresh scoring ownership' using errcode='55000';end if;
 actual_kind:=kind;
 actual_role:=case when assignment.mode='line_judge' then 'line_judge'::public.staff_role when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'main_judge'::public.staff_role end;
 before_value:=private.raw_game_state(game);
 if kind='start' then
  if g.status<>'pending' or g.player_a=g.player_b or exists(select 1 from public.singles_games where match_id=m.id and status='in_progress') or g.slot<>(select min(slot) from public.singles_games where match_id=m.id and status='pending') then raise exception 'Next pending singles required' using errcode='55000';end if;
  select * into cfg from public.tournament_settings where tour_id=tour order by revision desc limit 1;
  state:=jsonb_build_object('initial_server',side,'sets',jsonb_build_array(jsonb_build_object('a',0,'b',0)),'timeouts',jsonb_build_object('a',false,'b',false));
  select private.eligible_lineup_player(g.player_a,m.subteam_a,t.season_id,g.slot),private.eligible_lineup_player(g.player_b,m.subteam_b,t.season_id,g.slot) into a_ready,b_ready from public.tours t where t.id=tour;
  if not a_ready and not b_ready then raise exception 'Both singles players unavailable; Main Judge required' using errcode='55000';end if;
  if a_ready and b_ready then
   if (select count(*) from public.live_players where match_id=m.id and player_id in(g.player_a,g.player_b))<>2 then raise exception 'Selected player leases required' using errcode='55000';end if;
   if exists(select 1 from public.player_rest_heads where player_id in(g.player_a,g.player_b) and last_ended_at+make_interval(mins=>cfg.rest_minutes)>command_now) then raise exception 'Player rest incomplete' using errcode='55000';end if;
   update public.singles_games set status='in_progress',score_state=state,score_version=score_version+1,started_at=command_now,player_a_name=(select s.player_name from public.lineups l join public.lineup_slots s on s.lineup_id=l.id where l.match_id=m.id and l.subteam_id=m.subteam_a and s.slot=g.slot),player_b_name=(select s.player_name from public.lineups l join public.lineup_slots s on s.lineup_id=l.id where l.match_id=m.id and l.subteam_id=m.subteam_b and s.slot=g.slot) where id=game;
   update public.team_matches set lineup_version=lineup_version+1 where id=m.id;
  else
   update public.singles_games set score_state=state,score_version=score_version+1 where id=game;
   actual_kind:='withdrawal';winner_side:=case when a_ready then 'a' else 'b' end;
   result:=private.finish_singles(game,'withdrawal',winner_side,command_now);
  end if;
 else
  if g.status<>'in_progress' then raise exception 'Active singles required; completed results need official correction' using errcode='55000';end if;
  select a.status='active',b.status='active' into a_ready,b_ready from public.players a cross join public.players b where a.id=g.player_a and b.id=g.player_b;
  if not a_ready and not b_ready then raise exception 'Both singles players unavailable; Main Judge required' using errcode='55000';end if;
  if kind='withdrawal' and side is not null then
   if (side='a' and not b_ready) or (side='b' and not a_ready) then raise exception 'Both singles players unavailable; Main Judge required' using errcode='55000';end if;
   winner_side:=case when side='a' then 'b' else 'a' end;
   update public.singles_games set score_version=score_version+1 where id=game;
   result:=private.finish_singles(game,'withdrawal',winner_side,command_now);
  elsif not a_ready or not b_ready then
   actual_kind:='withdrawal';winner_side:=case when a_ready then 'a' else 'b' end;
   update public.singles_games set score_version=score_version+1 where id=game;
   result:=private.finish_singles(game,'withdrawal',winner_side,command_now);
  else
   if kind='withdrawal' then raise exception 'Withdrawn player required' using errcode='22023';end if;
  if g.timeout_until>command_now and kind<>'resume_timeout' then raise exception 'Timeout still active' using errcode='55000';end if;
  state:=g.score_state;
  if kind='resume_timeout' then
   if g.timeout_until is null then raise exception 'No active timeout' using errcode='22023';end if;
   update public.singles_games set timeout_until=null,timeout_side=null where id=game;
  elsif kind='undo_point' then
   select * into point from public.active_score_points where game_id=game order by event_version desc limit 1;
   if not found then raise exception 'No active point to undo' using errcode='22023';end if;
   state:=private.score_transition(state,jsonb_build_object('kind','undo_point','side',point.side));
   delete from public.active_score_points where event_id=point.event_id;
  elsif kind='undo_set' then
   summary:=private.score_summary(state);set_no:=(summary->>'set_number')::integer;
   if (summary->>'points_a')::bigint+(summary->>'points_b')::bigint=0 then set_no:=set_no-1;end if;
   state:=private.score_transition(state,'{"kind":"undo_set"}');
   delete from public.active_score_points where game_id=game and set_number=set_no;
  else
   state:=private.score_transition(state,jsonb_build_object('kind',kind,'side',side));
   if kind='point' then
    summary:=private.score_summary(g.score_state);
    insert into public.active_score_points(event_id,game_id,event_version,set_number,side) values(command_id,game,g.score_version+1,(summary->>'set_number')::integer,side);
   elsif kind='timeout' then update public.singles_games set timeout_until=command_now+interval '60 seconds',timeout_side=side where id=game;
   end if;
  end if;
  update public.singles_games set score_state=state,score_version=score_version+1,timeout_until=case when timeout_until<=command_now then null else timeout_until end,timeout_side=case when timeout_until<=command_now then null else timeout_side end where id=game;
  summary:=private.score_summary(state);
  if summary->>'winner' is not null then result:=private.finish_singles(game,'played',summary->>'winner',command_now);end if;
  end if;
 end if;
 perform private.project_game_sets(game);
 update public.team_matches set version=version+1 where id=m.id;
 after_value:=private.raw_game_state(game);
 insert into public.score_events(id,game_id,actor_id,actor_role,kind,request,version_before,version_after,before_state,after_state,table_number,venue_day,assignment_id,authority,undo_target_id,undo_set_number,created_at) values(command_id,game,auth.uid(),actual_role,actual_kind,payload,g.score_version,g.score_version+1,before_value,after_value,lease.table_number,scoring_day,head.assignment_id,'table',point.event_id,set_no,command_now);
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state) values(auth.uid(),actual_role,'score.'||actual_kind,game,'singles_game',before_value,after_value||jsonb_build_object('command_id',command_id,'undo_target',point.event_id,'undo_set',set_no,'result_id',result));
 return private.game_score_snapshot(game);
end;$$;
revoke all on function public.score_command(uuid,uuid,text,text,integer,text) from public,anon;
grant execute on function public.score_command(uuid,uuid,text,text,integer,text) to authenticated;

create function private.singles_correction_preview(target uuid)
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
 with recursive impacted(id) as(select unnest(direct) union select e.match_id from public.match_sources e join impacted i on e.source_match_id=i.id join public.team_matches current on current.id=e.match_id and current.superseded_by is null)
 select coalesce(jsonb_agg(jsonb_build_object('id',tm.id,'status',tm.status,'version',tm.version,'lineup_version',tm.lineup_version,'has_lineup',exists(select 1 from public.lineups where match_id=tm.id),'started',tm.started_at is not null) order by tm.id),'[]'::jsonb) into affected from public.team_matches tm join impacted i on i.id=tm.id;
 needs_organizer:=exists(select 1 from jsonb_array_elements(affected||trailing_data) v where (v->>'started')::boolean or v->>'status' in('in_progress','finished'));
 plan:=jsonb_build_object('stale',false,'game_id',g.id,'game_version',g.score_version,'base_result_id',g.result_id,'match_id',m.id,'match_version',m.version,'team_complete',complete,'team_winner',team_winner,'games_a',wins_a,'games_b',wins_b,'sets_a',sets_a,'sets_b',sets_b,'points_a',points_a,'points_b',points_b,'trailing_games',trailing_data,'restore_games',restore,'reactivate_games',case when complete then '[]'::jsonb else reactivate end,'direct_dependencies',to_jsonb(direct),'affected_matches',affected,'requires_organizer',needs_organizer,'group',case when m.placement_from is null then jsonb_build_object('complete',group_complete,'order',ranked->'order','unresolved',ranked->'unresolved','current_snapshot',(select snapshot_id from public.group_standing_heads where group_id=m.group_id)) else null end);
 return plan||jsonb_build_object('digest',md5(plan::text));
end;$$;

revoke all on function private.singles_correction_preview(uuid) from public,anon,authenticated;
create function private.supersede_correction_attempts(request_id uuid,targets uuid[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.team_matches;req public.result_correction_requests;child public.team_matches;new_id uuid;mapping jsonb:='{}';edge public.match_sources;
begin
 select * into req from public.result_correction_requests where id=request_id;
 select * into m from public.team_matches where id=coalesce(req.match_id,(select match_id from public.singles_games where id=req.game_id));
 -- Allocate fresh graph IDs first, preserving every old attempt and its sources.
 for new_id in select distinct unnest(targets) loop
  mapping:=mapping||jsonb_build_object(new_id::text,gen_random_uuid());
 end loop;
 for child in select * from public.team_matches where id in(select key::uuid from jsonb_each(mapping)) order by id for update loop
  new_id:=(mapping->>child.id::text)::uuid;
  insert into public.correction_attempts(request_id,old_match_id,new_match_id,original) values(request_id,child.id,new_id,jsonb_build_object('match',to_jsonb(child),'sources',(select coalesce(jsonb_agg(to_jsonb(s)),'[]') from public.match_sources s where match_id=child.id)));
  update public.team_matches set superseded_by=new_id,status='cancelled',version=version+1 where id=child.id;
  insert into public.team_matches(id,draw_id,stage_id,group_id,match_no,round_no,placement_from,placement_to,subteam_a,subteam_b) values(new_id,child.draw_id,child.stage_id,child.group_id,child.match_no,child.round_no,child.placement_from,child.placement_to,child.subteam_a,child.subteam_b);
 end loop;
 for edge in select s.* from public.match_sources s where s.match_id in(select key::uuid from jsonb_each(mapping)) order by match_id,side loop
  new_id:=(mapping->>edge.match_id::text)::uuid;
  insert into public.match_sources(match_id,side,source_group_id,source_place,source_match_id,outcome,source_entry_id,source_snapshot_id,source_result_id) values(new_id,edge.side,edge.source_group_id,edge.source_place,coalesce((mapping->>edge.source_match_id::text)::uuid,edge.source_match_id),edge.outcome,edge.source_entry_id,edge.source_snapshot_id,case when mapping ? edge.source_match_id::text then null else edge.source_result_id end);
  if mapping ? edge.source_match_id::text or edge.source_match_id=m.id or (m.placement_from is null and edge.source_group_id=m.group_id) then update public.team_matches set subteam_a=case when edge.side='a' then null else subteam_a end,subteam_b=case when edge.side='b' then null else subteam_b end where id=new_id;end if;
 end loop;
 -- Any current consumer of a superseded parent now waits for the new attempt.
 update public.match_sources s set source_match_id=(mapping->>s.source_match_id::text)::uuid,source_result_id=null where mapping ? s.source_match_id::text and exists(select 1 from public.team_matches current where current.id=s.match_id and current.superseded_by is null) and not exists(select 1 from public.correction_attempts a where a.request_id=supersede_correction_attempts.request_id and a.new_match_id=s.match_id);
 return mapping;
end;$$;
revoke all on function private.supersede_correction_attempts(uuid,uuid[]) from public,anon,authenticated;
create function private.apply_singles_result_correction(command_id uuid,request_id uuid,expected_digest text,resolve_started boolean,reason text)
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
 select * into state from public.result_correction_states where public.result_correction_states.request_id=apply_singles_result_correction.request_id for update;
 if state.status<>'review' then raise exception 'Correction is no longer in review' using errcode='55000';end if;
 plan:=private.correction_preview(request_id);
 if coalesce((plan->>'stale')::boolean,true) or plan->>'digest' is distinct from expected_digest then raise exception 'Correction review version conflict' using errcode='40001';end if;
 if (plan->>'requires_organizer')::boolean and (not private.has_staff_role('organizer') or not resolve_started) then raise exception 'Explicit Organizer resolution required' using errcode='42501';end if;
 if m.superseded_by is not null then raise exception 'Current match attempt required' using errcode='55000';end if;
 select * into original from public.singles_results where id=req.base_result_id;
 mapping:=private.supersede_correction_attempts(request_id,array(select (v->>'id')::uuid from jsonb_array_elements(plan->'affected_matches') v));
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
 update public.result_correction_states set status='applied',version=version+1,updated_by=auth.uid(),updated_at=clock_timestamp() where public.result_correction_states.request_id=apply_singles_result_correction.request_id;
 role_name:=case when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'main_judge'::public.staff_role end;
 result_snapshot:=jsonb_build_object('request_id',request_id,'status','applied','result_id',result,'match_id',m.id,'replacements',mapping,'replay',replayed);
 insert into public.result_correction_events(id,request_id,kind,actor_id,actor_role,payload,before_state,after_state) values(command_id,request_id,'applied',auth.uid(),role_name,payload,plan,result_snapshot);
 perform private.league_audit('correction.applied',request_id,'result_correction',plan,result_snapshot||jsonb_build_object('reason',btrim(reason)));
 return result_snapshot;
end;$$;
revoke all on function private.apply_singles_result_correction(uuid,uuid,text,boolean,text) from public,anon,authenticated;
create function private.team_correction_preview(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare req public.result_correction_requests;m public.team_matches;original public.team_match_results;complete boolean;team_winner uuid;wins_a integer:=0;wins_b integer:=0;sets_a integer:=0;sets_b integer:=0;points_a bigint:=0;points_b bigint:=0;members text[];results jsonb;ranked jsonb;subset jsonb;receipt public.group_tie_draws;lots jsonb:='{}';group_complete boolean;edge public.match_sources;expected uuid;current_side uuid;direct uuid[]:='{}';affected jsonb;needs_organizer boolean;plan jsonb;
begin
 select * into req from public.result_correction_requests where id=target;
 select * into m from public.team_matches where id=req.match_id;
 if req.id is null then raise exception 'Correction required' using errcode='22023';end if;
 if m.result_id is distinct from req.base_team_result_id or m.status<>'finished' or m.superseded_by is not null then return jsonb_build_object('stale',true,'match_id',req.match_id);end if;
 complete:=req.proposed_kind='team_forfeit';
 if complete then
  team_winner:=case req.proposed_winner when 'a' then m.subteam_a else m.subteam_b end;
  if req.proposed_winner='a' then wins_a:=3;sets_a:=9;points_a:=99;else wins_b:=3;sets_b:=9;points_b:=99;end if;
 end if;
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
 with recursive impacted(id) as(select unnest(direct) union select e.match_id from public.match_sources e join impacted i on e.source_match_id=i.id join public.team_matches current on current.id=e.match_id and current.superseded_by is null)
 select coalesce(jsonb_agg(jsonb_build_object('id',tm.id,'status',tm.status,'version',tm.version,'lineup_version',tm.lineup_version,'has_lineup',exists(select 1 from public.lineups where match_id=tm.id),'started',tm.started_at is not null) order by tm.id),'[]'::jsonb) into affected from public.team_matches tm join impacted i on i.id=tm.id;
 needs_organizer:=exists(select 1 from jsonb_array_elements(affected) v where (v->>'started')::boolean or v->>'status' in('in_progress','finished'));
 plan:=jsonb_build_object('stale',false,'match_id',m.id,'match_version',m.version,'base_team_result_id',m.result_id,'team_complete',complete,'team_winner',team_winner,'games_a',wins_a,'games_b',wins_b,'sets_a',sets_a,'sets_b',sets_b,'points_a',points_a,'points_b',points_b,'affected_matches',affected,'requires_organizer',needs_organizer,'trailing_games','[]'::jsonb,'group',case when m.placement_from is null then jsonb_build_object('complete',group_complete,'order',ranked->'order','current_snapshot',(select snapshot_id from public.group_standing_heads where group_id=m.group_id)) else null end);
 return plan||jsonb_build_object('digest',md5(plan::text));
end;$$;
revoke all on function private.team_correction_preview(uuid) from public,anon,authenticated;
create or replace function private.correction_preview(target uuid) returns jsonb language sql volatile security definer set search_path='' as $$
 select case when r.match_id is null then private.singles_correction_preview(target) else private.team_correction_preview(target) end from public.result_correction_requests r where r.id=target;
$$;
alter function private.correction_snapshot(uuid) rename to singles_correction_snapshot;
revoke all on function private.singles_correction_snapshot(uuid) from public,anon,authenticated;
create function private.correction_snapshot(target uuid) returns jsonb language sql volatile security definer set search_path='' as $$
 select case when r.match_id is null then private.singles_correction_snapshot(target) else
 jsonb_build_object('id',r.id,'game_id',null,'kind',r.proposed_kind,'winner',r.proposed_winner,'score',jsonb_build_object('sets','[]'::jsonb),'reason',r.reason,'status',s.status,'current_match_id',coalesce((select (e.after_state->>'match_id')::uuid from public.result_correction_events e where e.request_id=r.id and e.kind='applied'),r.match_id),'original',jsonb_build_object('k',null,'player_a_name',(select t.name from public.subteams sub join public.teams t on t.id=sub.team_id where sub.id=m.subteam_a),'player_b_name',(select t.name from public.subteams sub join public.teams t on t.id=sub.team_id where sub.id=m.subteam_b)),'plan',private.team_correction_preview(target)) end
 from public.result_correction_requests r join public.result_correction_states s on s.request_id=r.id left join public.team_matches m on m.id=r.match_id where r.id=target;
$$;
revoke all on function private.correction_snapshot(uuid) from public,anon,authenticated;
create function public.submit_team_result_correction(request_id uuid,match uuid,base_result uuid,kind text,winner text,reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.team_matches;original public.team_match_results;old public.result_correction_requests;payload jsonb;role_name public.staff_role;
begin
 perform private.require_match_manager();perform pg_advisory_xact_lock(170005);perform private.scoring_replay_barrier();
 select * into m from public.team_matches where id=match;
 perform private.draw_command_lock(m.draw_id);
 payload:=jsonb_build_object('match',match,'base_result',base_result,'kind',kind,'winner',winner,'reason',btrim(reason));
 select * into old from public.result_correction_requests where id=request_id;
 if found then
  if old.submitted_by<>auth.uid() or old.payload<>payload then raise exception 'Correction request ID conflict' using errcode='22023';end if;
  return private.correction_snapshot(request_id);
 end if;
 select * into m from public.team_matches where id=match for update;
 select * into original from public.team_match_results where id=m.result_id;
 if m.id is null or m.superseded_by is not null or m.status<>'finished' or original.kind is distinct from 'team_forfeit' or not exists(select 1 from public.draw_revisions where id=m.draw_id and published_at is not null) then raise exception 'Current team forfeit required' using errcode='22023';end if;
 if m.result_id is distinct from base_result then raise exception 'Result version conflict' using errcode='40001';end if;
 if request_id is null or reason is null or length(btrim(reason)) not between 1 and 500 or coalesce(kind,'') not in('team_forfeit','reopen') or (kind='team_forfeit' and coalesce(winner,'') not in('a','b')) or (kind='reopen' and winner is not null) then raise exception 'Valid forfeit correction required' using errcode='22023';end if;
 if kind='team_forfeit' and original.winner=(case winner when 'a' then m.subteam_a else m.subteam_b end) then raise exception 'Changed result required' using errcode='22023';end if;
 insert into public.result_correction_requests(id,match_id,base_team_result_id,proposed_kind,proposed_winner,proposed_state,reason,payload,submitted_by) values(request_id,match,base_result,kind,winner,'{}',btrim(reason),payload,auth.uid());
 insert into public.result_correction_states(request_id,updated_by) values(request_id,auth.uid());
 role_name:=case when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'main_judge'::public.staff_role end;
 insert into public.result_correction_events(id,request_id,kind,actor_id,actor_role,payload,after_state) values(request_id,request_id,'submitted',auth.uid(),role_name,payload,private.team_correction_preview(request_id));
 perform private.league_audit('correction.submitted',request_id,'result_correction',null,payload);
 return private.correction_snapshot(request_id);
end;$$;
revoke all on function public.submit_team_result_correction(uuid,uuid,uuid,text,text,text) from public,anon;
grant execute on function public.submit_team_result_correction(uuid,uuid,uuid,text,text,text) to authenticated;
create function private.apply_team_result_correction(command_id uuid,request_id uuid,expected_digest text,resolve_started boolean,reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare req public.result_correction_requests;state public.result_correction_states;old_event public.result_correction_events;m public.team_matches;plan jsonb;payload jsonb;mapping jsonb;targets uuid[];root uuid;result uuid;role_name public.staff_role;result_snapshot jsonb;replayed jsonb;
begin
 perform private.require_match_manager();perform pg_advisory_xact_lock(170002);perform pg_advisory_xact_lock(170005);perform pg_advisory_xact_lock(170040::bigint);
 select * into req from public.result_correction_requests where id=request_id;
 select * into m from public.team_matches where id=req.match_id;
 if m.id is null then raise exception 'Correction required' using errcode='22023';end if;
 perform private.draw_command_lock(m.draw_id);
 payload:=jsonb_build_object('request_id',request_id,'digest',expected_digest,'resolve_started',resolve_started,'reason',btrim(reason));
 select * into old_event from public.result_correction_events where id=command_id;
 if found then
  if old_event.kind<>'applied' or old_event.actor_id<>auth.uid() or old_event.payload<>payload then raise exception 'Correction command ID conflict' using errcode='22023';end if;
  return old_event.after_state;
 end if;
 if command_id is null or expected_digest is null or resolve_started is null or reason is null or length(btrim(reason)) not between 1 and 500 then raise exception 'Reviewed correction and reason required' using errcode='22023';end if;
 select * into state from public.result_correction_states where public.result_correction_states.request_id=apply_team_result_correction.request_id for update;
 if state.status<>'review' then raise exception 'Correction is no longer in review' using errcode='55000';end if;
 plan:=private.team_correction_preview(request_id);
 if coalesce((plan->>'stale')::boolean,true) or plan->>'digest' is distinct from expected_digest then raise exception 'Correction review version conflict' using errcode='40001';end if;
 if (plan->>'requires_organizer')::boolean and (not private.has_staff_role('organizer') or not resolve_started) then raise exception 'Explicit Organizer resolution required' using errcode='42501';end if;
 targets:=array(select (v->>'id')::uuid from jsonb_array_elements(plan->'affected_matches') v);
 if req.proposed_kind='reopen' then targets:=array_append(targets,m.id);end if;
 mapping:=private.supersede_correction_attempts(request_id,targets);
 insert into public.player_end_events(game_id,player_id,ended_at,created_by) select g.id,p.id,clock_timestamp(),auth.uid() from public.singles_games g cross join lateral unnest(array[g.player_a,g.player_b]) p(id) where g.status='in_progress' and g.match_id=any(targets) on conflict(game_id,player_id) do nothing;
 insert into public.player_rest_heads(player_id,last_ended_at) select e.player_id,max(e.ended_at) from public.player_end_events e join public.singles_games g on g.id=e.game_id where g.match_id=any(targets) group by e.player_id on conflict(player_id) do update set last_ended_at=greatest(public.player_rest_heads.last_ended_at,excluded.last_ended_at);
 update public.singles_games set status='cancelled',ended_at=clock_timestamp(),score_version=score_version+1,timeout_until=null,timeout_side=null where status='in_progress' and match_id=any(targets);
 delete from public.live_players where match_id=any(targets);
 delete from public.live_subteams where match_id=any(targets);
 delete from public.match_table_leases where match_id=any(targets);
 delete from public.tour_placements where source_result_id in(select id from public.team_match_results where match_id=m.id or match_id=any(targets));
 if req.proposed_kind='reopen' then
  root:=(mapping->>m.id::text)::uuid;
  if m.placement_from is null then perform private.rebuild_group_standings(m.group_id);end if;
 else
  root:=m.id;
  insert into public.team_match_results(match_id,revision,previous_result_id,winner,kind,games_a,games_b,sets_a,sets_b,points_a,points_b,created_by) values(m.id,m.result_revision+1,m.result_id,(plan->>'team_winner')::uuid,'team_forfeit',(plan->>'games_a')::integer,(plan->>'games_b')::integer,(plan->>'sets_a')::integer,(plan->>'sets_b')::integer,(plan->>'points_a')::bigint,(plan->>'points_b')::bigint,auth.uid()) returning id into result;
  update public.team_matches set result_id=result,result_revision=result_revision+1,version=version+1,lineup_version=lineup_version+1 where id=m.id;
  perform private.advance_team_result(m.id);
 end if;
 replayed:=private.replay_effective_ratings();
 update public.result_correction_states set status='applied',version=version+1,updated_by=auth.uid(),updated_at=clock_timestamp() where public.result_correction_states.request_id=apply_team_result_correction.request_id;
 role_name:=case when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'main_judge'::public.staff_role end;
 result_snapshot:=jsonb_build_object('request_id',request_id,'status','applied','match_id',root,'result_id',result,'replacements',mapping,'replay',replayed);
 insert into public.result_correction_events(id,request_id,kind,actor_id,actor_role,payload,before_state,after_state) values(command_id,request_id,'applied',auth.uid(),role_name,payload,plan,result_snapshot);
 perform private.league_audit('correction.applied',request_id,'result_correction',plan,result_snapshot||jsonb_build_object('reason',btrim(reason)));
 return result_snapshot;
end;$$;
revoke all on function private.apply_team_result_correction(uuid,uuid,text,boolean,text) from public,anon,authenticated;
create or replace function public.apply_result_correction(command_id uuid,request_id uuid,expected_digest text,resolve_started boolean,reason text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.require_match_manager();
 if exists(select 1 from public.result_correction_requests r where r.id=request_id and r.match_id is not null) then return private.apply_team_result_correction(command_id,request_id,expected_digest,resolve_started,reason);end if;
 return private.apply_singles_result_correction(command_id,request_id,expected_digest,resolve_started,reason);
end;$$;
create or replace function public.get_result_correction(request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare draw uuid;
begin
 perform private.require_match_manager();perform pg_advisory_xact_lock(170005);perform private.scoring_replay_barrier();
 select m.draw_id into draw from public.result_correction_requests r left join public.singles_games g on g.id=r.game_id join public.team_matches m on m.id=coalesce(r.match_id,g.match_id) where r.id=request_id;
 if draw is null then raise exception 'Correction required' using errcode='22023';end if;
 perform private.draw_command_lock(draw);return private.correction_snapshot(request_id);
end;$$;
commit;
