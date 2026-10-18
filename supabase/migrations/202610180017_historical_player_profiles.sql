begin;
create index roster_player_history on public.roster_memberships(player_id,season_id,subteam_id);
create index singles_player_a_history on public.singles_games(player_a,match_id);
create index singles_player_b_history on public.singles_games(player_b,match_id);
-- Current rankings stay roster-scoped. A previously published player also has
-- a stable historical profile after leaving, without exposing a new private club.
create function public.get_public_player(player uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;context_subteam uuid;
begin
 select to_jsonb(profile) into result from public.public_league_players profile where profile.id=player;
 if found then return result;end if;
 select visible.subteam_id into context_subteam from (
  select r.subteam_id,greatest(r.joined_at,d.published_at) as visible_at
  from public.roster_memberships r join public.subteams sub on sub.id=r.subteam_id
  join public.draw_entries entry on entry.subteam_id=sub.id
  join public.draw_revisions d on d.id=entry.draw_id and d.published_at is not null
  join public.tour_stage_plans plan on plan.id=d.plan_id and plan.age_group=sub.age_group
  join public.tours tour on tour.id=plan.tour_id and tour.season_id=r.season_id
  where r.player_id=player and (r.ended_at is null or r.ended_at>=d.published_at)
  union all
  select case when g.player_a=player then m.subteam_a else m.subteam_b end,
   coalesce(g.ended_at,g.started_at,m.lineups_revealed_at)
  from public.singles_games g join public.team_matches m on m.id=g.match_id
  join public.draw_revisions d on d.id=m.draw_id and d.published_at is not null
  where player in(g.player_a,g.player_b) and m.lineups_revealed_at is not null
 ) visible order by visible.visible_at desc,visible.subteam_id limit 1;
 if context_subteam is null then return null;end if;
 select jsonb_build_object('id',p.id,'first_name',p.first_name,'last_name',p.last_name,
  'rating',p.current_rating,'team_id',team.id,'team_name',team.name,'age_group',sub.age_group,
  'has_photo',exists(select 1 from public.public_player_photos photo where photo.player_id=p.id))
 into result from public.players p join public.subteams sub on sub.id=context_subteam
 join public.teams team on team.id=sub.team_id where p.id=player;
 return result;
end;$$;
revoke all on function public.get_public_player(uuid) from public;
grant execute on function public.get_public_player(uuid) to anon,authenticated;
commit;
