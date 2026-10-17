begin;
alter table public.singles_games add column score_version integer not null default 0 check(score_version>=0);
alter table public.singles_games add column score_state jsonb;
alter table public.singles_games add column started_at timestamptz;
alter table public.singles_games add column ended_at timestamptz;
alter table public.singles_games add column player_a_name text;
alter table public.singles_games add column player_b_name text;
alter table public.singles_games add column timeout_until timestamptz;
alter table public.singles_games add column timeout_side text check(timeout_side in('a','b'));
alter table public.singles_games add constraint timeout_stamp check((timeout_until is null)=(timeout_side is null));
create unique index one_active_singles_per_match on public.singles_games(match_id) where status='in_progress';
create sequence private.singles_completion_order;
revoke all on sequence private.singles_completion_order from public,anon,authenticated;
create table public.singles_results(
 id uuid primary key default gen_random_uuid(),
 game_id uuid not null references public.singles_games(id) on delete restrict,
 revision integer not null check(revision>0),
 previous_result_id uuid references public.singles_results(id) on delete restrict,
 completion_order bigint not null,
 kind text not null check(kind in('played','withdrawal')),
 winner text not null check(winner in('a','b')),
 player_a uuid not null references public.players(id) on delete restrict,
 player_b uuid not null references public.players(id) on delete restrict,
 player_a_name text not null,player_b_name text not null,
 actual_sets jsonb not null check(jsonb_typeof(actual_sets)='array'),
 sets_a integer not null check(sets_a between 0 and 3),sets_b integer not null check(sets_b between 0 and 3),
 points_a bigint not null check(points_a>=0),points_b bigint not null check(points_b>=0),
 settings_id uuid not null references public.tournament_settings(id) on delete restrict,
 k_factor numeric not null check(k_factor>0 and k_factor<=9007199254740991),
 ended_at timestamptz not null,
 created_by uuid not null references public.staff_accounts(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 unique(game_id,revision),check(player_a<>player_b),
 check((winner='a' and sets_a=3 and sets_b<3) or (winner='b' and sets_b=3 and sets_a<3)),
 check(kind<>'withdrawal' or (winner='a' and sets_b=0 and points_a=33 and points_b=0) or (winner='b' and sets_a=0 and points_b=33 and points_a=0))
);
alter table public.singles_games add column result_id uuid references public.singles_results(id) on delete restrict;
alter table public.singles_games add column result_revision integer not null default 0;
alter table public.singles_games add column completion_order bigint;
alter table public.singles_games add constraint singles_result_pointer check((result_id is null and result_revision=0) or (result_id is not null and result_revision>0));
create unique index one_singles_completion_order on public.singles_games(completion_order) where completion_order is not null;
create table public.rating_calculations(
 id uuid primary key default gen_random_uuid(),
 game_id uuid not null references public.singles_games(id) on delete restrict,
 result_id uuid not null references public.singles_results(id) on delete restrict,
 revision integer not null check(revision>0),
 previous_calculation_id uuid references public.rating_calculations(id) on delete restrict,
 completion_order bigint not null,
 player_a uuid not null references public.players(id) on delete restrict,
 player_b uuid not null references public.players(id) on delete restrict,
 a_before numeric not null,b_before numeric not null,a_after numeric not null,b_after numeric not null,
 settings_id uuid not null references public.tournament_settings(id) on delete restrict,
 k_factor numeric not null check(k_factor>0 and k_factor<=9007199254740991),
 created_by uuid not null references public.staff_accounts(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 unique(game_id,revision),
 check(a_before>=0 and a_before<=9007199254740991 and a_before=trunc(a_before)),
 check(b_before>=0 and b_before<=9007199254740991 and b_before=trunc(b_before)),
 check(a_after>=0 and a_after<=9007199254740991 and a_after=trunc(a_after)),
 check(b_after>=0 and b_after<=9007199254740991 and b_after=trunc(b_after))
);
create table public.rating_calculation_heads(
 game_id uuid primary key references public.singles_games(id) on delete restrict,
 calculation_id uuid not null references public.rating_calculations(id) on delete restrict
);
alter table public.rating_history add column calculation_id uuid references public.rating_calculations(id) on delete restrict;
alter table public.rating_history add column game_result_id uuid references public.singles_results(id) on delete restrict;
alter table public.rating_history add constraint linked_rating_calculation check((calculation_id is null)=(game_result_id is null));
create table public.score_events(
 id uuid primary key,
 game_id uuid not null references public.singles_games(id) on delete restrict,
 actor_id uuid not null references public.staff_accounts(id) on delete restrict,
 actor_role public.staff_role not null,
 kind text not null check(kind in('start','point','undo_point','undo_set','timeout','resume_timeout','withdrawal')),
 request jsonb not null,
 version_before integer not null,version_after integer not null,
 before_state jsonb not null,after_state jsonb not null,
 table_number integer references public.league_tables(number) on delete restrict,
 venue_day date,
 assignment_id uuid references public.table_judge_assignments(id) on delete restrict,
 authority text not null check(authority in('table','dropout')),
 undo_target_id uuid references public.score_events(id) on delete restrict,
 undo_set_number integer check(undo_set_number between 1 and 5),
 created_at timestamptz not null default clock_timestamp(),
 unique(game_id,version_after),check(version_after=version_before+1),
 check(authority<>'table' or (table_number is not null and venue_day is not null and assignment_id is not null)),
 check(undo_target_id is distinct from id)
);
create table public.active_score_points(
 event_id uuid primary key references public.score_events(id) on delete restrict deferrable initially deferred,
 game_id uuid not null references public.singles_games(id) on delete restrict,
 event_version integer not null,
 set_number integer not null check(set_number between 1 and 5),
 side text not null check(side in('a','b')),
 unique(game_id,event_version)
);
create table public.game_sets(
 game_id uuid not null references public.singles_games(id) on delete restrict,
 set_number integer not null check(set_number between 1 and 5),
 points_a bigint not null,points_b bigint not null,
 winner text check(winner in('a','b')),
 first_server text not null check(first_server in('a','b')),
 primary key(game_id,set_number),
 check(winner is not distinct from private.set_winner(points_a,points_b))
);
create table public.player_end_events(
 id uuid primary key default gen_random_uuid(),
 game_id uuid not null references public.singles_games(id) on delete restrict,
 player_id uuid not null references public.players(id) on delete restrict,
 ended_at timestamptz not null,
 created_by uuid not null references public.staff_accounts(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 unique(game_id,player_id)
);
create function private.can_read_score_game(target uuid)
returns boolean language sql volatile security definer set search_path='' as $$
 select private.has_staff_role() and exists(select 1 from public.singles_games g join public.team_matches m on m.id=g.match_id join public.draw_revisions d on d.id=m.draw_id join public.tour_stage_plans p on p.id=d.plan_id where g.id=target and d.published_at is not null and m.lineups_revealed_at is not null and (private.manages_all_teams() or private.can_read_match_operation(m.id) or exists(select 1 from public.score_events e where e.game_id=g.id and e.actor_id=auth.uid() and e.authority='table' and private.owns_scoring_table(e.table_number,p.tour_id))));
$$;
revoke all on function private.can_read_score_game(uuid) from public,anon;
grant execute on function private.can_read_score_game(uuid) to authenticated;
do $$declare relation text;begin
 foreach relation in array array['singles_results','rating_calculations','rating_calculation_heads','score_events','active_score_points','game_sets','player_end_events'] loop
  execute format('alter table public.%I enable row level security',relation);
  execute format('revoke all on public.%I from anon,authenticated',relation);
  execute format('grant select on public.%I to authenticated',relation);
  execute format('create policy score_game_read on public.%I for select to authenticated using(private.can_read_score_game(game_id))',relation);
 end loop;
end;$$;
create function private.validate_singles_result() returns trigger language plpgsql security definer set search_path='' as $$
declare g public.singles_games;cfg public.tournament_settings;tour uuid;summary jsonb;a_points bigint;b_points bigint;
begin
 select * into g from public.singles_games where id=new.game_id;
 select p.tour_id into tour from public.team_matches m join public.draw_revisions d on d.id=m.draw_id join public.tour_stage_plans p on p.id=d.plan_id where m.id=g.match_id;
 select * into cfg from public.tournament_settings where id=new.settings_id;
 if g.id is null or new.revision<>g.result_revision+1 or new.previous_result_id is distinct from g.result_id or new.player_a<>g.player_a or new.player_b<>g.player_b or new.completion_order is distinct from g.completion_order or cfg.tour_id is distinct from tour or new.k_factor is distinct from cfg.k_factor then raise exception 'Consistent singles result required' using errcode='22023';end if;
 if new.kind='played' then
  summary:=private.score_summary(g.score_state);
  select coalesce(sum((v->>'a')::bigint),0),coalesce(sum((v->>'b')::bigint),0) into a_points,b_points from jsonb_array_elements(g.score_state->'sets') v;
  if summary->>'winner' is distinct from new.winner or (summary->>'sets_a')::integer<>new.sets_a or (summary->>'sets_b')::integer<>new.sets_b or new.actual_sets is distinct from g.score_state->'sets' or new.points_a<>a_points or new.points_b<>b_points then raise exception 'Played result must match authoritative score' using errcode='22023';end if;
 end if;
 return new;
end;$$;
revoke all on function private.validate_singles_result() from public,anon,authenticated;
create trigger validate_singles_result before insert on public.singles_results for each row execute function private.validate_singles_result();
create function private.validate_singles_pointer() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.result_id is not null and not exists(select 1 from public.singles_results r where r.id=new.result_id and r.game_id=new.id and r.revision=new.result_revision and r.completion_order=new.completion_order) then raise exception 'Consistent singles result pointer required' using errcode='22023';end if;
 return new;
end;$$;
revoke all on function private.validate_singles_pointer() from public,anon,authenticated;
create trigger validate_singles_pointer before update of result_id,result_revision on public.singles_games for each row execute function private.validate_singles_pointer();
create function private.validate_rating_calculation() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.singles_results;old public.rating_calculations;expected jsonb;
begin
 select * into r from public.singles_results where id=new.result_id;
 select * into old from public.rating_calculations where game_id=new.game_id order by revision desc limit 1;
 expected:=private.elo_pair(new.a_before,new.b_before,r.winner,r.k_factor);
 if r.kind is distinct from 'played' or r.game_id<>new.game_id or new.player_a<>r.player_a or new.player_b<>r.player_b or new.settings_id<>r.settings_id or new.k_factor<>r.k_factor or new.completion_order<>r.completion_order or new.revision<>coalesce(old.revision,0)+1 or new.previous_calculation_id is distinct from old.id or new.a_after<>(expected->>'a')::numeric or new.b_after<>(expected->>'b')::numeric then raise exception 'Consistent rating calculation required' using errcode='22023';end if;
 return new;
end;$$;
revoke all on function private.validate_rating_calculation() from public,anon,authenticated;
create trigger validate_rating_calculation before insert on public.rating_calculations for each row execute function private.validate_rating_calculation();
create function private.validate_rating_head() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.rating_calculations c join public.singles_games g on g.id=c.game_id where c.id=new.calculation_id and c.game_id=new.game_id and c.result_id=g.result_id) then raise exception 'Consistent rating head required' using errcode='22023';end if;
 return new;
end;$$;
revoke all on function private.validate_rating_head() from public,anon,authenticated;
create trigger validate_rating_head before insert or update on public.rating_calculation_heads for each row execute function private.validate_rating_head();
create function private.project_game_sets(target uuid) returns void language plpgsql security definer set search_path='' as $$
declare g public.singles_games;set_value jsonb;index integer:=0;first_server text;
begin
 select * into g from public.singles_games where id=target;
 perform private.score_summary(g.score_state);
 for set_value in select value from jsonb_array_elements(g.score_state->'sets') loop
  index:=index+1;first_server:=case when index%2=1 then g.score_state->>'initial_server' when g.score_state->>'initial_server'='a' then 'b' else 'a' end;
  insert into public.game_sets(game_id,set_number,points_a,points_b,winner,first_server) values(target,index,(set_value->>'a')::bigint,(set_value->>'b')::bigint,private.set_winner((set_value->>'a')::bigint,(set_value->>'b')::bigint),first_server) on conflict(game_id,set_number) do update set points_a=excluded.points_a,points_b=excluded.points_b,winner=excluded.winner,first_server=excluded.first_server;
 end loop;
 delete from public.game_sets where game_id=target and set_number>index;
end;$$;
revoke all on function private.project_game_sets(uuid) from public,anon,authenticated;
create function private.raw_game_state(target uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('game_id',g.id,'match_id',m.id,'status',g.status,'version',g.score_version,'score',g.score_state,'timeout_until',g.timeout_until,'timeout_side',g.timeout_side,'result_id',g.result_id,'match_status',m.status,'match_version',m.version,'lineup_version',m.lineup_version) from public.singles_games g join public.team_matches m on m.id=g.match_id where g.id=target;
$$;
revoke all on function private.raw_game_state(uuid) from public,anon,authenticated;
create function private.game_score_snapshot(target uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare g public.singles_games;m public.team_matches;summary jsonb;players jsonb;team_a text;team_b text;age public.age_group;timezone_name text;table_no integer;wins_a integer;wins_b integer;initial_name_a text;initial_name_b text;result_data jsonb;availability jsonb;
begin
 select * into g from public.singles_games where id=target;
 select * into m from public.team_matches where id=g.match_id;
 if g.score_state is not null then summary:=private.score_summary(g.score_state);else summary:=jsonb_build_object('set_number',1,'points_a',0,'points_b',0,'sets_a',0,'sets_b',0,'winner',null,'server',null,'ends_swapped',false);end if;
 select s.player_name into initial_name_a from public.lineups l join public.lineup_slots s on s.lineup_id=l.id where l.match_id=m.id and l.subteam_id=m.subteam_a and s.slot=g.slot;
 select s.player_name into initial_name_b from public.lineups l join public.lineup_slots s on s.lineup_id=l.id where l.match_id=m.id and l.subteam_id=m.subteam_b and s.slot=g.slot;
 select jsonb_build_object('a_active',a.status='active','b_active',b.status='active') into availability from public.players a cross join public.players b where a.id=g.player_a and b.id=g.player_b;
 select jsonb_build_object('a',jsonb_build_object('id',a.id,'name',coalesce(g.player_a_name,initial_name_a),'rating',a.current_rating),'b',jsonb_build_object('id',b.id,'name',coalesce(g.player_b_name,initial_name_b),'rating',b.current_rating)) into players from public.players a cross join public.players b where a.id=g.player_a and b.id=g.player_b;
 select a.name,b.name into team_a,team_b from public.subteams sa join public.teams a on a.id=sa.team_id cross join public.subteams sb join public.teams b on b.id=sb.team_id where sa.id=m.subteam_a and sb.id=m.subteam_b;
 select p.age_group,cfg.venue_timezone into age,timezone_name from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id join lateral(select venue_timezone from public.tournament_settings where tour_id=p.tour_id order by revision desc limit 1) cfg on true where d.id=m.draw_id;
 select table_number into table_no from public.match_table_leases where match_id=m.id;
 if table_no is null then select table_number into table_no from public.score_events where game_id=g.id and table_number is not null order by version_after desc limit 1;end if;
 select count(*) filter(where r.winner='a'),count(*) filter(where r.winner='b') into wins_a,wins_b from public.singles_games game join public.singles_results r on r.id=game.result_id where game.match_id=m.id and game.status='finished';
 select jsonb_build_object('id',r.id,'kind',r.kind,'winner',r.winner,'sets_a',r.sets_a,'sets_b',r.sets_b,'points_a',r.points_a,'points_b',r.points_b,'actual_sets',r.actual_sets,'k',r.k_factor,'ended_at',r.ended_at) into result_data from public.singles_results r where r.id=g.result_id;
 if g.status='finished' then summary:=summary||jsonb_build_object('server',null,'winner',result_data->>'winner');end if;
 return private.raw_game_state(target)||jsonb_build_object('summary',summary,'availability',availability,'result',result_data,'players',players,'teams',jsonb_build_object('a',team_a,'b',team_b),'team_wins',jsonb_build_object('a',wins_a,'b',wins_b),'slot',g.slot,'age_group',age,'timezone',timezone_name,'table_number',table_no,'timeouts',coalesce(g.score_state->'timeouts','{"a":false,"b":false}'::jsonb),'last_point_side',(select side from public.active_score_points where game_id=g.id order by event_version desc limit 1),'server_now',clock_timestamp());
end;$$;
revoke all on function private.game_score_snapshot(uuid) from public,anon,authenticated;
create function public.get_game_score(game uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
begin
 if not private.can_read_score_game(game) then raise exception 'Scoring access required' using errcode='42501';end if;
 return private.game_score_snapshot(game);
end;$$;
revoke all on function public.get_game_score(uuid) from public,anon;
grant execute on function public.get_game_score(uuid) to authenticated;
-- Caller holds replay/draw/match/game and ownership first. Completion locks
-- tour/settings BEFORE the sorted player rows, including automatic results.
create function private.finish_singles(target uuid,kind_name text,winner_side text,ended_time timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare g public.singles_games;m public.team_matches;tour uuid;cfg public.tournament_settings;summary jsonb;result uuid;calc uuid;previous_calc public.rating_calculations;a_rating numeric;b_rating numeric;pair jsonb;set_a integer;set_b integer;point_a bigint;point_b bigint;team_summary jsonb;team_result uuid;game_winners jsonb;name_a text;name_b text;
begin
 select * into g from public.singles_games where id=target for update;
 select * into m from public.team_matches where id=g.match_id for update;
 if g.id is null or m.status<>'in_progress' or g.status not in('pending','in_progress') or kind_name not in('played','withdrawal') or coalesce(winner_side,'') not in('a','b') then raise exception 'Active singles completion required' using errcode='22023';end if;
 select p.tour_id into tour from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id where d.id=m.draw_id;
 perform 1 from public.tours where id=tour for update;
 select * into cfg from public.tournament_settings where tour_id=tour order by revision desc limit 1;
 perform p.id from public.players p where p.id in(g.player_a,g.player_b) order by p.id for update;
 select current_rating into a_rating from public.players where id=g.player_a;
 select current_rating into b_rating from public.players where id=g.player_b;
 select s.player_name into name_a from public.lineups l join public.lineup_slots s on s.lineup_id=l.id where l.match_id=m.id and l.subteam_id=m.subteam_a and s.slot=g.slot;
 select s.player_name into name_b from public.lineups l join public.lineup_slots s on s.lineup_id=l.id where l.match_id=m.id and l.subteam_id=m.subteam_b and s.slot=g.slot;
 if g.completion_order is null then update public.singles_games set completion_order=nextval('private.singles_completion_order'::regclass) where id=target;end if;
 update public.singles_games set player_a_name=coalesce(player_a_name,name_a),player_b_name=coalesce(player_b_name,name_b) where id=target returning * into g;
 if kind_name='played' then
  summary:=private.score_summary(g.score_state);
  if summary->>'winner' is distinct from winner_side then raise exception 'Played singles winner must match score' using errcode='22023';end if;
  set_a:=(summary->>'sets_a')::integer;set_b:=(summary->>'sets_b')::integer;
  select coalesce(sum((v->>'a')::bigint),0),coalesce(sum((v->>'b')::bigint),0) into point_a,point_b from jsonb_array_elements(g.score_state->'sets') v;
 else
  set_a:=case winner_side when 'a' then 3 else 0 end;set_b:=case winner_side when 'b' then 3 else 0 end;
  point_a:=case winner_side when 'a' then 33 else 0 end;point_b:=case winner_side when 'b' then 33 else 0 end;
 end if;
 insert into public.singles_results(game_id,revision,previous_result_id,completion_order,kind,winner,player_a,player_b,player_a_name,player_b_name,actual_sets,sets_a,sets_b,points_a,points_b,settings_id,k_factor,ended_at,created_by) values(g.id,g.result_revision+1,g.result_id,g.completion_order,kind_name,winner_side,g.player_a,g.player_b,g.player_a_name,g.player_b_name,coalesce(g.score_state->'sets','[]'::jsonb),set_a,set_b,point_a,point_b,cfg.id,cfg.k_factor,ended_time,auth.uid()) returning id into result;
 update public.singles_games set status='finished',ended_at=ended_time,result_id=result,result_revision=result_revision+1,timeout_until=null,timeout_side=null where id=g.id;
 if kind_name='played' then
  pair:=private.elo_pair(a_rating,b_rating,winner_side,cfg.k_factor);
  select * into previous_calc from public.rating_calculations where game_id=g.id order by revision desc limit 1;
  insert into public.rating_calculations(game_id,result_id,revision,previous_calculation_id,completion_order,player_a,player_b,a_before,b_before,a_after,b_after,settings_id,k_factor,created_by) values(g.id,result,coalesce(previous_calc.revision,0)+1,previous_calc.id,g.completion_order,g.player_a,g.player_b,a_rating,b_rating,(pair->>'a')::numeric,(pair->>'b')::numeric,cfg.id,cfg.k_factor,auth.uid()) returning id into calc;
  insert into public.rating_calculation_heads(game_id,calculation_id) values(g.id,calc) on conflict(game_id) do update set calculation_id=excluded.calculation_id;
  update public.players set current_rating=case id when g.player_a then (pair->>'a')::numeric else (pair->>'b')::numeric end where id in(g.player_a,g.player_b);
  insert into public.rating_history(player_id,source,rating_before,rating_after,calculation_id,game_result_id) values(g.player_a,'game',a_rating,(pair->>'a')::numeric,calc,result),(g.player_b,'game',b_rating,(pair->>'b')::numeric,calc,result);
 end if;
 -- Physical rest is independent of rating correction/result history.
 if g.started_at is not null then
  insert into public.player_end_events(game_id,player_id,ended_at,created_by) values(g.id,g.player_a,ended_time,auth.uid()),(g.id,g.player_b,ended_time,auth.uid());
  insert into public.player_rest_heads(player_id,last_ended_at) values(g.player_a,ended_time),(g.player_b,ended_time) on conflict(player_id) do update set last_ended_at=greatest(public.player_rest_heads.last_ended_at,excluded.last_ended_at);
 end if;
 delete from public.live_players where match_id=m.id and player_id in(g.player_a,g.player_b);
 update public.team_matches set lineup_version=lineup_version+1 where id=m.id;
 select jsonb_agg(case when game.status='finished' then to_jsonb(r.winner) else 'null'::jsonb end order by game.slot) into game_winners from public.singles_games game left join public.singles_results r on r.id=game.result_id where game.match_id=m.id;
 team_summary:=private.team_outcome(game_winners);
 if team_summary->>'winner' is not null then
  select coalesce(sum(r.sets_a),0),coalesce(sum(r.sets_b),0),coalesce(sum(r.points_a),0),coalesce(sum(r.points_b),0) into set_a,set_b,point_a,point_b from public.singles_games game join public.singles_results r on r.id=game.result_id where game.match_id=m.id and game.status='finished';
  insert into public.team_match_results(match_id,revision,previous_result_id,winner,kind,games_a,games_b,sets_a,sets_b,points_a,points_b,created_by) values(m.id,m.result_revision+1,m.result_id,case team_summary->>'winner' when 'a' then m.subteam_a else m.subteam_b end,'played',(team_summary->>'a')::integer,(team_summary->>'b')::integer,set_a,set_b,point_a,point_b,auth.uid()) returning id into team_result;
  update public.team_matches set status='finished',completed_at=ended_time,result_id=team_result,result_revision=result_revision+1 where id=m.id;
  update public.singles_games set status='cancelled',score_version=score_version+1 where match_id=m.id and status='pending';
  delete from public.live_players where match_id=m.id;
  delete from public.live_subteams where match_id=m.id;
  delete from public.match_table_leases where match_id=m.id;
  perform private.advance_team_result(m.id);
 end if;
 return result;
end;$$;
revoke all on function private.finish_singles(uuid,text,text,timestamptz) from public,anon,authenticated;
create function public.score_command(command_id uuid,game uuid,kind text,side text,expected_version integer,note text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.singles_games;m public.team_matches;lease public.match_table_leases;head public.table_day_heads;assignment public.table_judge_assignments;old public.score_events;tour uuid;cfg public.tournament_settings;payload jsonb;before_value jsonb;after_value jsonb;state jsonb;summary jsonb;point public.active_score_points;command_now timestamptz;actual_kind text;actual_role public.staff_role;set_no integer;result uuid;a_ready boolean;b_ready boolean;winner_side text;scoring_day date;
begin
 if not private.has_staff_role() then raise exception 'Scoring access required' using errcode='42501';end if;
 -- Starts validate the roster; roster edits use the same low-frequency lock.
 -- Ordinary points/undo/timeouts never take the league administration locks.
 if kind='start' then perform pg_advisory_xact_lock(170005);end if;
 perform private.scoring_replay_barrier();
 select * into g from public.singles_games where id=game;
 select * into m from public.team_matches where id=g.match_id;
 perform private.draw_command_lock(m.draw_id);
 select * into m from public.team_matches where id=g.match_id for update;
 select * into g from public.singles_games where id=game for update;
 select p.tour_id into tour from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id where d.id=m.draw_id and d.published_at is not null;
 if g.id is null or tour is null or m.lineups_revealed_at is null then raise exception 'Scoring access required' using errcode='42501';end if;
 payload:=jsonb_build_object('kind',kind,'side',side,'version',expected_version,'note',btrim(note));
 select * into old from public.score_events where id=command_id;
 if found then
  if old.game_id<>game or old.actor_id<>auth.uid() or old.request<>payload then raise exception 'Score command ID conflict' using errcode='22023';end if;
  if old.authority<>'table' or not private.owns_scoring_table(old.table_number,tour) then raise exception 'Scoring access required' using errcode='42501';end if;
  return private.game_score_snapshot(game);
 end if;
 select * into lease from public.match_table_leases where match_id=m.id;
 if lease.match_id is null or not private.owns_scoring_table(lease.table_number,tour) then raise exception 'Scoring access required' using errcode='42501';end if;
 select * into cfg from public.tournament_settings where tour_id=tour order by revision desc limit 1;
 scoring_day:=(clock_timestamp() at time zone cfg.venue_timezone)::date;
 select * into head from public.table_day_heads where venue_day=scoring_day and table_number=lease.table_number for share;
 select * into assignment from public.table_judge_assignments where id=head.assignment_id;
 -- Recheck after waiting for ownership; a takeover must disable the old tablet.
 if head.staff_id is distinct from auth.uid() or not private.owns_scoring_table(lease.table_number,tour) then raise exception 'Scoring access required' using errcode='42501';end if;
 if command_id is null or coalesce(kind,'') not in('start','point','undo_point','undo_set','timeout','resume_timeout','withdrawal') or note is null or length(note)>500 or (kind in('start','point','timeout') and coalesce(side,'') not in('a','b')) or (kind in('undo_point','undo_set','resume_timeout','withdrawal') and side is not null) then raise exception 'Invalid score command' using errcode='22023';end if;
 if expected_version is distinct from g.score_version then raise exception 'Score version conflict' using errcode='40001';end if;
 if m.status<>'in_progress' or not private.match_dependencies_ready(m.id) then raise exception 'Live source-ready match required' using errcode='55000';end if;
 command_now:=clock_timestamp();
 if scoring_day<>(command_now at time zone cfg.venue_timezone)::date then raise exception 'Venue day changed; refresh scoring ownership' using errcode='55000';end if;
 actual_kind:=kind;
 actual_role:=case when assignment.mode='line_judge' then 'line_judge'::public.staff_role when private.has_staff_role('organizer') then 'organizer'::public.staff_role else 'main_judge'::public.staff_role end;
 before_value:=private.raw_game_state(game);
 if kind='start' then
  if g.status<>'pending' or g.player_a=g.player_b or exists(select 1 from public.singles_games where match_id=m.id and status='in_progress') or g.slot<>(select min(slot) from public.singles_games where match_id=m.id and status='pending') then raise exception 'Next pending singles required' using errcode='55000';end if;
  select * into cfg from public.tournament_settings where tour_id=tour order by revision desc limit 1;
  state:=jsonb_build_object('initial_server',side,'sets',jsonb_build_array(jsonb_build_object('a',0,'b',0)),'timeouts',jsonb_build_object('a',false,'b',false));
  select private.eligible_lineup_player(g.player_a,m.subteam_a,t.season_id,g.slot),private.eligible_lineup_player(g.player_b,m.subteam_b,t.season_id,g.slot) into a_ready,b_ready from public.tours t where t.id=tour;
  if not a_ready and not b_ready then raise exception 'Both singles players unavailable; Main Judge required' using errcode='55000';end if;
  if a_ready and b_ready then
   if (select count(*) from public.live_players where match_id=m.id and player_id in(g.player_a,g.player_b))<>2 then raise exception 'Selected player leases required' using errcode='55000';end if;
   if exists(select 1 from public.player_rest_heads where player_id in(g.player_a,g.player_b) and last_ended_at+make_interval(mins=>cfg.rest_minutes)>command_now) then raise exception 'Player rest incomplete' using errcode='55000';end if;
   update public.singles_games set status='in_progress',score_state=state,score_version=score_version+1,started_at=command_now,player_a_name=(select s.player_name from public.lineups l join public.lineup_slots s on s.lineup_id=l.id where l.match_id=m.id and l.subteam_id=m.subteam_a and s.slot=g.slot),player_b_name=(select s.player_name from public.lineups l join public.lineup_slots s on s.lineup_id=l.id where l.match_id=m.id and l.subteam_id=m.subteam_b and s.slot=g.slot) where id=game;
   update public.team_matches set lineup_version=lineup_version+1 where id=m.id;
  else
   update public.singles_games set score_state=state,score_version=score_version+1 where id=game;
   actual_kind:='withdrawal';winner_side:=case when a_ready then 'a' else 'b' end;
   result:=private.finish_singles(game,'withdrawal',winner_side,command_now);
  end if;
 else
  if g.status<>'in_progress' then raise exception 'Active singles required; completed results need official correction' using errcode='55000';end if;
  select a.status='active',b.status='active' into a_ready,b_ready from public.players a cross join public.players b where a.id=g.player_a and b.id=g.player_b;
  if not a_ready and not b_ready then raise exception 'Both singles players unavailable; Main Judge required' using errcode='55000';end if;
  if not a_ready or not b_ready then
   actual_kind:='withdrawal';winner_side:=case when a_ready then 'a' else 'b' end;
   update public.singles_games set score_version=score_version+1 where id=game;
   result:=private.finish_singles(game,'withdrawal',winner_side,command_now);
  else
   if kind='withdrawal' then raise exception 'Withdrawn player required' using errcode='22023';end if;
  if g.timeout_until>command_now and kind<>'resume_timeout' then raise exception 'Timeout still active' using errcode='55000';end if;
  state:=g.score_state;
  if kind='resume_timeout' then
   if g.timeout_until is null then raise exception 'No active timeout' using errcode='22023';end if;
   update public.singles_games set timeout_until=null,timeout_side=null where id=game;
  elsif kind='undo_point' then
   select * into point from public.active_score_points where game_id=game order by event_version desc limit 1;
   if not found then raise exception 'No active point to undo' using errcode='22023';end if;
   state:=private.score_transition(state,jsonb_build_object('kind','undo_point','side',point.side));
   delete from public.active_score_points where event_id=point.event_id;
  elsif kind='undo_set' then
   summary:=private.score_summary(state);set_no:=(summary->>'set_number')::integer;
   if (summary->>'points_a')::bigint+(summary->>'points_b')::bigint=0 then set_no:=set_no-1;end if;
   state:=private.score_transition(state,'{"kind":"undo_set"}');
   delete from public.active_score_points where game_id=game and set_number=set_no;
  else
   state:=private.score_transition(state,jsonb_build_object('kind',kind,'side',side));
   if kind='point' then
    summary:=private.score_summary(g.score_state);
    insert into public.active_score_points(event_id,game_id,event_version,set_number,side) values(command_id,game,g.score_version+1,(summary->>'set_number')::integer,side);
   elsif kind='timeout' then update public.singles_games set timeout_until=command_now+interval '60 seconds',timeout_side=side where id=game;
   end if;
  end if;
  update public.singles_games set score_state=state,score_version=score_version+1,timeout_until=case when timeout_until<=command_now then null else timeout_until end,timeout_side=case when timeout_until<=command_now then null else timeout_side end where id=game;
  summary:=private.score_summary(state);
  if summary->>'winner' is not null then result:=private.finish_singles(game,'played',summary->>'winner',command_now);end if;
  end if;
 end if;
 perform private.project_game_sets(game);
 update public.team_matches set version=version+1 where id=m.id;
 after_value:=private.raw_game_state(game);
 insert into public.score_events(id,game_id,actor_id,actor_role,kind,request,version_before,version_after,before_state,after_state,table_number,venue_day,assignment_id,authority,undo_target_id,undo_set_number,created_at) values(command_id,game,auth.uid(),actual_role,actual_kind,payload,g.score_version,g.score_version+1,before_value,after_value,lease.table_number,scoring_day,head.assignment_id,'table',point.event_id,set_no,command_now);
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,before_state,after_state) values(auth.uid(),actual_role,'score.'||actual_kind,game,'singles_game',before_value,after_value||jsonb_build_object('command_id',command_id,'undo_target',point.event_id,'undo_set',set_no,'result_id',result));
 return private.game_score_snapshot(game);
end;$$;
revoke all on function public.score_command(uuid,uuid,text,text,integer,text) from public,anon;
grant execute on function public.score_command(uuid,uuid,text,text,integer,text) to authenticated;

create or replace function public.drop_player(player uuid,effective_date date,reason text)
returns void language plpgsql security definer set search_path='' as $$
declare old public.players;live_match uuid;draw uuid;
begin
 perform pg_advisory_xact_lock(170005);
 select live.match_id,m.draw_id into live_match,draw from public.live_players live join public.team_matches m on m.id=live.match_id where live.player_id=player;
 if live_match is not null then
  perform private.scoring_replay_barrier();
  perform private.draw_command_lock(draw);
  perform 1 from public.team_matches where id=live_match for update;
 end if;
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
