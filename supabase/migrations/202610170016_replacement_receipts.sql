begin;
-- An authenticated exact receipt retry remains valid after the match has ended.
create or replace function public.replace_lineup_player(replacement_id uuid,match uuid,subteam uuid,slot integer,player uuid,reason text,expected_lineup_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare value public.team_matches; lineup public.lineups; old public.lineup_slots; previous public.lineup_replacements; game public.singles_games; season uuid; new_name text;
begin
 perform private.require_draw_manager();
 perform pg_advisory_xact_lock(170005);
 select * into value from public.team_matches where id=match for update;
 if not found or value.lineups_revealed_at is null then raise exception 'Revealed active match required' using errcode='22023'; end if;
 select * into previous from public.lineup_replacements where id=replacement_id;
 if found then
  if previous.match_id=match and previous.slot=slot and previous.new_player_id=player and previous.reason=btrim(reason) and exists(select 1 from public.lineups l where l.id=previous.lineup_id and l.subteam_id=subteam) then return private.lineup_status_data(match); end if;
  raise exception 'Replacement ID conflict' using errcode='22023';
 end if;
 if value.status not in('scheduled','called','in_progress') then raise exception 'Revealed active match required' using errcode='22023'; end if;
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
commit;
