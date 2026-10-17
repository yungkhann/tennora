begin;
-- C10's standard formula has a zero floor and no provisional 100000 ceiling.
-- Keep whole, finite, exactly serializable ratings and the existing write grants.
alter table public.players drop constraint players_current_rating_check;
alter table public.players add constraint players_current_rating_check check(current_rating>=0 and current_rating<=9007199254740991 and current_rating=trunc(current_rating));
alter table public.rating_history drop constraint rating_history_rating_after_check;
alter table public.rating_history add constraint rating_history_rating_after_check check(rating_after>=0 and rating_after<=9007199254740991 and rating_after=trunc(rating_after));
alter table public.tournament_settings drop constraint tournament_settings_k_factor_check;
alter table public.tournament_settings add constraint tournament_settings_k_factor_check check(k_factor>0 and k_factor<=9007199254740991);
create table public.league_tables(number integer primary key check(number between 1 and 128));
insert into public.league_tables select generate_series(1,128);
create table public.table_judge_assignments(
 id uuid primary key,
 context_tour_id uuid not null references public.tours(id) on delete restrict,
 venue_day date not null,
 table_number integer not null references public.league_tables(number) on delete restrict,
 revision integer not null check(revision>0),
 staff_id uuid references public.staff_accounts(id) on delete restrict,
 mode text not null check(mode in('line_judge','takeover','unassigned')),
 reason text not null check(length(btrim(reason)) between 1 and 500),
 created_by uuid not null references public.staff_accounts(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 unique(venue_day,table_number,revision),
 check((mode='unassigned' and staff_id is null) or (mode in('line_judge','takeover') and staff_id is not null))
);
create table public.table_day_heads(
 venue_day date not null,
 table_number integer not null references public.league_tables(number) on delete restrict,
 assignment_id uuid not null references public.table_judge_assignments(id) on delete restrict,
 staff_id uuid references public.staff_accounts(id) on delete restrict,
 version integer not null check(version>0),
 primary key(venue_day,table_number),unique(venue_day,staff_id)
);
create function private.validate_table_day_head() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.table_judge_assignments a where a.id=new.assignment_id and a.venue_day=new.venue_day and a.table_number=new.table_number and a.revision=new.version and a.staff_id is not distinct from new.staff_id) then raise exception 'Consistent table assignment head required' using errcode='22023';end if;
 return new;
end;$$;
revoke all on function private.validate_table_day_head() from public,anon,authenticated;
create trigger validate_table_day_head before insert or update on public.table_day_heads for each row execute function private.validate_table_day_head();
do $$declare relation text;begin
 foreach relation in array array['league_tables','table_judge_assignments','table_day_heads'] loop
  execute format('alter table public.%I enable row level security',relation);
  execute format('revoke all on public.%I from anon,authenticated',relation);
  execute format('grant select on public.%I to authenticated',relation);
 end loop;
end;$$;
create policy league_tables_read on public.league_tables for select to authenticated using(private.has_staff_role());
create policy judge_assignments_read on public.table_judge_assignments for select to authenticated using(private.has_staff_role() and (private.manages_all_teams() or staff_id=auth.uid()));
create policy day_heads_read on public.table_day_heads for select to authenticated using(private.has_staff_role() and (private.manages_all_teams() or staff_id=auth.uid()));
create function private.require_match_manager() returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(170002);
 if not private.manages_all_teams() then raise exception 'Match management permission required' using errcode='42501';end if;
end;$$;
revoke all on function private.require_match_manager() from public,anon,authenticated;
create function private.save_table_judge(command_id uuid,tour uuid,table_no integer,requested_day date,judge uuid,expected_version integer,mode_name text,note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare t public.tours;settings public.tournament_settings;head public.table_day_heads;old public.table_judge_assignments;value public.table_judge_assignments;
begin
 perform private.require_match_manager();
 select * into old from public.table_judge_assignments where id=command_id;
 if found then
  if old.context_tour_id=tour and old.table_number=table_no and old.venue_day=requested_day and old.staff_id is not distinct from judge and old.mode=mode_name and old.reason=btrim(note) and expected_version=old.revision-1 then return command_id;end if;
  raise exception 'Assignment ID conflict' using errcode='22023';
 end if;
 -- Administration already serializes settings edits. Do not hold the tour row
 -- while waiting for a scoring-owner head: result completion locks it after ownership.
 select * into t from public.tours where id=tour;
 select * into settings from public.tournament_settings where tour_id=t.id order by revision desc limit 1;
 if command_id is null or settings.id is null or requested_day is null or requested_day not between t.starts_on and t.ends_on or table_no is null or table_no not between 1 and settings.table_count or note is null or length(btrim(note)) not between 1 and 500 or mode_name not in('line_judge','takeover','unassigned') then raise exception 'Valid table, venue date and reason required' using errcode='22023';end if;
 if mode_name='unassigned' then
  if judge is not null then raise exception 'Invalid scoring owner' using errcode='22023';end if;
 elsif mode_name='takeover' then
  if judge is distinct from auth.uid() or requested_day<>(clock_timestamp() at time zone settings.venue_timezone)::date then raise exception 'Acting official and current venue day required' using errcode='42501';end if;
 elsif not exists(select 1 from public.staff_accounts a join public.staff_roles r on r.user_id=a.id where a.id=judge and a.active and r.role='line_judge') then raise exception 'Active Line Judge required' using errcode='22023';end if;
 select * into head from public.table_day_heads where venue_day=requested_day and table_number=table_no for update;
 if expected_version is distinct from coalesce(head.version,0) then raise exception 'Assignment version conflict' using errcode='40001';end if;
 if judge is not null and exists(select 1 from public.table_day_heads where venue_day=requested_day and staff_id=judge and table_number<>table_no) then raise exception 'Judge already assigned to another table' using errcode='22023';end if;
 insert into public.table_judge_assignments(id,context_tour_id,venue_day,table_number,revision,staff_id,mode,reason,created_by) values(command_id,tour,requested_day,table_no,coalesce(head.version,0)+1,judge,mode_name,btrim(note),auth.uid()) returning * into value;
 insert into public.table_day_heads(venue_day,table_number,assignment_id,staff_id,version) values(requested_day,table_no,command_id,judge,value.revision) on conflict(venue_day,table_number) do update set assignment_id=excluded.assignment_id,staff_id=excluded.staff_id,version=excluded.version;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state) values(auth.uid(),case when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'main_judge'::public.staff_role end,'table.judge_'||case mode_name when 'takeover' then 'takeover' when 'unassigned' then 'unassigned' else 'assigned' end,command_id,'table_judge_assignment',case when head.version is null then null else to_jsonb(head) end,to_jsonb(value));
 return command_id;
end;$$;
revoke all on function private.save_table_judge(uuid,uuid,integer,date,uuid,integer,text,text) from public,anon,authenticated;
create function public.assign_table_judge(assignment_id uuid,tournament uuid,table_no integer,venue_day date,staff uuid,expected_version integer,reason text)
returns uuid language plpgsql security definer set search_path='' as $$
begin return private.save_table_judge(assignment_id,tournament,table_no,venue_day,staff,expected_version,case when staff is null then 'unassigned' else 'line_judge' end,reason);end;$$;
create function public.takeover_table(assignment_id uuid,tournament uuid,table_no integer,venue_day date,expected_version integer,reason text)
returns uuid language plpgsql security definer set search_path='' as $$
begin return private.save_table_judge(assignment_id,tournament,table_no,venue_day,auth.uid(),expected_version,'takeover',reason);end;$$;
revoke all on function public.assign_table_judge(uuid,uuid,integer,date,uuid,integer,text),public.takeover_table(uuid,uuid,integer,date,integer,text) from public,anon;
grant execute on function public.assign_table_judge(uuid,uuid,integer,date,uuid,integer,text),public.takeover_table(uuid,uuid,integer,date,integer,text) to authenticated;
-- Only a future authorized match RPC may consume this predicate. The table/day
-- comes from the server's clock and saved venue timezone, never client metadata.
create function private.owns_scoring_table(table_no integer,tournament uuid)
returns boolean language sql volatile security definer set search_path='' as $$
 select exists(select 1 from public.tours t join lateral(select * from public.tournament_settings where tour_id=t.id order by revision desc limit 1) s on true join public.table_day_heads h on h.venue_day=(clock_timestamp() at time zone s.venue_timezone)::date and h.table_number=table_no join public.table_judge_assignments a on a.id=h.assignment_id where t.id=tournament and h.staff_id=auth.uid() and h.venue_day between t.starts_on and t.ends_on and table_no<=s.table_count and ((a.mode='line_judge' and private.has_staff_role('line_judge')) or (a.mode='takeover' and private.manages_all_teams())));
$$;
revoke all on function private.owns_scoring_table(integer,uuid) from public,anon,authenticated;

create or replace function public.save_tournament_settings(settings_id uuid, tournament uuid, expected_revision integer, k numeric, tables integer, rest integer, prioritize_finals boolean, timezone_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare parent public.seasons; old public.tournament_settings; existing public.tournament_settings; next_revision integer;
begin
 perform private.require_organizer();
 select s.* into parent from public.seasons s join public.tours t on t.season_id=s.id where t.id=tournament for update of s;
 if not found then raise exception 'Unknown tournament' using errcode='22023'; end if;
 perform 1 from public.tours where id=tournament for update;
 if settings_id is null or k is null or not(k>0 and k<=9007199254740991) or tables is null or tables not between 1 and 128 or rest is null or rest not between 0 and 1440 or prioritize_finals is null or timezone_name is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=timezone_name) then raise exception 'Invalid tournament settings' using errcode='22023'; end if;
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


commit;
