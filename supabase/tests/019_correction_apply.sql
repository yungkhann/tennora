begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaae3b0-0000-4000-8000-000000000001','lineup-org-lifecycle-score-correction@test.invalid','{"display_name":"Lineup Organizer"}'),
 ('aaaae3b0-0000-4000-8000-000000000002','lineup-judge-lifecycle-score-correction@test.invalid','{"display_name":"Lineup Judge"}'),
 ('aaaae3b0-0000-4000-8000-000000000003','lineup-coach-a-lifecycle-score-correction@test.invalid','{"display_name":"Lineup Trainer A"}'),
 ('aaaae3b0-0000-4000-8000-000000000004','lineup-coach-b-lifecycle-score-correction@test.invalid','{"display_name":"Lineup Trainer B"}'),
 ('aaaae3b0-0000-4000-8000-000000000005','lineup-outsider-lifecycle-score-correction@test.invalid','{"display_name":"Lineup Outsider"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Lineup Fixture' from auth.users where id::text like 'aaaae3b0-%';
insert into public.staff_roles values('aaaae3b0-0000-4000-8000-000000000001','organizer'),('aaaae3b0-0000-4000-8000-000000000002','main_judge'),('aaaae3b0-0000-4000-8000-000000000003','trainer'),('aaaae3b0-0000-4000-8000-000000000004','trainer'),('aaaae3b0-0000-4000-8000-000000000004','main_judge'),('aaaae3b0-0000-4000-8000-000000000005','trainer');
create temp table lineup_fixture(match uuid,subteam_a uuid,subteam_b uuid,players_a uuid[],players_b uuid[],reserve_a uuid);
grant all on lineup_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaae3b0-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbbe3b0-0000-4000-8000-000000000001','Lineup Season',2026,(clock_timestamp() at time zone 'Asia/Almaty')::date-7,(clock_timestamp() at time zone 'Asia/Almaty')::date+7);
select public.save_tour('cccce3b0-0000-4000-8000-000000000001','bbbbe3b0-0000-4000-8000-000000000001','Lineup Tour',1,(clock_timestamp() at time zone 'Asia/Almaty')::date,(clock_timestamp() at time zone 'Asia/Almaty')::date);
select public.create_stage_template('dddde3b0-0000-4000-8000-000000000001','Lineup Format','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":1,"group_size":2}]}');
select public.configure_tour_stages('cccce3b0-0000-4000-8000-000000000001','dddde3b0-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'cccce3b0-0000-4000-8000-000000000001',0,32,128,60,true,'Asia/Almaty');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..2 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Lineup Club '||i,'Synthetic'); perform public.register_season_team('bbbbe3b0-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Hidden','Slot '||j,case when j in(1,3,5) then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbbe3b0-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;
select public.start_season('bbbbe3b0-0000-4000-8000-000000000001');
select public.generate_tour_draw('eeeee3b0-0000-4000-8000-000000000001','cccce3b0-0000-4000-8000-000000000001','U13',0);
select public.publish_tour_draw('eeeee3b0-0000-4000-8000-000000000001',1);
insert into lineup_fixture(match,subteam_a,subteam_b) select id,subteam_a,subteam_b from public.team_matches where draw_id='eeeee3b0-0000-4000-8000-000000000001';
update lineup_fixture f set players_a=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_a and m.ended_at is null),players_b=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_b and m.ended_at is null);
select public.assign_team_trainer('aaaae3b0-0000-4000-8000-000000000003',(select team_id from public.subteams where id=(select subteam_a from lineup_fixture)),array[(select subteam_a from lineup_fixture)]);
select public.assign_team_trainer('aaaae3b0-0000-4000-8000-000000000004',(select team_id from public.subteams where id=(select subteam_b from lineup_fixture)),array[(select subteam_b from lineup_fixture)]);
do $$declare person uuid:=gen_random_uuid();club uuid;sub uuid;begin select subteam_a into sub from lineup_fixture;select team_id into club from public.subteams where id=sub;perform public.save_player(person,club,'Reserve','Boy','boy','2014-01-01','right','attack','junior');perform public.add_roster_player('bbbbe3b0-0000-4000-8000-000000000001',sub,person);update lineup_fixture set reserve_a=person;end;$$;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values('aaaae3b0-0000-4000-8000-000000000006','life-line-score-correction@test.invalid','{"display_name":"Life Line Judge"}');
insert into public.staff_accounts(id,email,display_name) values('aaaae3b0-0000-4000-8000-000000000006','life-line-score-correction@test.invalid','Life Line Judge');
insert into public.staff_roles values('aaaae3b0-0000-4000-8000-000000000006','line_judge');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaae3b0-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.submit_lineup('ffffe3b0-0000-4000-8000-000000000001',match,subteam_a,players_a) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaae3b0-0000-4000-8000-000000000004","role":"authenticated"}',true);
select public.submit_lineup('ffffe3b0-0000-4000-8000-000000000002',match,subteam_b,players_b) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaae3b0-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.assign_table_judge('ffffe3b0-0000-4000-8000-000000000003','cccce3b0-0000-4000-8000-000000000001',127,(clock_timestamp() at time zone 'Asia/Almaty')::date,'aaaae3b0-0000-4000-8000-000000000006',0,'Lifecycle fixture judge');
select public.manage_match('dddde3b0-0000-4000-8000-000000000010',match,'assign',127,2,'Scoring fixture table') from lineup_fixture;
select public.manage_match('dddde3b0-0000-4000-8000-000000000011',match,'call',null,3,'Scoring fixture call') from lineup_fixture;
select public.manage_match('dddde3b0-0000-4000-8000-000000000012',match,'start',null,4,'Scoring fixture ready') from lineup_fixture;
create temp table score_fixture(games uuid[],first_point uuid,last_command uuid,last_expected integer);
grant all on score_fixture to authenticated;
insert into score_fixture(games,first_point) select array_agg(id order by slot),'ffffe3b0-0000-4000-8000-000000000020'::uuid from public.singles_games where match_id=(select match from lineup_fixture);
select set_config('request.jwt.claims','{"sub":"aaaae3b0-0000-4000-8000-000000000006","role":"authenticated"}',true);
select public.score_command('ffffe3b0-0000-4000-8000-000000000010',(select games[1] from score_fixture),'start','a',0,'Initial server');
do $$declare i integer;j integer;v integer;target uuid;begin
 for j in 1..3 loop select games[j] into target from score_fixture;if j>1 then perform public.score_command(gen_random_uuid(),target,'start','a',0,'Original game');end if;for i in 1..33 loop select score_version into v from public.singles_games where id=target;perform public.score_command(gen_random_uuid(),target,'point','a',v,'Original point');end loop;end loop;
end;$$;
create temp table correction_fixture(first_request uuid,first_payload jsonb,snapshot jsonb,original_ratings jsonb,root uuid,root_game uuid,dependent uuid,second_request uuid);
grant all on correction_fixture to authenticated;
insert into correction_fixture(first_request,first_payload) values('ffffe3b0-0000-4000-8000-000000000030','{"initial_server":"a","sets":[{"a":11,"b":1},{"a":11,"b":0},{"a":11,"b":0}],"timeouts":{"a":false,"b":false}}');
reset role;
update correction_fixture set original_ratings=(select jsonb_agg(jsonb_build_object('id',id,'rating',current_rating) order by id) from public.players where id in(select unnest(players_a||players_b) from lineup_fixture));
set local role authenticated;
select throws_ok($$select public.submit_result_correction(gen_random_uuid(),g.id,g.result_id,'played','a',(select first_payload from correction_fixture),'Unauthorized correction') from public.singles_games g where id=(select games[1] from score_fixture)$$,'42501','Match management permission required','assigned Line Judge cannot reopen a completed result');
select set_config('request.jwt.claims','{"sub":"aaaae3b0-0000-4000-8000-000000000002","role":"authenticated"}',true);
update correction_fixture set snapshot=public.submit_result_correction(first_request,g.id,g.result_id,'played','a',first_payload,'Correct recorded first set') from public.singles_games g where g.id=(select games[1] from score_fixture);
select is((select snapshot->>'status' from correction_fixture),'review','Main Judge creates private correction review');
select is((select snapshot->'plan'->>'team_complete' from correction_fixture),'true','same-winner score correction retains team completion in preview');
select is((select snapshot->'plan'->>'points_b' from correction_fixture),'1','preview uses amended point totals');
select is((select snapshot->'plan'->>'requires_organizer' from correction_fixture),'false','unchanged qualifiers need no started-play resolution');
select is((select length(snapshot->'plan'->>'digest') from correction_fixture),32,'preview has a deterministic version digest');
select is(public.get_result_correction((select first_request from correction_fixture))->'plan'->>'digest',(select snapshot->'plan'->>'digest' from correction_fixture),'unchanged review yields the same digest');
select public.submit_result_correction(first_request,g.id,g.result_id,'played','a',first_payload,'Correct recorded first set') from correction_fixture cross join public.singles_games g where g.id=(select games[1] from score_fixture);
select is((select count(*)::int from public.result_correction_events where request_id=(select first_request from correction_fixture)),1,'exact duplicate submission creates no second event');
select throws_ok($$select public.submit_result_correction(first_request,g.id,g.result_id,'played','a',first_payload,'Different reason') from correction_fixture cross join public.singles_games g where g.id=(select games[1] from score_fixture)$$,'22023','Correction request ID conflict','changed payload cannot reuse request ID');
select throws_ok($$select public.submit_result_correction(gen_random_uuid(),g.id,gen_random_uuid(),'played','a',(select first_payload from correction_fixture),'Stale result') from public.singles_games g where id=(select games[1] from score_fixture)$$,'40001','Result version conflict','stale result revision rejected');
select throws_ok($$select public.submit_result_correction(gen_random_uuid(),g.id,g.result_id,'played','a',g.score_state,'No change') from public.singles_games g where id=(select games[1] from score_fixture)$$,'22023','Changed result required','unchanged proposal rejected');
select throws_ok($$select public.submit_result_correction(gen_random_uuid(),g.id,g.result_id,'played','b',(select first_payload from correction_fixture),'Wrong claimed winner') from public.singles_games g where id=(select games[1] from score_fixture)$$,'22023','Completed proposed score required','claimed winner must match authoritative proposed score');
select throws_ok($$select public.submit_result_correction(gen_random_uuid(),g.id,g.result_id,'played','a','{"initial_server":"a","sets":[{"a":12,"b":0}],"timeouts":{"a":false,"b":false}}','Overshot set') from public.singles_games g where id=(select games[1] from score_fixture)$$,'22023','Invalid terminal set score','invalid terminal score rejected');
select throws_ok($$select public.submit_result_correction(gen_random_uuid(),g.id,g.result_id,'played','a','{"initial_server":"a","sets":[{"a":3,"b":0}],"timeouts":{"a":false,"b":false}}','Unfinished score') from public.singles_games g where id=(select games[1] from score_fixture)$$,'22023','Completed proposed score required','unfinished proposal is not an official completed result');
update correction_fixture set snapshot=public.submit_result_correction('ffffe3b0-0000-4000-8000-000000000031',g.id,g.result_id,'played','b','{"initial_server":"a","sets":[{"a":0,"b":11},{"a":0,"b":11},{"a":0,"b":11}],"timeouts":{"a":false,"b":false}}','Earlier winner was recorded incorrectly') from public.singles_games g where g.id=(select games[1] from score_fixture);
select is((select snapshot->'plan'->>'team_complete' from correction_fixture),'false','changed win can require more team singles');
select is((select jsonb_array_length(snapshot->'plan'->'reactivate_games') from correction_fixture),2,'preview identifies both previously unplayed cancelled games');
select is((select snapshot->'plan'->'group'->>'complete' from correction_fixture),'false','unfinished corrected match makes group provisional');
select is((select status::text from public.team_matches where id=(select match from lineup_fixture)),'finished','review does not reopen official match prematurely');
select is((select result_revision from public.singles_games where id=(select games[1] from score_fixture)),1,'review does not change current result revision');
update correction_fixture set snapshot=public.submit_result_correction('ffffe3b0-0000-4000-8000-000000000033',g.id,g.result_id,'withdrawal','b','{}','Historical withdrawal instead of a played result') from public.singles_games g where g.id=(select games[1] from score_fixture);
select is((select snapshot->>'kind' from correction_fixture),'withdrawal','official may propose an automatic-loss correction');
select is((select snapshot->'score' from correction_fixture),(select score_state from public.singles_games where id=(select games[1] from score_fixture)),'automatic proposal preserves actual original played score');
select is((select count(*)::int from public.rating_calculations where game_id=(select games[1] from score_fixture)),1,'automatic proposal does not remove existing effective Elo before application');
reset role;
select is((select jsonb_agg(jsonb_build_object('id',id,'rating',current_rating) order by id) from public.players where id in(select unnest(players_a||players_b) from lineup_fixture)),(select original_ratings from correction_fixture),'review changes no ratings');
-- A saved five-game team match plus two child branches and one grandchild.
-- Trusted fixture topology isolates started-play dependency preview.
select set_config('request.jwt.claims','{"sub":"aaaae3b0-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$declare m public.team_matches;root_match uuid:=gen_random_uuid();child_a uuid:=gen_random_uuid();child_b uuid:=gen_random_uuid();grandchild uuid:=gen_random_uuid();target uuid;g_index integer;winner text;root_result uuid;begin
 select * into m from public.team_matches where id=(select match from lineup_fixture);
 insert into public.team_matches(id,draw_id,stage_id,group_id,match_no,round_no,placement_from,placement_to,subteam_a,subteam_b,status,lineup_version,lineups_revealed_at,lineups_reveal_version,started_at) values(root_match,m.draw_id,m.stage_id,m.group_id,2,1,1,4,m.subteam_a,m.subteam_b,'in_progress',1,clock_timestamp(),1,clock_timestamp());
 for g_index in 1..5 loop
  target:=gen_random_uuid();winner:=case when g_index in(1,3,5) then 'a' else 'b' end;
  insert into public.singles_games(id,match_id,slot,player_a,player_b,status,score_state,player_a_name,player_b_name,started_at) values(target,root_match,g_index,(select players_a[g_index] from lineup_fixture),(select players_b[g_index] from lineup_fixture),'in_progress',jsonb_build_object('initial_server','a','sets',case when winner='a' then '[{"a":11,"b":0},{"a":11,"b":0},{"a":11,"b":0}]'::jsonb else '[{"a":0,"b":11},{"a":0,"b":11},{"a":0,"b":11}]'::jsonb end,'timeouts','{"a":false,"b":false}'::jsonb),'Historic A','Historic B',clock_timestamp());
  perform private.finish_singles(target,'played',winner,clock_timestamp());if g_index=3 then update correction_fixture set root_game=target;end if;
 end loop;
 select result_id into root_result from public.team_matches where id=root_match;
 insert into public.team_matches(id,draw_id,stage_id,group_id,match_no,round_no,placement_from,placement_to,subteam_a,status,started_at) values(child_a,m.draw_id,m.stage_id,m.group_id,3,2,1,2,m.subteam_a,'scheduled',null),(child_b,m.draw_id,m.stage_id,m.group_id,4,2,3,4,m.subteam_b,'in_progress',clock_timestamp()),(grandchild,m.draw_id,m.stage_id,m.group_id,5,3,1,2,m.subteam_a,'scheduled',null);
 insert into public.match_sources(match_id,side,source_match_id,outcome,source_result_id) values(child_a,'a',root_match,'winner',root_result),(child_b,'a',root_match,'loser',root_result),(grandchild,'a',child_a,'winner',null);
 update correction_fixture set root=root_match,dependent=child_b,second_request='ffffe3b0-0000-4000-8000-000000000032';
end;$$;
set local role authenticated;
update correction_fixture set snapshot=public.submit_result_correction(second_request,g.id,g.result_id,'played','b','{"initial_server":"a","sets":[{"a":0,"b":11},{"a":0,"b":11},{"a":0,"b":11}],"timeouts":{"a":false,"b":false}}','Winner changes after dependent play') from public.singles_games g where g.id=root_game;
select is((select snapshot->'plan'->>'games_b' from correction_fixture),'3','corrected team stops at first third win');
select is((select snapshot->'plan'->>'games_a' from correction_fixture),'1','later played singles is excluded from proposed team total');
select is((select jsonb_array_length(snapshot->'plan'->'trailing_games') from correction_fixture),1,'preview identifies already-played singles after corrected deciding win');
select is((select jsonb_array_length(snapshot->'plan'->'affected_matches') from correction_fixture),3,'preview follows both direct branches and a transitive dependency');
select is((select snapshot->'plan'->>'requires_organizer' from correction_fixture),'true','started dependency waits for explicit Organizer resolution');
select ok(not ((select snapshot->'plan'->'affected_matches' from correction_fixture)::text like '%player%'),'dependency preview carries no hidden player selections');
select throws_ok($$update public.result_correction_requests set reason='Rewrite history'$$,'42501',null,'staff cannot rewrite a submitted proposal');
select throws_ok($$insert into public.result_correction_events(id,request_id,kind,actor_id,actor_role,payload,after_state) values(gen_random_uuid(),(select first_request from correction_fixture),'applied',auth.uid(),'organizer','{}','{}')$$,'42501',null,'staff cannot forge an approval event');

-- Apply with a current digest; started downstream attempts demand Organizer action.
select throws_ok($$select public.apply_result_correction('ffffe3b0-0000-4000-8000-000000000040',(select second_request from correction_fixture),(select snapshot->'plan'->>'digest' from correction_fixture),false,'Reviewed correction')$$,'42501','Explicit Organizer resolution required','Main Judge cannot invalidate started downstream play');
select set_config('request.jwt.claims','{"sub":"aaaae3b0-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.apply_result_correction('ffffe3b0-0000-4000-8000-000000000040',(select second_request from correction_fixture),'stale',true,'Reviewed correction')$$,'40001','Correction review version conflict','apply requires the exact current plan digest');
select throws_ok($$select public.apply_result_correction('ffffe3b0-0000-4000-8000-000000000040',(select second_request from correction_fixture),(select snapshot->'plan'->>'digest' from correction_fixture),false,'Reviewed correction')$$,'42501','Explicit Organizer resolution required','Organizer also supplies explicit started-play consent');
reset role;
create function private.test_correction_fail() returns trigger language plpgsql as $$begin raise exception 'Injected correction failure' using errcode='P0001';end;$$;
create trigger test_correction_fail before insert on public.result_correction_events for each row when(new.kind='applied') execute function private.test_correction_fail();
set local role authenticated;
select throws_ok($$select public.apply_result_correction('ffffe3b0-0000-4000-8000-000000000040',(select second_request from correction_fixture),(select snapshot->'plan'->>'digest' from correction_fixture),true,'Rollback injected failure')$$,'P0001','Injected correction failure','late failure rolls back results, graph and rating replay');
select is((select result_revision from public.singles_games where id=(select root_game from correction_fixture)),1,'failed correction preserves the original result pointer');
select is((select count(*)::int from public.correction_attempts),0,'failed correction leaves no replacement attempts');
reset role;
drop trigger test_correction_fail on public.result_correction_events;
drop function private.test_correction_fail();
set local role authenticated;
update correction_fixture set first_payload=public.apply_result_correction('ffffe3b0-0000-4000-8000-000000000040',second_request,snapshot->'plan'->>'digest',true,'Reviewed correction and restart of affected matches');
select is((select first_payload->>'status' from correction_fixture),'applied','correction applies atomically');
select is(public.apply_result_correction('ffffe3b0-0000-4000-8000-000000000040',(select second_request from correction_fixture),(select snapshot->'plan'->>'digest' from correction_fixture),true,'Reviewed correction and restart of affected matches'),(select first_payload from correction_fixture),'exact apply retry returns its receipt');
select is((select count(*)::int from public.correction_attempts),3,'all transitive affected attempts are preserved');
select is((select result_revision from public.singles_games where id=(select root_game from correction_fixture)),2,'amended singles appends a second result');
select is((select k_factor::int from public.singles_results where id=(select first_payload->>'result_id' from correction_fixture)::uuid),32,'amendment retains original saved K');
select is((select count(*)::int from public.singles_games where match_id=(select root from correction_fixture) and slot=5 and status='cancelled'),1,'previously played trailing singles becomes ineffective');
select is((select count(*)::int from public.player_end_events where game_id in(select id from public.singles_games where match_id=(select root from correction_fixture))),10,'physical end history of all five singles is retained');
select is((select count(*)::int from public.rating_calculation_heads where game_id in(select id from public.singles_games where match_id=(select root from correction_fixture))),4,'trailing singles no longer has an effective rating head');
select is((select count(*)::int from public.team_matches where superseded_by is not null),0,'ordinary current-match reads hide superseded attempts');
reset role;
select is((select count(*)::int from public.team_matches where superseded_by is not null),3,'superseded matches remain stored for audit');
select is((select count(*)::int from public.singles_results where game_id=(select root_game from correction_fixture)),2,'original singles result remains immutable');
select is((select count(*)::int from public.match_sources s join public.correction_attempts a on a.new_match_id=s.match_id where s.source_match_id in(select old_match_id from public.correction_attempts)),0,'replacement graph does not depend on superseded parents');
set local role authenticated;
select throws_ok($$select public.apply_result_correction(gen_random_uuid(),(select second_request from correction_fixture),(select snapshot->'plan'->>'digest' from correction_fixture),true,'Another application')$$,'55000','Correction is no longer in review','new command cannot reapply an applied correction');
-- Reversing the amendment restores an originally played trailing result when needed.
update correction_fixture set snapshot=public.submit_result_correction('ffffe3b0-0000-4000-8000-000000000041',g.id,g.result_id,'played','a','{"initial_server":"a","sets":[{"a":11,"b":0},{"a":11,"b":0},{"a":11,"b":0}],"timeouts":{"a":false,"b":false}}','Restore original scored winner') from public.singles_games g where g.id=root_game;
select is((select jsonb_array_length(snapshot->'plan'->'restore_games') from correction_fixture),1,'reverse review restores the previously played deciding singles');
select lives_ok($$select public.apply_result_correction(gen_random_uuid(),'ffffe3b0-0000-4000-8000-000000000041',(select snapshot->'plan'->>'digest' from correction_fixture),true,'Restore original played result with retained history')$$,'reversed correction restores the full original match outcome');
select is((select count(*)::int from public.singles_games where match_id=(select root from correction_fixture) and status='finished'),5,'all five original games become effective again');
select is((select count(*)::int from public.rating_calculation_heads where game_id in(select id from public.singles_games where match_id=(select root from correction_fixture))),5,'restored original play rejoins saved-K replay');
-- Apply a different proposal to the original three-game fixture; it needs continuation.
update correction_fixture set snapshot=public.get_result_correction('ffffe3b0-0000-4000-8000-000000000031');
select lives_ok($$select public.apply_result_correction(gen_random_uuid(),'ffffe3b0-0000-4000-8000-000000000031',(select snapshot->'plan'->>'digest' from correction_fixture),false,'Reopen incomplete original team match')$$,'winner amendment reopens an incomplete match');
select is((select status::text from public.team_matches where id=(select match from lineup_fixture)),'scheduled','continuation waits for fresh table assignment');
select is((select count(*)::int from public.singles_games where match_id=(select match from lineup_fixture) and status='pending'),2,'unplayed cancelled singles reactivate');
select throws_ok($$select public.resume_corrected_match(gen_random_uuid(),(select match from lineup_fixture),(select version from public.team_matches where id=(select match from lineup_fixture)),'Resume without table')$$,'55000','Current-day table required','resuming requires a current-day table');
select throws_ok($$select public.manage_match(gen_random_uuid(),id,'assign',127,version,'Too early continuation assignment') from public.team_matches where id=(select match from lineup_fixture)$$,'55000','Player rest incomplete','continuation allocation also honors actual rest');
reset role;
update public.player_rest_heads set last_ended_at=clock_timestamp()-interval '61 minutes' where player_id in(select unnest(players_a||players_b) from lineup_fixture);
set local role authenticated;
select public.manage_match(gen_random_uuid(),id,'assign',127,version,'Continuation table') from public.team_matches where id=(select match from lineup_fixture);
reset role;
update public.player_rest_heads set last_ended_at=clock_timestamp() where player_id=(select players_a[4] from lineup_fixture);
set local role authenticated;
select throws_ok($$select public.resume_corrected_match(gen_random_uuid(),id,version,'Too soon') from public.team_matches where id=(select match from lineup_fixture)$$,'55000','Player rest incomplete','correction does not bypass physical rest');
reset role;
-- Trusted clock fixture: move only the rest projection back to simulate waiting.
update public.player_rest_heads set last_ended_at=clock_timestamp()-interval '61 minutes' where player_id in(select unnest(players_a||players_b) from lineup_fixture);
set local role authenticated;
select lives_ok($$select public.resume_corrected_match(gen_random_uuid(),id,version,'Continue reviewed result') from public.team_matches where id=(select match from lineup_fixture)$$,'eligible rested pending players may resume');
select is((select count(*)::int from public.live_players where match_id=(select match from lineup_fixture)),4,'only pending continuation players receive leases');
select set_config('request.jwt.claims','{"sub":"aaaae3b0-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.apply_result_correction(gen_random_uuid(),(select first_request from correction_fixture),'x',true,'Trainer forgery')$$,'42501','Match management permission required','Trainer cannot apply a correction directly');
reset role;
set local role anon;
select throws_ok($$select public.apply_result_correction(gen_random_uuid(),gen_random_uuid(),'x',true,'Anonymous forgery')$$,'42501',null,'anonymous cannot apply a correction');
reset role;
select * from finish();
rollback;
