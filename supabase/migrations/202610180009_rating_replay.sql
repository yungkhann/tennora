begin;
create table public.rating_replay_anchors(
 player_id uuid primary key references public.players(id) on delete restrict,
 history_id uuid not null references public.rating_history(id) on delete restrict,
 rating numeric not null check(rating>=0 and rating<=9007199254740991 and rating=trunc(rating)),
 created_at timestamptz not null default clock_timestamp()
);
alter table public.rating_replay_anchors enable row level security;
revoke all on public.rating_replay_anchors from anon,authenticated;
grant select on public.rating_replay_anchors to authenticated;
create policy anchor_read on public.rating_replay_anchors for select to authenticated using(private.can_manage_player(player_id));
create function private.ensure_rating_anchor(target uuid)
returns numeric language plpgsql security definer set search_path='' as $$
declare anchor public.rating_replay_anchors;provenance public.rating_history;first_calc timestamptz;
begin
 select * into anchor from public.rating_replay_anchors where player_id=target;
 if found then return anchor.rating;end if;
 select * into provenance from public.rating_history where player_id=target and source in('initial','import') order by created_at desc,id desc limit 1;
 select min(created_at) into first_calc from public.rating_calculations where player_a=target or player_b=target;
 if provenance.id is null or (first_calc is not null and provenance.created_at>first_calc) or exists(select 1 from public.rating_history where player_id=target and source in('game','correction') and calculation_id is null) then raise exception 'Supported rating provenance required' using errcode='55000';end if;
 insert into public.rating_replay_anchors(player_id,history_id,rating) values(target,provenance.id,provenance.rating_after);
 return provenance.rating_after;
end;$$;
revoke all on function private.ensure_rating_anchor(uuid) from public,anon,authenticated;
-- Bootstrap prior scored players using their earliest original calculation,
-- rejecting provenance mismatches instead of manufacturing a baseline.
do $$declare person uuid;baseline numeric;first_before numeric;begin
 for person in select player_a from public.rating_calculations union select player_b from public.rating_calculations loop
  baseline:=private.ensure_rating_anchor(person);
  select case when c.player_a=person then c.a_before else c.b_before end into first_before from public.rating_calculations c where c.player_a=person or c.player_b=person order by c.completion_order,c.revision limit 1;
  if baseline is distinct from first_before then raise exception 'Existing rating baseline needs reconciliation' using errcode='55000';end if;
 end loop;
end;$$;
create function private.capture_rating_anchor()
returns trigger language plpgsql security definer set search_path='' as $$
declare baseline numeric;
begin
 baseline:=private.ensure_rating_anchor(new.player_a);
 if not exists(select 1 from public.rating_calculations where player_a=new.player_a or player_b=new.player_a) and new.a_before<>baseline then raise exception 'Initial rating baseline mismatch' using errcode='55000';end if;
 baseline:=private.ensure_rating_anchor(new.player_b);
 if not exists(select 1 from public.rating_calculations where player_a=new.player_b or player_b=new.player_b) and new.b_before<>baseline then raise exception 'Initial rating baseline mismatch' using errcode='55000';end if;
 return new;
end;$$;
revoke all on function private.capture_rating_anchor() from public,anon,authenticated;
create trigger capture_rating_anchor before insert on public.rating_calculations for each row execute function private.capture_rating_anchor();
create unique index one_history_per_calculation_player on public.rating_history(calculation_id,player_id) where calculation_id is not null;
create function private.validate_linked_rating_history()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.calculation_id is not null and not exists(select 1 from public.rating_calculations c where c.id=new.calculation_id and new.source='game' and c.result_id=new.game_result_id and (new.player_id=c.player_a and new.rating_before=c.a_before and new.rating_after=c.a_after or new.player_id=c.player_b and new.rating_before=c.b_before and new.rating_after=c.b_after)) then raise exception 'Consistent linked rating history required' using errcode='22023';end if;
 return new;
end;$$;
revoke all on function private.validate_linked_rating_history() from public,anon,authenticated;
create trigger validate_linked_rating_history before insert or update on public.rating_history for each row execute function private.validate_linked_rating_history();
create function private.replay_effective_ratings()
returns jsonb language plpgsql security definer set search_path='' as $$
declare ratings jsonb;old_ratings jsonb;changes jsonb:='[]';r public.singles_results;old public.rating_calculations;latest public.rating_calculations;anchor public.rating_replay_anchors;person uuid;pair jsonb;new_calc uuid;appended integer:=0;removed integer:=0;changed integer:=0;before_rating numeric;after_rating numeric;
begin
 perform private.require_match_manager();
 perform pg_advisory_xact_lock(170005);
 perform pg_advisory_xact_lock(170040::bigint);
 -- Include newly played corrections of formerly automatic results.
 for person in select g.player_a from public.singles_games g join public.team_matches m on m.id=g.match_id where g.status='finished' and m.status<>'cancelled' union select g.player_b from public.singles_games g join public.team_matches m on m.id=g.match_id where g.status='finished' and m.status<>'cancelled' loop
  perform private.ensure_rating_anchor(person);
 end loop;
 perform p.id from public.players p join public.rating_replay_anchors a on a.player_id=p.id order by p.id for update of p;
 -- A later importer needs its own ordered anchor event model; reject unsupported
 -- post-game adjustments rather than silently discarding an imported rating.
 if exists(select 1 from public.rating_replay_anchors a join public.rating_history baseline on baseline.id=a.history_id join public.rating_history h on h.player_id=a.player_id where baseline.player_id<>a.player_id or baseline.source not in('initial','import') or baseline.rating_after<>a.rating or (h.source in('game','correction') and h.calculation_id is null) or (h.source in('initial','import') and h.id<>a.history_id and h.created_at>=baseline.created_at)) then raise exception 'Supported rating provenance required' using errcode='55000';end if;
 select coalesce(jsonb_object_agg(player_id::text,rating),'{}'::jsonb) into ratings from public.rating_replay_anchors;
 old_ratings:=ratings;
 for old in select c.* from public.rating_calculation_heads h join public.rating_calculations c on c.id=h.calculation_id order by c.completion_order,c.game_id loop
  old_ratings:=old_ratings||jsonb_build_object(old.player_a::text,old.a_after,old.player_b::text,old.b_after);
 end loop;
 for anchor in select * from public.rating_replay_anchors loop
  select current_rating into before_rating from public.players where id=anchor.player_id;
  if before_rating is distinct from (old_ratings->>anchor.player_id::text)::numeric then raise exception 'Current rating provenance mismatch' using errcode='55000';end if;
 end loop;
 delete from public.rating_calculation_heads h where not exists(select 1 from public.singles_games g join public.team_matches m on m.id=g.match_id join public.singles_results result on result.id=g.result_id where g.id=h.game_id and g.status='finished' and m.status<>'cancelled' and result.kind='played');
 get diagnostics removed=row_count;
 for r in select result.* from public.singles_games g join public.team_matches m on m.id=g.match_id join public.singles_results result on result.id=g.result_id where g.status='finished' and m.status<>'cancelled' and result.kind='played' order by result.completion_order,result.game_id loop
  pair:=private.elo_pair((ratings->>r.player_a::text)::numeric,(ratings->>r.player_b::text)::numeric,r.winner,r.k_factor);
  select c.* into old from public.rating_calculation_heads h join public.rating_calculations c on c.id=h.calculation_id where h.game_id=r.game_id;
  if old.id is null or old.result_id<>r.id or old.a_before<>(ratings->>r.player_a::text)::numeric or old.b_before<>(ratings->>r.player_b::text)::numeric or old.a_after<>(pair->>'a')::numeric or old.b_after<>(pair->>'b')::numeric then
   select * into latest from public.rating_calculations where game_id=r.game_id order by revision desc limit 1;
   insert into public.rating_calculations(game_id,result_id,revision,previous_calculation_id,completion_order,player_a,player_b,a_before,b_before,a_after,b_after,settings_id,k_factor,created_by) values(r.game_id,r.id,coalesce(latest.revision,0)+1,latest.id,r.completion_order,r.player_a,r.player_b,(ratings->>r.player_a::text)::numeric,(ratings->>r.player_b::text)::numeric,(pair->>'a')::numeric,(pair->>'b')::numeric,r.settings_id,r.k_factor,auth.uid()) returning id into new_calc;
   insert into public.rating_calculation_heads(game_id,calculation_id) values(r.game_id,new_calc) on conflict(game_id) do update set calculation_id=excluded.calculation_id;
   insert into public.rating_history(player_id,source,rating_before,rating_after,calculation_id,game_result_id) values(r.player_a,'game',(ratings->>r.player_a::text)::numeric,(pair->>'a')::numeric,new_calc,r.id),(r.player_b,'game',(ratings->>r.player_b::text)::numeric,(pair->>'b')::numeric,new_calc,r.id);
   appended:=appended+1;
  end if;
  ratings:=ratings||jsonb_build_object(r.player_a::text,(pair->>'a')::numeric,r.player_b::text,(pair->>'b')::numeric);
 end loop;
 for anchor in select * from public.rating_replay_anchors order by player_id loop
  before_rating:=(old_ratings->>anchor.player_id::text)::numeric;after_rating:=(ratings->>anchor.player_id::text)::numeric;
  if before_rating<>after_rating then
   update public.players set current_rating=after_rating where id=anchor.player_id;
   changes:=changes||jsonb_build_array(jsonb_build_object('player',anchor.player_id,'before',before_rating,'after',after_rating));changed:=changed+1;
  end if;
 end loop;
 if appended+removed+changed>0 then perform private.league_audit('ratings.replayed',gen_random_uuid(),'rating_replay',null,jsonb_build_object('calculations_appended',appended,'heads_removed',removed,'players',changes));end if;
 return jsonb_build_object('calculations_appended',appended,'heads_removed',removed,'players_changed',changed);
end;$$;
revoke all on function private.replay_effective_ratings() from public,anon,authenticated;
commit;
