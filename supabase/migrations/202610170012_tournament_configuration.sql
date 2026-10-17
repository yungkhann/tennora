begin;
create table public.tournament_settings(
 id uuid primary key,
 tour_id uuid not null references public.tours(id) on delete restrict,
 revision integer not null check(revision>0),
 k_factor numeric not null check(k_factor>0 and k_factor<'Infinity'::numeric),
 table_count integer not null check(table_count between 1 and 128),
 rest_minutes integer not null check(rest_minutes between 0 and 1440),
 finals_priority boolean not null,
 venue_timezone text not null,
 effective_at timestamptz not null default clock_timestamp(),
 created_by uuid not null references public.staff_accounts(id) on delete restrict,
 unique(tour_id,revision)
);
create table public.stage_templates(
 id uuid primary key,
 name text not null check(char_length(btrim(name)) between 2 and 100),
 definition jsonb not null,
 entry_count integer not null check(entry_count between 2 and 1024),
 created_by uuid not null references public.staff_accounts(id) on delete restrict,
 created_at timestamptz not null default now()
);
create table public.tour_stage_plans(
 id uuid primary key,
 tour_id uuid not null references public.tours(id) on delete restrict,
 age_group public.age_group not null,
 revision integer not null check(revision>0),
 template_id uuid not null references public.stage_templates(id) on delete restrict,
 created_by uuid not null references public.staff_accounts(id) on delete restrict,
 created_at timestamptz not null default now(),
 unique(tour_id,age_group,revision)
);
create table public.stages(
 id uuid primary key default gen_random_uuid(),
 plan_id uuid not null references public.tour_stage_plans(id) on delete restrict,
 ordinal integer not null check(ordinal>0),
 kind text not null check(kind in('round_robin','knockout')),
 configuration jsonb not null,
 unique(plan_id,ordinal)
);
create table public.season_configuration_snapshots(
 season_id uuid primary key references public.seasons(id) on delete restrict,
 configuration jsonb not null,
 created_by uuid not null references public.staff_accounts(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp()
);
do $$declare relation text; begin
 foreach relation in array array['tournament_settings','stage_templates','tour_stage_plans','stages','season_configuration_snapshots'] loop
  execute format('alter table public.%I enable row level security',relation);
  execute format('revoke all on public.%I from anon,authenticated',relation);
  execute format('grant select on public.%I to authenticated',relation);
  execute format('create policy config_staff_read on public.%I for select to authenticated using(private.has_staff_role())',relation);
 end loop;
end;$$;

-- Supported reusable data grammar: one round-robin or knockout root, optionally
-- followed by parallel knockout stages partitioning every root placement once.
-- This validates placement-to-bracket routing; D adds frozen seeds/draw ordering.
create function private.template_entry_count(definition jsonb)
returns integer language plpgsql immutable set search_path='' as $$
declare nodes jsonb; root jsonb; node jsonb; n integer; groups integer; size integer; total integer; used integer[]:='{}'; lo integer; hi integer; place integer; i integer;
begin
 nodes:=definition->'nodes';
 if jsonb_typeof(definition)<>'object' or jsonb_typeof(nodes)<>'array' or jsonb_array_length(nodes) not between 1 and 33 then raise exception 'Invalid stage template' using errcode='22023'; end if;
 root:=nodes->0; n:=jsonb_array_length(nodes);
 if (root->>'ordinal')::integer is distinct from 1 then raise exception 'Invalid stage template' using errcode='22023'; end if;
 if root->>'kind'='knockout' then
  size:=(root->>'size')::integer;
  if n<>1 or size is null or size not between 2 and 1024 or (size & (size-1))<>0 then raise exception 'Invalid stage template' using errcode='22023'; end if;
  return size;
 elsif root->>'kind'='round_robin' then
  groups:=(root->>'group_count')::integer; size:=(root->>'group_size')::integer; total:=groups*size;
  if groups is null or size is null or groups not between 1 and 32 or size not between 2 and 32 or total>1024 then raise exception 'Invalid stage template' using errcode='22023'; end if;
 else raise exception 'Invalid stage template' using errcode='22023'; end if;
 if n=1 then return total; end if;
 for i in 1..n-1 loop
  node:=nodes->i; lo:=(node->>'place_from')::integer; hi:=(node->>'place_to')::integer;
  if node->>'kind' is distinct from 'knockout' or (node->>'ordinal')::integer is distinct from i+1 or (node->>'source_ordinal')::integer is distinct from 1 or lo is null or hi is null or lo<1 or hi>size or lo>hi or (node->>'size')::integer is distinct from groups*(hi-lo+1) or groups*(hi-lo+1)<2 or (groups*(hi-lo+1) & (groups*(hi-lo+1)-1))<>0 then raise exception 'Invalid stage template' using errcode='22023'; end if;
  for place in lo..hi loop
   if place=any(used) then raise exception 'Overlapping placement bands' using errcode='22023'; end if;
   used:=array_append(used,place);
  end loop;
 end loop;
 if cardinality(used)<>size then raise exception 'Incomplete placement bands' using errcode='22023'; end if;
 return total;
exception when invalid_text_representation or numeric_value_out_of_range then
 raise exception 'Invalid stage template' using errcode='22023';
end;$$;
revoke all on function private.template_entry_count(jsonb) from public,anon,authenticated;

create function public.create_stage_template(template_id uuid, template_name text, definition jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare entries integer; old public.stage_templates;
begin
 perform private.require_organizer();
 entries:=private.template_entry_count(definition);
 if template_id is null or template_name is null or char_length(btrim(template_name)) not between 2 and 100 or entries is null then raise exception 'Invalid stage template' using errcode='22023'; end if;
 select * into old from public.stage_templates where id=template_id;
 if found then
  if old.name=btrim(template_name) and old.definition=definition then return template_id; end if;
  raise exception 'Template ID conflict' using errcode='22023';
 end if;
 insert into public.stage_templates(id,name,definition,entry_count,created_by) values(template_id,btrim(template_name),definition,entries,auth.uid());
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),'organizer','stage_template.created',template_id,'stage_template',jsonb_build_object('name',btrim(template_name),'definition',definition,'entry_count',entries));
 return template_id;
end;$$;

create function public.save_tournament_settings(settings_id uuid, tournament uuid, expected_revision integer, k numeric, tables integer, rest integer, prioritize_finals boolean, timezone_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare parent public.seasons; old public.tournament_settings; existing public.tournament_settings; next_revision integer;
begin
 perform private.require_organizer();
 select s.* into parent from public.seasons s join public.tours t on t.season_id=s.id where t.id=tournament for update of s;
 if not found then raise exception 'Unknown tournament' using errcode='22023'; end if;
 perform 1 from public.tours where id=tournament for update;
 if settings_id is null or k is null or not(k>0 and k<'Infinity'::numeric) or tables is null or tables not between 1 and 128 or rest is null or rest not between 0 and 1440 or prioritize_finals is null or timezone_name is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=timezone_name) then raise exception 'Invalid tournament settings' using errcode='22023'; end if;
 select * into existing from public.tournament_settings where id=settings_id;
 if found then
  if existing.tour_id=tournament and existing.k_factor=k and existing.table_count=tables and existing.rest_minutes=rest and existing.finals_priority=prioritize_finals and existing.venue_timezone=timezone_name then return settings_id; end if;
  raise exception 'Settings ID conflict' using errcode='22023';
 end if;
 select * into old from public.tournament_settings where tour_id=tournament order by revision desc limit 1;
 if expected_revision is distinct from coalesce(old.revision,0) then raise exception 'Settings revision conflict' using errcode='22023'; end if;
 if parent.status='started' and (old.id is null or old.table_count<>tables or old.rest_minutes<>rest or old.finals_priority<>prioritize_finals or old.venue_timezone<>timezone_name) then raise exception 'Season configuration locked' using errcode='22023'; end if;
 next_revision:=coalesce(old.revision,0)+1;
 insert into public.tournament_settings(id,tour_id,revision,k_factor,table_count,rest_minutes,finals_priority,venue_timezone,created_by) values(settings_id,tournament,next_revision,k,tables,rest,prioritize_finals,timezone_name,auth.uid());
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state) values(auth.uid(),'organizer','tournament_settings.created',tournament,'tour',to_jsonb(old),(select to_jsonb(v) from public.tournament_settings v where id=settings_id));
 return settings_id;
end;$$;

create function public.configure_tour_stages(tournament uuid, template uuid, age_groups public.age_group[])
returns void language plpgsql security definer set search_path='' as $$
declare parent public.seasons; pattern public.stage_templates; age public.age_group; plan uuid; next_revision integer;
begin
 perform private.require_organizer();
 select s.* into parent from public.seasons s join public.tours t on t.season_id=s.id where t.id=tournament for update of s;
 if not found then raise exception 'Unknown tournament' using errcode='22023'; end if;
 if parent.status<>'draft' then raise exception 'Season configuration locked' using errcode='22023'; end if;
 select * into pattern from public.stage_templates where id=template;
 if not found or age_groups is null or cardinality(age_groups) not between 1 and 3 or array_position(age_groups,null) is not null or cardinality(age_groups)<>(select count(distinct a) from unnest(age_groups) a) then raise exception 'Template and age groups required' using errcode='22023'; end if;
 foreach age in array age_groups loop
  -- Exact retries are no-ops. New selections append and preserve previous stages.
  if exists(select 1 from public.tour_stage_plans p where p.tour_id=tournament and p.age_group=age and p.template_id=template and p.revision=(select max(q.revision) from public.tour_stage_plans q where q.tour_id=tournament and q.age_group=age)) then continue; end if;
  select coalesce(max(revision),0)+1 into next_revision from public.tour_stage_plans where tour_id=tournament and age_group=age;
  plan:=gen_random_uuid();
  insert into public.tour_stage_plans(id,tour_id,age_group,revision,template_id,created_by) values(plan,tournament,age,next_revision,template,auth.uid());
  insert into public.stages(plan_id,ordinal,kind,configuration) select plan,(node->>'ordinal')::integer,node->>'kind',node from jsonb_array_elements(pattern.definition->'nodes') node;
  insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),'organizer','stages.configured',tournament,'tour',jsonb_build_object('plan_id',plan,'age_group',age,'revision',next_revision,'template_id',template));
 end loop;
end;$$;

create function private.season_readiness(parent_season uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare problems text[]:='{}'; clubs integer; tour_count integer;
begin
 select count(*) into clubs from public.season_team_entries where season_id=parent_season;
 select count(*) into tour_count from public.tours where season_id=parent_season;
 if tour_count=0 then problems:=array_append(problems,'no_tours'); end if;
 if exists(select 1 from public.tours t where t.season_id=parent_season and not exists(select 1 from public.tournament_settings s where s.tour_id=t.id)) then problems:=array_append(problems,'missing_settings'); end if;
 if exists(select 1 from public.tours t cross join unnest(enum_range(null::public.age_group)) age where t.season_id=parent_season and not exists(select 1 from public.tour_stage_plans p where p.tour_id=t.id and p.age_group=age)) then problems:=array_append(problems,'missing_stage_plans'); end if;
 if exists(select 1 from public.tours t join public.tour_stage_plans p on p.tour_id=t.id join public.stage_templates f on f.id=p.template_id where t.season_id=parent_season and p.revision=(select max(q.revision) from public.tour_stage_plans q where q.tour_id=t.id and q.age_group=p.age_group) and f.entry_count<>(select count(*) from public.season_team_entries e join public.subteams sub on sub.team_id=e.team_id and sub.age_group=p.age_group where e.season_id=parent_season)) then problems:=array_append(problems,'entry_count_mismatch'); end if;
 return jsonb_build_object('ready',cardinality(problems)=0,'problems',to_jsonb(problems),'club_count',clubs,'tour_count',tour_count);
end;$$;
revoke all on function private.season_readiness(uuid) from public,anon,authenticated;
create function public.season_configuration_readiness(parent_season uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.require_organizer();
 if not exists(select 1 from public.seasons where id=parent_season) then raise exception 'Unknown season' using errcode='22023'; end if;
 return private.season_readiness(parent_season);
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
 select jsonb_build_object('tours',jsonb_agg(jsonb_build_object('tour_id',t.id,'settings_id',(select s.id from public.tournament_settings s where s.tour_id=t.id order by s.revision desc limit 1),'plan_ids',(select jsonb_agg(p.id order by p.age_group) from public.tour_stage_plans p where p.tour_id=t.id and p.revision=(select max(q.revision) from public.tour_stage_plans q where q.tour_id=t.id and q.age_group=p.age_group))) order by t.ordinal)) into snapshot from public.tours t where t.season_id=start_season.season_id;
 insert into public.season_configuration_snapshots(season_id,configuration,created_by) values(season_id,snapshot,auth.uid());
 update public.seasons set status='started',started_at=clock_timestamp() where id=season_id;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state) values(auth.uid(),'organizer','season.started',season_id,'season',to_jsonb(parent),snapshot);
end;$$;
revoke all on function public.create_stage_template(uuid,text,jsonb),public.save_tournament_settings(uuid,uuid,integer,numeric,integer,integer,boolean,text),public.configure_tour_stages(uuid,uuid,public.age_group[]),public.season_configuration_readiness(uuid) from public,anon;
grant execute on function public.create_stage_template(uuid,text,jsonb),public.save_tournament_settings(uuid,uuid,integer,numeric,integer,integer,boolean,text),public.configure_tour_stages(uuid,uuid,public.age_group[]),public.season_configuration_readiness(uuid) to authenticated;
commit;
