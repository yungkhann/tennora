begin;
alter table public.team_matches add column lineup_version integer not null default 0 check(lineup_version>=0);
alter table public.team_matches add column lineups_revealed_at timestamptz;
alter table public.team_matches add column lineups_reveal_version integer;
alter table public.team_matches add constraint joint_reveal_stamp check((lineups_revealed_at is null and lineups_reveal_version is null) or (lineups_revealed_at is not null and lineups_reveal_version>0 and lineups_reveal_version<=lineup_version));
create table public.lineups(
 id uuid primary key,
 match_id uuid not null references public.team_matches(id) on delete restrict,
 subteam_id uuid not null references public.subteams(id) on delete restrict,
 original_players uuid[] not null check(cardinality(original_players)=5 and array_position(original_players,null) is null),
 submitted_by uuid not null references public.staff_accounts(id) on delete restrict,
 submitted_at timestamptz not null default clock_timestamp(),
 unique(match_id,subteam_id)
);
create table public.lineup_slots(
 lineup_id uuid not null references public.lineups(id) on delete restrict,
 slot integer not null check(slot between 1 and 5),
 player_id uuid not null references public.players(id) on delete restrict,
 player_name text not null,
 gender public.player_gender not null,
 primary key(lineup_id,slot),unique(lineup_id,player_id),
 check(gender=case when slot in(1,3,5) then 'boy' else 'girl' end::public.player_gender)
);
create type public.singles_game_status as enum('pending','in_progress','finished','cancelled');
create table public.singles_games(
 id uuid primary key default gen_random_uuid(),
 match_id uuid not null references public.team_matches(id) on delete restrict,
 slot integer not null check(slot between 1 and 5),
 player_a uuid not null references public.players(id) on delete restrict,
 player_b uuid not null references public.players(id) on delete restrict,
 status public.singles_game_status not null default 'pending',
 unique(match_id,slot),check(player_a<>player_b)
);
create table public.lineup_replacements(
 id uuid primary key,
 match_id uuid not null references public.team_matches(id) on delete restrict,
 lineup_id uuid not null references public.lineups(id) on delete restrict,
 slot integer not null check(slot between 1 and 5),
 old_player_id uuid not null references public.players(id) on delete restrict,
 new_player_id uuid not null references public.players(id) on delete restrict,
 old_player_name text not null,
 new_player_name text not null,
 reason text not null check(char_length(btrim(reason)) between 1 and 500),
 changed_by uuid not null references public.staff_accounts(id) on delete restrict,
 changed_at timestamptz not null default clock_timestamp(),
 check(old_player_id<>new_player_id)
);
create function private.is_subteam_trainer(subteam uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select private.has_staff_role('trainer') and exists(select 1 from public.subteam_trainers a join public.trainer_profiles p on p.user_id=a.trainer_id join public.subteams s on s.id=a.subteam_id and s.team_id=p.team_id where a.subteam_id=subteam and a.trainer_id=auth.uid());
$$;
create function private.can_read_lineup(lineup uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.lineups l join public.team_matches m on m.id=l.match_id where l.id=lineup and private.can_read_draw(m.draw_id) and (m.lineups_revealed_at is not null or private.is_subteam_trainer(l.subteam_id)));
$$;
revoke all on function private.is_subteam_trainer(uuid),private.can_read_lineup(uuid) from public,anon;
grant execute on function private.is_subteam_trainer(uuid),private.can_read_lineup(uuid) to authenticated;
do $$declare relation text; begin
 foreach relation in array array['lineups','lineup_slots','singles_games','lineup_replacements'] loop
  execute format('alter table public.%I enable row level security',relation);
  execute format('revoke all on public.%I from anon,authenticated',relation);
  execute format('grant select on public.%I to authenticated',relation);
 end loop;
end;$$;
create policy lineups_read on public.lineups for select to authenticated using(private.can_read_lineup(id));
create policy slots_read on public.lineup_slots for select to authenticated using(private.can_read_lineup(lineup_id));
create policy singles_read on public.singles_games for select to authenticated using(exists(select 1 from public.team_matches m where m.id=match_id and m.lineups_revealed_at is not null and private.can_read_draw(m.draw_id)));
create policy replacements_read on public.lineup_replacements for select to authenticated using(private.can_read_lineup(lineup_id) and (private.manages_all_teams() or exists(select 1 from public.lineups l where l.id=lineup_id and private.is_subteam_trainer(l.subteam_id))));

create function private.lineup_status_data(match uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('match_id',m.id,'version',m.version,'lineup_version',m.lineup_version,'revealed',m.lineups_revealed_at is not null,'reveal_version',m.lineups_reveal_version,'a_submitted',exists(select 1 from public.lineups l where l.match_id=m.id and l.subteam_id=m.subteam_a),'b_submitted',exists(select 1 from public.lineups l where l.match_id=m.id and l.subteam_id=m.subteam_b)) from public.team_matches m where m.id=match;
$$;
revoke all on function private.lineup_status_data(uuid) from public,anon,authenticated;
create function public.get_lineup_status(match uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare value public.team_matches;
begin
 select * into value from public.team_matches where id=match;
 if not found or not exists(select 1 from public.draw_revisions where id=value.draw_id and published_at is not null) or not (private.manages_all_teams() or private.is_subteam_trainer(value.subteam_a) or private.is_subteam_trainer(value.subteam_b)) then raise exception 'Lineup access required' using errcode='42501'; end if;
 return private.lineup_status_data(match);
end;$$;

create function private.eligible_lineup_player(player uuid,subteam uuid,season uuid,slot integer)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.players p join public.roster_memberships m on m.player_id=p.id and m.ended_at is null join public.subteams sub on sub.id=m.subteam_id and sub.team_id=p.team_id join public.seasons s on s.id=m.season_id where p.id=player and sub.id=subteam and s.id=season and p.status='active' and p.gender=case when slot in(1,3,5) then 'boy' else 'girl' end::public.player_gender and public.age_group_for_birth_year(extract(year from p.date_of_birth)::integer,s.year)=sub.age_group::text);
$$;
revoke all on function private.eligible_lineup_player(uuid,uuid,uuid,integer) from public,anon,authenticated;

create function public.submit_lineup(lineup_id uuid,match uuid,subteam uuid,players uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare value public.team_matches; old public.lineups; season uuid; i integer;
begin
 perform pg_advisory_xact_lock(170002);
 perform pg_advisory_xact_lock(170005);
 if not private.is_subteam_trainer(subteam) then raise exception 'Assigned Trainer required' using errcode='42501'; end if;
 select * into value from public.team_matches where id=match for update;
 if not found or subteam is null or subteam not in(value.subteam_a,value.subteam_b) or value.subteam_a is null or value.subteam_b is null or not exists(select 1 from public.draw_revisions where id=value.draw_id and published_at is not null) then raise exception 'Published participant match required' using errcode='22023'; end if;
 select * into old from public.lineups where id=lineup_id;
 if found then
  if old.match_id=match and old.subteam_id=subteam and old.original_players=players then return private.lineup_status_data(match); end if;
  raise exception 'Lineup ID conflict' using errcode='22023';
 end if;
 if value.status not in('scheduled','called') or value.lineups_revealed_at is not null or exists(select 1 from public.lineups l where l.match_id=match and l.subteam_id=subteam) then raise exception 'Lineup already locked' using errcode='22023'; end if;
 if lineup_id is null or players is null or cardinality(players)<>5 or array_ndims(players)<>1 or array_lower(players,1)<>1 or array_position(players,null) is not null or (select count(distinct p) from unnest(players) p)<>5 then raise exception 'Five distinct lineup players required' using errcode='22023'; end if;
 select t.season_id into season from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id join public.tours t on t.id=p.tour_id where d.id=value.draw_id;
 for i in 1..5 loop
  if not private.eligible_lineup_player(players[i],subteam,season,i) then raise exception 'Eligible gendered roster player required' using errcode='22023'; end if;
 end loop;
 insert into public.lineups(id,match_id,subteam_id,original_players,submitted_by) values(lineup_id,match,subteam,players,auth.uid());
 insert into public.lineup_slots(lineup_id,slot,player_id,player_name,gender) select lineup_id,position,p.id,p.first_name||' '||p.last_name,p.gender from unnest(players) with ordinality selected(id,position) join public.players p on p.id=selected.id;
 -- Before reveal even an Organizer must not recover identities from audit hashes.
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),'trainer','lineup.submitted',lineup_id,'lineup',jsonb_build_object('match_id',match,'subteam_id',subteam,'submitted',true));
 update public.team_matches set version=version+1,lineup_version=lineup_version+1 where id=match;
 if (select count(*) from public.lineups l where l.match_id=match)=2 then
  insert into public.singles_games(match_id,slot,player_a,player_b)
  select match,a.slot,a.player_id,b.player_id from public.lineups la join public.lineup_slots a on a.lineup_id=la.id join public.lineups lb on lb.match_id=la.match_id and lb.subteam_id=value.subteam_b join public.lineup_slots b on b.lineup_id=lb.id and b.slot=a.slot where la.match_id=match and la.subteam_id=value.subteam_a;
  update public.team_matches set lineups_revealed_at=clock_timestamp(),lineups_reveal_version=lineup_version where id=match;
  insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),'trainer','lineups.revealed',match,'team_match',jsonb_build_object('lineup_version',value.lineup_version+1));
 end if;
 return private.lineup_status_data(match);
end;$$;

create function public.replace_lineup_player(replacement_id uuid,match uuid,subteam uuid,slot integer,player uuid,reason text,expected_lineup_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare value public.team_matches; lineup public.lineups; old public.lineup_slots; previous public.lineup_replacements; game public.singles_games; season uuid; new_name text;
begin
 perform private.require_draw_manager();
 perform pg_advisory_xact_lock(170005);
 select * into value from public.team_matches where id=match for update;
 if not found or value.lineups_revealed_at is null or value.status not in('scheduled','called','in_progress') then raise exception 'Revealed active match required' using errcode='22023'; end if;
 select * into previous from public.lineup_replacements where id=replacement_id;
 if found then
  if previous.match_id=match and previous.slot=slot and previous.new_player_id=player and previous.reason=btrim(reason) and exists(select 1 from public.lineups l where l.id=previous.lineup_id and l.subteam_id=subteam) then return private.lineup_status_data(match); end if;
  raise exception 'Replacement ID conflict' using errcode='22023';
 end if;
 if expected_lineup_version is distinct from value.lineup_version then raise exception 'Lineup revision conflict' using errcode='22023'; end if;
 select * into lineup from public.lineups l where l.match_id=match and l.subteam_id=subteam;
 select * into old from public.lineup_slots where lineup_id=lineup.id and lineup_slots.slot=replace_lineup_player.slot;
 select * into game from public.singles_games g where g.match_id=match and g.slot=replace_lineup_player.slot for update;
 if replacement_id is null or old.player_id is null or game.status is distinct from 'pending' or reason is null or char_length(btrim(reason)) not between 1 and 500 then raise exception 'Pending singles and reason required' using errcode='22023'; end if;
 if old.player_id=player or exists(select 1 from public.lineup_slots s where s.lineup_id=lineup.id and s.player_id=player) then raise exception 'Distinct replacement player required' using errcode='22023'; end if;
 select t.season_id into season from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id join public.tours t on t.id=p.tour_id where d.id=value.draw_id;
 if not private.eligible_lineup_player(player,subteam,season,slot) then raise exception 'Eligible gendered roster player required' using errcode='22023'; end if;
 select first_name||' '||last_name into new_name from public.players where id=player;
 insert into public.lineup_replacements(id,match_id,lineup_id,slot,old_player_id,new_player_id,old_player_name,new_player_name,reason,changed_by) values(replacement_id,match,lineup.id,slot,old.player_id,player,old.player_name,new_name,btrim(reason),auth.uid());
 update public.lineup_slots set player_id=player,player_name=new_name where lineup_id=lineup.id and lineup_slots.slot=replace_lineup_player.slot;
 update public.singles_games set player_a=case when subteam=value.subteam_a then player else player_a end,player_b=case when subteam=value.subteam_b then player else player_b end where id=game.id;
 update public.team_matches set version=version+1,lineup_version=lineup_version+1 where id=match;
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),(case when private.has_staff_role('organizer') then 'organizer' else 'main_judge' end)::public.staff_role,'lineup.replaced',replacement_id,'lineup_replacement',jsonb_build_object('match_id',match,'lineup_id',lineup.id,'slot',slot,'reason',btrim(reason)));
 return private.lineup_status_data(match);
end;$$;
revoke all on function public.get_lineup_status(uuid),public.submit_lineup(uuid,uuid,uuid,uuid[]),public.replace_lineup_player(uuid,uuid,uuid,integer,uuid,text,integer) from public,anon;
grant execute on function public.get_lineup_status(uuid),public.submit_lineup(uuid,uuid,uuid,uuid[]),public.replace_lineup_player(uuid,uuid,uuid,integer,uuid,text,integer) to authenticated;
commit;
