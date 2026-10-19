begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaaa026-0000-4000-8000-000000000001','lineup-org-audit-a026@test.invalid','{"display_name":"Lineup Organizer"}'),
 ('aaaaa026-0000-4000-8000-000000000002','lineup-judge-audit-a026@test.invalid','{"display_name":"Lineup Judge"}'),
 ('aaaaa026-0000-4000-8000-000000000003','lineup-coach-a-audit-a026@test.invalid','{"display_name":"Lineup Trainer A"}'),
 ('aaaaa026-0000-4000-8000-000000000004','lineup-coach-b-audit-a026@test.invalid','{"display_name":"Lineup Trainer B"}'),
 ('aaaaa026-0000-4000-8000-000000000005','lineup-outsider-audit-a026@test.invalid','{"display_name":"Lineup Outsider"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Lineup Fixture' from auth.users where id::text like 'aaaaa026-%';
insert into public.staff_roles values('aaaaa026-0000-4000-8000-000000000001','organizer'),('aaaaa026-0000-4000-8000-000000000002','main_judge'),('aaaaa026-0000-4000-8000-000000000003','trainer'),('aaaaa026-0000-4000-8000-000000000004','trainer'),('aaaaa026-0000-4000-8000-000000000004','main_judge'),('aaaaa026-0000-4000-8000-000000000005','trainer');
create temp table lineup_fixture(match uuid,subteam_a uuid,subteam_b uuid,players_a uuid[],players_b uuid[],reserve_a uuid);
grant all on lineup_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaa026-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbba026-0000-4000-8000-000000000001','Lineup Season',2026,(clock_timestamp() at time zone 'Asia/Almaty')::date-7,(clock_timestamp() at time zone 'Asia/Almaty')::date+7);
select public.save_tour('cccca026-0000-4000-8000-000000000001','bbbba026-0000-4000-8000-000000000001','Lineup Tour',1,(clock_timestamp() at time zone 'Asia/Almaty')::date,(clock_timestamp() at time zone 'Asia/Almaty')::date);
select public.create_stage_template('dddda026-0000-4000-8000-000000000001','Lineup Format','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":1,"group_size":2}]}');
select public.configure_tour_stages('cccca026-0000-4000-8000-000000000001','dddda026-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'cccca026-0000-4000-8000-000000000001',0,32,128,60,true,'Asia/Almaty');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..2 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Lineup Club '||i,'Synthetic'); perform public.register_season_team('bbbba026-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Hidden','Slot '||j,case when j in(1,3,5) then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbba026-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;
select public.start_season('bbbba026-0000-4000-8000-000000000001');
select public.generate_tour_draw('eeeea026-0000-4000-8000-000000000001','cccca026-0000-4000-8000-000000000001','U13',0);
select public.publish_tour_draw('eeeea026-0000-4000-8000-000000000001',1);
insert into lineup_fixture(match,subteam_a,subteam_b) select id,subteam_a,subteam_b from public.team_matches where draw_id='eeeea026-0000-4000-8000-000000000001';
update lineup_fixture f set players_a=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_a and m.ended_at is null),players_b=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_b and m.ended_at is null);
select public.assign_team_trainer('aaaaa026-0000-4000-8000-000000000003',(select team_id from public.subteams where id=(select subteam_a from lineup_fixture)),array[(select subteam_a from lineup_fixture)]);
select public.assign_team_trainer('aaaaa026-0000-4000-8000-000000000004',(select team_id from public.subteams where id=(select subteam_b from lineup_fixture)),array[(select subteam_b from lineup_fixture)]);
do $$declare person uuid:=gen_random_uuid();club uuid;sub uuid;begin select subteam_a into sub from lineup_fixture;select team_id into club from public.subteams where id=sub;perform public.save_player(person,club,'Reserve','Boy','boy','2014-01-01','right','attack','junior');perform public.add_roster_player('bbbba026-0000-4000-8000-000000000001',sub,person);update lineup_fixture set reserve_a=person;end;$$;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values('aaaaa026-0000-4000-8000-000000000006','line-a026@test.invalid','{"display_name":"Life Line Judge"}');
insert into public.staff_accounts(id,email,display_name) values('aaaaa026-0000-4000-8000-000000000006','line-a026@test.invalid','Life Line Judge');
insert into public.staff_roles values('aaaaa026-0000-4000-8000-000000000006','line_judge');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaa026-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.submit_lineup('ffffa026-0000-4000-8000-000000000001',match,subteam_a,players_a) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaa026-0000-4000-8000-000000000004","role":"authenticated"}',true);
select public.submit_lineup('ffffa026-0000-4000-8000-000000000002',match,subteam_b,players_b) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaa026-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.assign_table_judge('ffffa026-0000-4000-8000-000000000003','cccca026-0000-4000-8000-000000000001',127,(clock_timestamp() at time zone 'Asia/Almaty')::date,'aaaaa026-0000-4000-8000-000000000006',0,true);
select public.manage_match('dddda026-0000-4000-8000-000000000010',match,'assign',127,2,true) from lineup_fixture;
select public.manage_match('dddda026-0000-4000-8000-000000000011',match,'call',null,3,true) from lineup_fixture;
select public.manage_match('dddda026-0000-4000-8000-000000000012',match,'start',null,4,true) from lineup_fixture;
create temp table score_fixture(games uuid[],first_point uuid,last_command uuid,last_expected integer);
grant all on score_fixture to authenticated;
insert into score_fixture(games,first_point) select array_agg(id order by slot),'ffffa026-0000-4000-8000-000000000020'::uuid from public.singles_games where match_id=(select match from lineup_fixture);
select set_config('request.jwt.claims','{"sub":"aaaaa026-0000-4000-8000-000000000006","role":"authenticated"}',true);
select public.score_command('ffffa026-0000-4000-8000-000000000010',(select games[1] from score_fixture),'start','a',0,true);

select lives_ok($$select public.score_command('ffffa026-0000-4000-8000-000000000090',(select games[1] from score_fixture),'withdrawal','a',1,true)$$,'assigned judge records a match-specific retirement');
select is((select status::text from public.singles_games where id=(select games[1] from score_fixture)),'finished','retirement finishes singles');
select is((select winner from public.singles_results where game_id=(select games[1] from score_fixture)),'b','opponent wins automatically');
reset role;
select is((select count(*)::int from public.players where id in(select unnest(players_a||players_b) from lineup_fixture) and status='active'),10,'retirement does not drop out either player');
select is((select count(*)::int from public.roster_memberships where player_id in(select unnest(players_a||players_b) from lineup_fixture) and ended_at is null),10,'retirement preserves active roster memberships');
select is((select count(*)::int from public.rating_history where player_id in(select unnest(players_a||players_b) from lineup_fixture) and source<>'initial'),0,'retirement changes no Elo');
set local role authenticated;
select lives_ok($$select public.score_command('ffffa026-0000-4000-8000-000000000090',(select games[1] from score_fixture),'withdrawal','a',1,true)$$,'exact retirement retry acknowledges the same result');
select is((select count(*)::int from public.singles_results where game_id=(select games[1] from score_fixture)),1,'retirement retry creates no second result');
select public.score_command(gen_random_uuid(),(select games[2] from score_fixture),'start','a',0,true);
select throws_ok($$select public.score_command(gen_random_uuid(),(select games[2] from score_fixture),'withdrawal','b',1,false)$$,'22023','Action confirmation required','retirement needs confirmation');
select set_config('request.jwt.claims','{"sub":"aaaaa026-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.score_command(gen_random_uuid(),(select games[2] from score_fixture),'withdrawal','b',1,true)$$,'42501','Scoring access required','Trainer cannot retire through direct RPC');
select set_config('request.jwt.claims','{"sub":"aaaaa026-0000-4000-8000-000000000006","role":"authenticated"}',true);
select public.score_command(gen_random_uuid(),(select games[2] from score_fixture),'withdrawal','b',1,true);
select is((select winner from public.singles_results where game_id=(select games[2] from score_fixture)),'a','B-side retirement awards A');
select * from finish();rollback;
