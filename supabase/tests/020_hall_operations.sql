begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaaf000-0000-4000-8000-000000000001','lineup-org-lifecycle-hall@test.invalid','{"display_name":"Lineup Organizer"}'),
 ('aaaaf000-0000-4000-8000-000000000002','lineup-judge-lifecycle-hall@test.invalid','{"display_name":"Lineup Judge"}'),
 ('aaaaf000-0000-4000-8000-000000000003','lineup-coach-a-lifecycle-hall@test.invalid','{"display_name":"Lineup Trainer A"}'),
 ('aaaaf000-0000-4000-8000-000000000004','lineup-coach-b-lifecycle-hall@test.invalid','{"display_name":"Lineup Trainer B"}'),
 ('aaaaf000-0000-4000-8000-000000000005','lineup-outsider-lifecycle-hall@test.invalid','{"display_name":"Lineup Outsider"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Lineup Fixture' from auth.users where id::text like 'aaaaf000-%';
insert into public.staff_roles values('aaaaf000-0000-4000-8000-000000000001','organizer'),('aaaaf000-0000-4000-8000-000000000002','main_judge'),('aaaaf000-0000-4000-8000-000000000003','trainer'),('aaaaf000-0000-4000-8000-000000000004','trainer'),('aaaaf000-0000-4000-8000-000000000004','main_judge'),('aaaaf000-0000-4000-8000-000000000005','trainer');
create temp table lineup_fixture(match uuid,subteam_a uuid,subteam_b uuid,players_a uuid[],players_b uuid[],reserve_a uuid);
grant all on lineup_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaf000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbbf000-0000-4000-8000-000000000001','Lineup Season',2026,(clock_timestamp() at time zone 'Asia/Almaty')::date-7,(clock_timestamp() at time zone 'Asia/Almaty')::date+7);
select public.save_tour('ccccf000-0000-4000-8000-000000000001','bbbbf000-0000-4000-8000-000000000001','Lineup Tour',1,(clock_timestamp() at time zone 'Asia/Almaty')::date,(clock_timestamp() at time zone 'Asia/Almaty')::date);
select public.create_stage_template('ddddf000-0000-4000-8000-000000000001','Lineup Format','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":1,"group_size":2}]}');
select public.configure_tour_stages('ccccf000-0000-4000-8000-000000000001','ddddf000-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'ccccf000-0000-4000-8000-000000000001',0,32,128,60,true,'Asia/Almaty');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..2 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Lineup Club '||i,'Synthetic'); perform public.register_season_team('bbbbf000-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Hidden','Slot '||j,case when j in(1,3,5) then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbbf000-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;
select public.start_season('bbbbf000-0000-4000-8000-000000000001');
select public.generate_tour_draw('eeeef000-0000-4000-8000-000000000001','ccccf000-0000-4000-8000-000000000001','U13',0);
select public.publish_tour_draw('eeeef000-0000-4000-8000-000000000001',1);
insert into lineup_fixture(match,subteam_a,subteam_b) select id,subteam_a,subteam_b from public.team_matches where draw_id='eeeef000-0000-4000-8000-000000000001';
update lineup_fixture f set players_a=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_a and m.ended_at is null),players_b=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_b and m.ended_at is null);
select public.assign_team_trainer('aaaaf000-0000-4000-8000-000000000003',(select team_id from public.subteams where id=(select subteam_a from lineup_fixture)),array[(select subteam_a from lineup_fixture)]);
select public.assign_team_trainer('aaaaf000-0000-4000-8000-000000000004',(select team_id from public.subteams where id=(select subteam_b from lineup_fixture)),array[(select subteam_b from lineup_fixture)]);
do $$declare person uuid:=gen_random_uuid();club uuid;sub uuid;begin select subteam_a into sub from lineup_fixture;select team_id into club from public.subteams where id=sub;perform public.save_player(person,club,'Reserve','Boy','boy','2014-01-01','right','attack','junior');perform public.add_roster_player('bbbbf000-0000-4000-8000-000000000001',sub,person);update lineup_fixture set reserve_a=person;end;$$;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values('aaaaf000-0000-4000-8000-000000000006','life-line-hall@test.invalid','{"display_name":"Life Line Judge"}');
insert into public.staff_accounts(id,email,display_name) values('aaaaf000-0000-4000-8000-000000000006','life-line-hall@test.invalid','Life Line Judge');
insert into public.staff_roles values('aaaaf000-0000-4000-8000-000000000006','line_judge');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaf000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.submit_lineup('fffff000-0000-4000-8000-000000000001',match,subteam_a,players_a) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaf000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select public.submit_lineup('fffff000-0000-4000-8000-000000000002',match,subteam_b,players_b) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaf000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.assign_table_judge('fffff000-0000-4000-8000-000000000003','ccccf000-0000-4000-8000-000000000001',127,(clock_timestamp() at time zone 'Asia/Almaty')::date,'aaaaf000-0000-4000-8000-000000000006',0,true);

create temp table hall_fixture(snapshot jsonb,receipt jsonb,id uuid);
grant all on hall_fixture to authenticated;
insert into hall_fixture(id) values('fffff000-0000-4000-8000-000000000031');
update hall_fixture set snapshot=public.get_hall_snapshot('ccccf000-0000-4000-8000-000000000001');
select is((select jsonb_array_length(snapshot->'tables') from hall_fixture),128,'hall exposes configured physical tables');
select is((select jsonb_array_length(snapshot->'matches') from hall_fixture),1,'hall lists the current published match');
select ok(not ((select snapshot from hall_fixture)::text like '%date_of_birth%'),'hall omits private player DOB');
select ok(not ((select snapshot from hall_fixture)::text like '%Hidden%'),'hall omits selected player identities');
reset role;
insert into public.player_rest_heads(player_id,last_ended_at) select players_a[1],clock_timestamp() from lineup_fixture;
set local role authenticated;
select throws_ok($$select public.manage_match(gen_random_uuid(),match,'assign',127,2,true) from lineup_fixture$$,'55000','Player rest incomplete','manual allocation cannot bypass actual rest');
select is(jsonb_array_length(public.run_hall_command(gen_random_uuid(),'ccccf000-0000-4000-8000-000000000001','allocate',true)->'outcomes'),1,'allocator records blocked readiness outcome');
select is((select count(*)::int from public.match_table_leases where match_id=(select match from lineup_fixture)),0,'allocator leaves resting players unassigned');
reset role;
update public.player_rest_heads set last_ended_at=clock_timestamp()-interval '61 minutes' where player_id=(select players_a[1] from lineup_fixture);
set local role authenticated;
update hall_fixture set receipt=public.run_hall_command(id,'ccccf000-0000-4000-8000-000000000001','allocate',true);
select is((select count(*)::int from public.match_table_leases where match_id=(select match from lineup_fixture)),1,'allocator assigns a rested ready match once');
select is(public.run_hall_command((select id from hall_fixture),'ccccf000-0000-4000-8000-000000000001','allocate',true),(select receipt from hall_fixture),'exact bulk retry returns original outcome');
select throws_ok($$select public.run_hall_command((select id from hall_fixture),'ccccf000-0000-4000-8000-000000000001','start_all',true)$$,'22023','Hall command ID conflict','hall command ID cannot change meaning');
-- No owner on the automatically chosen table: bulk start reports a blocked item.
select is(public.run_hall_command(gen_random_uuid(),'ccccf000-0000-4000-8000-000000000001','start_all',true)->'outcomes'->0->>'ok','false','bulk start retains blocked matches for official resolution');
select public.assign_table_judge(gen_random_uuid(),'ccccf000-0000-4000-8000-000000000001',127,(clock_timestamp() at time zone 'Asia/Almaty')::date,null,1,true);
select public.assign_table_judge(gen_random_uuid(),'ccccf000-0000-4000-8000-000000000001',(select table_number from public.match_table_leases where match_id=(select match from lineup_fixture)),(clock_timestamp() at time zone 'Asia/Almaty')::date,'aaaaf000-0000-4000-8000-000000000006',0,true);
select is(public.run_hall_command(gen_random_uuid(),'ccccf000-0000-4000-8000-000000000001','start_all',true)->'outcomes'->0->>'ok','true','bulk start starts a ready owned table');
select is((select status::text from public.team_matches where id=(select match from lineup_fixture)),'in_progress','bulk start commits actual match state');
select is((select count(*)::int from public.live_players where match_id=(select match from lineup_fixture)),10,'bulk start reserves ten exclusive players');
select is(public.run_hall_command(gen_random_uuid(),'ccccf000-0000-4000-8000-000000000001','allocate',true)->'outcomes','[]'::jsonb,'allocator never reassigns live matches');
select set_config('request.jwt.claims','{"sub":"aaaaf000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.get_hall_snapshot('ccccf000-0000-4000-8000-000000000001')$$,'42501','Match management permission required','Trainer cannot read hall operations');
select throws_ok($$select public.run_hall_command(gen_random_uuid(),'ccccf000-0000-4000-8000-000000000001','allocate',true)$$,'42501','Match management permission required','Trainer cannot allocate directly');
select throws_ok($$insert into public.hall_commands(id,tour_id,actor_id,request,response) values(gen_random_uuid(),'ccccf000-0000-4000-8000-000000000001',auth.uid(),'{}','{}')$$,'42501',null,'staff cannot forge hall receipts');
reset role;
set local role anon;
select throws_ok($$select public.get_hall_snapshot(gen_random_uuid())$$,'42501',null,'anonymous cannot inspect hall');
reset role;
select * from finish();
rollback;
