begin;
create or replace function public.assign_team_trainer(trainer uuid,club uuid,coached_subteams uuid[])
returns void language plpgsql security definer set search_path='' as $$
declare before_value jsonb;
begin
 perform pg_advisory_xact_lock(170005);
 if not private.manages_all_teams() then raise exception 'Team permission required' using errcode='42501'; end if;
 if not exists(select 1 from public.staff_accounts a join public.staff_roles r on r.user_id=a.id where a.id=trainer and a.active and r.role='trainer') then raise exception 'Active Trainer required' using errcode='22023'; end if;
 if coached_subteams is null or cardinality(coached_subteams) not between 1 and 3 or array_position(coached_subteams,null) is not null
 or cardinality(coached_subteams)<>(select count(distinct requested.id) from unnest(coached_subteams) as requested(id))
 or exists(select 1 from unnest(coached_subteams) as requested(id) where not exists(select 1 from public.subteams s where s.id=requested.id and s.team_id=club))
 then raise exception 'Subteams must belong to the club' using errcode='22023'; end if;
 select jsonb_build_object('team_id',p.team_id,'subteams',(select jsonb_agg(a.subteam_id order by a.subteam_id) from public.subteam_trainers a where a.trainer_id=trainer)) into before_value from public.trainer_profiles p where p.user_id=trainer;
 delete from public.subteam_trainers where trainer_id=trainer;
 insert into public.trainer_profiles(user_id,team_id) values(trainer,club) on conflict(user_id) do update set team_id=excluded.team_id;
 insert into public.subteam_trainers(subteam_id,trainer_id) select unnest(coached_subteams),trainer;
 perform private.league_audit('trainer.assigned',trainer,'trainer',before_value,jsonb_build_object('team_id',club,'subteams',coached_subteams));
end;
$$;
create function private.check_subteam_trainer_club() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.trainer_profiles p join public.subteams s on s.team_id=p.team_id where p.user_id=new.trainer_id and s.id=new.subteam_id) then raise exception 'Subteams must belong to the club' using errcode='23514'; end if;
 return new;
end;
$$;
create function private.check_trainer_profile_club() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.subteam_trainers a join public.subteams s on s.id=a.subteam_id where a.trainer_id=new.user_id and s.team_id<>new.team_id) then raise exception 'Existing subteam assignments belong to another club' using errcode='23514'; end if;
 return new;
end;
$$;
revoke all on function private.check_subteam_trainer_club(),private.check_trainer_profile_club() from public,anon,authenticated;
create trigger trainer_subteam_club before insert or update on public.subteam_trainers for each row execute function private.check_subteam_trainer_club();
create trigger trainer_profile_club before update on public.trainer_profiles for each row execute function private.check_trainer_profile_club();

create function public.available_team_trainers()
returns table(id uuid,display_name text,team_id uuid) language sql stable security definer set search_path='' as $$
 select a.id,a.display_name,p.team_id from public.staff_accounts a join public.staff_roles r on r.user_id=a.id and r.role='trainer' left join public.trainer_profiles p on p.user_id=a.id
 where a.active and (private.manages_all_teams() or (p.team_id is not null and private.can_manage_team(p.team_id))) order by a.display_name,a.id;
$$;
revoke all on function public.available_team_trainers() from public,anon;
grant execute on function public.available_team_trainers() to authenticated;
commit;
