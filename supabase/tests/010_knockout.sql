begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaaa000-0000-4000-8000-000000000001','knockout-org@test.invalid','{"display_name":"Draw Organizer"}'),
 ('aaaaa000-0000-4000-8000-000000000002','knockout-judge@test.invalid','{"display_name":"Draw Judge"}'),
 ('aaaaa000-0000-4000-8000-000000000003','knockout-trainer@test.invalid','{"display_name":"Draw Trainer"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Draw Fixture' from auth.users where id::text like 'aaaaa000-%';
insert into public.staff_roles values('aaaaa000-0000-4000-8000-000000000001','organizer'),('aaaaa000-0000-4000-8000-000000000002','main_judge'),('aaaaa000-0000-4000-8000-000000000003','trainer');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaa000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbba000-0000-4000-8000-000000000001','Draw Season',2026,'2026-01-01','2026-12-31');
select public.save_tour('cccca000-0000-4000-8000-000000000001','bbbba000-0000-4000-8000-000000000001','Draw Tour',1,'2026-03-01','2026-03-03');
select public.create_stage_template('dddda000-0000-4000-8000-000000000001','Confirmed draw format','{"nodes":[{"ordinal":1,"kind":"knockout","size":32}]}');
select public.configure_tour_stages('cccca000-0000-4000-8000-000000000001','dddda000-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'cccca000-0000-4000-8000-000000000001',0,32,12,60,true,'Asia/Almaty');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..32 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Draw Club '||i,'Synthetic'); perform public.register_season_team('bbbba000-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Draw','Player '||i||' '||j,case when j<=3 then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbba000-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;
select public.start_season('bbbba000-0000-4000-8000-000000000001');
select public.generate_tour_draw('eeeea000-0000-4000-8000-000000000001','cccca000-0000-4000-8000-000000000001','U13',0);
select public.publish_tour_draw('eeeea000-0000-4000-8000-000000000001',1);
select is((select count(*)::int from public.team_matches where draw_id='eeeea000-0000-4000-8000-000000000001'),80,'32-team knockout creates eighty all-place matches');
select is((select count(*)::int from public.team_matches where draw_id='eeeea000-0000-4000-8000-000000000001' and subteam_a is not null and subteam_b is not null),16,'only first round has known participants');
select is((select count(*)::int from public.match_sources where source_entry_id in(select id from public.draw_entries where draw_id='eeeea000-0000-4000-8000-000000000001')),32,'all 32 initial participants have frozen entry sources');
select is((select mapping_snapshot->'seeds' from public.draw_revisions where id='eeeea000-0000-4000-8000-000000000001'),'[1, 32, 16, 17, 8, 25, 9, 24, 4, 29, 13, 20, 5, 28, 12, 21, 2, 31, 15, 18, 7, 26, 10, 23, 3, 30, 14, 19, 6, 27, 11, 22]'::jsonb,'balanced seed map frozen with draw');
reset role;
select ok(bool_and(jsonb_array_length(seeds)=size and (select count(distinct value)=size and min(value::integer)=1 and max(value::integer)=size from jsonb_array_elements_text(seeds))),'all reference maps are full seed permutations') from public.knockout_seed_maps;
select ok(bool_and(seeds->>0='1' and seeds->>(size/2)='2'),'top two seeds are in opposite halves of every reference map') from public.knockout_seed_maps;
select ok(bool_and(private.match_dependencies_ready(id)),'initial frozen entry sources are ready') from public.team_matches where draw_id='eeeea000-0000-4000-8000-000000000001' and round_no=1;
select ok(not bool_or(private.match_dependencies_ready(id)),'unplayed later sources are not ready') from public.team_matches where draw_id='eeeea000-0000-4000-8000-000000000001' and round_no>1;
do $$declare rec public.team_matches;rid uuid;win uuid;begin
 for rec in select * from public.team_matches where draw_id='eeeea000-0000-4000-8000-000000000001' order by round_no,match_no loop
  select * into rec from public.team_matches where id=rec.id;
  if not private.match_dependencies_ready(rec.id) then raise exception 'Unready fixture match';end if;
  select subteam_id into win from public.draw_entries where draw_id=rec.draw_id and subteam_id in(rec.subteam_a,rec.subteam_b) order by seed limit 1;
  insert into public.team_match_results(match_id,revision,winner,kind,games_a,games_b,sets_a,sets_b,points_a,points_b,created_by) values(rec.id,1,win,'team_forfeit',case when win=rec.subteam_a then 3 else 0 end,case when win=rec.subteam_b then 3 else 0 end,case when win=rec.subteam_a then 9 else 0 end,case when win=rec.subteam_b then 9 else 0 end,case when win=rec.subteam_a then 99 else 0 end,case when win=rec.subteam_b then 99 else 0 end,'aaaaa000-0000-4000-8000-000000000001') returning id into rid;
  update public.team_matches set result_id=rid,result_revision=1,status='finished' where id=rec.id;
  perform private.advance_team_result(rec.id);
 end loop;
end;$$;
select is((select count(*)::int from public.tour_placements p join public.draw_entries e on e.draw_id=p.draw_id and e.subteam_id=p.subteam_id where p.draw_id='eeeea000-0000-4000-8000-000000000001' and p.place=e.seed),32,'favourites winning produces every seed placement one through 32');
-- Deliberately test an unsupported reference map before roster capture.
update public.stages set configuration=jsonb_build_object('ordinal',1,'kind','knockout','size',64) where plan_id in(select id from public.tour_stage_plans where tour_id='cccca000-0000-4000-8000-000000000001' and age_group='U15');
set local role authenticated;
select throws_ok($$select public.generate_tour_draw(gen_random_uuid(),'cccca000-0000-4000-8000-000000000001','U15',0)$$,'22023','Draw map not supported','unsupported knockout map fails explicitly before partial generation');
select is((select count(*)::int from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id where p.tour_id='cccca000-0000-4000-8000-000000000001' and p.age_group='U15'),0,'unsupported map leaves no partial draw');
select throws_ok($$update public.knockout_seed_maps set seeds='[]'$$,'42501',null,'staff cannot rewrite reference seed maps');
reset role;
set local role anon;
select throws_ok($$select * from public.knockout_seed_maps$$,'42501',null,'seed reference base table is private');
reset role;
select * from finish();
rollback;
