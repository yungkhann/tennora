begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaa9000-0000-4000-8000-000000000001','standings-org@test.invalid','{"display_name":"Draw Organizer"}'),
 ('aaaa9000-0000-4000-8000-000000000002','standings-judge@test.invalid','{"display_name":"Draw Judge"}'),
 ('aaaa9000-0000-4000-8000-000000000003','standings-trainer@test.invalid','{"display_name":"Draw Trainer"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Draw Fixture' from auth.users where id::text like 'aaaa9000-%';
insert into public.staff_roles values('aaaa9000-0000-4000-8000-000000000001','organizer'),('aaaa9000-0000-4000-8000-000000000002','main_judge'),('aaaa9000-0000-4000-8000-000000000003','trainer');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaa9000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbb9000-0000-4000-8000-000000000001','Draw Season',2026,'2026-01-01','2026-12-31');
select public.save_tour('cccc9000-0000-4000-8000-000000000001','bbbb9000-0000-4000-8000-000000000001','Draw Tour',1,'2026-03-01','2026-03-03');
select public.create_stage_template('dddd9000-0000-4000-8000-000000000001','Confirmed draw format','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":4,"group_size":6},{"ordinal":2,"kind":"knockout","size":8,"source_ordinal":1,"place_from":1,"place_to":2},{"ordinal":3,"kind":"knockout","size":8,"source_ordinal":1,"place_from":3,"place_to":4},{"ordinal":4,"kind":"knockout","size":8,"source_ordinal":1,"place_from":5,"place_to":6}]}');
select public.configure_tour_stages('cccc9000-0000-4000-8000-000000000001','dddd9000-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'cccc9000-0000-4000-8000-000000000001',0,32,12,60,true,'Asia/Almaty');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..24 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Draw Club '||i,'Synthetic'); perform public.register_season_team('bbbb9000-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Draw','Player '||i||' '||j,case when j<=3 then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbb9000-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;
select public.start_season('bbbb9000-0000-4000-8000-000000000001');
select public.generate_tour_draw('eeee9000-0000-4000-8000-000000000001','cccc9000-0000-4000-8000-000000000001','U13',0);
select public.publish_tour_draw('eeee9000-0000-4000-8000-000000000001',1);
create temp table standing_fixture(group_id uuid,snapshot_id uuid);
grant all on standing_fixture to authenticated;
insert into standing_fixture(group_id) select id from public.stage_groups where draw_id='eeee9000-0000-4000-8000-000000000001' and label='A';
update standing_fixture set snapshot_id=public.refresh_group_standings(group_id);
select is((select complete from public.group_standing_snapshots where id=(select snapshot_id from standing_fixture)),false,'empty group stays provisional');
select is((select count(*)::int from public.team_matches m join public.match_sources e on e.match_id=m.id where e.source_group_id=(select group_id from standing_fixture) and (m.subteam_a is not null or m.subteam_b is not null)),0,'provisional group advances nobody');
select throws_ok($$select public.draw_group_ties((select group_id from standing_fixture),1)$$,'22023','Complete group required for tie draw','incomplete group cannot draw lots');
select is(public.refresh_group_standings((select group_id from standing_fixture)),(select snapshot_id from standing_fixture),'unchanged refresh is idempotent');
reset role;
-- Trusted result fixture: group A has a top-three circular tie; all others transitive.
do $$declare rec record; winner uuid; rid uuid; begin
 for rec in select m.*,a.group_slot a_slot,b.group_slot b_slot,g.label from public.team_matches m join public.draw_entries a on a.group_id=m.group_id and a.subteam_id=m.subteam_a join public.draw_entries b on b.group_id=m.group_id and b.subteam_id=m.subteam_b join public.stage_groups g on g.id=m.group_id where m.draw_id='eeee9000-0000-4000-8000-000000000001' loop
  winner:=case when rec.a_slot<rec.b_slot then rec.subteam_a else rec.subteam_b end;
  if rec.label='A' and least(rec.a_slot,rec.b_slot)=1 and greatest(rec.a_slot,rec.b_slot)=3 then winner:=case when rec.a_slot=3 then rec.subteam_a else rec.subteam_b end;end if;
  insert into public.team_match_results(match_id,revision,winner,kind,games_a,games_b,sets_a,sets_b,points_a,points_b,created_by) values(rec.id,1,winner,'played',case when winner=rec.subteam_a then 3 else 0 end,case when winner=rec.subteam_b then 3 else 0 end,case when winner=rec.subteam_a then 9 else 0 end,case when winner=rec.subteam_b then 9 else 0 end,case when winner=rec.subteam_a then 99 else 0 end,case when winner=rec.subteam_b then 99 else 0 end,'aaaa9000-0000-4000-8000-000000000001') returning id into rid;
  update public.team_matches set result_id=rid,result_revision=1,status='finished' where id=rec.id;
 end loop;
end;$$;
set local role authenticated;
update standing_fixture set snapshot_id=public.refresh_group_standings(group_id);
select is((select jsonb_array_length(data->'unresolved') from public.group_standing_snapshots where id=(select snapshot_id from standing_fixture)),1,'circular tie is explicitly unresolved');
select is((select complete from public.group_standing_snapshots where id=(select snapshot_id from standing_fixture)),true,'all actual results make group complete');
-- STANDINGS_RACE_FIXTURE_END: shared by scripts/test-standings-concurrency.mjs
select set_config('request.jwt.claims','{"sub":"aaaa9000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.draw_group_ties((select group_id from standing_fixture),2)$$,'42501','Organizer required','Main Judge cannot decide final tie by lot');
select set_config('request.jwt.claims','{"sub":"aaaa9000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.draw_group_ties((select group_id from standing_fixture),1)$$,'40001','Standings revision conflict','stale tie request rejected');
update standing_fixture set snapshot_id=public.draw_group_ties(group_id,2);
select is((select jsonb_array_length(data->'unresolved') from public.group_standing_snapshots where id=(select snapshot_id from standing_fixture)),0,'audited random lot resolves exact subset');
select is((select count(*)::int from public.group_tie_draws where group_id=(select group_id from standing_fixture)),1,'one immutable lot receipt');
select is((select count(distinct value)::int from public.group_tie_draws t,jsonb_each_text(t.lots) where t.group_id=(select group_id from standing_fixture)),3,'each tied club has a unique random lot');
select is(public.draw_group_ties((select group_id from standing_fixture),2),(select snapshot_id from standing_fixture),'retry does not redraw');
select is((select count(*)::int from public.audit_logs where action='standings.tie_drawn' and after_state->>'group_id'=(select group_id::text from standing_fixture)),1,'lot audit written once');
select public.refresh_group_standings(g.id) from public.stage_groups g join public.stages s on s.id=g.stage_id where g.draw_id='eeee9000-0000-4000-8000-000000000001' and s.kind='round_robin';
select is((select count(*)::int from public.team_matches where draw_id='eeee9000-0000-4000-8000-000000000001' and placement_from is not null and subteam_a is not null and subteam_b is not null),12,'all twelve quarterfinals receive actual qualifiers');
reset role;
select ok(bool_and(private.match_dependencies_ready(id)),'all populated quarterfinal dependencies are current') from public.team_matches where draw_id='eeee9000-0000-4000-8000-000000000001' and placement_from is not null and subteam_a is not null;
select throws_ok($$insert into public.team_match_results(match_id,revision,previous_result_id,winner,kind,games_a,games_b,sets_a,sets_b,points_a,points_b,created_by) select id,2,result_id,subteam_a,'team_forfeit',3,0,9,0,98,0,'aaaa9000-0000-4000-8000-000000000001' from public.team_matches where draw_id='eeee9000-0000-4000-8000-000000000001' and result_id is not null limit 1$$,'22023','Forfeit tie-break totals required','forfeit accounting cannot drift');
create temp table stale_fixture as select e.match_id,e.side,e.source_snapshot_id,m.subteam_a from public.match_sources e join public.team_matches m on m.id=e.match_id where e.source_group_id=(select group_id from standing_fixture) limit 1;
grant select on stale_fixture to authenticated;
update public.match_sources set source_snapshot_id=null where (match_id,side)=(select match_id,side from stale_fixture);
set local role authenticated;
select is(public.get_lineup_status((select match_id from stale_fixture))->>'sources_ready','false','safe status exposes stale-source flag without lineup identities');
select public.assign_team_trainer('aaaa9000-0000-4000-8000-000000000003',(select team_id from public.subteams where id=(select subteam_a from stale_fixture)),array[(select subteam_a from stale_fixture)]);
select set_config('request.jwt.claims','{"sub":"aaaa9000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.submit_lineup(gen_random_uuid(),(select match_id from stale_fixture),(select subteam_a from stale_fixture),array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()])$$,'55000','Match sources are not ready','new lineups reject stale qualifiers independently of UI');
reset role;
update public.match_sources e set source_snapshot_id=f.source_snapshot_id from stale_fixture f where e.match_id=f.match_id and e.side=f.side;
select throws_ok($$update public.team_matches set result_id=(select result_id from public.team_matches where group_id=(select group_id from standing_fixture) limit 1),result_revision=1 where id=(select match_id from stale_fixture)$$,'22023','Consistent result pointer required','result pointers cannot reference another match');
-- Trusted completion drives every winner/loser edge and all final classification pairs.
do $$declare rec record; rid uuid; begin
 for rec in select * from public.team_matches where draw_id='eeee9000-0000-4000-8000-000000000001' and placement_from is not null order by round_no,match_no loop
  select * into rec from public.team_matches where id=rec.id;
  if not private.match_dependencies_ready(rec.id) then raise exception 'Unready fixture match';end if;
  insert into public.team_match_results(match_id,revision,winner,kind,games_a,games_b,sets_a,sets_b,points_a,points_b,created_by) values(rec.id,1,rec.subteam_a,'team_forfeit',3,0,9,0,99,0,'aaaa9000-0000-4000-8000-000000000001') returning id into rid;
  update public.team_matches set result_id=rid,result_revision=1,status='finished' where id=rec.id;
  perform private.advance_team_result(rec.id);
 end loop;
end;$$;
select is((select count(*)::int from public.tour_placements where draw_id='eeee9000-0000-4000-8000-000000000001'),24,'all 24 clubs receive a distinct placement');
select is((select max(place) from public.tour_placements where draw_id='eeee9000-0000-4000-8000-000000000001'),24,'bracket offsets cover place 24');
-- Reopen upstream into an unresolved state: completed descendants force atomic rollback.
update public.team_matches set status='in_progress' where id=(select id from public.team_matches where group_id=(select group_id from standing_fixture) limit 1);
select throws_ok($$select private.rebuild_group_standings((select group_id from standing_fixture))$$,'55000','Dependent match requires correction resolution','upstream change cannot rewrite a completed descendant');
select is((select snapshot_id from public.group_standing_heads where group_id=(select group_id from standing_fixture)),(select snapshot_id from standing_fixture),'failed dependency change preserves authoritative head');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaa9000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.refresh_group_standings((select group_id from standing_fixture))$$,'42501','Draw permission required','Trainer cannot refresh authoritative standings');
select throws_ok($$delete from public.team_match_results$$,'42501',null,'staff cannot delete result history');
select throws_ok($$update public.group_tie_draws set lots='{}'$$,'42501',null,'staff cannot alter random receipts');
select throws_ok($$select private.advance_team_result(gen_random_uuid())$$,'42501',null,'private advancement has no staff RPC bypass');
reset role;
set local role anon;
select throws_ok($$select * from public.group_standing_snapshots$$,'42501',null,'anonymous cannot read private standings base tables');
select throws_ok($$select public.draw_group_ties(gen_random_uuid(),1)$$,'42501',null,'anonymous cannot request tie draw');
reset role;
select * from finish();
rollback;
