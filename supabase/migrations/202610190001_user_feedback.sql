begin;
-- Feedback: season-year upper bounds permit playing up. Classification is unchanged.
create or replace function public.is_eligible_for_age_group(birth_year integer,season_year integer,target_group public.age_group)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(public.age_group_for_birth_year(birth_year,season_year)::public.age_group <= target_group,false);
$$;
revoke all on function public.is_eligible_for_age_group(integer,integer,public.age_group) from public,anon;
grant execute on function public.is_eligible_for_age_group(integer,integer,public.age_group) to authenticated;

create or replace function public.save_player(player_id uuid,club uuid,first_name text,last_name text,gender public.player_gender,dob date,hand text,style text,sports_level text,external_id text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare old public.players; value public.players;
begin
 perform pg_advisory_xact_lock(170005);
 if not private.can_manage_team(club) then raise exception 'Team permission required' using errcode='42501'; end if;
 select * into old from public.players where id=player_id for update;
 if found and old.team_id<>club then raise exception 'Use Organizer transfer' using errcode='42501'; end if;
 if player_id is null or dob is null or dob>current_date or dob<'1900-01-01' or first_name is null or char_length(btrim(first_name)) not between 1 and 80 or last_name is null or char_length(btrim(last_name)) not between 1 and 80 or gender is null or hand is null or hand not in ('left','right') or style is null or char_length(btrim(style)) not between 1 and 100 or sports_level is null or char_length(btrim(sports_level)) not between 1 and 100 or (external_id is not null and char_length(btrim(external_id)) not between 1 and 100) then raise exception 'Invalid player details' using errcode='22023'; end if;
 if exists(select 1 from public.roster_memberships m join public.subteams s on s.id=m.subteam_id join public.seasons season on season.id=m.season_id where m.player_id=save_player.player_id and m.ended_at is null and not public.is_eligible_for_age_group(extract(year from dob)::integer,season.year,s.age_group)) then raise exception 'DOB invalidates an active roster' using errcode='22023'; end if;
 insert into public.players(id,team_id,first_name,last_name,gender,date_of_birth,playing_hand,playing_style,sports_level,external_rating_id) values(player_id,club,btrim(first_name),btrim(last_name),gender,dob,hand,btrim(style),btrim(sports_level),external_id)
 on conflict(id) do update set first_name=excluded.first_name,last_name=excluded.last_name,gender=excluded.gender,date_of_birth=excluded.date_of_birth,playing_hand=excluded.playing_hand,playing_style=excluded.playing_style,sports_level=excluded.sports_level,external_rating_id=excluded.external_rating_id returning * into value;
 if old.id is null then insert into public.rating_history(player_id,source,rating_after,external_rating_id) values(player_id,'initial',1000,external_id); end if;
 perform private.league_audit(case when old.id is null then 'player.created' else 'player.updated' end,player_id,'player',to_jsonb(old),to_jsonb(value));
 return player_id;
end;
$$;

create or replace function public.add_roster_player(parent_season uuid,target_subteam uuid,player uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare child public.subteams; person public.players; season public.seasons; member uuid;
begin
 perform pg_advisory_xact_lock(170005);
 if not private.can_manage_subteam(target_subteam) then raise exception 'Subteam permission required' using errcode='42501'; end if;
 select * into child from public.subteams where id=target_subteam for update;
 select * into season from public.seasons where id=parent_season for update;
 select * into person from public.players where id=player for update;
 if child.id is null or person.id is null or season.id is null or person.team_id<>child.team_id or person.status<>'active' or not exists(select 1 from public.season_team_entries where season_id=parent_season and team_id=child.team_id) then raise exception 'Eligible active club player required' using errcode='22023'; end if;
 if not public.is_eligible_for_age_group(extract(year from person.date_of_birth)::integer,season.year,child.age_group) then raise exception 'Player exceeds lineup age limit' using errcode='22023'; end if;
 select id into member from public.roster_memberships where player_id=player and season_id=parent_season and subteam_id=target_subteam and ended_at is null;
 if found then return member; end if;
 if (select count(*) from public.roster_memberships where season_id=parent_season and subteam_id=target_subteam and ended_at is null)>=10 then raise exception 'Roster capacity reached' using errcode='22023'; end if;
 insert into public.roster_memberships(season_id,subteam_id,player_id) values(parent_season,target_subteam,player) returning id into member;
 perform private.league_audit('roster.joined',member,'roster_membership',null,jsonb_build_object('season_id',parent_season,'subteam_id',target_subteam,'player_id',player));
 return member;
end;
$$;

create or replace function private.check_season_roster_year()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.year<>old.year and exists(select 1 from public.roster_memberships m join public.players p on p.id=m.player_id join public.subteams s on s.id=m.subteam_id where m.season_id=new.id and m.ended_at is null and not public.is_eligible_for_age_group(extract(year from p.date_of_birth)::integer,new.year,s.age_group)) then raise exception 'Year invalidates an active roster' using errcode='22023'; end if;
 return new;
end;
$$;

create or replace function private.eligible_lineup_player(player uuid,subteam uuid,season uuid,slot integer)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.players p join public.roster_memberships m on m.player_id=p.id and m.ended_at is null join public.subteams sub on sub.id=m.subteam_id and sub.team_id=p.team_id join public.seasons s on s.id=m.season_id where p.id=player and sub.id=subteam and s.id=season and p.status='active' and p.gender=case when slot in(1,3,5) then 'boy' else 'girl' end::public.player_gender and public.is_eligible_for_age_group(extract(year from p.date_of_birth)::integer,s.year,sub.age_group));
$$;

create or replace function public.generate_tour_draw(draw_id uuid,tournament uuid,age public.age_group,expected_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare parent public.seasons; plan public.tour_stage_plans; root public.stages; child public.stages; pattern public.stage_templates; mapping public.draw_seed_maps; old public.draw_revisions; latest integer; root_groups integer; group_size integer; group_number integer; group_uuid uuid; root_group_ids uuid[]:='{}'; positions integer[]; rotated integer[]; length integer; r integer; i integer; a integer; b integer; a_team uuid; b_team uuid; match_number integer; sources jsonb; slot jsonb; audit_seeds jsonb; knockout_map public.knockout_seed_maps;
begin
 perform private.require_draw_manager();
 -- Match the existing roster administration lock order before the season lock.
 perform pg_advisory_xact_lock(170005);
 select s.* into parent from public.seasons s join public.tours t on t.season_id=s.id where t.id=tournament for update of s;
 if not found or parent.status<>'started' then raise exception 'Started season required' using errcode='22023'; end if;
 select * into plan from public.tour_stage_plans p where p.tour_id=tournament and p.age_group=age order by revision desc limit 1 for update;
 if not found then raise exception 'Stage plan required' using errcode='22023'; end if;
 select * into old from public.draw_revisions where id=draw_id;
 if found then
  if old.plan_id=plan.id then return draw_id; end if;
  raise exception 'Draw ID conflict' using errcode='22023';
 end if;
 if draw_id is null or exists(select 1 from public.draw_revisions where plan_id=plan.id and published_at is not null) then raise exception 'Published draw is locked' using errcode='22023'; end if;
 select coalesce(max(revision),0) into latest from public.draw_revisions where plan_id=plan.id;
 if expected_revision is distinct from latest then raise exception 'Draw revision conflict' using errcode='22023'; end if;
 select * into root from public.stages where plan_id=plan.id and ordinal=1;
 select * into pattern from public.stage_templates where id=plan.template_id;
 if root.kind='knockout' then
  select * into knockout_map from public.knockout_seed_maps where size=(root.configuration->>'size')::integer;
  if not found then raise exception 'Draw map not supported' using errcode='22023';end if;
 elsif root.kind<>'round_robin' then raise exception 'Draw map not supported' using errcode='22023';end if;
 root_groups:=(root.configuration->>'group_count')::integer; group_size:=(root.configuration->>'group_size')::integer;
 for child in select * from public.stages where plan_id=plan.id and ordinal>1 order by ordinal loop
  select * into mapping from public.draw_seed_maps where group_count=root_groups and qualifiers_per_group=(child.configuration->>'place_to')::integer-(child.configuration->>'place_from')::integer+1;
  if not found then raise exception 'Draw map not supported' using errcode='22023'; end if;
 end loop;
 -- Freeze ratings across the seed-total and identity snapshots, including live
 -- rating updates from other tournaments. Scoring uses player row locks, not 170005.
 perform p.id from public.players p join public.roster_memberships m on m.player_id=p.id join public.subteams sub on sub.id=m.subteam_id where m.season_id=parent.id and sub.age_group=age and m.ended_at is null order by p.id for share of p;
 insert into public.draw_revisions(id,plan_id,revision,generated_by,mapping_snapshot) values(draw_id,plan.id,latest+1,auth.uid(),case when root.kind='knockout' then jsonb_build_object('kind','seeded_knockout','size',knockout_map.size,'seeds',knockout_map.seeds) else coalesce(to_jsonb(mapping),'{}') end);
 with eligible as (
  select sub.id subteam_id,p.id player_id,p.gender,p.current_rating,
   row_number() over(partition by sub.id,p.gender order by p.current_rating desc,p.id) position
  from public.season_team_entries e join public.subteams sub on sub.team_id=e.team_id and sub.age_group=age
  join public.roster_memberships m on m.season_id=e.season_id and m.subteam_id=sub.id and m.ended_at is null
  join public.players p on p.id=m.player_id and p.team_id=sub.team_id and p.status='active' and public.is_eligible_for_age_group(extract(year from p.date_of_birth)::integer,parent.year,age)
  where e.season_id=parent.id
 ), totals as (
  select subteam_id,sum(current_rating) total from eligible where position<=case when gender='boy' then 3 else 2 end group by subteam_id having count(*)=5 and count(*) filter(where gender='boy')=3 and count(*) filter(where gender='girl')=2
 ), lots as materialized(select *,gen_random_uuid() lot from totals), seeded as(select *,row_number() over(order by total desc,lot) seed from lots)
 insert into public.draw_entries(draw_id,subteam_id,seed,rating_total,tie_lot) select draw_id,subteam_id,seed,total,lot from seeded;
 if (select count(*) from public.draw_entries where draw_entries.draw_id=generate_tour_draw.draw_id)<>pattern.entry_count then raise exception 'Every club needs three eligible boys and two eligible girls' using errcode='22023'; end if;
 insert into public.draw_seed_players(entry_id,player_id,gender,rating)
 select id,player_id,gender,current_rating from (
  select e.id,p.id player_id,p.gender,p.current_rating,row_number() over(partition by e.id,p.gender order by p.current_rating desc,p.id) position
  from public.draw_entries e join public.roster_memberships m on m.subteam_id=e.subteam_id and m.season_id=parent.id and m.ended_at is null join public.players p on p.id=m.player_id where e.draw_id=generate_tour_draw.draw_id and p.team_id=(select team_id from public.subteams where id=e.subteam_id) and p.status='active' and public.is_eligible_for_age_group(extract(year from p.date_of_birth)::integer,parent.year,age)
 ) ranked where position<=case when gender='boy' then 3 else 2 end;
 perform private.populate_draw_graph(draw_id);
 select jsonb_agg(jsonb_build_object('subteam_id',subteam_id,'seed',seed,'rating_total',rating_total,'tie_lot',tie_lot) order by seed) into audit_seeds from public.draw_entries where draw_entries.draw_id=generate_tour_draw.draw_id;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),case when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'main_judge'::public.staff_role end,'draw.generated',draw_id,'draw',jsonb_build_object('plan_id',plan.id,'revision',latest+1,'seeds',audit_seeds,'mapping',case when root.kind='knockout' then jsonb_build_object('kind','seeded_knockout','size',knockout_map.size,'seeds',knockout_map.seeds) else coalesce(to_jsonb(mapping),'{}') end));
 return draw_id;
end;$$;

create or replace function public.end_roster_membership(membership uuid,confirmed boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 perform public.end_roster_membership(membership,'Action confirmed'::text);
end;$$;
revoke all on function public.end_roster_membership(uuid,text) from public,anon,authenticated;
revoke all on function public.end_roster_membership(uuid,boolean) from public,anon;
grant execute on function public.end_roster_membership(uuid,boolean) to authenticated;

create or replace function public.drop_player(player uuid,effective_date date,confirmed boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 perform public.drop_player(player,effective_date,'Action confirmed'::text);
end;$$;
revoke all on function public.drop_player(uuid,date,text) from public,anon,authenticated;
revoke all on function public.drop_player(uuid,date,boolean) from public,anon;
grant execute on function public.drop_player(uuid,date,boolean) to authenticated;

create or replace function public.transfer_player(player uuid,new_club uuid,confirmed boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 perform public.transfer_player(player,new_club,'Action confirmed'::text);
end;$$;
revoke all on function public.transfer_player(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.transfer_player(uuid,uuid,boolean) from public,anon;
grant execute on function public.transfer_player(uuid,uuid,boolean) to authenticated;

create or replace function public.replace_lineup_player(replacement_id uuid,match uuid,subteam uuid,slot integer,player uuid,confirmed boolean,expected_lineup_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 return public.replace_lineup_player(replacement_id,match,subteam,slot,player,'Action confirmed'::text,expected_lineup_version);
end;$$;
revoke all on function public.replace_lineup_player(uuid,uuid,uuid,integer,uuid,text,integer) from public,anon,authenticated;
revoke all on function public.replace_lineup_player(uuid,uuid,uuid,integer,uuid,boolean,integer) from public,anon;
grant execute on function public.replace_lineup_player(uuid,uuid,uuid,integer,uuid,boolean,integer) to authenticated;

create or replace function public.swap_draw_seeds(draw_id uuid,source_draw uuid,expected_revision integer,seed_a integer,seed_b integer,confirmed boolean)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 return public.swap_draw_seeds(draw_id,source_draw,expected_revision,seed_a,seed_b,'Action confirmed'::text);
end;$$;
revoke all on function public.swap_draw_seeds(uuid,uuid,integer,integer,integer,text) from public,anon,authenticated;
revoke all on function public.swap_draw_seeds(uuid,uuid,integer,integer,integer,boolean) from public,anon;
grant execute on function public.swap_draw_seeds(uuid,uuid,integer,integer,integer,boolean) to authenticated;

create or replace function public.review_player_photo(asset uuid,decision text,confirmed boolean,publication jsonb default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 perform public.review_player_photo(asset,decision,'Action confirmed'::text,publication);
end;$$;
revoke all on function public.review_player_photo(uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.review_player_photo(uuid,text,boolean,jsonb) from public,anon;
grant execute on function public.review_player_photo(uuid,text,boolean,jsonb) to authenticated;

create or replace function public.assign_table_judge(assignment_id uuid,tournament uuid,table_no integer,venue_day date,staff uuid,expected_version integer,confirmed boolean)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 return public.assign_table_judge(assignment_id,tournament,table_no,venue_day,staff,expected_version,'Action confirmed'::text);
end;$$;
revoke all on function public.assign_table_judge(uuid,uuid,integer,date,uuid,integer,text) from public,anon,authenticated;
revoke all on function public.assign_table_judge(uuid,uuid,integer,date,uuid,integer,boolean) from public,anon;
grant execute on function public.assign_table_judge(uuid,uuid,integer,date,uuid,integer,boolean) to authenticated;

create or replace function public.takeover_table(assignment_id uuid,tournament uuid,table_no integer,venue_day date,expected_version integer,confirmed boolean)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 return public.takeover_table(assignment_id,tournament,table_no,venue_day,expected_version,'Action confirmed'::text);
end;$$;
revoke all on function public.takeover_table(uuid,uuid,integer,date,integer,text) from public,anon,authenticated;
revoke all on function public.takeover_table(uuid,uuid,integer,date,integer,boolean) from public,anon;
grant execute on function public.takeover_table(uuid,uuid,integer,date,integer,boolean) to authenticated;

create or replace function public.manage_match(command_id uuid,match uuid,operation text,table_no integer,expected_version integer,confirmed boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 return public.manage_match(command_id,match,operation,table_no,expected_version,'Action confirmed'::text);
end;$$;
revoke all on function public.manage_match(uuid,uuid,text,integer,integer,text) from public,anon,authenticated;
revoke all on function public.manage_match(uuid,uuid,text,integer,integer,boolean) from public,anon;
grant execute on function public.manage_match(uuid,uuid,text,integer,integer,boolean) to authenticated;

create or replace function public.run_hall_command(command_id uuid,tournament uuid,operation text,confirmed boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 return public.run_hall_command(command_id,tournament,operation,'Action confirmed'::text);
end;$$;
revoke all on function public.run_hall_command(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.run_hall_command(uuid,uuid,text,boolean) from public,anon;
grant execute on function public.run_hall_command(uuid,uuid,text,boolean) to authenticated;

create or replace function public.submit_result_correction(request_id uuid,game uuid,base_result uuid,kind text,winner text,score jsonb,confirmed boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 return public.submit_result_correction(request_id,game,base_result,kind,winner,score,'Action confirmed'::text);
end;$$;
revoke all on function public.submit_result_correction(uuid,uuid,uuid,text,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.submit_result_correction(uuid,uuid,uuid,text,text,jsonb,boolean) from public,anon;
grant execute on function public.submit_result_correction(uuid,uuid,uuid,text,text,jsonb,boolean) to authenticated;

create or replace function public.submit_team_result_correction(request_id uuid,match uuid,base_result uuid,kind text,winner text,confirmed boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 return public.submit_team_result_correction(request_id,match,base_result,kind,winner,'Action confirmed'::text);
end;$$;
revoke all on function public.submit_team_result_correction(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.submit_team_result_correction(uuid,uuid,uuid,text,text,boolean) from public,anon;
grant execute on function public.submit_team_result_correction(uuid,uuid,uuid,text,text,boolean) to authenticated;

create or replace function public.apply_result_correction(command_id uuid,request_id uuid,expected_digest text,resolve_started boolean,confirmed boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 return public.apply_result_correction(command_id,request_id,expected_digest,resolve_started,'Action confirmed'::text);
end;$$;
revoke all on function public.apply_result_correction(uuid,uuid,text,boolean,text) from public,anon,authenticated;
revoke all on function public.apply_result_correction(uuid,uuid,text,boolean,boolean) from public,anon;
grant execute on function public.apply_result_correction(uuid,uuid,text,boolean,boolean) to authenticated;

create or replace function public.resume_corrected_match(command_id uuid,match uuid,expected_version integer,confirmed boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if confirmed is distinct from true then raise exception 'Action confirmation required' using errcode='22023'; end if;
 return public.resume_corrected_match(command_id,match,expected_version,'Action confirmed'::text);
end;$$;
revoke all on function public.resume_corrected_match(uuid,uuid,integer,text) from public,anon,authenticated;
revoke all on function public.resume_corrected_match(uuid,uuid,integer,boolean) from public,anon;
grant execute on function public.resume_corrected_match(uuid,uuid,integer,boolean) to authenticated;

-- Retirement needs confirmation; ordinary scoring retains its existing controls.
create or replace function public.score_command(command_id uuid,game uuid,kind text,side text,expected_version integer,confirmed boolean,note text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if kind='withdrawal' and side is not null and confirmed is distinct from true then
  raise exception 'Action confirmation required' using errcode='22023';
 end if;
 return public.score_command(command_id,game,kind,side,expected_version,
  case when kind='withdrawal' and side is not null then 'Action confirmed' else note end);
end;$$;
revoke all on function public.score_command(uuid,uuid,text,text,integer,text) from public,anon,authenticated;
revoke all on function public.score_command(uuid,uuid,text,text,integer,boolean,text) from public,anon;
grant execute on function public.score_command(uuid,uuid,text,text,integer,boolean,text) to authenticated;

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
  if exists(select 1 from public.players p join public.subteams sub on sub.id=subteam and sub.team_id=p.team_id join public.seasons s on s.id=season where p.id=players[i] and not public.is_eligible_for_age_group(extract(year from p.date_of_birth)::integer,s.year,sub.age_group)) then raise exception 'Player exceeds lineup age limit' using errcode='22023'; end if;
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
 if exists(select 1 from public.players p join public.subteams sub on sub.id=subteam and sub.team_id=p.team_id join public.seasons s on s.id=season where p.id=player and not public.is_eligible_for_age_group(extract(year from p.date_of_birth)::integer,s.year,sub.age_group)) then raise exception 'Player exceeds lineup age limit' using errcode='22023'; end if;
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

create or replace view public.public_league_players as
 select distinct on(p.id) p.id,p.first_name,p.last_name,p.current_rating as rating,t.id as team_id,t.name as team_name,s.age_group,exists(select 1 from public.public_player_photos photo where photo.player_id=p.id) as has_photo,p.gender
 from public.players p join public.teams t on t.id=p.team_id join public.roster_memberships r on r.player_id=p.id and r.ended_at is null join public.subteams s on s.id=r.subteam_id
 where exists(select 1 from public.tours tour join public.tour_stage_plans plan on plan.tour_id=tour.id join public.draw_revisions d on d.plan_id=plan.id where tour.season_id=r.season_id and plan.age_group=s.age_group and d.published_at is not null)
 order by p.id,r.joined_at desc;

create or replace function public.get_public_player(player uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;context_subteam uuid;
begin
 select to_jsonb(profile) into result from public.public_league_players profile where profile.id=player;
 if found then return result;end if;
 select visible.subteam_id into context_subteam from (
  select r.subteam_id,greatest(r.joined_at,d.published_at) as visible_at
  from public.roster_memberships r join public.subteams sub on sub.id=r.subteam_id
  join public.draw_entries entry on entry.subteam_id=sub.id
  join public.draw_revisions d on d.id=entry.draw_id and d.published_at is not null
  join public.tour_stage_plans plan on plan.id=d.plan_id and plan.age_group=sub.age_group
  join public.tours tour on tour.id=plan.tour_id and tour.season_id=r.season_id
  where r.player_id=player and (r.ended_at is null or r.ended_at>=d.published_at)
  union all
  select case when g.player_a=player then m.subteam_a else m.subteam_b end,
   coalesce(g.ended_at,g.started_at,m.lineups_revealed_at)
  from public.singles_games g join public.team_matches m on m.id=g.match_id
  join public.draw_revisions d on d.id=m.draw_id and d.published_at is not null
  where player in(g.player_a,g.player_b) and m.lineups_revealed_at is not null
 ) visible order by visible.visible_at desc,visible.subteam_id limit 1;
 if context_subteam is null then return null;end if;
 select jsonb_build_object('id',p.id,'first_name',p.first_name,'last_name',p.last_name,
  'gender',p.gender,'rating',p.current_rating,'team_id',team.id,'team_name',team.name,'age_group',sub.age_group,
  'has_photo',exists(select 1 from public.public_player_photos photo where photo.player_id=p.id))
 into result from public.players p join public.subteams sub on sub.id=context_subteam
 join public.teams team on team.id=sub.team_id where p.id=player;
 return result;
end;$$;

commit;
