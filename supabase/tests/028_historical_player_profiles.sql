begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaaa028-0000-4000-8000-000000000001','audit-history-org@test.invalid','{"display_name":"Lineup Organizer"}'),
 ('aaaaa028-0000-4000-8000-000000000002','audit-history-manager@test.invalid','{"display_name":"Lineup Judge"}'),
 ('aaaaa028-0000-4000-8000-000000000003','audit-history-coach-a@test.invalid','{"display_name":"Lineup Trainer A"}'),
 ('aaaaa028-0000-4000-8000-000000000004','audit-history-coach-b@test.invalid','{"display_name":"Lineup Trainer B"}'),
 ('aaaaa028-0000-4000-8000-000000000005','audit-history-outsider@test.invalid','{"display_name":"Lineup Outsider"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Lineup Fixture' from auth.users where id::text like 'aaaaa028-%';
insert into public.staff_roles values('aaaaa028-0000-4000-8000-000000000001','organizer'),('aaaaa028-0000-4000-8000-000000000002','main_judge'),('aaaaa028-0000-4000-8000-000000000003','trainer'),('aaaaa028-0000-4000-8000-000000000004','trainer'),('aaaaa028-0000-4000-8000-000000000004','main_judge'),('aaaaa028-0000-4000-8000-000000000005','trainer');
create temp table lineup_fixture(match uuid,subteam_a uuid,subteam_b uuid,players_a uuid[],players_b uuid[],reserve_a uuid);
grant all on lineup_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaa028-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbba028-0000-4000-8000-000000000001','Lineup Season',2026,(clock_timestamp() at time zone 'Asia/Almaty')::date-7,(clock_timestamp() at time zone 'Asia/Almaty')::date+7);
select public.save_tour('cccca028-0000-4000-8000-000000000001','bbbba028-0000-4000-8000-000000000001','Lineup Tour',1,(clock_timestamp() at time zone 'Asia/Almaty')::date,(clock_timestamp() at time zone 'Asia/Almaty')::date);
select public.create_stage_template('dddda028-0000-4000-8000-000000000001','Lineup Format','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":1,"group_size":2}]}');
select public.configure_tour_stages('cccca028-0000-4000-8000-000000000001','dddda028-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'cccca028-0000-4000-8000-000000000001',0,32,128,60,true,'Asia/Almaty');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..2 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Lineup Club '||i,'Synthetic'); perform public.register_season_team('bbbba028-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Hidden','Slot '||j,case when j in(1,3,5) then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbba028-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;
select public.start_season('bbbba028-0000-4000-8000-000000000001');
select public.generate_tour_draw('eeeea028-0000-4000-8000-000000000001','cccca028-0000-4000-8000-000000000001','U13',0);
select public.publish_tour_draw('eeeea028-0000-4000-8000-000000000001',1);
insert into lineup_fixture(match,subteam_a,subteam_b) select id,subteam_a,subteam_b from public.team_matches where draw_id='eeeea028-0000-4000-8000-000000000001';
update lineup_fixture f set players_a=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_a and m.ended_at is null),players_b=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_b and m.ended_at is null);
select public.assign_team_trainer('aaaaa028-0000-4000-8000-000000000003',(select team_id from public.subteams where id=(select subteam_a from lineup_fixture)),array[(select subteam_a from lineup_fixture)]);
select public.assign_team_trainer('aaaaa028-0000-4000-8000-000000000004',(select team_id from public.subteams where id=(select subteam_b from lineup_fixture)),array[(select subteam_b from lineup_fixture)]);
do $$declare person uuid:=gen_random_uuid();club uuid;sub uuid;begin select subteam_a into sub from lineup_fixture;select team_id into club from public.subteams where id=sub;perform public.save_player(person,club,'Reserve','Boy','boy','2014-01-01','right','attack','junior');perform public.add_roster_player('bbbba028-0000-4000-8000-000000000001',sub,person);update lineup_fixture set reserve_a=person;end;$$;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values('aaaaa028-0000-4000-8000-000000000006','audit-history-line@test.invalid','{"display_name":"Life Line Judge"}');
insert into public.staff_accounts(id,email,display_name) values('aaaaa028-0000-4000-8000-000000000006','audit-history-line@test.invalid','Life Line Judge');
insert into public.staff_roles values('aaaaa028-0000-4000-8000-000000000006','line_judge');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaa028-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.submit_lineup('ffffa028-0000-4000-8000-000000000001',match,subteam_a,players_a) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaa028-0000-4000-8000-000000000004","role":"authenticated"}',true);
select public.submit_lineup('ffffa028-0000-4000-8000-000000000002',match,subteam_b,players_b) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaa028-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.assign_table_judge('ffffa028-0000-4000-8000-000000000003','cccca028-0000-4000-8000-000000000001',127,(clock_timestamp() at time zone 'Asia/Almaty')::date,'aaaaa028-0000-4000-8000-000000000006',0,true);
select public.manage_match('dddda028-0000-4000-8000-000000000010',match,'assign',127,2,true) from lineup_fixture;
select public.manage_match('dddda028-0000-4000-8000-000000000011',match,'call',null,3,true) from lineup_fixture;
select public.manage_match('dddda028-0000-4000-8000-000000000012',match,'start',null,4,true) from lineup_fixture;
create temp table score_fixture(games uuid[],first_point uuid,last_command uuid,last_expected integer);
grant all on score_fixture to authenticated;
insert into score_fixture(games,first_point) select array_agg(id order by slot),'ffffa028-0000-4000-8000-000000000020'::uuid from public.singles_games where match_id=(select match from lineup_fixture);
select set_config('request.jwt.claims','{"sub":"aaaaa028-0000-4000-8000-000000000006","role":"authenticated"}',true);
select public.score_command('ffffa028-0000-4000-8000-000000000010',(select games[1] from score_fixture),'start','a',0,true);

do $$declare v integer;i integer;begin
 for i in 1..33 loop select score_version into v from public.singles_games where id=(select games[1] from score_fixture);perform public.score_command(gen_random_uuid(),(select games[1] from score_fixture),'point','a',v,true);end loop;
end;$$;
reset role;
create temp table public_profile_fixture(a uuid,b uuid,old_team uuid,other_team uuid,reserve uuid);
insert into public_profile_fixture select players_a[1],players_b[1],(select team_id from public.subteams where id=subteam_a),(select team_id from public.subteams where id=subteam_b),reserve_a from lineup_fixture;
grant select on public_profile_fixture to anon,authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaa028-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.drop_player(a,current_date,true) from public_profile_fixture;
set local role anon;
select lives_ok($$select public.get_public_player(a) from public_profile_fixture$$,'anonymous historical player projection is available');
select is((select public.get_public_player(a)->>'id' from public_profile_fixture),(select a::text from public_profile_fixture),'dropped player keeps their public profile');
select is((select public.get_public_player(a)->>'team_id' from public_profile_fixture),(select old_team::text from public_profile_fixture),'historical profile retains published club context');
select is((select jsonb_array_length(public.get_public_player_history(a)) from public_profile_fixture),1,'effective played history remains available after dropout');
select is((select count(*)::int from public.public_league_players where id=(select a from public_profile_fixture)),0,'dropped player stays outside current ranking roster');
select is((select count(*)::int from jsonb_object_keys((select public.get_public_player(a) from public_profile_fixture))),9,'historical projection has exactly the approved nine fields including gender');
select ok(not (select public.get_public_player(a) from public_profile_fixture) ?| array['date_of_birth','status','email','consent','team_id_private','submitted_by'],'historical profile exposes no private attributes');
select is(public.get_public_player(gen_random_uuid()),null::jsonb,'unknown player is indistinguishable from unpublished');
reset role;
select set_config('request.jwt.claims','{"sub":"aaaaa028-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.transfer_player(b,old_team,true) from public_profile_fixture;
set local role anon;
select is((select public.get_public_player(b)->>'team_id' from public_profile_fixture),(select other_team::text from public_profile_fixture),'transfer without new roster does not reveal an unpublished club association');
reset role;
-- A reserve added after publication was also public and keeps their history path.
set local role authenticated;
select public.end_roster_membership(id,true) from public.roster_memberships where player_id=(select reserve from public_profile_fixture) and ended_at is null;
reset role;
-- Model publication in an earlier committed RPC; now() inside this pgTAP
-- transaction otherwise predates the draw's clock_timestamp() publication.
update public.roster_memberships set ended_at=clock_timestamp() where player_id=(select reserve from public_profile_fixture);
set local role anon;
select is((select public.get_public_player(reserve)->>'id' from public_profile_fixture),(select reserve::text from public_profile_fixture),'late roster entry retains public profile after leaving');
reset role;
-- A player who left before publication was never approved for public exposure.
update public.roster_memberships set joined_at=(select published_at-interval '2 days' from public.draw_revisions where id='eeeea028-0000-4000-8000-000000000001'),ended_at=(select published_at-interval '1 day' from public.draw_revisions where id='eeeea028-0000-4000-8000-000000000001') where player_id=(select reserve from public_profile_fixture);
set local role anon;
select is((select public.get_public_player(reserve) from public_profile_fixture),null::jsonb,'prepublication dropout is not newly exposed');
select throws_ok('select date_of_birth from public.players','42501',null,'private base table remains inaccessible anonymously');
reset role;
select * from finish();rollback;
