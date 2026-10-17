begin;
create type public.season_status as enum ('draft','started');
create table public.seasons (
 id uuid primary key,
 name text not null check(char_length(btrim(name)) between 2 and 100),
 year integer not null check(year between 1900 and 2200),
 starts_on date not null,
 ends_on date not null check(ends_on>=starts_on),
 status public.season_status not null default 'draft',
 started_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((status='draft' and started_at is null) or (status='started' and started_at is not null))
);
create table public.tours (
 id uuid primary key,
 season_id uuid not null references public.seasons(id) on delete restrict,
 name text not null check(char_length(btrim(name)) between 2 and 100),
 ordinal integer not null check(ordinal between 1 and 100),
 starts_on date not null,
 ends_on date not null check(ends_on>=starts_on),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(season_id,ordinal)
);
create trigger seasons_updated before update on public.seasons for each row execute function private.set_updated_at();
create trigger tours_updated before update on public.tours for each row execute function private.set_updated_at();
alter table public.seasons enable row level security;
alter table public.tours enable row level security;
revoke all on public.seasons,public.tours from anon,authenticated;
grant select on public.seasons,public.tours to authenticated;
create policy season_staff_read on public.seasons for select to authenticated using(private.has_staff_role());
create policy tour_staff_read on public.tours for select to authenticated using(private.has_staff_role());

create function public.save_season(season_id uuid, season_name text, season_year integer, first_day date, last_day date)
returns uuid language plpgsql security definer set search_path='' as $$
declare before_value jsonb; after_value jsonb; old public.seasons;
begin
 perform private.require_organizer();
 if season_id is null or season_name is null or char_length(btrim(season_name)) not between 2 and 100 or season_year is null or season_year not between 1900 and 2200 or first_day is null or last_day is null or first_day>last_day then raise exception 'Invalid season details' using errcode='22023'; end if;
 select * into old from public.seasons where id=season_id for update;
 if found then
  if old.status<>'draft' then raise exception 'Season configuration locked' using errcode='22023'; end if;
  if exists(select 1 from public.tours where tours.season_id=save_season.season_id and (starts_on<first_day or ends_on>last_day)) then raise exception 'Dates exclude an existing tour' using errcode='22023'; end if;
  before_value:=to_jsonb(old);
  update public.seasons set name=btrim(season_name),year=season_year,starts_on=first_day,ends_on=last_day where id=season_id;
 else
  insert into public.seasons(id,name,year,starts_on,ends_on) values(season_id,btrim(season_name),season_year,first_day,last_day);
 end if;
 select to_jsonb(s) into after_value from public.seasons s where id=season_id;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state)
 values(auth.uid(),'organizer',case when before_value is null then 'season.created' else 'season.updated' end,season_id,'season',before_value,after_value);
 return season_id;
end;
$$;

create function public.save_tour(tour_id uuid, parent_season uuid, tour_name text, tour_ordinal integer, first_day date, last_day date)
returns uuid language plpgsql security definer set search_path='' as $$
declare parent public.seasons; old public.tours; before_value jsonb; after_value jsonb;
begin
 perform private.require_organizer();
 -- Parent lock is shared with all configuration/start commands.
 select * into parent from public.seasons where id=parent_season for update;
 if not found then raise exception 'Unknown season' using errcode='22023'; end if;
 if parent.status<>'draft' then raise exception 'Season configuration locked' using errcode='22023'; end if;
 if tour_id is null or tour_name is null or char_length(btrim(tour_name)) not between 2 and 100 or tour_ordinal is null or tour_ordinal not between 1 and 100 or first_day is null or last_day is null or first_day>last_day or first_day<parent.starts_on or last_day>parent.ends_on then raise exception 'Invalid tour details' using errcode='22023'; end if;
 select * into old from public.tours where id=tour_id for update;
 if found then
  if old.season_id<>parent_season then raise exception 'Tour belongs to another season' using errcode='22023'; end if;
  before_value:=to_jsonb(old);
  update public.tours set name=btrim(tour_name),ordinal=tour_ordinal,starts_on=first_day,ends_on=last_day where id=tour_id;
 else
  insert into public.tours(id,season_id,name,ordinal,starts_on,ends_on) values(tour_id,parent_season,btrim(tour_name),tour_ordinal,first_day,last_day);
 end if;
 select to_jsonb(t) into after_value from public.tours t where id=tour_id;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state)
 values(auth.uid(),'organizer',case when before_value is null then 'tour.created' else 'tour.updated' end,tour_id,'tour',before_value,after_value);
 return tour_id;
end;
$$;

-- Starting is deliberately unavailable until stage/settings readiness is implemented in C3.
-- Avoid locking a real season that cannot yet contain its required configuration.
create function public.start_season(season_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.require_organizer();
 perform 1 from public.seasons where id=season_id for update;
 if not found then raise exception 'Unknown season' using errcode='22023'; end if;
 raise exception 'Stage and settings readiness required' using errcode='22023';
end;
$$;

create function public.age_group_for_birth_year(birth_year integer, season_year integer)
returns text language sql immutable set search_path='' as $$
 select case when birth_year is null or season_year is null or birth_year<1900 or season_year not between 1900 and 2200 or season_year-birth_year<0 or season_year-birth_year>=17 then null
 when season_year-birth_year<13 then 'U13' when season_year-birth_year<15 then 'U15' else 'U17' end;
$$;
revoke all on function public.save_season(uuid,text,integer,date,date),public.save_tour(uuid,uuid,text,integer,date,date),public.start_season(uuid),public.age_group_for_birth_year(integer,integer) from public,anon;
grant execute on function public.save_season(uuid,text,integer,date,date),public.save_tour(uuid,uuid,text,integer,date,date),public.start_season(uuid),public.age_group_for_birth_year(integer,integer) to authenticated;
commit;
