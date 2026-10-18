begin;
-- Correct deciding-set physical ends and reserve both continuing opponents.
create or replace function private.score_summary(state jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare length integer;set_value jsonb;a bigint;b bigint;wins_a integer:=0;wins_b integer:=0;index integer;won text;winner text;first_server text;changes bigint;total bigint;
begin
 if jsonb_typeof(state) is distinct from 'object' or coalesce(state->>'initial_server','') not in('a','b') or jsonb_typeof(state->'sets') is distinct from 'array' or jsonb_typeof(state->'timeouts'->'a') is distinct from 'boolean' or jsonb_typeof(state->'timeouts'->'b') is distinct from 'boolean' then raise exception 'Invalid scoring state' using errcode='22023';end if;
 length:=jsonb_array_length(state->'sets');
 if length not between 1 and 5 then raise exception 'Invalid scoring state' using errcode='22023';end if;
 for index in 0..length-1 loop
  set_value:=state->'sets'->index;
  if jsonb_typeof(set_value->'a') is distinct from 'number' or jsonb_typeof(set_value->'b') is distinct from 'number' or (set_value->>'a')::numeric<>trunc((set_value->>'a')::numeric) or (set_value->>'b')::numeric<>trunc((set_value->>'b')::numeric) then raise exception 'Invalid set score' using errcode='22023';end if;
  a:=(set_value->>'a')::bigint;b:=(set_value->>'b')::bigint;won:=private.set_winner(a,b);
  if won='a' then wins_a:=wins_a+1;elsif won='b' then wins_b:=wins_b+1;end if;
  if index<length-1 and (won is null or wins_a=3 or wins_b=3) then raise exception 'Invalid scoring state' using errcode='22023';end if;
 end loop;
 winner:=case when wins_a=3 then 'a' when wins_b=3 then 'b' else null end;
 if winner is null and won is not null then raise exception 'Next set required' using errcode='22023';end if;
 first_server:=case when length%2=1 then state->>'initial_server' when state->>'initial_server'='a' then 'b' else 'a' end;
 total:=a+b;changes:=case when total<20 then total/2 else total-20 end;
 return jsonb_build_object('set_number',length,'points_a',a,'points_b',b,'sets_a',wins_a,'sets_b',wins_b,'winner',winner,'server',case when winner is not null then null when changes%2=0 then first_server when first_server='a' then 'b' else 'a' end,'ends_swapped',((length-1)%2=1)<>(length=5 and greatest(a,b)>=5));
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'Invalid scoring state' using errcode='22023';
end;$$;
create or replace function public.resume_corrected_match(command_id uuid,match uuid,expected_version integer,reason text)
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
 if exists(select 1 from public.player_rest_heads r where r.player_id in(select player_a from public.singles_games where match_id=match and status in('pending','in_progress') union select player_b from public.singles_games where match_id=match and status in('pending','in_progress')) and r.last_ended_at+make_interval(mins=>cfg.rest_minutes)>clock_timestamp()) then raise exception 'Player rest incomplete' using errcode='55000';end if;
 before_value:=private.match_operation_snapshot(match);
 insert into public.live_subteams(subteam_id,match_id) values(m.subteam_a,match),(m.subteam_b,match);
 insert into public.live_players(player_id,match_id) select player_a,match from public.singles_games where match_id=match and status in('pending','in_progress') union select player_b,match from public.singles_games where match_id=match and status in('pending','in_progress');
 update public.team_matches set status='in_progress',version=version+1 where id=match;
 after_value:=private.match_operation_snapshot(match);
 insert into public.match_commands(id,match_id,actor_id,kind,request,before_state,after_state) values(command_id,match,auth.uid(),'start',payload,before_value,after_value);
 perform private.league_audit('match.resumed',match,'team_match',before_value,after_value||jsonb_build_object('reason',btrim(reason)));
 return after_value;
end;$$;
revoke all on function public.resume_corrected_match(uuid,uuid,integer,text) from public,anon;
grant execute on function public.resume_corrected_match(uuid,uuid,integer,text) to authenticated;
-- Refresh any already-published deciding-set snapshot with the corrected ends.
select private.project_public_match(match_id) from public.singles_games
where status='in_progress' and jsonb_array_length(score_state->'sets')=5;
commit;
