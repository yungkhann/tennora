begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaaa024-0000-4000-8000-000000000001','audit-recovery-org@test.invalid','{"display_name":"Lineup Organizer"}'),
 ('aaaaa024-0000-4000-8000-000000000002','audit-recovery-manager@test.invalid','{"display_name":"Lineup Judge"}'),
 ('aaaaa024-0000-4000-8000-000000000003','audit-recovery-coach-a@test.invalid','{"display_name":"Lineup Trainer A"}'),
 ('aaaaa024-0000-4000-8000-000000000004','audit-recovery-coach-b@test.invalid','{"display_name":"Lineup Trainer B"}'),
 ('aaaaa024-0000-4000-8000-000000000005','audit-recovery-outsider@test.invalid','{"display_name":"Lineup Outsider"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Lineup Fixture' from auth.users where id::text like 'aaaaa024-%';
insert into public.staff_roles values('aaaaa024-0000-4000-8000-000000000001','organizer'),('aaaaa024-0000-4000-8000-000000000002','main_judge'),('aaaaa024-0000-4000-8000-000000000003','trainer'),('aaaaa024-0000-4000-8000-000000000004','trainer'),('aaaaa024-0000-4000-8000-000000000004','main_judge'),('aaaaa024-0000-4000-8000-000000000005','trainer');
create temp table lineup_fixture(match uuid,subteam_a uuid,subteam_b uuid,players_a uuid[],players_b uuid[],reserve_a uuid);
grant all on lineup_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaa024-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbba024-0000-4000-8000-000000000001','Lineup Season',2026,(clock_timestamp() at time zone 'Asia/Almaty')::date-7,(clock_timestamp() at time zone 'Asia/Almaty')::date+7);
select public.save_tour('cccca024-0000-4000-8000-000000000001','bbbba024-0000-4000-8000-000000000001','Lineup Tour',1,(clock_timestamp() at time zone 'Asia/Almaty')::date,(clock_timestamp() at time zone 'Asia/Almaty')::date);
select public.create_stage_template('dddda024-0000-4000-8000-000000000001','Lineup Format','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":1,"group_size":2}]}');
select public.configure_tour_stages('cccca024-0000-4000-8000-000000000001','dddda024-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'cccca024-0000-4000-8000-000000000001',0,32,128,60,true,'Asia/Almaty');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..2 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Lineup Club '||i,'Synthetic'); perform public.register_season_team('bbbba024-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Hidden','Slot '||j,case when j in(1,3,5) then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbba024-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;
select public.start_season('bbbba024-0000-4000-8000-000000000001');
select public.generate_tour_draw('eeeea024-0000-4000-8000-000000000001','cccca024-0000-4000-8000-000000000001','U13',0);
select public.publish_tour_draw('eeeea024-0000-4000-8000-000000000001',1);
insert into lineup_fixture(match,subteam_a,subteam_b) select id,subteam_a,subteam_b from public.team_matches where draw_id='eeeea024-0000-4000-8000-000000000001';
update lineup_fixture f set players_a=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_a and m.ended_at is null),players_b=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_b and m.ended_at is null);
select public.assign_team_trainer('aaaaa024-0000-4000-8000-000000000003',(select team_id from public.subteams where id=(select subteam_a from lineup_fixture)),array[(select subteam_a from lineup_fixture)]);
select public.assign_team_trainer('aaaaa024-0000-4000-8000-000000000004',(select team_id from public.subteams where id=(select subteam_b from lineup_fixture)),array[(select subteam_b from lineup_fixture)]);
do $$declare person uuid:=gen_random_uuid();club uuid;sub uuid;begin select subteam_a into sub from lineup_fixture;select team_id into club from public.subteams where id=sub;perform public.save_player(person,club,'Reserve','Boy','boy','2014-01-01','right','attack','junior');perform public.add_roster_player('bbbba024-0000-4000-8000-000000000001',sub,person);update lineup_fixture set reserve_a=person;end;$$;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values('aaaaa024-0000-4000-8000-000000000006','audit-recovery-line@test.invalid','{"display_name":"Life Line Judge"}');
insert into public.staff_accounts(id,email,display_name) values('aaaaa024-0000-4000-8000-000000000006','audit-recovery-line@test.invalid','Life Line Judge');
insert into public.staff_roles values('aaaaa024-0000-4000-8000-000000000006','line_judge');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaa024-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.submit_lineup('ffffa024-0000-4000-8000-000000000001',match,subteam_a,players_a) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaa024-0000-4000-8000-000000000004","role":"authenticated"}',true);
select public.submit_lineup('ffffa024-0000-4000-8000-000000000002',match,subteam_b,players_b) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaa024-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.assign_table_judge('ffffa024-0000-4000-8000-000000000003','cccca024-0000-4000-8000-000000000001',127,(clock_timestamp() at time zone 'Asia/Almaty')::date,'aaaaa024-0000-4000-8000-000000000006',0,'Lifecycle fixture judge');
select public.manage_match('dddda024-0000-4000-8000-000000000010',match,'assign',127,2,'Scoring fixture table') from lineup_fixture;
select public.manage_match('dddda024-0000-4000-8000-000000000011',match,'call',null,3,'Scoring fixture call') from lineup_fixture;
select public.manage_match('dddda024-0000-4000-8000-000000000012',match,'start',null,4,'Scoring fixture ready') from lineup_fixture;
create temp table score_fixture(games uuid[],first_point uuid,last_command uuid,last_expected integer);
grant all on score_fixture to authenticated;
insert into score_fixture(games,first_point) select array_agg(id order by slot),'ffffa024-0000-4000-8000-000000000020'::uuid from public.singles_games where match_id=(select match from lineup_fixture);
select set_config('request.jwt.claims','{"sub":"aaaaa024-0000-4000-8000-000000000006","role":"authenticated"}',true);
select public.score_command('ffffa024-0000-4000-8000-000000000010',(select games[1] from score_fixture),'start','a',0,'Initial server');

do $$declare target uuid;v integer;i integer;begin
 select games[1] into target from score_fixture;
 for i in 1..33 loop select score_version into v from public.singles_games where id=target;perform public.score_command(gen_random_uuid(),target,'point','a',v,'Original point');end loop;
 perform public.score_command(gen_random_uuid(),(select games[2] from score_fixture),'start','a',0,'Ongoing singles');
end;$$;
select set_config('request.jwt.claims','{"sub":"aaaaa024-0000-4000-8000-000000000001","role":"authenticated"}',true);
create temp table audit_review as select public.submit_result_correction(gen_random_uuid(),id,result_id,'played','a','{"initial_server":"a","sets":[{"a":11,"b":1},{"a":11,"b":0},{"a":11,"b":0}],"timeouts":{"a":false,"b":false}}','Correct opening set') as value from public.singles_games where id=(select games[1] from score_fixture);
select public.apply_result_correction(gen_random_uuid(),(value->>'id')::uuid,value->'plan'->>'digest',false,'Reviewed correction') from audit_review;
select public.manage_match(gen_random_uuid(),id,'assign',127,version,'Reassign continuing match') from public.team_matches where id=(select match from lineup_fixture);
reset role;
-- The rest guard must include the continuing B player, not just pending slots.
insert into public.player_rest_heads(player_id,last_ended_at) values((select players_b[2] from lineup_fixture),clock_timestamp()) on conflict(player_id) do update set last_ended_at=excluded.last_ended_at;
set local role authenticated;
select throws_ok($$select public.resume_corrected_match(gen_random_uuid(),id,version,'Too early B continuation') from public.team_matches where id=(select match from lineup_fixture)$$,'55000','Player rest incomplete','active B continuation is included in rest checks');
reset role;
delete from public.player_rest_heads where player_id=(select players_b[2] from lineup_fixture);
set local role authenticated;
select public.resume_corrected_match(gen_random_uuid(),id,version,'Resume continuing players') from public.team_matches where id=(select match from lineup_fixture);
select is((select count(*)::int from public.live_players where match_id=(select match from lineup_fixture)),8,'both continuing players and six pending players are reserved');
select throws_ok($$select public.transfer_player((select players_b[2] from lineup_fixture),(select team_id from public.subteams where id=(select subteam_a from lineup_fixture)),'Transfer during active singles')$$,'55000','Player reserved in live match','continuing B player cannot transfer during play');
reset role;
select is(private.score_summary('{"initial_server":"a","sets":[{"a":11,"b":0},{"a":0,"b":11},{"a":11,"b":0},{"a":0,"b":11},{"a":5,"b":0}],"timeouts":{"a":false,"b":false}}')->>'ends_swapped','true','SQL changes ends at five in deciding set');
select * from finish();
rollback;
