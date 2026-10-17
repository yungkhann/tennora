-- Phase 1: identity, tenant onboarding and least-privilege access only.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.organization_role as enum ('owner', 'tournament_director', 'scorekeeper', 'player');

create function private.valid_roles(value public.organization_role[])
returns boolean language sql immutable set search_path = '' as $$
  select cardinality(value) between 1 and 4
    and array_position(value, null) is null
    and cardinality(value) = (select count(distinct r) from unnest(value) r);
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  roles public.organization_role[] not null check (private.valid_roles(roles)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members(user_id, organization_id);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_id uuid not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);

create function private.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger profiles_updated before update on public.profiles for each row execute function private.set_updated_at();
create trigger organizations_updated before update on public.organizations for each row execute function private.set_updated_at();
create trigger members_updated before update on public.organization_members for each row execute function private.set_updated_at();

create function private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare name_value text;
begin
  name_value := left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80);
  if char_length(name_value) < 2 then name_value := 'Player'; end if;
  insert into public.profiles(id, display_name) values(new.id, name_value);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

-- Definer helper avoids recursive membership policies. Identity always comes from auth.uid().
create function private.has_org_role(org_id uuid, required_role public.organization_role default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.organization_members m
    where m.organization_id = org_id and m.user_id = (select auth.uid())
      and (required_role is null or required_role = any(m.roles)));
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.audit_logs enable row level security;
revoke all on public.profiles, public.organizations, public.organization_members, public.audit_logs from anon, authenticated;
grant select on public.profiles, public.organizations, public.organization_members, public.audit_logs to authenticated;
grant update(display_name) on public.profiles to authenticated;
create policy profiles_self_read on public.profiles for select to authenticated using(id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using(id = (select auth.uid())) with check(id = (select auth.uid()));
create policy memberships_self_read on public.organization_members for select to authenticated using(user_id = (select auth.uid()));
create policy organizations_member_read on public.organizations for select to authenticated using(private.has_org_role(id));
create policy audit_owner_read on public.audit_logs for select to authenticated using(private.has_org_role(organization_id, 'owner'));

create function public.create_organization(organization_name text, organization_slug text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); new_id uuid;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if organization_name is null or char_length(btrim(organization_name)) not between 2 and 80
    or organization_slug is null or char_length(organization_slug) not between 3 and 48
    or organization_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    then raise exception 'Invalid organization details' using errcode = '22023'; end if;
  insert into public.organizations(name, slug, created_by)
    values(btrim(organization_name), organization_slug, caller) returning id into new_id;
  insert into public.organization_members(organization_id, user_id, roles) values(new_id, caller, array['owner']::public.organization_role[]);
  insert into public.audit_logs(organization_id, actor_id, action, entity_id) values(new_id, caller, 'organization.created', new_id);
  return new_id;
end;
$$;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.valid_roles(public.organization_role[]) to authenticated;
grant execute on function private.has_org_role(uuid, public.organization_role) to authenticated;
revoke all on function public.create_organization(text,text) from public, anon;
grant execute on function public.create_organization(text,text) to authenticated;
commit;
