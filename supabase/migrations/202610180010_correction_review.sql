begin;
create table public.result_correction_requests(
 id uuid primary key,
 game_id uuid not null references public.singles_games(id) on delete restrict,
 base_result_id uuid not null references public.singles_results(id) on delete restrict,
 proposed_kind text not null check(proposed_kind in('played','withdrawal')),
 proposed_winner text not null check(proposed_winner in('a','b')),
 proposed_state jsonb not null,
 reason text not null check(length(btrim(reason)) between 1 and 500),
 payload jsonb not null,
 submitted_by uuid not null references public.staff_accounts(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp()
);
create table public.result_correction_states(
 request_id uuid primary key references public.result_correction_requests(id) on delete restrict,
 status text not null default 'review' check(status in('review','applied','dismissed')),
 version integer not null default 1,
 updated_by uuid not null references public.staff_accounts(id) on delete restrict,
 updated_at timestamptz not null default clock_timestamp()
);
create table public.result_correction_events(
 id uuid primary key,
 request_id uuid not null references public.result_correction_requests(id) on delete restrict,
 kind text not null check(kind in('submitted','applied','dismissed','resolution_waiting')),
 actor_id uuid not null references public.staff_accounts(id) on delete restrict,
 actor_role public.staff_role not null,
 payload jsonb not null,
 before_state jsonb,after_state jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
do $$declare relation text;begin
 foreach relation in array array['result_correction_requests','result_correction_states','result_correction_events'] loop
  execute format('alter table public.%I enable row level security',relation);
  execute format('revoke all on public.%I from anon,authenticated',relation);
  execute format('grant select on public.%I to authenticated',relation);
  execute format('create policy correction_manager_read on public.%I for select to authenticated using(private.manages_all_teams())',relation);
 end loop;
end;$$;
-- Caller holds the current draw lock. Pure preview writes no official state.
create function private.correction_preview(target uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare req public.result_correction_requests;g public.singles_games;m public.team_matches;game public.singles_games;result public.singles_results;summary jsonb;winner text;wins_a integer:=0;wins_b integer:=0;sets_a integer:=0;sets_b integer:=0;points_a bigint:=0;points_b bigint:=0;team_winner uuid;complete boolean:=false;trailing_data jsonb:='[]';reactivate jsonb:='[]';members text[];results jsonb;ranked jsonb;subset jsonb;receipt public.group_tie_draws;lots jsonb:='{}';group_complete boolean;edge public.match_sources;expected uuid;current_side uuid;direct uuid[]:='{}';affected jsonb;needs_organizer boolean;plan jsonb;
begin
 select * into req from public.result_correction_requests where id=target;
 select * into g from public.singles_games where id=req.game_id;
 select * into m from public.team_matches where id=g.match_id;
 if req.id is null then raise exception 'Correction required' using errcode='22023';end if;
 if g.result_id is distinct from req.base_result_id or g.status<>'finished' or m.status='cancelled' then return jsonb_build_object('stale',true,'game_id',g.id,'match_id',m.id);end if;
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
  elsif game.status='finished' then
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
  select coalesce(jsonb_agg(jsonb_build_object('a',tm.subteam_a,'b',tm.subteam_b,'winner',r.winner,'gamesA',r.games_a,'gamesB',r.games_b,'setsA',r.sets_a,'setsB',r.sets_b,'pointsA',r.points_a,'pointsB',r.points_b) order by tm.id),'[]'::jsonb) into results from public.team_matches tm join public.team_match_results r on r.id=tm.result_id where tm.group_id=m.group_id and tm.id<>m.id and tm.status='finished';
  if complete then results:=results||jsonb_build_array(jsonb_build_object('a',m.subteam_a,'b',m.subteam_b,'winner',team_winner,'gamesA',wins_a,'gamesB',wins_b,'setsA',sets_a,'setsB',sets_b,'pointsA',points_a,'pointsB',points_b));end if;
  select count(*)=cardinality(members)*(cardinality(members)-1)/2 and bool_and(case when id=m.id then complete else status='finished' and result_id is not null end) into group_complete from public.team_matches where group_id=m.group_id;
  ranked:=private.rank_group(members,results);
  if group_complete then
   for subset in select value from jsonb_array_elements(ranked->'unresolved') loop
    select * into receipt from public.group_tie_draws where group_id=m.group_id and public.group_tie_draws.members=subset;
    if found then lots:=lots||receipt.lots;end if;
   end loop;
   ranked:=private.rank_group(members,results,lots);
  end if;
 end if;
 for edge in select * from public.match_sources where source_match_id=m.id or (m.placement_from is null and source_group_id=m.group_id) order by match_id,side loop
  if edge.source_match_id=m.id then expected:=case when not complete then null when edge.outcome='winner' then team_winner when team_winner=m.subteam_a then m.subteam_b else m.subteam_a end;
  else expected:=case when group_complete and jsonb_array_length(ranked->'unresolved')=0 then (ranked->'order'->>(edge.source_place-1))::uuid else null end;
  end if;
  select case when edge.side='a' then subteam_a else subteam_b end into current_side from public.team_matches where id=edge.match_id;
  if current_side is distinct from expected then direct:=array_append(direct,edge.match_id);end if;
 end loop;
 with recursive impacted(id) as(select unnest(direct) union select e.match_id from public.match_sources e join impacted i on e.source_match_id=i.id)
 select coalesce(jsonb_agg(jsonb_build_object('id',tm.id,'status',tm.status,'version',tm.version,'lineup_version',tm.lineup_version,'has_lineup',exists(select 1 from public.lineups where match_id=tm.id),'started',tm.started_at is not null) order by tm.id),'[]'::jsonb) into affected from public.team_matches tm join impacted i on i.id=tm.id;
 needs_organizer:=exists(select 1 from jsonb_array_elements(affected||trailing_data) v where (v->>'started')::boolean or v->>'status' in('in_progress','finished'));
 plan:=jsonb_build_object('stale',false,'game_id',g.id,'game_version',g.score_version,'base_result_id',g.result_id,'match_id',m.id,'match_version',m.version,'team_complete',complete,'team_winner',team_winner,'games_a',wins_a,'games_b',wins_b,'sets_a',sets_a,'sets_b',sets_b,'points_a',points_a,'points_b',points_b,'trailing_games',trailing_data,'reactivate_games',case when complete then '[]'::jsonb else reactivate end,'direct_dependencies',to_jsonb(direct),'affected_matches',affected,'requires_organizer',needs_organizer,'group',case when m.placement_from is null then jsonb_build_object('complete',group_complete,'order',ranked->'order','unresolved',ranked->'unresolved','current_snapshot',(select snapshot_id from public.group_standing_heads where group_id=m.group_id)) else null end);
 return plan||jsonb_build_object('digest',md5(plan::text));
end;$$;
revoke all on function private.correction_preview(uuid) from public,anon,authenticated;
create function private.correction_snapshot(target uuid)
returns jsonb language sql volatile security definer set search_path='' as $$
 select jsonb_build_object('id',r.id,'game_id',r.game_id,'base_result_id',r.base_result_id,'kind',r.proposed_kind,'winner',r.proposed_winner,'score',r.proposed_state,'reason',r.reason,'submitted_by',r.submitted_by,'created_at',r.created_at,'status',s.status,'version',s.version,'original',jsonb_build_object('kind',original.kind,'winner',original.winner,'sets',original.actual_sets,'k',original.k_factor,'player_a_name',original.player_a_name,'player_b_name',original.player_b_name),'plan',private.correction_preview(target)) from public.result_correction_requests r join public.result_correction_states s on s.request_id=r.id join public.singles_results original on original.id=r.base_result_id where r.id=target;
$$;
revoke all on function private.correction_snapshot(uuid) from public,anon,authenticated;
create function public.submit_result_correction(request_id uuid,game uuid,base_result uuid,kind text,winner text,score jsonb,reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.singles_games;m public.team_matches;old public.result_correction_requests;original public.singles_results;summary jsonb;state jsonb;payload jsonb;role_name public.staff_role;
begin
 perform private.require_match_manager();perform pg_advisory_xact_lock(170005);perform private.scoring_replay_barrier();
 select * into g from public.singles_games where id=game;select * into m from public.team_matches where id=g.match_id;
 perform private.draw_command_lock(m.draw_id);
 payload:=jsonb_build_object('game',game,'base_result',base_result,'kind',kind,'winner',winner,'score',score,'reason',btrim(reason));
 select * into old from public.result_correction_requests where id=request_id;
 if found then
  if old.submitted_by<>auth.uid() or old.payload<>payload then raise exception 'Correction request ID conflict' using errcode='22023';end if;
  return private.correction_snapshot(request_id);
 end if;
 select * into g from public.singles_games where id=game for update;select * into m from public.team_matches where id=g.match_id;
 if g.id is null or g.status<>'finished' or m.status='cancelled' or m.lineups_revealed_at is null or not exists(select 1 from public.draw_revisions where id=m.draw_id and published_at is not null) then raise exception 'Completed revealed singles required' using errcode='22023';end if;
 if g.result_id is distinct from base_result then raise exception 'Result version conflict' using errcode='40001';end if;
 if request_id is null or reason is null or length(btrim(reason)) not between 1 and 500 or coalesce(kind,'') not in('played','withdrawal') or coalesce(winner,'') not in('a','b') or score is null or pg_column_size(score)>8192 then raise exception 'Valid correction proposal required' using errcode='22023';end if;
 select * into original from public.singles_results where id=g.result_id;
 if kind='played' then
  state:=score||jsonb_build_object('timeouts',g.score_state->'timeouts');summary:=private.score_summary(state);
  if summary->>'winner' is distinct from winner then raise exception 'Completed proposed score required' using errcode='22023';end if;
 else state:=g.score_state;
 end if;
 if kind=original.kind and winner=original.winner and state=g.score_state then raise exception 'Changed result required' using errcode='22023';end if;
 insert into public.result_correction_requests(id,game_id,base_result_id,proposed_kind,proposed_winner,proposed_state,reason,payload,submitted_by) values(request_id,game,base_result,kind,winner,state,btrim(reason),payload,auth.uid());
 insert into public.result_correction_states(request_id,updated_by) values(request_id,auth.uid());
 role_name:=case when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'main_judge'::public.staff_role end;
 insert into public.result_correction_events(id,request_id,kind,actor_id,actor_role,payload,after_state) values(request_id,request_id,'submitted',auth.uid(),role_name,payload,private.correction_preview(request_id));
 perform private.league_audit('correction.submitted',request_id,'result_correction',null,jsonb_build_object('game_id',game,'base_result_id',base_result,'kind',kind,'winner',winner,'reason',btrim(reason)));
 return private.correction_snapshot(request_id);
end;$$;
create function public.get_result_correction(request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare draw uuid;
begin
 perform private.require_match_manager();perform pg_advisory_xact_lock(170005);perform private.scoring_replay_barrier();
 select m.draw_id into draw from public.result_correction_requests r join public.singles_games g on g.id=r.game_id join public.team_matches m on m.id=g.match_id where r.id=request_id;
 if draw is null then raise exception 'Correction required' using errcode='22023';end if;
 perform private.draw_command_lock(draw);return private.correction_snapshot(request_id);
end;$$;
revoke all on function public.submit_result_correction(uuid,uuid,uuid,text,text,jsonb,text),public.get_result_correction(uuid) from public,anon;
grant execute on function public.submit_result_correction(uuid,uuid,uuid,text,text,jsonb,text),public.get_result_correction(uuid) to authenticated;
commit;
