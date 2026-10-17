begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaab000-0000-4000-8000-000000000001','adjust-org@test.invalid','{"display_name":"Draw Organizer"}'),
 ('aaaab000-0000-4000-8000-000000000002','adjust-judge@test.invalid','{"display_name":"Draw Judge"}'),
 ('aaaab000-0000-4000-8000-000000000003','adjust-trainer@test.invalid','{"display_name":"Draw Trainer"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Draw Fixture' from auth.users where id::text like 'aaaab000-%';
insert into public.staff_roles values('aaaab000-0000-4000-8000-000000000001','organizer'),('aaaab000-0000-4000-8000-000000000002','main_judge'),('aaaab000-0000-4000-8000-000000000003','trainer');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaab000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbbb000-0000-4000-8000-000000000001','Draw Season',2026,'2026-01-01','2026-12-31');
select public.save_tour('ccccb000-0000-4000-8000-000000000001','bbbbb000-0000-4000-8000-000000000001','Draw Tour',1,'2026-03-01','2026-03-03');
select public.create_stage_template('ddddb000-0000-4000-8000-000000000001','Confirmed draw format','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":4,"group_size":6},{"ordinal":2,"kind":"knockout","size":8,"source_ordinal":1,"place_from":1,"place_to":2},{"ordinal":3,"kind":"knockout","size":8,"source_ordinal":1,"place_from":3,"place_to":4},{"ordinal":4,"kind":"knockout","size":8,"source_ordinal":1,"place_from":5,"place_to":6}]}');
select public.configure_tour_stages('ccccb000-0000-4000-8000-000000000001','ddddb000-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'ccccb000-0000-4000-8000-000000000001',0,32,12,60,true,'Asia/Almaty');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..24 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Draw Club '||i,'Synthetic'); perform public.register_season_team('bbbbb000-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Draw','Player '||i||' '||j,case when j<=3 then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbbb000-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;
select public.start_season('bbbbb000-0000-4000-8000-000000000001');
select public.generate_tour_draw('eeeeb000-0000-4000-8000-000000000001','ccccb000-0000-4000-8000-000000000001','U13',0);
select set_config('request.jwt.claims','{"sub":"aaaab000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.swap_draw_seeds('eeeeb000-0000-4000-8000-000000000002','eeeeb000-0000-4000-8000-000000000001',1,1,2,'Correction')$$,'42501','Organizer required','Main Judge cannot adjust seed order');
select set_config('request.jwt.claims','{"sub":"aaaab000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.swap_draw_seeds('eeeeb000-0000-4000-8000-000000000002','eeeeb000-0000-4000-8000-000000000001',1,1,1,'Correction')$$,'22023','Distinct valid seeds and reason required','same-seed swap rejected');
select throws_ok($$select public.swap_draw_seeds('eeeeb000-0000-4000-8000-000000000002','eeeeb000-0000-4000-8000-000000000001',1,1,25,'Correction')$$,'22023','Distinct valid seeds and reason required','out-of-range seed rejected');
select throws_ok($$select public.swap_draw_seeds('eeeeb000-0000-4000-8000-000000000002','eeeeb000-0000-4000-8000-000000000001',1,1,2,' ')$$,'22023','Distinct valid seeds and reason required','reason required');
reset role;
-- A manual adjustment must preserve the chosen frozen inputs despite later ratings.
update public.players set current_rating=2000 where id in(select p.player_id from public.draw_seed_players p join public.draw_entries e on e.id=p.entry_id where e.draw_id='eeeeb000-0000-4000-8000-000000000001' and e.seed=1);
set local role authenticated;
select lives_ok($$select public.swap_draw_seeds('eeeeb000-0000-4000-8000-000000000002','eeeeb000-0000-4000-8000-000000000001',1,1,2,'Reviewed seed order')$$,'Organizer appends seed-adjusted draft');
select is((select revision from public.draw_revisions where id='eeeeb000-0000-4000-8000-000000000002'),2,'adjustment appends revision two');
select is((select rating_total::int from public.draw_entries where draw_id='eeeeb000-0000-4000-8000-000000000002' and seed=2),5000,'adjustment does not recapture newer rating');
select is((select count(*)::int from public.draw_seed_players p join public.draw_entries e on e.id=p.entry_id where e.draw_id='eeeeb000-0000-4000-8000-000000000002' and p.rating=1000),120,'all original player ratings retained');
select is((select count(*)::int from public.draw_entries a join public.draw_entries b on a.subteam_id=b.subteam_id where a.draw_id='eeeeb000-0000-4000-8000-000000000001' and b.draw_id='eeeeb000-0000-4000-8000-000000000002' and a.tie_lot=b.tie_lot),24,'original seed tie lots retained');
select is((select count(*)::int from public.draw_entries a join public.draw_entries b on a.subteam_id=b.subteam_id join public.stage_groups ga on ga.id=a.group_id join public.stage_groups gb on gb.id=b.group_id where a.draw_id='eeeeb000-0000-4000-8000-000000000001' and b.draw_id='eeeeb000-0000-4000-8000-000000000002' and a.seed in(1,2) and a.seed+b.seed=3 and ga.ordinal<>gb.ordinal),2,'both swapped seeds move through the rebuilt snake groups');
select is((select count(*)::int from public.team_matches where draw_id='eeeeb000-0000-4000-8000-000000000002'),96,'adjusted composite graph is complete');
select is((select count(*)::int from public.team_matches where draw_id='eeeeb000-0000-4000-8000-000000000001'),96,'original draft graph preserved');
select is((select count(*)::int from public.audit_logs where action='draw.seeds_adjusted' and entity_id='eeeeb000-0000-4000-8000-000000000002'),1,'one adjustment audit');
select lives_ok($$select public.swap_draw_seeds('eeeeb000-0000-4000-8000-000000000002','eeeeb000-0000-4000-8000-000000000001',1,1,2,'Reviewed seed order')$$,'exact retry returns existing draft');
select throws_ok($$select public.swap_draw_seeds('eeeeb000-0000-4000-8000-000000000002','eeeeb000-0000-4000-8000-000000000001',1,1,3,'Reviewed seed order')$$,'22023','Draw adjustment ID conflict','changed request cannot reuse receipt');
select throws_ok($$select public.swap_draw_seeds(gen_random_uuid(),'eeeeb000-0000-4000-8000-000000000001',1,1,2,'Reviewed seed order')$$,'22023','Draw revision conflict','stale source cannot create another revision');
select throws_ok($$select public.publish_tour_draw('eeeeb000-0000-4000-8000-000000000001',1)$$,'22023','Draw revision conflict','superseded draft cannot publish');
select public.publish_tour_draw('eeeeb000-0000-4000-8000-000000000002',2);
select throws_ok($$select public.swap_draw_seeds(gen_random_uuid(),'eeeeb000-0000-4000-8000-000000000002',2,1,2,'Reviewed seed order')$$,'22023','Published draw is locked','published graph cannot be adjusted');
select lives_ok($$select public.swap_draw_seeds('eeeeb000-0000-4000-8000-000000000002','eeeeb000-0000-4000-8000-000000000001',1,1,2,'Reviewed seed order')$$,'committed receipt retry survives publication');
select is((select count(*)::int from public.audit_logs where action='draw.seeds_adjusted' and entity_id='eeeeb000-0000-4000-8000-000000000002'),1,'retries do not duplicate audit');
select throws_ok($$delete from public.draw_seed_adjustments$$,'42501',null,'staff cannot delete adjustment history');
select throws_ok($$select private.populate_draw_graph(gen_random_uuid())$$,'42501',null,'staff cannot bypass publication via graph helper');
reset role;
set local role anon;
select throws_ok($$select * from public.draw_seed_adjustments$$,'42501',null,'anonymous cannot inspect private seed adjustment table');
select throws_ok($$select public.swap_draw_seeds(gen_random_uuid(),gen_random_uuid(),1,1,2,'Correction')$$,'42501',null,'anonymous cannot adjust draws');
reset role;
select * from finish();
rollback;
