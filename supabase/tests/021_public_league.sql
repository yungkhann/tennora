begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaaf100-0000-4000-8000-000000000001','lineup-org-lifecycle-score@test.invalid','{"display_name":"Lineup Organizer"}'),
 ('aaaaf100-0000-4000-8000-000000000002','lineup-judge-lifecycle-score@test.invalid','{"display_name":"Lineup Judge"}'),
 ('aaaaf100-0000-4000-8000-000000000003','lineup-coach-a-lifecycle-score@test.invalid','{"display_name":"Lineup Trainer A"}'),
 ('aaaaf100-0000-4000-8000-000000000004','lineup-coach-b-lifecycle-score@test.invalid','{"display_name":"Lineup Trainer B"}'),
 ('aaaaf100-0000-4000-8000-000000000005','lineup-outsider-lifecycle-score@test.invalid','{"display_name":"Lineup Outsider"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Lineup Fixture' from auth.users where id::text like 'aaaaf100-%';
insert into public.staff_roles values('aaaaf100-0000-4000-8000-000000000001','organizer'),('aaaaf100-0000-4000-8000-000000000002','main_judge'),('aaaaf100-0000-4000-8000-000000000003','trainer'),('aaaaf100-0000-4000-8000-000000000004','trainer'),('aaaaf100-0000-4000-8000-000000000004','main_judge'),('aaaaf100-0000-4000-8000-000000000005','trainer');
create temp table lineup_fixture(match uuid,subteam_a uuid,subteam_b uuid,players_a uuid[],players_b uuid[],reserve_a uuid);
grant all on lineup_fixture to authenticated;
grant select on lineup_fixture to anon;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaf100-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbbf100-0000-4000-8000-000000000001','Lineup Season',2026,(clock_timestamp() at time zone 'Asia/Almaty')::date-7,(clock_timestamp() at time zone 'Asia/Almaty')::date+7);
select public.save_tour('ccccf100-0000-4000-8000-000000000001','bbbbf100-0000-4000-8000-000000000001','Lineup Tour',1,(clock_timestamp() at time zone 'Asia/Almaty')::date,(clock_timestamp() at time zone 'Asia/Almaty')::date);
select public.create_stage_template('ddddf100-0000-4000-8000-000000000001','Lineup Format','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":1,"group_size":2}]}');
select public.configure_tour_stages('ccccf100-0000-4000-8000-000000000001','ddddf100-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'ccccf100-0000-4000-8000-000000000001',0,32,128,60,true,'Asia/Almaty');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..2 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Lineup Club '||i,'Synthetic'); perform public.register_season_team('bbbbf100-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Hidden','Slot '||j,case when j in(1,3,5) then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbbf100-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;
select public.start_season('bbbbf100-0000-4000-8000-000000000001');
select public.generate_tour_draw('eeeef100-0000-4000-8000-000000000001','ccccf100-0000-4000-8000-000000000001','U13',0);
select public.publish_tour_draw('eeeef100-0000-4000-8000-000000000001',1);
insert into lineup_fixture(match,subteam_a,subteam_b) select id,subteam_a,subteam_b from public.team_matches where draw_id='eeeef100-0000-4000-8000-000000000001';
update lineup_fixture f set players_a=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_a and m.ended_at is null),players_b=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_b and m.ended_at is null);
select public.assign_team_trainer('aaaaf100-0000-4000-8000-000000000003',(select team_id from public.subteams where id=(select subteam_a from lineup_fixture)),array[(select subteam_a from lineup_fixture)]);
select public.assign_team_trainer('aaaaf100-0000-4000-8000-000000000004',(select team_id from public.subteams where id=(select subteam_b from lineup_fixture)),array[(select subteam_b from lineup_fixture)]);
do $$declare person uuid:=gen_random_uuid();club uuid;sub uuid;begin select subteam_a into sub from lineup_fixture;select team_id into club from public.subteams where id=sub;perform public.save_player(person,club,'Reserve','Boy','boy','2014-01-01','right','attack','junior');perform public.add_roster_player('bbbbf100-0000-4000-8000-000000000001',sub,person);update lineup_fixture set reserve_a=person;end;$$;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values('aaaaf100-0000-4000-8000-000000000006','life-line-score@test.invalid','{"display_name":"Life Line Judge"}');
insert into public.staff_accounts(id,email,display_name) values('aaaaf100-0000-4000-8000-000000000006','life-line-score@test.invalid','Life Line Judge');
insert into public.staff_roles values('aaaaf100-0000-4000-8000-000000000006','line_judge');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaf100-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.submit_lineup('fffff100-0000-4000-8000-000000000001',match,subteam_a,players_a) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaf100-0000-4000-8000-000000000004","role":"authenticated"}',true);
select public.submit_lineup('fffff100-0000-4000-8000-000000000002',match,subteam_b,players_b) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaf100-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.assign_table_judge('fffff100-0000-4000-8000-000000000003','ccccf100-0000-4000-8000-000000000001',127,(clock_timestamp() at time zone 'Asia/Almaty')::date,'aaaaf100-0000-4000-8000-000000000006',0,'Lifecycle fixture judge');
select public.manage_match('ddddf100-0000-4000-8000-000000000010',match,'assign',127,2,'Scoring fixture table') from lineup_fixture;
select public.manage_match('ddddf100-0000-4000-8000-000000000011',match,'call',null,3,'Scoring fixture call') from lineup_fixture;
select public.manage_match('ddddf100-0000-4000-8000-000000000012',match,'start',null,4,'Scoring fixture ready') from lineup_fixture;
create temp table score_fixture(games uuid[],first_point uuid,last_command uuid,last_expected integer);
grant all on score_fixture to authenticated;
insert into score_fixture(games,first_point) select array_agg(id order by slot),'fffff100-0000-4000-8000-000000000020'::uuid from public.singles_games where match_id=(select match from lineup_fixture);
select set_config('request.jwt.claims','{"sub":"aaaaf100-0000-4000-8000-000000000006","role":"authenticated"}',true);
select public.score_command('fffff100-0000-4000-8000-000000000010',(select games[1] from score_fixture),'start','a',0,'Initial server');

set constraints public_match_changed,public_singles_changed,public_table_changed,public_draw_changed immediate;
set constraints public_match_changed,public_singles_changed,public_table_changed,public_draw_changed deferred;
create temp table public_fixture(version bigint,payload jsonb);
grant all on public_fixture to anon,authenticated;
insert into public_fixture select version,data from public.public_match_snapshots where match_id=(select match from lineup_fixture);
set local role anon;
select is((select jsonb_array_length(payload->'singles') from public_fixture),5,'committed joint reveal exposes all five pairings together');
select throws_ok($$select * from public.subteams$$,'42501',null,'public player projection grants no private subteam access');
reset role;
set local role anon;
select ok(not ((select payload from public_fixture)::text ~ 'date_of_birth|submitted_by|actor_id|email|consent|score_events'),'public match projection contains approved fields only');
select is(jsonb_array_length(public.get_public_directory()->'seasons'),1,'directory lists published seasons');
select is(jsonb_array_length(public.get_public_season_standings('bbbbf100-0000-4000-8000-000000000001')),6,'standings include three subteams per registered club');
select ok((public.get_public_season_standings('bbbbf100-0000-4000-8000-000000000001')->0->>'provisional')::boolean,'unfinished tours remain provisional');
select throws_ok($$select * from public.lineup_slots$$,'42501',null,'public projection grants no private lineup access');
select throws_ok($$update public.public_match_snapshots set data='{}'$$,'42501',null,'anonymous cannot forge public snapshots');
reset role;
select set_config('request.jwt.claims','{"sub":"aaaaf100-0000-4000-8000-000000000006","role":"authenticated"}',true);
set local role authenticated;
select public.score_command(gen_random_uuid(),(select games[1] from score_fixture),'point','a',1,'Public committed point');
select is((select version from public.public_match_snapshots where match_id=(select match from lineup_fixture)),(select version from public_fixture),'uncommitted score leaves the previous public snapshot intact');
set constraints public_match_changed,public_singles_changed,public_table_changed,public_draw_changed immediate;
select is((select (data->'singles'->0->'summary'->>'points_a')::int from public.public_match_snapshots where match_id=(select match from lineup_fixture)),1,'deferred projection publishes the authoritative committed score');
select is((select version from public.public_match_snapshots where match_id=(select match from lineup_fixture)),(select version+1 from public_fixture),'one changed command increments the public projection once');
set constraints public_match_changed,public_singles_changed,public_table_changed,public_draw_changed deferred;
select set_config('request.jwt.claims','{"sub":"aaaaf100-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.drop_player(players_b[1],current_date,'Public withdrawal projection') from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaf100-0000-4000-8000-000000000006","role":"authenticated"}',true);
select public.score_command(gen_random_uuid(),(select games[1] from score_fixture),'withdrawal',null,2,'Confirm the recorded withdrawal');
set constraints public_match_changed,public_singles_changed immediate;
select is((select (data->'singles'->0->'summary'->>'sets_a')::int from public.public_match_snapshots where match_id=(select match from lineup_fixture)),3,'automatic loss displays the official three-set award');
select is((select (data->'singles'->0->'sets'->0->>'a')::int from public.public_match_snapshots where match_id=(select match from lineup_fixture)),1,'automatic award retains the separate actual played points');
set constraints public_match_changed,public_singles_changed deferred;
-- Synthetic early hidden state: never expose one side's selections.
reset role;
update public.team_matches set lineups_revealed_at=null,lineups_reveal_version=null where id=(select match from lineup_fixture);
set constraints public_match_changed immediate;
set local role anon;
select is((select jsonb_array_length(data->'singles') from public.public_match_snapshots where match_id=(select match from lineup_fixture)),0,'hidden state excludes every player selection');
select ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='public_league_players' and column_name in('date_of_birth','email','external_rating_id')),'player projection has no private columns');
reset role;
select * from finish();
rollback;
