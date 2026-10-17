begin;
create table public.draw_seed_maps(
 id text primary key,
 group_count integer not null,
 qualifiers_per_group integer not null,
 slots jsonb not null
);
insert into public.draw_seed_maps values('four_groups_pairs_v1',4,2,'[{"group":1,"offset":0},{"group":2,"offset":1},{"group":3,"offset":0},{"group":4,"offset":1},{"group":2,"offset":0},{"group":1,"offset":1},{"group":4,"offset":0},{"group":3,"offset":1}]');
create table public.draw_revisions(
 id uuid primary key,
 plan_id uuid not null references public.tour_stage_plans(id) on delete restrict,
 revision integer not null check(revision>0),
 generated_by uuid not null references public.staff_accounts(id) on delete restrict,
 generated_at timestamptz not null default clock_timestamp(),
 published_at timestamptz,
 published_by uuid references public.staff_accounts(id) on delete restrict,
 mapping_snapshot jsonb not null,
 unique(plan_id,revision),
 check((published_at is null)=(published_by is null))
);
create unique index one_published_draw_per_plan on public.draw_revisions(plan_id) where published_at is not null;
create table public.stage_groups(
 id uuid primary key default gen_random_uuid(),
 draw_id uuid not null references public.draw_revisions(id) on delete restrict,
 stage_id uuid not null references public.stages(id) on delete restrict,
 ordinal integer not null check(ordinal>0),
 label text not null,
 unique(draw_id,stage_id,ordinal)
);
create table public.draw_entries(
 id uuid primary key default gen_random_uuid(),
 draw_id uuid not null references public.draw_revisions(id) on delete restrict,
 subteam_id uuid not null references public.subteams(id) on delete restrict,
 seed integer not null check(seed>0),
 rating_total numeric not null,
 tie_lot uuid not null,
 group_id uuid references public.stage_groups(id) on delete restrict,
 group_slot integer,
 unique(draw_id,subteam_id),unique(draw_id,seed),unique(group_id,group_slot)
);
create table public.draw_seed_players(
 entry_id uuid not null references public.draw_entries(id) on delete restrict,
 player_id uuid not null references public.players(id) on delete restrict,
 gender public.player_gender not null,
 rating numeric not null,
 primary key(entry_id,player_id)
);
create type public.team_match_status as enum('scheduled','called','in_progress','finished','cancelled');
create table public.team_matches(
 id uuid primary key default gen_random_uuid(),
 draw_id uuid not null references public.draw_revisions(id) on delete restrict,
 stage_id uuid not null references public.stages(id) on delete restrict,
 group_id uuid not null references public.stage_groups(id) on delete restrict,
 match_no integer not null check(match_no>0),
 round_no integer not null check(round_no>0),
 placement_from integer,
 placement_to integer,
 subteam_a uuid references public.subteams(id) on delete restrict,
 subteam_b uuid references public.subteams(id) on delete restrict,
 status public.team_match_status not null default 'scheduled',
 version integer not null default 0 check(version>=0),
 unique(group_id,match_no),
 check(subteam_a is null or subteam_b is null or subteam_a<>subteam_b),
 check((placement_from is null and placement_to is null) or (placement_from>=1 and placement_to>placement_from))
);
create table public.match_sources(
 match_id uuid not null references public.team_matches(id) on delete restrict,
 side text not null check(side in('a','b')),
 source_group_id uuid references public.stage_groups(id) on delete restrict,
 source_place integer check(source_place>0),
 source_match_id uuid references public.team_matches(id) on delete restrict,
 outcome text check(outcome in('winner','loser')),
 primary key(match_id,side),
 check((source_group_id is not null and source_place is not null and source_match_id is null and outcome is null) or (source_group_id is null and source_place is null and source_match_id is not null and outcome is not null)),
 check(source_match_id is distinct from match_id)
);
create index draw_matches on public.team_matches(draw_id,round_no);
create index match_dependencies on public.match_sources(source_match_id) where source_match_id is not null;
create index group_dependencies on public.match_sources(source_group_id,source_place) where source_group_id is not null;
create function private.can_read_draw(draw uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select private.has_staff_role() and exists(select 1 from public.draw_revisions d where d.id=draw and (d.published_at is not null or private.manages_all_teams()));
$$;
revoke all on function private.can_read_draw(uuid) from public,anon;
grant execute on function private.can_read_draw(uuid) to authenticated;
do $$declare relation text; begin
 foreach relation in array array['draw_seed_maps','draw_revisions','stage_groups','draw_entries','draw_seed_players','team_matches','match_sources'] loop
  execute format('alter table public.%I enable row level security',relation);
  execute format('revoke all on public.%I from anon,authenticated',relation);
  execute format('grant select on public.%I to authenticated',relation);
 end loop;
end;$$;
create policy seed_map_staff on public.draw_seed_maps for select to authenticated using(private.has_staff_role());
create policy draw_read on public.draw_revisions for select to authenticated using(private.can_read_draw(id));
create policy groups_read on public.stage_groups for select to authenticated using(private.can_read_draw(draw_id));
create policy entries_read on public.draw_entries for select to authenticated using(private.can_read_draw(draw_id));
create policy seed_players_read on public.draw_seed_players for select to authenticated using(exists(select 1 from public.draw_entries e where e.id=entry_id and private.can_read_draw(e.draw_id)));
create policy matches_read on public.team_matches for select to authenticated using(private.can_read_draw(draw_id));
create policy match_sources_read on public.match_sources for select to authenticated using(exists(select 1 from public.team_matches m where m.id=match_id and private.can_read_draw(m.draw_id)));

create function private.require_draw_manager() returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(170002);
 if not private.manages_all_teams() then raise exception 'Draw permission required' using errcode='42501'; end if;
end;$$;
revoke all on function private.require_draw_manager() from public,anon,authenticated;

-- Recursive classification uses explicit winner/loser edges, preserving all places.
create function private.classification_graph(draw uuid,stage uuid,bracket uuid,sources jsonb,round_number integer,first_place integer,last_place integer)
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
   insert into public.match_sources(match_id,side,source_group_id,source_place,source_match_id,outcome) values(match,case when side_no=0 then 'a' else 'b' end,(source->>'group_id')::uuid,(source->>'place')::integer,(source->>'match_id')::uuid,source->>'outcome');
  end loop;
  winners:=winners||jsonb_build_array(jsonb_build_object('match_id',match,'outcome','winner'));
  losers:=losers||jsonb_build_array(jsonb_build_object('match_id',match,'outcome','loser'));
 end loop;
 if count_entries>2 then
  perform private.classification_graph(draw,stage,bracket,winners,round_number+1,first_place,(first_place+last_place)/2);
  perform private.classification_graph(draw,stage,bracket,losers,round_number+1,(first_place+last_place)/2+1,last_place);
 end if;
end;$$;
revoke all on function private.classification_graph(uuid,uuid,uuid,jsonb,integer,integer,integer) from public,anon,authenticated;

create function public.generate_tour_draw(draw_id uuid,tournament uuid,age public.age_group,expected_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare parent public.seasons; plan public.tour_stage_plans; root public.stages; child public.stages; pattern public.stage_templates; mapping public.draw_seed_maps; old public.draw_revisions; latest integer; root_groups integer; group_size integer; group_number integer; group_uuid uuid; root_group_ids uuid[]:='{}'; positions integer[]; rotated integer[]; length integer; r integer; i integer; a integer; b integer; a_team uuid; b_team uuid; match_number integer; sources jsonb; slot jsonb; audit_seeds jsonb;
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
 if root.kind<>'round_robin' then raise exception 'Draw map not supported' using errcode='22023'; end if;
 root_groups:=(root.configuration->>'group_count')::integer; group_size:=(root.configuration->>'group_size')::integer;
 for child in select * from public.stages where plan_id=plan.id and ordinal>1 order by ordinal loop
  select * into mapping from public.draw_seed_maps where group_count=root_groups and qualifiers_per_group=(child.configuration->>'place_to')::integer-(child.configuration->>'place_from')::integer+1;
  if not found then raise exception 'Draw map not supported' using errcode='22023'; end if;
 end loop;
 -- Freeze ratings across the seed-total and identity snapshots, including live
 -- rating updates from other tournaments. Scoring uses player row locks, not 170005.
 perform p.id from public.players p join public.roster_memberships m on m.player_id=p.id join public.subteams sub on sub.id=m.subteam_id where m.season_id=parent.id and sub.age_group=age and m.ended_at is null order by p.id for share of p;
 insert into public.draw_revisions(id,plan_id,revision,generated_by,mapping_snapshot) values(draw_id,plan.id,latest+1,auth.uid(),coalesce(to_jsonb(mapping),'{}'));
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
 select jsonb_agg(jsonb_build_object('subteam_id',subteam_id,'seed',seed,'rating_total',rating_total,'tie_lot',tie_lot) order by seed) into audit_seeds from public.draw_entries where draw_entries.draw_id=generate_tour_draw.draw_id;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),case when private.has_staff_role('organizer') then 'organizer' else 'main_judge' end,'draw.generated',draw_id,'draw',jsonb_build_object('plan_id',plan.id,'revision',latest+1,'seeds',audit_seeds,'mapping',coalesce(to_jsonb(mapping),'{}')));
 return draw_id;
end;$$;

create function public.publish_tour_draw(draw uuid,expected_revision integer)
returns void language plpgsql security definer set search_path='' as $$
declare value public.draw_revisions;
begin
 perform private.require_draw_manager();
 select * into value from public.draw_revisions where id=draw;
 if not found then raise exception 'Unknown draw' using errcode='22023'; end if;
 perform 1 from public.tour_stage_plans where id=value.plan_id for update;
 select * into value from public.draw_revisions where id=draw for update;
 if value.published_at is not null then return; end if;
 if value.revision is distinct from expected_revision or value.revision<>(select max(revision) from public.draw_revisions where plan_id=value.plan_id) then raise exception 'Draw revision conflict' using errcode='22023'; end if;
 update public.draw_revisions set published_at=clock_timestamp(),published_by=auth.uid() where id=draw;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),case when private.has_staff_role('organizer') then 'organizer' else 'main_judge' end,'draw.published',draw,'draw',jsonb_build_object('revision',value.revision,'plan_id',value.plan_id));
end;$$;
revoke all on function public.generate_tour_draw(uuid,uuid,public.age_group,integer),public.publish_tour_draw(uuid,integer) from public,anon;
grant execute on function public.generate_tour_draw(uuid,uuid,public.age_group,integer),public.publish_tour_draw(uuid,integer) to authenticated;
commit;
