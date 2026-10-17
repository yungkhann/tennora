begin;
-- Participant club labels are safe metadata; do not loosen private team/player RLS
-- merely to let an assigned Trainer read the opposing match label.
create function public.lineup_match_names(matches uuid[])
returns table(match_id uuid,side text,subteam_id uuid,club_id uuid,name text)
language plpgsql stable security definer set search_path='' as $$
declare target uuid;
begin
 if matches is null or cardinality(matches) not between 1 and 100 or array_position(matches,null) is not null then raise exception 'Match IDs required' using errcode='22023'; end if;
 foreach target in array matches loop perform public.get_lineup_status(target); end loop;
 return query select m.id,participant.side,sub.id,team.id,team.name
 from public.team_matches m cross join lateral(values('a',m.subteam_a),('b',m.subteam_b)) participant(side,subteam)
 join public.subteams sub on sub.id=participant.subteam join public.teams team on team.id=sub.team_id
 where m.id=any(matches);
end;$$;
revoke all on function public.lineup_match_names(uuid[]) from public,anon;
grant execute on function public.lineup_match_names(uuid[]) to authenticated;
commit;
