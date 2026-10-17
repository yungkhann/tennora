begin;
create table public.draw_seed_adjustments(
 draw_id uuid primary key references public.draw_revisions(id) on delete restrict,
 source_draw_id uuid not null references public.draw_revisions(id) on delete restrict,
 seed_a integer not null check(seed_a>0),seed_b integer not null check(seed_b>0),
 reason text not null check(length(btrim(reason)) between 1 and 500),
 created_by uuid not null references public.staff_accounts(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 check(draw_id<>source_draw_id and seed_a<>seed_b)
);
alter table public.draw_seed_adjustments enable row level security;
revoke all on public.draw_seed_adjustments from anon,authenticated;
grant select on public.draw_seed_adjustments to authenticated;
create policy adjustments_read on public.draw_seed_adjustments for select to authenticated using(private.can_read_draw(draw_id));

create function private.populate_draw_graph(target_draw uuid)
returns void language plpgsql security definer set search_path='' as $$
declare frozen public.draw_revisions;plan public.tour_stage_plans;root public.stages;child public.stages;mapping public.draw_seed_maps;knockout_map public.knockout_seed_maps;root_groups integer;group_size integer;group_number integer;group_uuid uuid;root_group_ids uuid[]:='{}';positions integer[];rotated integer[];length integer;r integer;i integer;a integer;b integer;a_team uuid;b_team uuid;match_number integer;sources jsonb;slot jsonb;
begin
 select * into frozen from public.draw_revisions where id=target_draw;
 if not found or frozen.published_at is not null or exists(select 1 from public.team_matches where draw_id=target_draw) then raise exception 'Empty draft graph required' using errcode='22023';end if;
 select * into plan from public.tour_stage_plans where id=frozen.plan_id;
 select * into root from public.stages where plan_id=plan.id and ordinal=1;
 select * into mapping from jsonb_populate_record(null::public.draw_seed_maps,frozen.mapping_snapshot);
 select * into knockout_map from jsonb_populate_record(null::public.knockout_seed_maps,frozen.mapping_snapshot);
 root_groups:=(root.configuration->>'group_count')::integer;group_size:=(root.configuration->>'group_size')::integer;
 if root.kind='knockout' then
  insert into public.stage_groups(draw_id,stage_id,ordinal,label) values(target_draw,root.id,1,'') returning id into group_uuid;
  sources:='[]';
  for slot in select value from jsonb_array_elements(knockout_map.seeds) loop
   select id into group_uuid from public.stage_groups where stage_id=root.id and stage_groups.draw_id=target_draw;
   update public.draw_entries set group_id=group_uuid,group_slot=jsonb_array_length(sources)+1 where draw_entries.draw_id=target_draw and seed=slot::integer;
   sources:=sources||jsonb_build_array(jsonb_build_object('entry_id',(select id from public.draw_entries where draw_entries.draw_id=target_draw and seed=slot::integer)));
  end loop;
  perform private.classification_graph(target_draw,root.id,group_uuid,sources,1,1,knockout_map.size);
 else
 for group_number in 1..root_groups loop
  insert into public.stage_groups(draw_id,stage_id,ordinal,label) values(target_draw,root.id,group_number,case when group_number<=26 then chr(64+group_number) else 'G'||group_number end) returning id into group_uuid;
  root_group_ids:=array_append(root_group_ids,group_uuid);
  update public.draw_entries e set group_id=group_uuid,group_slot=(seed-1)/root_groups+1 where e.draw_id=target_draw and (case when ((seed-1)/root_groups)%2=0 then (seed-1)%root_groups+1 else root_groups-(seed-1)%root_groups end)=group_number;
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
    insert into public.team_matches(draw_id,stage_id,group_id,match_no,round_no,subteam_a,subteam_b) values(target_draw,root.id,group_uuid,match_number,r,a_team,b_team);
   end loop;
   rotated:=array[positions[1],positions[length]]||positions[2:length-1]; positions:=rotated;
  end loop;
 end loop;
 for child in select * from public.stages where plan_id=plan.id and ordinal>1 order by ordinal loop
  insert into public.stage_groups(draw_id,stage_id,ordinal,label) values(target_draw,child.id,1,'') returning id into group_uuid;
  sources:='[]';
  for slot in select value from jsonb_array_elements(mapping.slots) loop sources:=sources||jsonb_build_array(jsonb_build_object('group_id',root_group_ids[(slot->>'group')::integer],'place',(child.configuration->>'place_from')::integer+(slot->>'offset')::integer)); end loop;
  perform private.classification_graph(target_draw,child.id,group_uuid,sources,1,1,(child.configuration->>'size')::integer);
 end loop;
 end if;
end;$$;
revoke all on function private.populate_draw_graph(uuid) from public,anon,authenticated;

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
 perform private.populate_draw_graph(draw_id);
 select jsonb_agg(jsonb_build_object('subteam_id',subteam_id,'seed',seed,'rating_total',rating_total,'tie_lot',tie_lot) order by seed) into audit_seeds from public.draw_entries where draw_entries.draw_id=generate_tour_draw.draw_id;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),case when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'main_judge'::public.staff_role end,'draw.generated',draw_id,'draw',jsonb_build_object('plan_id',plan.id,'revision',latest+1,'seeds',audit_seeds,'mapping',case when root.kind='knockout' then jsonb_build_object('kind','seeded_knockout','size',knockout_map.size,'seeds',knockout_map.seeds) else coalesce(to_jsonb(mapping),'{}') end));
 return draw_id;
end;$$;



create function public.swap_draw_seeds(draw_id uuid,source_draw uuid,expected_revision integer,seed_a integer,seed_b integer,reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare source public.draw_revisions;plan public.tour_stage_plans;old public.draw_seed_adjustments;latest integer;total integer;before_order jsonb;after_order jsonb;
begin
 perform private.require_organizer();
 select * into source from public.draw_revisions where id=source_draw;
 if not found then raise exception 'Current draft required' using errcode='22023';end if;
 perform s.id from public.seasons s join public.tours t on t.season_id=s.id join public.tour_stage_plans p on p.tour_id=t.id where p.id=source.plan_id for update of s;
 select * into plan from public.tour_stage_plans where id=source.plan_id for update;
 select * into old from public.draw_seed_adjustments a where a.draw_id=swap_draw_seeds.draw_id;
 if found then
  if old.source_draw_id=source_draw and old.seed_a=swap_draw_seeds.seed_a and old.seed_b=swap_draw_seeds.seed_b and old.reason=btrim(swap_draw_seeds.reason) and expected_revision=source.revision then return draw_id;end if;
  raise exception 'Draw adjustment ID conflict' using errcode='22023';
 end if;
 if draw_id is null or exists(select 1 from public.draw_revisions where id=draw_id) then raise exception 'Draw adjustment ID conflict' using errcode='22023';end if;
 if exists(select 1 from public.draw_revisions where plan_id=plan.id and published_at is not null) then raise exception 'Published draw is locked' using errcode='22023';end if;
 select max(revision) into latest from public.draw_revisions where plan_id=plan.id;
 if expected_revision is distinct from latest or source.revision<>latest then raise exception 'Draw revision conflict' using errcode='22023';end if;
 select count(*) into total from public.draw_entries e where e.draw_id=source.id;
 if seed_a is null or seed_b is null or seed_a=seed_b or seed_a not between 1 and total or seed_b not between 1 and total or reason is null or length(btrim(reason)) not between 1 and 500 then raise exception 'Distinct valid seeds and reason required' using errcode='22023';end if;
 insert into public.draw_revisions(id,plan_id,revision,generated_by,mapping_snapshot) values(draw_id,plan.id,latest+1,auth.uid(),source.mapping_snapshot);
 insert into public.draw_seed_adjustments(draw_id,source_draw_id,seed_a,seed_b,reason,created_by) values(draw_id,source.id,seed_a,seed_b,btrim(reason),auth.uid());
 insert into public.draw_entries(draw_id,subteam_id,seed,rating_total,tie_lot) select swap_draw_seeds.draw_id,e.subteam_id,case e.seed when seed_a then seed_b when seed_b then seed_a else e.seed end,e.rating_total,e.tie_lot from public.draw_entries e where e.draw_id=source.id;
 insert into public.draw_seed_players(entry_id,player_id,gender,rating) select copy.id,p.player_id,p.gender,p.rating from public.draw_entries original join public.draw_entries copy on copy.subteam_id=original.subteam_id and copy.draw_id=swap_draw_seeds.draw_id join public.draw_seed_players p on p.entry_id=original.id where original.draw_id=source.id;
 perform private.populate_draw_graph(draw_id);
 select jsonb_agg(jsonb_build_object('seed',e.seed,'subteam_id',e.subteam_id) order by e.seed) into before_order from public.draw_entries e where e.draw_id=source.id;
 select jsonb_agg(jsonb_build_object('seed',e.seed,'subteam_id',e.subteam_id) order by e.seed) into after_order from public.draw_entries e where e.draw_id=swap_draw_seeds.draw_id;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state) values(auth.uid(),'organizer','draw.seeds_adjusted',draw_id,'draw',jsonb_build_object('draw_id',source.id,'order',before_order),jsonb_build_object('revision',latest+1,'source_draw',source.id,'seed_a',seed_a,'seed_b',seed_b,'reason',btrim(reason),'order',after_order));
 return draw_id;
end;$$;
revoke all on function public.swap_draw_seeds(uuid,uuid,integer,integer,integer,text) from public,anon;
grant execute on function public.swap_draw_seeds(uuid,uuid,integer,integer,integer,text) to authenticated;
commit;
