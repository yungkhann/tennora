begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaaa027-0000-4000-8000-000000000001','lineup-org-audit-a027@test.invalid','{"display_name":"Lineup Organizer"}'),
 ('aaaaa027-0000-4000-8000-000000000002','lineup-judge-audit-a027@test.invalid','{"display_name":"Lineup Judge"}'),
 ('aaaaa027-0000-4000-8000-000000000003','lineup-coach-a-audit-a027@test.invalid','{"display_name":"Lineup Trainer A"}'),
 ('aaaaa027-0000-4000-8000-000000000004','lineup-coach-b-audit-a027@test.invalid','{"display_name":"Lineup Trainer B"}'),
 ('aaaaa027-0000-4000-8000-000000000005','lineup-outsider-audit-a027@test.invalid','{"display_name":"Lineup Outsider"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Lineup Fixture' from auth.users where id::text like 'aaaaa027-%';
insert into public.staff_roles values('aaaaa027-0000-4000-8000-000000000001','organizer'),('aaaaa027-0000-4000-8000-000000000002','main_judge'),('aaaaa027-0000-4000-8000-000000000003','trainer'),('aaaaa027-0000-4000-8000-000000000004','trainer'),('aaaaa027-0000-4000-8000-000000000004','main_judge'),('aaaaa027-0000-4000-8000-000000000005','trainer');
create temp table lineup_fixture(match uuid,subteam_a uuid,subteam_b uuid,players_a uuid[],players_b uuid[],reserve_a uuid);
grant all on lineup_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaa027-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbba027-0000-4000-8000-000000000001','Lineup Season',2026,(clock_timestamp() at time zone 'Asia/Almaty')::date-7,(clock_timestamp() at time zone 'Asia/Almaty')::date+7);
select public.save_tour('cccca027-0000-4000-8000-000000000001','bbbba027-0000-4000-8000-000000000001','Lineup Tour',1,(clock_timestamp() at time zone 'Asia/Almaty')::date,(clock_timestamp() at time zone 'Asia/Almaty')::date);
select public.create_stage_template('dddda027-0000-4000-8000-000000000001','Lineup Format','{"nodes":[{"ordinal":1,"kind":"knockout","size":2}]}');
select public.configure_tour_stages('cccca027-0000-4000-8000-000000000001','dddda027-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'cccca027-0000-4000-8000-000000000001',0,32,128,60,true,'Asia/Almaty');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..2 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Lineup Club '||i,'Synthetic'); perform public.register_season_team('bbbba027-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Hidden','Slot '||j,case when j in(1,3,5) then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbba027-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;
select public.start_season('bbbba027-0000-4000-8000-000000000001');
select public.generate_tour_draw('eeeea027-0000-4000-8000-000000000001','cccca027-0000-4000-8000-000000000001','U13',0);
select public.publish_tour_draw('eeeea027-0000-4000-8000-000000000001',1);
insert into lineup_fixture(match,subteam_a,subteam_b) select id,subteam_a,subteam_b from public.team_matches where draw_id='eeeea027-0000-4000-8000-000000000001';
update lineup_fixture f set players_a=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_a and m.ended_at is null),players_b=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_b and m.ended_at is null);
select public.assign_team_trainer('aaaaa027-0000-4000-8000-000000000003',(select team_id from public.subteams where id=(select subteam_a from lineup_fixture)),array[(select subteam_a from lineup_fixture)]);
select public.assign_team_trainer('aaaaa027-0000-4000-8000-000000000004',(select team_id from public.subteams where id=(select subteam_b from lineup_fixture)),array[(select subteam_b from lineup_fixture)]);
do $$declare person uuid:=gen_random_uuid();club uuid;sub uuid;begin select subteam_a into sub from lineup_fixture;select team_id into club from public.subteams where id=sub;perform public.save_player(person,club,'Reserve','Boy','boy','2014-01-01','right','attack','junior');perform public.add_roster_player('bbbba027-0000-4000-8000-000000000001',sub,person);update lineup_fixture set reserve_a=person;end;$$;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values('aaaaa027-0000-4000-8000-000000000006','line-a027@test.invalid','{"display_name":"Life Line Judge"}');
insert into public.staff_accounts(id,email,display_name) values('aaaaa027-0000-4000-8000-000000000006','line-a027@test.invalid','Life Line Judge');
insert into public.staff_roles values('aaaaa027-0000-4000-8000-000000000006','line_judge');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaa027-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.submit_lineup('ffffa027-0000-4000-8000-000000000001',match,subteam_a,players_a) from lineup_fixture;

select set_config('request.jwt.claims','{"sub":"aaaaa027-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.manage_match(gen_random_uuid(),id,'assign',127,version,true) from public.team_matches where id=(select match from lineup_fixture);
select public.manage_match(gen_random_uuid(),id,'start',null,version,true) from public.team_matches where id=(select match from lineup_fixture);
create temp table seeded_review as select public.submit_team_result_correction(gen_random_uuid(),id,result_id,'reopen',null,true) value,null::uuid fresh from public.team_matches where id=(select match from lineup_fixture);
update seeded_review set fresh=(public.apply_result_correction(gen_random_uuid(),(value->>'id')::uuid,value->'plan'->>'digest',false,true)->>'match_id')::uuid;
select is((select count(*)::int from public.match_sources where match_id=(select fresh from seeded_review) and source_entry_id is not null),2,'reopened seeded root retains both frozen entry sources');
select is((select count(*)::int from public.lineups where match_id=(select fresh from seeded_review)),0,'unrevealed forfeited lineup is not copied into fresh play');
reset role;
select ok(private.match_dependencies_ready((select fresh from seeded_review)),'fresh seeded root is source-ready');
set constraints all immediate;
grant select on seeded_review to anon;
set local role anon;
select is((select data->>'revealed' from public.public_match_snapshots where match_id=(select fresh from seeded_review)),'false','fresh public attempt remains unrevealed');
select is((select jsonb_array_length(data->'singles') from public.public_match_snapshots where match_id=(select fresh from seeded_review)),0,'old hidden lineup never enters fresh public projection');
reset role;
select * from finish();rollback;
