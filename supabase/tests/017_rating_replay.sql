begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaae3a0-0000-4000-8000-000000000001','lineup-org-lifecycle-score-replay@test.invalid','{"display_name":"Lineup Organizer"}'),
 ('aaaae3a0-0000-4000-8000-000000000002','lineup-judge-lifecycle-score-replay@test.invalid','{"display_name":"Lineup Judge"}'),
 ('aaaae3a0-0000-4000-8000-000000000003','lineup-coach-a-lifecycle-score-replay@test.invalid','{"display_name":"Lineup Trainer A"}'),
 ('aaaae3a0-0000-4000-8000-000000000004','lineup-coach-b-lifecycle-score-replay@test.invalid','{"display_name":"Lineup Trainer B"}'),
 ('aaaae3a0-0000-4000-8000-000000000005','lineup-outsider-lifecycle-score-replay@test.invalid','{"display_name":"Lineup Outsider"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Lineup Fixture' from auth.users where id::text like 'aaaae3a0-%';
insert into public.staff_roles values('aaaae3a0-0000-4000-8000-000000000001','organizer'),('aaaae3a0-0000-4000-8000-000000000002','main_judge'),('aaaae3a0-0000-4000-8000-000000000003','trainer'),('aaaae3a0-0000-4000-8000-000000000004','trainer'),('aaaae3a0-0000-4000-8000-000000000004','main_judge'),('aaaae3a0-0000-4000-8000-000000000005','trainer');
create temp table lineup_fixture(match uuid,subteam_a uuid,subteam_b uuid,players_a uuid[],players_b uuid[],reserve_a uuid);
grant all on lineup_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaae3a0-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbbe3a0-0000-4000-8000-000000000001','Lineup Season',2026,(clock_timestamp() at time zone 'Asia/Almaty')::date-7,(clock_timestamp() at time zone 'Asia/Almaty')::date+7);
select public.save_tour('cccce3a0-0000-4000-8000-000000000001','bbbbe3a0-0000-4000-8000-000000000001','Lineup Tour',1,(clock_timestamp() at time zone 'Asia/Almaty')::date,(clock_timestamp() at time zone 'Asia/Almaty')::date);
select public.create_stage_template('dddde3a0-0000-4000-8000-000000000001','Lineup Format','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":1,"group_size":2}]}');
select public.configure_tour_stages('cccce3a0-0000-4000-8000-000000000001','dddde3a0-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'cccce3a0-0000-4000-8000-000000000001',0,32,128,60,true,'Asia/Almaty');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..2 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Lineup Club '||i,'Synthetic'); perform public.register_season_team('bbbbe3a0-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Hidden','Slot '||j,case when j in(1,3,5) then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbbe3a0-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;
select public.start_season('bbbbe3a0-0000-4000-8000-000000000001');
select public.generate_tour_draw('eeeee3a0-0000-4000-8000-000000000001','cccce3a0-0000-4000-8000-000000000001','U13',0);
select public.publish_tour_draw('eeeee3a0-0000-4000-8000-000000000001',1);
insert into lineup_fixture(match,subteam_a,subteam_b) select id,subteam_a,subteam_b from public.team_matches where draw_id='eeeee3a0-0000-4000-8000-000000000001';
update lineup_fixture f set players_a=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_a and m.ended_at is null),players_b=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_b and m.ended_at is null);
select public.assign_team_trainer('aaaae3a0-0000-4000-8000-000000000003',(select team_id from public.subteams where id=(select subteam_a from lineup_fixture)),array[(select subteam_a from lineup_fixture)]);
select public.assign_team_trainer('aaaae3a0-0000-4000-8000-000000000004',(select team_id from public.subteams where id=(select subteam_b from lineup_fixture)),array[(select subteam_b from lineup_fixture)]);
do $$declare person uuid:=gen_random_uuid();club uuid;sub uuid;begin select subteam_a into sub from lineup_fixture;select team_id into club from public.subteams where id=sub;perform public.save_player(person,club,'Reserve','Boy','boy','2014-01-01','right','attack','junior');perform public.add_roster_player('bbbbe3a0-0000-4000-8000-000000000001',sub,person);update lineup_fixture set reserve_a=person;end;$$;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values('aaaae3a0-0000-4000-8000-000000000006','life-line-score-replay@test.invalid','{"display_name":"Life Line Judge"}');
insert into public.staff_accounts(id,email,display_name) values('aaaae3a0-0000-4000-8000-000000000006','life-line-score-replay@test.invalid','Life Line Judge');
insert into public.staff_roles values('aaaae3a0-0000-4000-8000-000000000006','line_judge');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaae3a0-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.submit_lineup('ffffe3a0-0000-4000-8000-000000000001',match,subteam_a,players_a) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaae3a0-0000-4000-8000-000000000004","role":"authenticated"}',true);
select public.submit_lineup('ffffe3a0-0000-4000-8000-000000000002',match,subteam_b,players_b) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaae3a0-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.assign_table_judge('ffffe3a0-0000-4000-8000-000000000003','cccce3a0-0000-4000-8000-000000000001',127,(clock_timestamp() at time zone 'Asia/Almaty')::date,'aaaae3a0-0000-4000-8000-000000000006',0,'Lifecycle fixture judge');
select public.manage_match('dddde3a0-0000-4000-8000-000000000010',match,'assign',127,2,'Scoring fixture table') from lineup_fixture;
select public.manage_match('dddde3a0-0000-4000-8000-000000000011',match,'call',null,3,'Scoring fixture call') from lineup_fixture;
select public.manage_match('dddde3a0-0000-4000-8000-000000000012',match,'start',null,4,'Scoring fixture ready') from lineup_fixture;
create temp table score_fixture(games uuid[],first_point uuid,last_command uuid,last_expected integer);
grant all on score_fixture to authenticated;
insert into score_fixture(games,first_point) select array_agg(id order by slot),'ffffe3a0-0000-4000-8000-000000000020'::uuid from public.singles_games where match_id=(select match from lineup_fixture);
select set_config('request.jwt.claims','{"sub":"aaaae3a0-0000-4000-8000-000000000006","role":"authenticated"}',true);
select public.score_command('ffffe3a0-0000-4000-8000-000000000010',(select games[1] from score_fixture),'start','a',0,'Initial server');
-- First result uses the real command path. Later saved historical fixtures use
-- trusted private completion to test cross-match chronology without a venue wait.
do $$declare i integer;v integer;target uuid;begin select games[1] into target from score_fixture;for i in 1..33 loop select score_version into v from public.singles_games where id=target;perform public.score_command(gen_random_uuid(),target,'point','a',v,'Original first singles');end loop;end;$$;
select set_config('request.jwt.claims','{"sub":"aaaae3a0-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_tournament_settings(gen_random_uuid(),'cccce3a0-0000-4000-8000-000000000001',1,64,128,60,true,'Asia/Almaty');
reset role;
create temp table replay_fixture(game1 uuid,game2 uuid,game3 uuid,original_results uuid[],original_calcs uuid[],original_ends jsonb,original_rest jsonb);
grant all on replay_fixture to authenticated;
insert into replay_fixture(game1) select games[1] from score_fixture;
do $$declare m public.team_matches;second_match uuid:=gen_random_uuid();target uuid:=gen_random_uuid();begin
 select * into m from public.team_matches where id=(select match from lineup_fixture);
 insert into public.team_matches(id,draw_id,stage_id,group_id,match_no,round_no,subteam_a,subteam_b,status) values(second_match,m.draw_id,m.stage_id,m.group_id,2,2,m.subteam_a,m.subteam_b,'in_progress');
 insert into public.singles_games(id,match_id,slot,player_a,player_b,status,score_state,player_a_name,player_b_name,started_at) values(target,second_match,1,(select players_a[1] from lineup_fixture),(select players_b[3] from lineup_fixture),'in_progress','{"initial_server":"a","sets":[{"a":11,"b":0},{"a":11,"b":0},{"a":11,"b":0}],"timeouts":{"a":false,"b":false}}','Repeated A','Later B',clock_timestamp());
 perform private.finish_singles(target,'played','a',clock_timestamp());perform private.project_game_sets(target);update replay_fixture set game2=target;
end;$$;
set local role authenticated;
select public.save_tournament_settings(gen_random_uuid(),'cccce3a0-0000-4000-8000-000000000001',2,16,128,60,true,'Asia/Almaty');
reset role;
do $$declare m public.team_matches;third_match uuid:=gen_random_uuid();target uuid:=gen_random_uuid();begin
 select * into m from public.team_matches where id=(select match from lineup_fixture);
 insert into public.team_matches(id,draw_id,stage_id,group_id,match_no,round_no,subteam_a,subteam_b,status) values(third_match,m.draw_id,m.stage_id,m.group_id,3,3,m.subteam_a,m.subteam_b,'in_progress');
 insert into public.singles_games(id,match_id,slot,player_a,player_b,status,score_state,player_a_name,player_b_name,started_at) values(target,third_match,1,(select players_a[3] from lineup_fixture),(select players_b[3] from lineup_fixture),'in_progress','{"initial_server":"a","sets":[{"a":0,"b":11},{"a":0,"b":11},{"a":0,"b":11}],"timeouts":{"a":false,"b":false}}','Third A','Repeated B',clock_timestamp());
 perform private.finish_singles(target,'played','b',clock_timestamp());perform private.project_game_sets(target);update replay_fixture set game3=target;
end;$$;
update replay_fixture set original_results=(select array_agg(result_id order by completion_order) from public.singles_games where id in(game1,game2,game3)),original_calcs=(select array_agg(calculation_id order by game_id) from public.rating_calculation_heads where game_id in(game1,game2,game3)),original_ends=(select jsonb_agg(to_jsonb(e) order by id) from public.player_end_events e where game_id in(game1,game2,game3)),original_rest=(select jsonb_agg(to_jsonb(h) order by player_id) from public.player_rest_heads h where player_id in(select unnest(players_a||players_b) from lineup_fixture));
select is((select count(*)::int from public.rating_replay_anchors where player_id in(select unnest(players_a||players_b) from lineup_fixture)),4,'four distinct played players have initial/import anchors');
select is(private.replay_effective_ratings(),' {"calculations_appended":0,"heads_removed":0,"players_changed":0}'::jsonb,'unchanged chronology is a no-op');
select is((select count(*)::int from public.rating_calculations where game_id in(select game1 from replay_fixture union all select game2 from replay_fixture union all select game3 from replay_fixture)),3,'no-op creates no duplicate calculation');
set local role authenticated;
select public.save_tournament_settings(gen_random_uuid(),'cccce3a0-0000-4000-8000-000000000001',3,128,128,60,true,'Asia/Almaty');
reset role;
-- Simulate the result revision that E3b will install in the same transaction.
do $$declare g public.singles_games;r public.singles_results;next_result uuid;begin
 select * into g from public.singles_games where id=(select game1 from replay_fixture);select * into r from public.singles_results where id=g.result_id;
 update public.singles_games set score_state='{"initial_server":"a","sets":[{"a":0,"b":11},{"a":0,"b":11},{"a":0,"b":11}],"timeouts":{"a":false,"b":false}}' where id=g.id;
 insert into public.singles_results(game_id,revision,previous_result_id,completion_order,kind,winner,player_a,player_b,player_a_name,player_b_name,actual_sets,sets_a,sets_b,points_a,points_b,settings_id,k_factor,ended_at,created_by) values(g.id,2,r.id,r.completion_order,'played','b',r.player_a,r.player_b,r.player_a_name,r.player_b_name,'[{"a":0,"b":11},{"a":0,"b":11},{"a":0,"b":11}]',0,3,0,33,r.settings_id,r.k_factor,r.ended_at,auth.uid()) returning id into next_result;
 update public.singles_games set result_id=next_result,result_revision=2 where id=g.id;
end;$$;
select is(private.replay_effective_ratings()->>'calculations_appended','3','earlier winner change propagates through a repeated player and then their later opponent');
select is((select current_rating::int from public.players where id=(select players_a[1] from lineup_fixture)),1017,'repeated winner recalculates from corrected 984 using saved K64');
select is((select current_rating::int from public.players where id=(select players_b[1] from lineup_fixture)),1016,'original opponent now receives the corrected win');
select is((select current_rating::int from public.players where id=(select players_a[3] from lineup_fixture)),991,'transitively affected third player recalculates with saved K16');
select is((select current_rating::int from public.players where id=(select players_b[3] from lineup_fixture)),976,'third game uses its recalculated input');
select is((select array_agg(c.k_factor::int order by c.completion_order) from public.rating_calculation_heads h join public.rating_calculations c on c.id=h.calculation_id where h.game_id in(select game1 from replay_fixture union all select game2 from replay_fixture union all select game3 from replay_fixture)),array[32,64,16],'replay ignores current K128 and preserves each result K');
select is((select count(*)::int from public.rating_calculations where id in(select unnest(original_calcs) from replay_fixture)),3,'original calculations remain unchanged');
select is((select count(*)::int from public.singles_results where id in(select unnest(original_results) from replay_fixture)),3,'original results remain unchanged');
select is((select count(*)::int from public.rating_history where calculation_id in(select unnest(original_calcs) from replay_fixture)),6,'original rating history remains');
select is((select jsonb_agg(to_jsonb(e) order by id) from public.player_end_events e where game_id in(select game1 from replay_fixture union all select game2 from replay_fixture union all select game3 from replay_fixture)),(select original_ends from replay_fixture),'replay does not rewrite physical ends');
select is((select jsonb_agg(to_jsonb(h) order by player_id) from public.player_rest_heads h where player_id in(select unnest(players_a||players_b) from lineup_fixture)),(select original_rest from replay_fixture),'replay does not move rest clocks');
select is(private.replay_effective_ratings(),' {"calculations_appended":0,"heads_removed":0,"players_changed":0}'::jsonb,'second identical replay remains a no-op');
-- Played -> automatic keeps immutable evidence but removes the effective Elo head.
do $$declare g public.singles_games;r public.singles_results;next_result uuid;begin
 select * into g from public.singles_games where id=(select game1 from replay_fixture);select * into r from public.singles_results where id=g.result_id;
 insert into public.singles_results(game_id,revision,previous_result_id,completion_order,kind,winner,player_a,player_b,player_a_name,player_b_name,actual_sets,sets_a,sets_b,points_a,points_b,settings_id,k_factor,ended_at,created_by) values(g.id,3,r.id,r.completion_order,'withdrawal','b',r.player_a,r.player_b,r.player_a_name,r.player_b_name,r.actual_sets,0,3,0,33,r.settings_id,r.k_factor,r.ended_at,auth.uid()) returning id into next_result;
 update public.singles_games set result_id=next_result,result_revision=3 where id=g.id;
end;$$;
select is(private.replay_effective_ratings()->>'heads_removed','1','automatic correction removes only the effective Elo head');
select is((select count(*)::int from public.rating_calculation_heads where game_id=(select game1 from replay_fixture)),0,'automatic result has no current calculation');
select is((select current_rating::int from public.players where id=(select players_b[1] from lineup_fixture)),1000,'automatic result restores unused original opponent to anchor');
select is((select current_rating::int from public.players where id=(select players_a[1] from lineup_fixture)),1032,'later played game replays without automatic-loss Elo');
-- Restore played result after the head was removed: revision follows full history.
do $$declare g public.singles_games;r public.singles_results;next_result uuid;begin
 select * into g from public.singles_games where id=(select game1 from replay_fixture);select * into r from public.singles_results where id=g.result_id;
 insert into public.singles_results(game_id,revision,previous_result_id,completion_order,kind,winner,player_a,player_b,player_a_name,player_b_name,actual_sets,sets_a,sets_b,points_a,points_b,settings_id,k_factor,ended_at,created_by) values(g.id,4,r.id,r.completion_order,'played','b',r.player_a,r.player_b,r.player_a_name,r.player_b_name,r.actual_sets,0,3,0,33,r.settings_id,r.k_factor,r.ended_at,auth.uid()) returning id into next_result;
 update public.singles_games set result_id=next_result,result_revision=4 where id=g.id;
end;$$;
select is(private.replay_effective_ratings()->>'calculations_appended','3','automatic-to-played correction recalculates the affected chronology');
select is((select c.revision from public.rating_calculation_heads h join public.rating_calculations c on c.id=h.calculation_id where h.game_id=(select game1 from replay_fixture)),3,'restored head uses maximum historical calculation revision plus one');
select is((select c.previous_calculation_id from public.rating_calculation_heads h join public.rating_calculations c on c.id=h.calculation_id where h.game_id=(select game1 from replay_fixture)),(select id from public.rating_calculations where game_id=(select game1 from replay_fixture) and revision=2),'restored head links previous preserved calculation');
update public.team_matches set status='cancelled' where id=(select match_id from public.singles_games where id=(select game3 from replay_fixture));
select is(private.replay_effective_ratings()->>'heads_removed','1','voided historical match removes its effective Elo head');
select is((select current_rating::int from public.players where id=(select players_a[3] from lineup_fixture)),1000,'voiding restores a player with no other played games to the original anchor');
select is((select current_rating::int from public.players where id=(select players_b[3] from lineup_fixture)),967,'voiding replays the opponent to their preceding effective game');
update public.team_matches set status='in_progress' where id=(select match_id from public.singles_games where id=(select game3 from replay_fixture));
select is(private.replay_effective_ratings()->>'calculations_appended','1','restoring a historical match appends rather than restoring an old mutable head');
select throws_ok($$insert into public.rating_history(player_id,source,rating_before,rating_after,calculation_id,game_result_id) select c.player_a,'game',c.a_before+1,c.a_after,c.id,c.result_id from public.rating_calculation_heads h join public.rating_calculations c on c.id=h.calculation_id where h.game_id=(select game1 from replay_fixture)$$,'22023','Consistent linked rating history required','forged linked history cannot claim a different rating input');
select throws_ok($$insert into public.rating_history(player_id,source,rating_before,rating_after,calculation_id,game_result_id) select c.player_a,'game',c.a_before,c.a_after,c.id,c.result_id from public.rating_calculation_heads h join public.rating_calculations c on c.id=h.calculation_id where h.game_id=(select game1 from replay_fixture)$$,'23505',null,'one history row per calculation/player');
update public.rating_history set rating_after=rating_after+1 where id=(select history_id from public.rating_replay_anchors where player_id=(select players_a[1] from lineup_fixture));
select throws_ok($$select private.replay_effective_ratings()$$,'55000','Supported rating provenance required','altered baseline evidence stops replay');
update public.rating_history set rating_after=rating_after-1 where id=(select history_id from public.rating_replay_anchors where player_id=(select players_a[1] from lineup_fixture));
update public.players set current_rating=current_rating+1 where id=(select players_a[1] from lineup_fixture);
select throws_ok($$select private.replay_effective_ratings()$$,'55000','Current rating provenance mismatch','unrecorded rating change stops replay rather than being discarded');
update public.players set current_rating=current_rating-1 where id=(select players_a[1] from lineup_fixture);
insert into public.rating_history(player_id,source,rating_after) values((select players_a[1] from lineup_fixture),'correction',1017);
select throws_ok($$select private.replay_effective_ratings()$$,'55000','Supported rating provenance required','legacy unlinked correction requires explicit reconciliation');
delete from public.rating_history where source='correction' and player_id=(select players_a[1] from lineup_fixture);
select is(private.replay_effective_ratings(),' {"calculations_appended":0,"heads_removed":0,"players_changed":0}'::jsonb,'failed attempts leave effective heads and current ratings unchanged');
set local role authenticated;
select throws_ok($$select private.replay_effective_ratings()$$,'42501',null,'even an Organizer cannot call the private replay helper directly');
select throws_ok($$delete from public.rating_replay_anchors$$,'42501',null,'staff cannot delete provenance anchors');
reset role;
select set_config('request.jwt.claims','{"sub":"aaaae3a0-0000-4000-8000-000000000006","role":"authenticated"}',true);
select throws_ok($$select private.replay_effective_ratings()$$,'42501','Match management permission required','private helper independently rejects Line Judge identity');
set local role anon;
select throws_ok($$select private.replay_effective_ratings()$$,'42501',null,'anonymous cannot replay');
select throws_ok($$select * from public.rating_replay_anchors$$,'42501',null,'anonymous cannot read anchors');
reset role;
select * from finish();
rollback;
