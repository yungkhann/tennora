begin;
create or replace function public.drop_player(player uuid,effective_date date,reason text)
returns void language plpgsql security definer set search_path='' as $$
declare old public.players;
begin
 perform pg_advisory_xact_lock(170005);
 select * into old from public.players where id=player for update;
 if not found or not private.can_manage_team(old.team_id) then raise exception 'Team permission required' using errcode='42501'; end if;
 if reason is null or char_length(btrim(reason)) not between 1 and 500 or effective_date is null or effective_date>current_date or effective_date<old.date_of_birth then raise exception 'Date and reason required' using errcode='22023'; end if;
 if old.status='dropped_out' then return; end if;
 update public.players set status='dropped_out' where id=player;
 update public.roster_memberships set ended_at=now(),ended_reason=btrim(reason) where player_id=player and ended_at is null;
 insert into public.player_status_events(player_id,status,effective_at,reason,set_by) values(player,'dropped_out',effective_date::timestamptz,btrim(reason),auth.uid());
 perform private.league_audit('player.dropped_out',player,'player',to_jsonb(old),jsonb_build_object('date',effective_date,'reason',btrim(reason)));
end;
$$;
commit;
