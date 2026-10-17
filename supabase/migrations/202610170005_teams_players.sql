begin;
create type public.age_group as enum('U13','U15','U17');
create type public.player_gender as enum('boy','girl');
create type public.player_status as enum('active','dropped_out');
create table public.teams(
 id uuid primary key,
 name text not null check(char_length(btrim(name)) between 2 and 100),
 region text not null check(char_length(btrim(region)) between 1 and 100),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.subteams(
 id uuid primary key default gen_random_uuid(),team_id uuid not null references public.teams(id) on delete restrict,
 age_group public.age_group not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(team_id,age_group)
);
create table public.season_team_entries(
 season_id uuid not null references public.seasons(id) on delete restrict,team_id uuid not null references public.teams(id) on delete restrict,
 created_at timestamptz not null default now(),primary key(season_id,team_id)
);
create table public.trainer_profiles(
 user_id uuid primary key references public.staff_accounts(id) on delete restrict,team_id uuid not null references public.teams(id) on delete restrict,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.subteam_trainers(
 subteam_id uuid not null references public.subteams(id) on delete restrict,trainer_id uuid not null references public.trainer_profiles(user_id) on delete restrict,
 created_at timestamptz not null default now(),primary key(subteam_id,trainer_id)
);
create table public.players(
 id uuid primary key,team_id uuid not null references public.teams(id) on delete restrict,
 first_name text not null check(char_length(btrim(first_name)) between 1 and 80),last_name text not null check(char_length(btrim(last_name)) between 1 and 80),
 gender public.player_gender not null,date_of_birth date not null,playing_hand text not null check(playing_hand in ('left','right')),
 playing_style text not null check(char_length(btrim(playing_style)) between 1 and 100),sports_level text not null check(char_length(btrim(sports_level)) between 1 and 100),
 current_rating numeric not null default 1000 check(current_rating>=0 and current_rating<100000),
 external_rating_id text unique check(char_length(external_rating_id) between 1 and 100),
 status public.player_status not null default 'active',created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.roster_memberships(
 id uuid primary key default gen_random_uuid(),season_id uuid not null references public.seasons(id) on delete restrict,
 subteam_id uuid not null references public.subteams(id) on delete restrict,player_id uuid not null references public.players(id) on delete restrict,
 joined_at timestamptz not null default now(),ended_at timestamptz,ended_reason text,created_at timestamptz not null default now(),
 check(ended_at is null or ended_at>=joined_at),check((ended_at is null and ended_reason is null) or (ended_at is not null and char_length(btrim(ended_reason))>0))
);
create unique index roster_one_active_per_season on public.roster_memberships(player_id,season_id) where ended_at is null;
create index roster_capacity_idx on public.roster_memberships(subteam_id,season_id) where ended_at is null;
create table public.player_status_events(
 id uuid primary key default gen_random_uuid(),player_id uuid not null references public.players(id) on delete restrict,status public.player_status not null,
 effective_at timestamptz not null,reason text not null check(char_length(btrim(reason)) between 1 and 500),set_by uuid not null references public.staff_accounts(id) on delete restrict,created_at timestamptz not null default now()
);
create table public.player_trainer_refs(
 player_id uuid not null references public.players(id) on delete restrict,kind text not null check(kind in ('first','personal')),
 trainer_id uuid references public.trainer_profiles(user_id) on delete restrict,free_first_name text,free_last_name text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(player_id,kind),
 check((trainer_id is not null and free_first_name is null and free_last_name is null) or (trainer_id is null and char_length(btrim(free_first_name)) between 1 and 80 and char_length(btrim(free_last_name)) between 1 and 80 and free_first_name is not null and free_last_name is not null))
);
-- Import execution is deferred; provenance schema is present now.
create table public.rating_imports(
 id uuid primary key default gen_random_uuid(),source text not null,external_revision text not null,created_by uuid not null references public.staff_accounts(id) on delete restrict,
 created_at timestamptz not null default now(),unique(source,external_revision)
);
create table public.rating_history(
 id uuid primary key default gen_random_uuid(),player_id uuid not null references public.players(id) on delete restrict,
 source text not null check(source in ('initial','import','game','correction')),rating_before numeric,rating_after numeric not null check(rating_after>=0 and rating_after<100000),
 import_id uuid references public.rating_imports(id) on delete restrict,external_rating_id text,created_at timestamptz not null default now(),
 check(source<>'import' or import_id is not null)
);
create unique index one_initial_rating on public.rating_history(player_id) where source='initial';
create index players_team_idx on public.players(team_id);
create index subteams_team_idx on public.subteams(team_id);
create index status_player_idx on public.player_status_events(player_id,created_at desc);
create index rating_player_idx on public.rating_history(player_id,created_at desc);
create trigger teams_updated before update on public.teams for each row execute function private.set_updated_at();
create trigger players_updated before update on public.players for each row execute function private.set_updated_at();
create trigger trainer_updated before update on public.trainer_profiles for each row execute function private.set_updated_at();
create trigger refs_updated before update on public.player_trainer_refs for each row execute function private.set_updated_at();

create function private.manages_all_teams() returns boolean language sql stable security definer set search_path='' as $$
 select private.has_staff_role('organizer') or private.has_staff_role('main_judge');
$$;
create function private.can_manage_team(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.manages_all_teams() or (private.has_staff_role('trainer') and exists(select 1 from public.trainer_profiles where user_id=auth.uid() and team_id=target));
$$;
create function private.can_manage_subteam(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.manages_all_teams() or (private.has_staff_role('trainer') and exists(select 1 from public.subteam_trainers a join public.trainer_profiles p on p.user_id=a.trainer_id join public.subteams s on s.id=a.subteam_id where a.subteam_id=target and a.trainer_id=auth.uid() and p.team_id=s.team_id));
$$;
create function private.can_manage_player(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.players where id=target and private.can_manage_team(team_id));
$$;
revoke all on function private.manages_all_teams(),private.can_manage_team(uuid),private.can_manage_subteam(uuid),private.can_manage_player(uuid) from public,anon;
grant execute on function private.manages_all_teams(),private.can_manage_team(uuid),private.can_manage_subteam(uuid),private.can_manage_player(uuid) to authenticated;

do $$declare relation text; begin
 foreach relation in array array['teams','subteams','season_team_entries','trainer_profiles','subteam_trainers','players','roster_memberships','player_status_events','player_trainer_refs','rating_imports','rating_history'] loop
 execute format('alter table public.%I enable row level security',relation);
 execute format('revoke all on public.%I from anon,authenticated',relation);
 execute format('grant select on public.%I to authenticated',relation);
 end loop;
end $$;
create policy teams_scope on public.teams for select to authenticated using(private.can_manage_team(id));
create policy subteams_scope on public.subteams for select to authenticated using(private.can_manage_team(team_id));
create policy entries_scope on public.season_team_entries for select to authenticated using(private.can_manage_team(team_id));
create policy trainers_scope on public.trainer_profiles for select to authenticated using(private.can_manage_team(team_id));
create policy subteam_trainers_scope on public.subteam_trainers for select to authenticated using(exists(select 1 from public.subteams s where s.id=subteam_id and private.can_manage_team(s.team_id)));
create policy players_scope on public.players for select to authenticated using(private.can_manage_team(team_id));
create policy roster_scope on public.roster_memberships for select to authenticated using(private.can_manage_subteam(subteam_id));
create policy status_scope on public.player_status_events for select to authenticated using(private.can_manage_player(player_id));
create policy refs_scope on public.player_trainer_refs for select to authenticated using(private.can_manage_player(player_id));
create policy imports_scope on public.rating_imports for select to authenticated using(private.has_staff_role('organizer'));
create policy ratings_scope on public.rating_history for select to authenticated using(private.can_manage_player(player_id));

create function private.league_audit(action_name text, entity uuid, kind text, old_value jsonb, new_value jsonb)
returns void language plpgsql set search_path='' as $$
declare effective_role public.staff_role;
begin
 select role into effective_role from public.staff_roles where user_id=auth.uid() order by role limit 1;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state) values(auth.uid(),effective_role,action_name,entity,kind,old_value,new_value);
end;
$$;
revoke all on function private.league_audit(text,uuid,text,jsonb,jsonb) from public,anon,authenticated;

create function public.save_team(team_id uuid, team_name text, team_region text)
returns uuid language plpgsql security definer set search_path='' as $$
declare old public.teams;
begin
 perform pg_advisory_xact_lock(170005);
 select * into old from public.teams where id=team_id for update;
 if (found and not private.can_manage_team(team_id)) or (not found and not private.manages_all_teams()) then raise exception 'Team permission required' using errcode='42501'; end if;
 if team_id is null or team_name is null or char_length(btrim(team_name)) not between 2 and 100 or team_region is null or char_length(btrim(team_region)) not between 1 and 100 then raise exception 'Invalid team details' using errcode='22023'; end if;
 insert into public.teams(id,name,region) values(team_id,btrim(team_name),btrim(team_region)) on conflict(id) do update set name=excluded.name,region=excluded.region;
 insert into public.subteams(team_id,age_group) select team_id,unnest(enum_range(null::public.age_group)) on conflict do nothing;
 perform private.league_audit(case when old.id is null then 'team.created' else 'team.updated' end,team_id,'team',to_jsonb(old),jsonb_build_object('name',btrim(team_name),'region',btrim(team_region)));
 return team_id;
end;
$$;
create function public.register_season_team(parent_season uuid, club uuid)
returns void language plpgsql security definer set search_path='' as $$
declare season public.seasons;
begin
 if not private.manages_all_teams() then raise exception 'Team permission required' using errcode='42501'; end if;
 select * into season from public.seasons where id=parent_season for update;
 if not found or season.status<>'draft' then raise exception 'Draft season required' using errcode='22023'; end if;
 insert into public.season_team_entries(season_id,team_id) values(parent_season,club) on conflict do nothing;
 perform private.league_audit('team.registered',club,'team',null,jsonb_build_object('season_id',parent_season));
end;
$$;
create function public.assign_team_trainer(trainer uuid,club uuid,coached_subteams uuid[])
returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(170005);
 if not private.manages_all_teams() then raise exception 'Team permission required' using errcode='42501'; end if;
 if not exists(select 1 from public.staff_accounts a join public.staff_roles r on r.user_id=a.id where a.id=trainer and a.active and r.role='trainer') then raise exception 'Active Trainer required' using errcode='22023'; end if;
 if coached_subteams is null or cardinality(coached_subteams) not between 1 and 3 or array_position(coached_subteams,null) is not null or cardinality(coached_subteams)<>(select count(distinct id) from unnest(coached_subteams) id) or exists(select 1 from unnest(coached_subteams) id where not exists(select 1 from public.subteams s where s.id=id and s.team_id=club)) then raise exception 'Subteams must belong to the club' using errcode='22023'; end if;
 delete from public.subteam_trainers where trainer_id=trainer;
 insert into public.trainer_profiles(user_id,team_id) values(trainer,club) on conflict(user_id) do update set team_id=excluded.team_id;
 insert into public.subteam_trainers(subteam_id,trainer_id) select unnest(coached_subteams),trainer;
 perform private.league_audit('trainer.assigned',trainer,'trainer',null,jsonb_build_object('team_id',club,'subteams',coached_subteams));
end;
$$;

create function public.save_player(player_id uuid,club uuid,first_name text,last_name text,gender public.player_gender,dob date,hand text,style text,sports_level text,external_id text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare old public.players; value public.players;
begin
 perform pg_advisory_xact_lock(170005);
 if not private.can_manage_team(club) then raise exception 'Team permission required' using errcode='42501'; end if;
 select * into old from public.players where id=player_id for update;
 if found and old.team_id<>club then raise exception 'Use Organizer transfer' using errcode='42501'; end if;
 if player_id is null or dob is null or dob>current_date or dob<'1900-01-01' or first_name is null or char_length(btrim(first_name)) not between 1 and 80 or last_name is null or char_length(btrim(last_name)) not between 1 and 80 or gender is null or hand is null or hand not in ('left','right') or style is null or char_length(btrim(style)) not between 1 and 100 or sports_level is null or char_length(btrim(sports_level)) not between 1 and 100 or (external_id is not null and char_length(btrim(external_id)) not between 1 and 100) then raise exception 'Invalid player details' using errcode='22023'; end if;
 if exists(select 1 from public.roster_memberships m join public.subteams s on s.id=m.subteam_id join public.seasons season on season.id=m.season_id where m.player_id=save_player.player_id and m.ended_at is null and public.age_group_for_birth_year(extract(year from dob)::integer,season.year) is distinct from s.age_group::text) then raise exception 'DOB invalidates an active roster' using errcode='22023'; end if;
 insert into public.players(id,team_id,first_name,last_name,gender,date_of_birth,playing_hand,playing_style,sports_level,external_rating_id) values(player_id,club,btrim(first_name),btrim(last_name),gender,dob,hand,btrim(style),btrim(sports_level),external_id)
 on conflict(id) do update set first_name=excluded.first_name,last_name=excluded.last_name,gender=excluded.gender,date_of_birth=excluded.date_of_birth,playing_hand=excluded.playing_hand,playing_style=excluded.playing_style,sports_level=excluded.sports_level,external_rating_id=excluded.external_rating_id returning * into value;
 if old.id is null then insert into public.rating_history(player_id,source,rating_after,external_rating_id) values(player_id,'initial',1000,external_id); end if;
 perform private.league_audit(case when old.id is null then 'player.created' else 'player.updated' end,player_id,'player',to_jsonb(old),to_jsonb(value));
 return player_id;
end;
$$;

create function public.add_roster_player(parent_season uuid,target_subteam uuid,player uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare child public.subteams; person public.players; season public.seasons; member uuid;
begin
 perform pg_advisory_xact_lock(170005);
 if not private.can_manage_subteam(target_subteam) then raise exception 'Subteam permission required' using errcode='42501'; end if;
 select * into child from public.subteams where id=target_subteam for update;
 select * into season from public.seasons where id=parent_season for update;
 select * into person from public.players where id=player for update;
 if child.id is null or person.id is null or season.id is null or person.team_id<>child.team_id or person.status<>'active' or not exists(select 1 from public.season_team_entries where season_id=parent_season and team_id=child.team_id) then raise exception 'Eligible active club player required' using errcode='22023'; end if;
 if public.age_group_for_birth_year(extract(year from person.date_of_birth)::integer,season.year) is distinct from child.age_group::text then raise exception 'Age group mismatch' using errcode='22023'; end if;
 select id into member from public.roster_memberships where player_id=player and season_id=parent_season and subteam_id=target_subteam and ended_at is null;
 if found then return member; end if;
 if (select count(*) from public.roster_memberships where season_id=parent_season and subteam_id=target_subteam and ended_at is null)>=10 then raise exception 'Roster capacity reached' using errcode='22023'; end if;
 insert into public.roster_memberships(season_id,subteam_id,player_id) values(parent_season,target_subteam,player) returning id into member;
 perform private.league_audit('roster.joined',member,'roster_membership',null,jsonb_build_object('season_id',parent_season,'subteam_id',target_subteam,'player_id',player));
 return member;
end;
$$;
create function public.end_roster_membership(membership uuid,reason text)
returns void language plpgsql security definer set search_path='' as $$
declare old public.roster_memberships;
begin
 perform pg_advisory_xact_lock(170005);
 select * into old from public.roster_memberships where id=membership for update;
 if not found or not private.can_manage_subteam(old.subteam_id) then raise exception 'Subteam permission required' using errcode='42501'; end if;
 if reason is null or char_length(btrim(reason)) not between 1 and 500 then raise exception 'Reason required' using errcode='22023'; end if;
 if old.ended_at is not null then return; end if;
 update public.roster_memberships set ended_at=now(),ended_reason=btrim(reason) where id=membership;
 perform private.league_audit('roster.ended',membership,'roster_membership',to_jsonb(old),jsonb_build_object('reason',btrim(reason)));
end;
$$;
create function public.drop_player(player uuid,effective_date date,reason text)
returns void language plpgsql security definer set search_path='' as $$
declare old public.players;
begin
 perform pg_advisory_xact_lock(170005);
 select * into old from public.players where id=player for update;
 if not found or not private.can_manage_team(old.team_id) then raise exception 'Team permission required' using errcode='42501'; end if;
 if reason is null or char_length(btrim(reason)) not between 1 and 500 or effective_date is null or effective_date>current_date then raise exception 'Date and reason required' using errcode='22023'; end if;
 if old.status='dropped_out' then return; end if;
 update public.players set status='dropped_out' where id=player;
 update public.roster_memberships set ended_at=now(),ended_reason=btrim(reason) where player_id=player and ended_at is null;
 insert into public.player_status_events(player_id,status,effective_at,reason,set_by) values(player,'dropped_out',effective_date::timestamptz,btrim(reason),auth.uid());
 perform private.league_audit('player.dropped_out',player,'player',to_jsonb(old),jsonb_build_object('date',effective_date,'reason',btrim(reason)));
end;
$$;
create function public.transfer_player(player uuid,new_club uuid,reason text)
returns void language plpgsql security definer set search_path='' as $$
declare old public.players;
begin
 perform pg_advisory_xact_lock(170005);
 if not private.has_staff_role('organizer') then raise exception 'Organizer required' using errcode='42501'; end if;
 select * into old from public.players where id=player for update;
 if not found or new_club is null or new_club=old.team_id or not exists(select 1 from public.teams where id=new_club) or reason is null or char_length(btrim(reason)) not between 1 and 500 then raise exception 'Transfer details required' using errcode='22023'; end if;
 update public.roster_memberships set ended_at=now(),ended_reason='transfer: '||btrim(reason) where player_id=player and ended_at is null;
 update public.players set team_id=new_club where id=player;
 perform private.league_audit('player.transferred',player,'player',to_jsonb(old),jsonb_build_object('team_id',new_club,'reason',btrim(reason)));
end;
$$;
create function public.set_player_trainer(player uuid,ref_kind text,trainer uuid,first_name text,last_name text)
returns void language plpgsql security definer set search_path='' as $$
declare old public.player_trainer_refs;
begin
 perform pg_advisory_xact_lock(170005);
 if not private.can_manage_player(player) then raise exception 'Team permission required' using errcode='42501'; end if;
 if ref_kind is null or ref_kind not in ('first','personal') then raise exception 'Trainer reference kind required' using errcode='22023'; end if;
 if trainer is not null and (first_name is not null or last_name is not null or not exists(select 1 from public.trainer_profiles p join public.staff_accounts a on a.id=p.user_id join public.staff_roles r on r.user_id=a.id where p.user_id=trainer and a.active and r.role='trainer')) then raise exception 'Active linked trainer or free name required' using errcode='22023'; end if;
 select * into old from public.player_trainer_refs where player_id=player and kind=ref_kind for update;
 insert into public.player_trainer_refs(player_id,kind,trainer_id,free_first_name,free_last_name) values(player,ref_kind,trainer,first_name,last_name)
 on conflict(player_id,kind) do update set trainer_id=excluded.trainer_id,free_first_name=excluded.free_first_name,free_last_name=excluded.free_last_name;
 perform private.league_audit('player.trainer_changed',player,'player_trainer_ref',to_jsonb(old),jsonb_build_object('kind',ref_kind,'trainer_id',trainer,'first_name',first_name,'last_name',last_name));
end;
$$;

-- Season reference-year changes must not invalidate assigned age bands.
create function private.check_season_roster_year() returns trigger language plpgsql set search_path='' as $$
begin
 if new.year<>old.year and exists(select 1 from public.roster_memberships m join public.players p on p.id=m.player_id join public.subteams s on s.id=m.subteam_id where m.season_id=new.id and m.ended_at is null and public.age_group_for_birth_year(extract(year from p.date_of_birth)::integer,new.year) is distinct from s.age_group::text) then raise exception 'Year invalidates an active roster' using errcode='22023'; end if;
 return new;
end;
$$;
revoke all on function private.check_season_roster_year() from public,anon,authenticated;
create trigger seasons_roster_year before update on public.seasons for each row execute function private.check_season_roster_year();

revoke all on function public.save_team(uuid,text,text),public.register_season_team(uuid,uuid),public.assign_team_trainer(uuid,uuid,uuid[]),public.save_player(uuid,uuid,text,text,public.player_gender,date,text,text,text,text),public.add_roster_player(uuid,uuid,uuid),public.end_roster_membership(uuid,text),public.drop_player(uuid,date,text),public.transfer_player(uuid,uuid,text),public.set_player_trainer(uuid,text,uuid,text,text) from public,anon;
grant execute on function public.save_team(uuid,text,text),public.register_season_team(uuid,uuid),public.assign_team_trainer(uuid,uuid,uuid[]),public.save_player(uuid,uuid,text,text,public.player_gender,date,text,text,text,text),public.add_roster_player(uuid,uuid,uuid),public.end_roster_membership(uuid,text),public.drop_player(uuid,date,text),public.transfer_player(uuid,uuid,text),public.set_player_trainer(uuid,text,uuid,text,text) to authenticated;
commit;
