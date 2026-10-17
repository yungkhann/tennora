begin;
create type public.staff_role as enum ('organizer','main_judge','trainer','line_judge');
create table public.staff_accounts (
  id uuid primary key references public.profiles(id) on delete restrict,
  email text not null unique,
  display_name text not null check(char_length(btrim(display_name)) between 2 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.staff_roles (
  user_id uuid not null references public.staff_accounts(id) on delete restrict,
  role public.staff_role not null,
  primary key(user_id,role)
);
create table public.staff_jobs (
  id uuid primary key,
  operation text not null check(operation in ('create','reset')),
  target_id uuid not null,
  email text not null,
  display_name text not null,
  roles public.staff_role[] not null,
  status text not null default 'pending' check(status in ('pending','failed','complete')),
  actor_id uuid not null references public.staff_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index staff_jobs_create_email on public.staff_jobs(email) where operation='create';
create trigger staff_accounts_updated before update on public.staff_accounts for each row execute function private.set_updated_at();
create trigger staff_jobs_updated before update on public.staff_jobs for each row execute function private.set_updated_at();

alter table public.audit_logs alter column organization_id drop not null;
alter table public.audit_logs add column actor_role public.staff_role;
alter table public.audit_logs add column entity_type text;
alter table public.audit_logs add column before_state jsonb;
alter table public.audit_logs add column after_state jsonb;
create index audit_league_created on public.audit_logs(created_at desc) where organization_id is null;

create function private.has_staff_role(required public.staff_role default null)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_accounts a join public.staff_roles r on r.user_id=a.id
 where a.id=(select auth.uid()) and a.active and (required is null or r.role=required));
$$;
revoke all on function private.has_staff_role(public.staff_role) from public,anon;
grant execute on function private.has_staff_role(public.staff_role) to authenticated;
create function private.require_organizer() returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(170002);
 if not private.has_staff_role('organizer') then raise exception 'Organizer required' using errcode='42501'; end if;
end;
$$;
revoke all on function private.require_organizer() from public,anon,authenticated;
create function private.valid_staff_roles(roles public.staff_role[]) returns boolean language sql immutable set search_path='' as $$
 select roles is not null and cardinality(roles) between 1 and 4 and array_position(roles,null) is null
 and cardinality(roles)=(select count(distinct r) from unnest(roles) r);
$$;
revoke all on function private.valid_staff_roles(public.staff_role[]) from public,anon,authenticated;

alter table public.staff_accounts enable row level security;
alter table public.staff_roles enable row level security;
alter table public.staff_jobs enable row level security;
revoke all on public.staff_accounts,public.staff_roles,public.staff_jobs from anon,authenticated;
grant select on public.staff_accounts,public.staff_roles,public.staff_jobs to authenticated;
create policy staff_read on public.staff_accounts for select to authenticated using ((id=auth.uid() and active) or private.has_staff_role('organizer'));
create policy staff_role_read on public.staff_roles for select to authenticated using ((user_id=auth.uid() and private.has_staff_role()) or private.has_staff_role('organizer'));
create policy staff_job_read on public.staff_jobs for select to authenticated using (private.has_staff_role('organizer'));
create policy league_audit_read on public.audit_logs for select to authenticated using (organization_id is null and private.has_staff_role('organizer'));
revoke execute on function public.create_organization(text,text) from authenticated;

create function public.begin_staff_job(job_id uuid, job_operation text, target uuid, staff_email text, staff_name text, desired_roles public.staff_role[])
returns public.staff_jobs language plpgsql security definer set search_path='' as $$
declare job public.staff_jobs; normalized_email text:=lower(btrim(staff_email));
begin
 perform private.require_organizer();
 if job_id is null or job_operation not in ('create','reset') or job_operation is null then raise exception 'Invalid job' using errcode='22023'; end if;
 select * into job from public.staff_jobs where id=job_id;
 if found then
   if job.operation<>job_operation or (job_operation='create' and (job.email is distinct from normalized_email or job.display_name is distinct from btrim(staff_name) or job.roles is distinct from desired_roles)) or (job_operation='reset' and job.target_id is distinct from target) then
     raise exception 'Job payload conflict' using errcode='22023';
   end if;
   return job;
 end if;
 if job_operation='create' then
   if normalized_email is null or char_length(normalized_email)>254 or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or staff_name is null or char_length(btrim(staff_name)) not between 2 and 80 or not private.valid_staff_roles(desired_roles)
    then raise exception 'Invalid staff details' using errcode='22023'; end if;
   -- The database chooses the identity; client-selected existing Auth IDs cannot acquire roles.
   insert into public.staff_jobs(id,operation,target_id,email,display_name,roles,actor_id)
     values(job_id,'create',gen_random_uuid(),normalized_email,btrim(staff_name),desired_roles,auth.uid()) returning * into job;
 else
   select job_id,'reset',a.id,a.email,a.display_name,array[]::public.staff_role[],'pending',auth.uid(),now(),now()
     into job from public.staff_accounts a where a.id=target and a.active;
   if not found then raise exception 'Active staff required' using errcode='22023'; end if;
   insert into public.staff_jobs select (job).*;
 end if;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state)
 values(auth.uid(),'organizer','staff.job_started',job.id,'staff_job',jsonb_build_object('operation',job.operation,'target_id',job.target_id));
 return job;
end;
$$;

create function public.finish_staff_job(job_id uuid, succeeded boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare job public.staff_jobs;
begin
 perform private.require_organizer();
 select * into job from public.staff_jobs where id=job_id for update;
 if not found or succeeded is null then raise exception 'Unknown job' using errcode='22023'; end if;
 if job.status='complete' then return job.target_id; end if;
 if succeeded then
   if not exists(select 1 from auth.users where id=job.target_id and lower(email)=job.email) then raise exception 'Auth identity mismatch' using errcode='22023'; end if;
   if job.operation='create' then
     insert into public.staff_accounts(id,email,display_name) values(job.target_id,job.email,job.display_name);
     insert into public.staff_roles(user_id,role) select job.target_id,unnest(job.roles);
   end if;
 end if;
 update public.staff_jobs set status=case when succeeded then 'complete' else 'failed' end where id=job.id;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state)
 values(auth.uid(),'organizer',case when succeeded then 'staff.job_completed' else 'staff.job_failed' end,job.target_id,'staff_account',jsonb_build_object('job_id',job.id,'operation',job.operation));
 return job.target_id;
end;
$$;

create function public.change_staff(target uuid, desired_roles public.staff_role[], is_active boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare before_value jsonb; after_value jsonb; old_account public.staff_accounts;
begin
 perform private.require_organizer();
 if is_active is null or not private.valid_staff_roles(desired_roles) then raise exception 'Invalid staff details' using errcode='22023'; end if;
 select * into old_account from public.staff_accounts where id=target for update;
 if not found then raise exception 'Unknown staff' using errcode='22023'; end if;
 if target=auth.uid() and (not is_active or not ('organizer'=any(desired_roles))) then raise exception 'Self lockout forbidden' using errcode='22023'; end if;
 if old_account.active and exists(select 1 from public.staff_roles where user_id=target and role='organizer')
 and (not is_active or not ('organizer'=any(desired_roles))) and not exists(
 select 1 from public.staff_accounts a join public.staff_roles r on a.id=r.user_id where a.active and r.role='organizer' and a.id<>target)
 then raise exception 'Last Organizer required' using errcode='22023'; end if;
 select jsonb_build_object('active',old_account.active,'roles',coalesce(jsonb_agg(role order by role),'[]'::jsonb)) into before_value from public.staff_roles where user_id=target;
 update public.staff_accounts set active=is_active where id=target;
 delete from public.staff_roles where user_id=target;
 insert into public.staff_roles(user_id,role) select target,unnest(desired_roles);
 after_value:=jsonb_build_object('active',is_active,'roles',to_jsonb(desired_roles));
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state)
 values(auth.uid(),'organizer','staff.changed',target,'staff_account',before_value,after_value);
 return target;
end;
$$;

-- Trusted operator only; never inferred from tenant membership or metadata.
create function public.bootstrap_organizer(target uuid)
returns void language plpgsql security definer set search_path='' as $$
declare identity_row auth.users;
begin
 perform pg_advisory_xact_lock(170002);
 if exists(select 1 from public.staff_accounts a join public.staff_roles r on r.user_id=a.id where a.active and r.role='organizer') then raise exception 'Organizer already exists' using errcode='22023'; end if;
 select * into identity_row from auth.users where id=target;
 if not found or identity_row.email is null then raise exception 'Auth identity required' using errcode='22023'; end if;
 insert into public.staff_accounts(id,email,display_name) select target,lower(identity_row.email),display_name from public.profiles where id=target;
 insert into public.staff_roles values(target,'organizer');
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type) values(target,'organizer','staff.bootstrap',target,'staff_account');
end;
$$;
revoke all on function public.bootstrap_organizer(uuid) from public,anon,authenticated;
grant execute on function public.bootstrap_organizer(uuid) to service_role;
revoke all on function public.begin_staff_job(uuid,text,uuid,text,text,public.staff_role[]),public.finish_staff_job(uuid,boolean),public.change_staff(uuid,public.staff_role[],boolean) from public,anon;
grant execute on function public.begin_staff_job(uuid,text,uuid,text,text,public.staff_role[]),public.finish_staff_job(uuid,boolean),public.change_staff(uuid,public.staff_role[],boolean) to authenticated;
commit;
