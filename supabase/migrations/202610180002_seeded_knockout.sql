begin;
create table public.knockout_seed_maps(size integer primary key,seeds jsonb not null);
insert into public.knockout_seed_maps values(2,'[1, 2]');
insert into public.knockout_seed_maps values(4,'[1, 4, 2, 3]');
insert into public.knockout_seed_maps values(8,'[1, 8, 4, 5, 2, 7, 3, 6]');
insert into public.knockout_seed_maps values(16,'[1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]');
insert into public.knockout_seed_maps values(32,'[1, 32, 16, 17, 8, 25, 9, 24, 4, 29, 13, 20, 5, 28, 12, 21, 2, 31, 15, 18, 7, 26, 10, 23, 3, 30, 14, 19, 6, 27, 11, 22]');
alter table public.knockout_seed_maps enable row level security;
revoke all on public.knockout_seed_maps from anon,authenticated;
grant select on public.knockout_seed_maps to authenticated;
create policy knockout_maps_read on public.knockout_seed_maps for select to authenticated using(private.has_staff_role());
alter table public.match_sources add column source_entry_id uuid references public.draw_entries(id) on delete restrict;
alter table public.match_sources drop constraint match_sources_check;
alter table public.match_sources add constraint match_source_kind check(
 (source_group_id is not null and source_place is not null and source_match_id is null and outcome is null and source_entry_id is null) or
 (source_group_id is null and source_place is null and source_match_id is not null and outcome is not null and source_entry_id is null) or
 (source_group_id is null and source_place is null and source_match_id is null and outcome is null and source_entry_id is not null)
);

create or replace function private.classification_graph(draw uuid,stage uuid,bracket uuid,sources jsonb,round_number integer,first_place integer,last_place integer)
returns void language plpgsql security definer set search_path='' as $$
declare i integer; side_no integer; match uuid; source jsonb; winners jsonb:='[]'; losers jsonb:='[]'; count_entries integer; next_match integer;
begin
 count_entries:=jsonb_array_length(sources);
 if count_entries<2 or (count_entries & (count_entries-1))<>0 then raise exception 'Power-of-two sources required' using errcode='22023'; end if;
 for i in 0..count_entries/2-1 loop
  select coalesce(max(match_no),0)+1 into next_match from public.team_matches where group_id=bracket;
  insert into public.team_matches(draw_id,stage_id,group_id,match_no,round_no,placement_from,placement_to) values(draw,stage,bracket,next_match,round_number,first_place,last_place) returning id into match;
  for side_no in 0..1 loop
   source:=sources->(2*i+side_no);
   insert into public.match_sources(match_id,side,source_group_id,source_place,source_match_id,outcome,source_entry_id) values(match,case when side_no=0 then 'a' else 'b' end,(source->>'group_id')::uuid,(source->>'place')::integer,(source->>'match_id')::uuid,source->>'outcome',(source->>'entry_id')::uuid);
   if source ? 'entry_id' then
    if not exists(select 1 from public.draw_entries where id=(source->>'entry_id')::uuid and draw_id=draw) then raise exception 'Frozen entry source required' using errcode='22023';end if;
    if side_no=0 then update public.team_matches set subteam_a=(select subteam_id from public.draw_entries where id=(source->>'entry_id')::uuid) where id=match;else update public.team_matches set subteam_b=(select subteam_id from public.draw_entries where id=(source->>'entry_id')::uuid) where id=match;end if;
   end if;
  end loop;
  winners:=winners||jsonb_build_array(jsonb_build_object('match_id',match,'outcome','winner'));
  losers:=losers||jsonb_build_array(jsonb_build_object('match_id',match,'outcome','loser'));
 end loop;
 if count_entries>2 then
  perform private.classification_graph(draw,stage,bracket,winners,round_number+1,first_place,(first_place+last_place)/2);
  perform private.classification_graph(draw,stage,bracket,losers,round_number+1,(first_place+last_place)/2+1,last_place);
 end if;
end;$$;

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
  join public.players p on p.id=m.player_id and p.team_id=sub.team_id and p.status='active' and public.age_group_for_birth_year(extract(year from p.date_of_birth)::integer,parent.year)=age::text
  where e.season_id=parent.id
 ), totals as (
  select subteam_id,sum(current_rating) total from eligible where position<=case when gender='boy' then 3 else 2 end group by subteam_id having count(*)=5 and count(*) filter(where gender='boy')=3 and count(*) filter(where gender='girl')=2
 ), lots as materialized(select *,gen_random_uuid() lot from totals), seeded as(select *,row_number() over(order by total desc,lot) seed from lots)
 insert into public.draw_entries(draw_id,subteam_id,seed,rating_total,tie_lot) select draw_id,subteam_id,seed,total,lot from seeded;
 if (select count(*) from public.draw_entries where draw_entries.draw_id=generate_tour_draw.draw_id)<>pattern.entry_count then raise exception 'Every club needs three eligible boys and two eligible girls' using errcode='22023'; end if;
 insert into public.draw_seed_players(entry_id,player_id,gender,rating)
 select id,player_id,gender,current_rating from (
  select e.id,p.id player_id,p.gender,p.current_rating,row_number() over(partition by e.id,p.gender order by p.current_rating desc,p.id) position
  from public.draw_entries e join public.roster_memberships m on m.subteam_id=e.subteam_id and m.season_id=parent.id and m.ended_at is null join public.players p on p.id=m.player_id where e.draw_id=generate_tour_draw.draw_id and p.team_id=(select team_id from public.subteams where id=e.subteam_id) and p.status='active' and public.age_group_for_birth_year(extract(year from p.date_of_birth)::integer,parent.year)=age::text
 ) ranked where position<=case when gender='boy' then 3 else 2 end;
 if root.kind='knockout' then
  insert into public.stage_groups(draw_id,stage_id,ordinal,label) values(draw_id,root.id,1,'') returning id into group_uuid;
  sources:='[]';
  for slot in select value from jsonb_array_elements(knockout_map.seeds) loop
   select id into group_uuid from public.stage_groups where stage_id=root.id and stage_groups.draw_id=generate_tour_draw.draw_id;
   update public.draw_entries set group_id=group_uuid,group_slot=jsonb_array_length(sources)+1 where draw_entries.draw_id=generate_tour_draw.draw_id and seed=slot::integer;
   sources:=sources||jsonb_build_array(jsonb_build_object('entry_id',(select id from public.draw_entries where draw_entries.draw_id=generate_tour_draw.draw_id and seed=slot::integer)));
  end loop;
  perform private.classification_graph(draw_id,root.id,group_uuid,sources,1,1,knockout_map.size);
 else
 for group_number in 1..root_groups loop
  insert into public.stage_groups(draw_id,stage_id,ordinal,label) values(draw_id,root.id,group_number,case when group_number<=26 then chr(64+group_number) else 'G'||group_number end) returning id into group_uuid;
  root_group_ids:=array_append(root_group_ids,group_uuid);
  update public.draw_entries e set group_id=group_uuid,group_slot=(seed-1)/root_groups+1 where e.draw_id=generate_tour_draw.draw_id and (case when ((seed-1)/root_groups)%2=0 then (seed-1)%root_groups+1 else root_groups-(seed-1)%root_groups end)=group_number;
  positions:=array(select generate_series(1,group_size));
  if group_size%2=1 then positions:=array_append(positions,0); end if;
  length:=cardinality(positions); match_number:=0;
  for r in 1..length-1 loop
   for i in 1..length/2 loop
    a:=positions[i]; b:=positions[length+1-i];
    if a=0 or b=0 then continue; end if;
    select subteam_id into a_team from public.draw_entries where group_id=group_uuid and group_slot=a;
    select subteam_id into b_team from public.draw_entries where group_id=group_uuid and group_slot=b;
    match_number:=match_number+1;
    insert into public.team_matches(draw_id,stage_id,group_id,match_no,round_no,subteam_a,subteam_b) values(draw_id,root.id,group_uuid,match_number,r,a_team,b_team);
   end loop;
   rotated:=array[positions[1],positions[length]]||positions[2:length-1]; positions:=rotated;
  end loop;
 end loop;
 for child in select * from public.stages where plan_id=plan.id and ordinal>1 order by ordinal loop
  insert into public.stage_groups(draw_id,stage_id,ordinal,label) values(draw_id,child.id,1,'') returning id into group_uuid;
  sources:='[]';
  for slot in select value from jsonb_array_elements(mapping.slots) loop sources:=sources||jsonb_build_array(jsonb_build_object('group_id',root_group_ids[(slot->>'group')::integer],'place',(child.configuration->>'place_from')::integer+(slot->>'offset')::integer)); end loop;
  perform private.classification_graph(draw_id,child.id,group_uuid,sources,1,1,(child.configuration->>'size')::integer);
 end loop;
 end if;
 select jsonb_agg(jsonb_build_object('subteam_id',subteam_id,'seed',seed,'rating_total',rating_total,'tie_lot',tie_lot) order by seed) into audit_seeds from public.draw_entries where draw_entries.draw_id=generate_tour_draw.draw_id;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),case when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'main_judge'::public.staff_role end,'draw.generated',draw_id,'draw',jsonb_build_object('plan_id',plan.id,'revision',latest+1,'seeds',audit_seeds,'mapping',case when root.kind='knockout' then jsonb_build_object('kind','seeded_knockout','size',knockout_map.size,'seeds',knockout_map.seeds) else coalesce(to_jsonb(mapping),'{}') end));
 return draw_id;
end;$$;


create or replace function private.match_dependencies_ready(match uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare edge public.match_sources; parent public.team_matches; snapshot public.group_standing_snapshots; expected uuid; actual uuid;
begin
 for edge in select * from public.match_sources where match_id=match loop
  select case edge.side when 'a' then subteam_a else subteam_b end into actual from public.team_matches where id=match;
  if edge.source_entry_id is not null then
   select e.subteam_id into expected from public.draw_entries e join public.team_matches m on m.draw_id=e.draw_id where e.id=edge.source_entry_id and m.id=match;
   if not found then return false;end if;
  elsif edge.source_group_id is not null then
   select s.* into snapshot from public.group_standing_heads h join public.group_standing_snapshots s on s.id=h.snapshot_id where h.group_id=edge.source_group_id;
   if not found or not snapshot.complete or jsonb_array_length(snapshot.data->'unresolved')<>0 or edge.source_snapshot_id is distinct from snapshot.id then return false;end if;
   expected:=(snapshot.data->'order'->>(edge.source_place-1))::uuid;
  else
   select * into parent from public.team_matches where id=edge.source_match_id;
   if parent.status<>'finished' or parent.result_id is null or edge.source_result_id is distinct from parent.result_id then return false;end if;
   select case when edge.outcome='winner' then r.winner when r.winner=parent.subteam_a then parent.subteam_b else parent.subteam_a end into expected from public.team_match_results r where r.id=parent.result_id;
  end if;
  if expected is null or actual is distinct from expected then return false;end if;
 end loop;
 return true;
end;$$;

commit;
