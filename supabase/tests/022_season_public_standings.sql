begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaaf200-0000-4000-8000-000000000001','lineup-org-lifecycle-score@test.invalid','{"display_name":"Lineup Organizer"}'),
 ('aaaaf200-0000-4000-8000-000000000002','lineup-judge-lifecycle-score@test.invalid','{"display_name":"Lineup Judge"}'),
 ('aaaaf200-0000-4000-8000-000000000003','lineup-coach-a-lifecycle-score@test.invalid','{"display_name":"Lineup Trainer A"}'),
 ('aaaaf200-0000-4000-8000-000000000004','lineup-coach-b-lifecycle-score@test.invalid','{"display_name":"Lineup Trainer B"}'),
 ('aaaaf200-0000-4000-8000-000000000005','lineup-outsider-lifecycle-score@test.invalid','{"display_name":"Lineup Outsider"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Lineup Fixture' from auth.users where id::text like 'aaaaf200-%';
insert into public.staff_roles values('aaaaf200-0000-4000-8000-000000000001','organizer'),('aaaaf200-0000-4000-8000-000000000002','main_judge'),('aaaaf200-0000-4000-8000-000000000003','trainer'),('aaaaf200-0000-4000-8000-000000000004','trainer'),('aaaaf200-0000-4000-8000-000000000004','main_judge'),('aaaaf200-0000-4000-8000-000000000005','trainer');
create temp table lineup_fixture(match uuid,subteam_a uuid,subteam_b uuid,players_a uuid[],players_b uuid[],reserve_a uuid);
grant all on lineup_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaf200-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbbf200-0000-4000-8000-000000000001','Lineup Season',2026,(clock_timestamp() at time zone 'Asia/Almaty')::date-7,(clock_timestamp() at time zone 'Asia/Almaty')::date+7);
select public.save_tour('ccccf200-0000-4000-8000-000000000001','bbbbf200-0000-4000-8000-000000000001','Lineup Tour',1,(clock_timestamp() at time zone 'Asia/Almaty')::date,(clock_timestamp() at time zone 'Asia/Almaty')::date);
select public.create_stage_template('ddddf200-0000-4000-8000-000000000001','Lineup Format','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":1,"group_size":2}]}');
select public.configure_tour_stages('ccccf200-0000-4000-8000-000000000001','ddddf200-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'ccccf200-0000-4000-8000-000000000001',0,32,128,60,true,'Asia/Almaty');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..2 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Lineup Club '||i,'Synthetic'); perform public.register_season_team('bbbbf200-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Hidden','Slot '||j,case when j in(1,3,5) then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbbf200-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;

select public.save_tour('ccccf200-0000-4000-8000-000000000002','bbbbf200-0000-4000-8000-000000000001','Second',2,(clock_timestamp() at time zone 'Asia/Almaty')::date,(clock_timestamp() at time zone 'Asia/Almaty')::date);
select public.save_tour('ccccf200-0000-4000-8000-000000000003','bbbbf200-0000-4000-8000-000000000001','Third',3,(clock_timestamp() at time zone 'Asia/Almaty')::date,(clock_timestamp() at time zone 'Asia/Almaty')::date);
select public.configure_tour_stages(tour,'ddddf200-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]) from unnest(array['ccccf200-0000-4000-8000-000000000002','ccccf200-0000-4000-8000-000000000003']::uuid[]) tour;
select public.save_tournament_settings(gen_random_uuid(),tour,0,32,128,60,true,'Asia/Almaty') from unnest(array['ccccf200-0000-4000-8000-000000000002','ccccf200-0000-4000-8000-000000000003']::uuid[]) tour;
select public.configure_tour_weight('ccccf200-0000-4000-8000-000000000002',2);
select public.start_season('bbbbf200-0000-4000-8000-000000000001');
select public.generate_tour_draw('eeeef200-0000-4000-8000-000000000001','ccccf200-0000-4000-8000-000000000001','U13',0);
select public.publish_tour_draw('eeeef200-0000-4000-8000-000000000001',1);
insert into lineup_fixture(match,subteam_a,subteam_b) select id,subteam_a,subteam_b from public.team_matches where draw_id='eeeef200-0000-4000-8000-000000000001';
update lineup_fixture f set players_a=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_a and m.ended_at is null),players_b=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_b and m.ended_at is null);
select public.assign_team_trainer('aaaaf200-0000-4000-8000-000000000003',(select team_id from public.subteams where id=(select subteam_a from lineup_fixture)),array[(select subteam_a from lineup_fixture)]);
select public.assign_team_trainer('aaaaf200-0000-4000-8000-000000000004',(select team_id from public.subteams where id=(select subteam_b from lineup_fixture)),array[(select subteam_b from lineup_fixture)]);
do $$declare person uuid:=gen_random_uuid();club uuid;sub uuid;begin select subteam_a into sub from lineup_fixture;select team_id into club from public.subteams where id=sub;perform public.save_player(person,club,'Reserve','Boy','boy','2014-01-01','right','attack','junior');perform public.add_roster_player('bbbbf200-0000-4000-8000-000000000001',sub,person);update lineup_fixture set reserve_a=person;end;$$;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values('aaaaf200-0000-4000-8000-000000000006','life-line-score@test.invalid','{"display_name":"Life Line Judge"}');
insert into public.staff_accounts(id,email,display_name) values('aaaaf200-0000-4000-8000-000000000006','life-line-score@test.invalid','Life Line Judge');
insert into public.staff_roles values('aaaaf200-0000-4000-8000-000000000006','line_judge');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaf200-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.submit_lineup('fffff200-0000-4000-8000-000000000001',match,subteam_a,players_a) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaf200-0000-4000-8000-000000000004","role":"authenticated"}',true);
select public.submit_lineup('fffff200-0000-4000-8000-000000000002',match,subteam_b,players_b) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaf200-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.assign_table_judge('fffff200-0000-4000-8000-000000000003','ccccf200-0000-4000-8000-000000000001',127,(clock_timestamp() at time zone 'Asia/Almaty')::date,'aaaaf200-0000-4000-8000-000000000006',0,true);
select public.manage_match('ddddf200-0000-4000-8000-000000000010',match,'assign',127,2,true) from lineup_fixture;
select public.manage_match('ddddf200-0000-4000-8000-000000000011',match,'call',null,3,true) from lineup_fixture;
select public.manage_match('ddddf200-0000-4000-8000-000000000012',match,'start',null,4,true) from lineup_fixture;
create temp table score_fixture(games uuid[],first_point uuid,last_command uuid,last_expected integer);
grant all on score_fixture to authenticated;
insert into score_fixture(games,first_point) select array_agg(id order by slot),'fffff200-0000-4000-8000-000000000020'::uuid from public.singles_games where match_id=(select match from lineup_fixture);
select set_config('request.jwt.claims','{"sub":"aaaaf200-0000-4000-8000-000000000006","role":"authenticated"}',true);
select public.score_command('fffff200-0000-4000-8000-000000000010',(select games[1] from score_fixture),'start','a',0,true);

do $$declare i integer;j integer;v integer;target uuid;begin for j in 1..3 loop select games[j] into target from score_fixture;if j>1 then perform public.score_command(gen_random_uuid(),target,'start','a',0,true);end if;for i in 1..33 loop select score_version into v from public.singles_games where id=target;perform public.score_command(gen_random_uuid(),target,'point','a',v,true);end loop;end loop;end;$$;
reset role;
select is((select count(*)::int from public.tour_placements where draw_id='eeeef200-0000-4000-8000-000000000001'),2,'final single-group tour projects both placements');
select is((select (configuration->'tours'->1->>'placement_weight')::int from public.season_configuration_snapshots where season_id='bbbbf200-0000-4000-8000-000000000001'),2,'season start freezes tour placement weights');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaf200-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.configure_tour_weight('ccccf200-0000-4000-8000-000000000001',3)$$,'55000','Draft season required','weight cannot change after season start');
select ok((public.get_public_season_standings('bbbbf200-0000-4000-8000-000000000001')->0->>'provisional')::boolean,'future unfinished tours keep season standings provisional');
reset role;
-- Trusted waiting-time fixture; actual events/results and saved K stay immutable.
update public.player_rest_heads set last_ended_at=clock_timestamp()-interval '61 minutes' where player_id in(select unnest(players_a||players_b) from lineup_fixture);
create function pg_temp.wait_for_rest() returns void language sql security definer as $$update public.player_rest_heads set last_ended_at=clock_timestamp()-interval '61 minutes' where player_id in(select unnest(players_a||players_b) from lineup_fixture)$$;
set local role authenticated;
do $$declare ordinal integer;tour uuid;draw uuid;tm public.team_matches;sub uuid;trainer uuid;players uuid[];target public.singles_games;i integer;v integer;winning_subteam uuid;winning_side text;begin
 for ordinal in 2..3 loop
  tour:=case ordinal when 2 then 'ccccf200-0000-4000-8000-000000000002' else 'ccccf200-0000-4000-8000-000000000003' end::uuid;
  perform set_config('request.jwt.claims','{"sub":"aaaaf200-0000-4000-8000-000000000001","role":"authenticated"}',true);
  draw:=gen_random_uuid();perform public.generate_tour_draw(draw,tour,'U13',0);perform public.publish_tour_draw(draw,1);
  select * into tm from public.team_matches where draw_id=draw;
  foreach sub in array array[tm.subteam_a,tm.subteam_b] loop
   if sub=(select subteam_a from lineup_fixture) then trainer:='aaaaf200-0000-4000-8000-000000000003';select players_a into players from lineup_fixture;else trainer:='aaaaf200-0000-4000-8000-000000000004';select players_b into players from lineup_fixture;end if;
   perform set_config('request.jwt.claims',jsonb_build_object('sub',trainer,'role','authenticated')::text,true);perform public.submit_lineup(gen_random_uuid(),tm.id,sub,players);
  end loop;
  perform set_config('request.jwt.claims','{"sub":"aaaaf200-0000-4000-8000-000000000001","role":"authenticated"}',true);
  perform public.manage_match(gen_random_uuid(),tm.id,'assign',127,2,true);perform public.manage_match(gen_random_uuid(),tm.id,'start',null,3,true);
  select case ordinal when 2 then subteam_b else subteam_a end into winning_subteam from lineup_fixture;winning_side:=case when tm.subteam_a=winning_subteam then 'a' else 'b' end;
  perform set_config('request.jwt.claims','{"sub":"aaaaf200-0000-4000-8000-000000000006","role":"authenticated"}',true);
  for target in select * from public.singles_games where match_id=tm.id and slot<=3 order by slot loop
   perform public.score_command(gen_random_uuid(),target.id,'start','a',0,true);
   for i in 1..33 loop select score_version into v from public.singles_games where id=target.id;perform public.score_command(gen_random_uuid(),target.id,'point',winning_side,v,true);end loop;
  end loop;
  -- The next iteration simulates an hour of venue time passing.
  perform pg_temp.wait_for_rest();
 end loop;
end;$$;

reset role;
create temp table season_public_fixture(data jsonb);
insert into season_public_fixture values(public.get_public_season_standings('bbbbf200-0000-4000-8000-000000000001'));
select is((select (value->>'score')::int from season_public_fixture,jsonb_array_elements(data) value where value->>'subteam_id'=(select subteam_a::text from lineup_fixture)),6,'weighted placements total 1+2*2+1');
select is((select (value->>'score')::int from season_public_fixture,jsonb_array_elements(data) value where value->>'subteam_id'=(select subteam_b::text from lineup_fixture)),6,'opponent weighted total is also six');
select is((select (value->>'rank')::int from season_public_fixture,jsonb_array_elements(data) value where value->>'subteam_id'=(select subteam_a::text from lineup_fixture)),1,'two head-to-head wins break the season score tie');
select is((select (value->>'head_to_head_wins')::int from season_public_fixture,jsonb_array_elements(data) value where value->>'subteam_id'=(select subteam_a::text from lineup_fixture)),2,'head-to-head evidence counts only effective current matches');
select is((select (value->>'provisional')::boolean from season_public_fixture,jsonb_array_elements(data) value where value->>'subteam_id'=(select subteam_a::text from lineup_fixture)),false,'all three completed tours finalize the age-group season');
select is(jsonb_array_length(public.get_public_player_history((select players_a[1] from lineup_fixture))),3,'public history returns all three effective singles');
-- A trusted legacy-registration fixture represents a club missing every finalized tour.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaf200-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_team('fffff200-0000-4000-8000-000000000099','Missing tour club','Synthetic');
reset role;
insert into public.season_team_entries(season_id,team_id) values('bbbbf200-0000-4000-8000-000000000001','fffff200-0000-4000-8000-000000000099');
select is((select (value->>'score')::int from jsonb_array_elements(public.get_public_season_standings('bbbbf200-0000-4000-8000-000000000001')) value where value->>'team_name'='Missing tour club' and value->>'age_group'='U13'),12,'missing finalized tours receive last place plus one, weighted per tour');
set local role authenticated;
select public.save_season('bbbbf200-0000-4000-8000-000000000099','Unpublished setup',2026,'2026-01-01','2026-12-31');
select public.save_tour('ccccf200-0000-4000-8000-000000000099','bbbbf200-0000-4000-8000-000000000099','Draft setup',1,'2026-01-01','2026-12-31');
select public.create_stage_template('ddddf200-0000-4000-8000-000000000099','Ambiguous final groups','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":2,"group_size":2}]}');
select public.configure_tour_stages('ccccf200-0000-4000-8000-000000000099','ddddf200-0000-4000-8000-000000000099',array['U13','U15','U17']::public.age_group[]);
select ok(public.season_configuration_readiness('bbbbf200-0000-4000-8000-000000000099')->'problems' ? 'unsupported_final_groups','ambiguous final groups need explicit classification before season start');
select throws_ok($$select public.configure_tour_weight('ccccf200-0000-4000-8000-000000000099',0)$$,'22023','Valid tour weight required','zero tour weight is rejected');
select throws_ok($$select public.configure_tour_weight('ccccf200-0000-4000-8000-000000000099',1.0001)$$,'22023','Valid tour weight required','unsupported tour-weight precision is rejected');
reset role;
set local role anon;
select is((select count(*)::int from jsonb_array_elements(public.get_public_directory()->'seasons') value where value->>'id'='bbbbf200-0000-4000-8000-000000000099'),0,'draft setup remains absent from the public directory');
reset role;
select * from finish();
rollback;
