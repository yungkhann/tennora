begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaa7000-0000-4000-8000-000000000001','draw-org@test.invalid','{"display_name":"Draw Organizer"}'),
 ('aaaa7000-0000-4000-8000-000000000002','draw-judge@test.invalid','{"display_name":"Draw Judge"}'),
 ('aaaa7000-0000-4000-8000-000000000003','draw-trainer@test.invalid','{"display_name":"Draw Trainer"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Draw Fixture' from auth.users where id::text like 'aaaa7000-%';
insert into public.staff_roles values('aaaa7000-0000-4000-8000-000000000001','organizer'),('aaaa7000-0000-4000-8000-000000000002','main_judge'),('aaaa7000-0000-4000-8000-000000000003','trainer');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaa7000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbb7000-0000-4000-8000-000000000001','Draw Season',2026,'2026-01-01','2026-12-31');
select public.save_tour('cccc7000-0000-4000-8000-000000000001','bbbb7000-0000-4000-8000-000000000001','Draw Tour',1,'2026-03-01','2026-03-03');
select public.create_stage_template('dddd7000-0000-4000-8000-000000000001','Confirmed draw format','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":4,"group_size":6},{"ordinal":2,"kind":"knockout","size":8,"source_ordinal":1,"place_from":1,"place_to":2},{"ordinal":3,"kind":"knockout","size":8,"source_ordinal":1,"place_from":3,"place_to":4},{"ordinal":4,"kind":"knockout","size":8,"source_ordinal":1,"place_from":5,"place_to":6}]}');
select public.configure_tour_stages('cccc7000-0000-4000-8000-000000000001','dddd7000-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'cccc7000-0000-4000-8000-000000000001',0,32,12,60,true,'Asia/Almaty');
select throws_ok($$select public.generate_tour_draw('eeee7000-0000-4000-8000-000000000001','cccc7000-0000-4000-8000-000000000001','U13',0)$$,'22023','Started season required','draw cannot precede season configuration freeze');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..24 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Draw Club '||i,'Synthetic'); perform public.register_season_team('bbbb7000-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Draw','Player '||i||' '||j,case when j<=3 then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbb7000-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;
select public.start_season('bbbb7000-0000-4000-8000-000000000001');
select throws_ok($$select public.generate_tour_draw(gen_random_uuid(),'cccc7000-0000-4000-8000-000000000001','U15',0)$$,'22023','Every club needs three eligible boys and two eligible girls','missing age-specific seed roster rejects entire generation');
select is((select count(*)::int from public.draw_revisions),0,'failed generation rolls back partial draw');
select lives_ok($$select public.generate_tour_draw('eeee7000-0000-4000-8000-000000000001','cccc7000-0000-4000-8000-000000000001','U13',0)$$,'generate confirmed 24-entry draw');
select lives_ok($$select public.generate_tour_draw('eeee7000-0000-4000-8000-000000000001','cccc7000-0000-4000-8000-000000000001','U13',0)$$,'same draw ID retry returns frozen result');
select is((select count(*)::int from public.draw_entries where draw_id='eeee7000-0000-4000-8000-000000000001'),24,'24 frozen subteam entries');
select is((select count(*)::int from public.draw_seed_players p join public.draw_entries e on e.id=p.entry_id where e.draw_id='eeee7000-0000-4000-8000-000000000001'),120,'exactly five player snapshots per entry');
select is((select count(*)::int from public.draw_entries e where e.draw_id='eeee7000-0000-4000-8000-000000000001' and e.rating_total=5000),24,'all initial seed totals correct');
select is((select count(distinct tie_lot)::int from public.draw_entries where draw_id='eeee7000-0000-4000-8000-000000000001'),24,'random tie lots preserved per seed');
select is((select g.ordinal from public.draw_entries e join public.stage_groups g on g.id=e.group_id where e.draw_id='eeee7000-0000-4000-8000-000000000001' and e.seed=5),4,'fifth seed snakes back into group D');
select is((select g.ordinal from public.draw_entries e join public.stage_groups g on g.id=e.group_id where e.draw_id='eeee7000-0000-4000-8000-000000000001' and e.seed=8),1,'eighth seed snakes into group A');
select is((select count(*)::int from public.team_matches m join public.stages s on s.id=m.stage_id where m.draw_id='eeee7000-0000-4000-8000-000000000001' and s.kind='round_robin'),60,'four groups have 60 round-robin matches');
select is((select count(*)::int from public.team_matches m join public.stages s on s.id=m.stage_id where m.draw_id='eeee7000-0000-4000-8000-000000000001' and s.kind='knockout'),36,'three brackets have 36 classification matches');
select is((select count(distinct least(subteam_a::text,subteam_b::text)||':'||greatest(subteam_a::text,subteam_b::text))::int from public.team_matches where draw_id='eeee7000-0000-4000-8000-000000000001' and subteam_a is not null),60,'each group pair appears once');
select is((select count(*)::int from (select group_id,round_no,subteam,count(*) from (select group_id,round_no,subteam_a subteam from public.team_matches where draw_id='eeee7000-0000-4000-8000-000000000001' and subteam_a is not null union all select group_id,round_no,subteam_b from public.team_matches where draw_id='eeee7000-0000-4000-8000-000000000001' and subteam_b is not null) p group by group_id,round_no,subteam having count(*)>1) duplicates),0,'no club plays twice in a group round');
select is((select count(*)::int from public.team_matches where draw_id='eeee7000-0000-4000-8000-000000000001' and placement_to-placement_from=1),12,'each of three brackets has four final classification pairs');
select is((select count(*)::int from public.match_sources d join public.team_matches m on m.id=d.match_id where m.draw_id='eeee7000-0000-4000-8000-000000000001' and d.source_group_id is not null),24,'all 24 group places route to quarterfinal slots');
select is((select count(*)::int from public.match_sources d join public.team_matches m on m.id=d.match_id join public.team_matches s on s.id=d.source_match_id where m.draw_id='eeee7000-0000-4000-8000-000000000001' and (s.round_no>=m.round_no or s.draw_id<>m.draw_id or s.stage_id<>m.stage_id)),0,'every match dependency points backward in the same draw/stage');
select is((select jsonb_array_length(after_state->'seeds') from public.audit_logs where action='draw.generated' and entity_id='eeee7000-0000-4000-8000-000000000001'),24,'audit includes every random tie lot and frozen seed');
select throws_ok($$select public.generate_tour_draw(gen_random_uuid(),'cccc7000-0000-4000-8000-000000000001','U13',0)$$,'22023','Draw revision conflict','stale generation revision rejected');
reset role;
update public.players set current_rating=2000 where id in(select p.player_id from public.draw_seed_players p join public.draw_entries e on e.id=p.entry_id where e.draw_id='eeee7000-0000-4000-8000-000000000001' and e.seed=24);
set local role authenticated;
select is((select rating_total::int from public.draw_entries where draw_id='eeee7000-0000-4000-8000-000000000001' and seed=24),5000,'later rating changes cannot rewrite frozen entry total');
select is((select count(*)::int from public.draw_seed_players p join public.draw_entries e on e.id=p.entry_id where e.draw_id='eeee7000-0000-4000-8000-000000000001' and p.rating=1000),120,'later ratings cannot change frozen player snapshots');
do $$declare sub uuid; club uuid; person uuid; sex public.player_gender; begin
 select e.subteam_id,s.team_id into sub,club from public.draw_entries e join public.subteams s on s.id=e.subteam_id where e.draw_id='eeee7000-0000-4000-8000-000000000001' and e.seed=24;
 foreach sex in array array['boy','girl']::public.player_gender[] loop
  person:=gen_random_uuid(); perform public.save_player(person,club,'Reserve','Seed Fixture',sex,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbb7000-0000-4000-8000-000000000001',sub,person);
 end loop;
end;$$;
select lives_ok($$select public.generate_tour_draw('eeee7000-0000-4000-8000-000000000002','cccc7000-0000-4000-8000-000000000001','U13',1)$$,'draft regeneration appends a revision');
select is((select rating_total::int from public.draw_entries where draw_id='eeee7000-0000-4000-8000-000000000002' and seed=1),10000,'regenerated draft uses latest ratings');
select is((select count(*)::int from public.draw_seed_players p join public.draw_entries e on e.id=p.entry_id where e.draw_id='eeee7000-0000-4000-8000-000000000002' and e.seed=1 and p.rating=2000),5,'lower-rated extra boy and girl are excluded from the top-five snapshot');
select throws_ok($$select public.publish_tour_draw('eeee7000-0000-4000-8000-000000000001',1)$$,'22023','Draw revision conflict','superseded draft cannot publish');
select set_config('request.jwt.claims','{"sub":"aaaa7000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*)::int from public.draw_revisions),0,'trainer cannot read private draft revisions');
select is((select count(*)::int from public.team_matches),0,'trainer cannot read draft match graph');
select throws_ok($$select public.publish_tour_draw('eeee7000-0000-4000-8000-000000000002',2)$$,'42501','Draw permission required','trainer cannot publish');
select throws_ok($$select public.generate_tour_draw(gen_random_uuid(),'cccc7000-0000-4000-8000-000000000001','U13',2)$$,'42501','Draw permission required','trainer cannot generate');
select set_config('request.jwt.claims','{"sub":"aaaa7000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.publish_tour_draw('eeee7000-0000-4000-8000-000000000002',2)$$,'main judge publishes latest draw');
select lives_ok($$select public.publish_tour_draw('eeee7000-0000-4000-8000-000000000002',2)$$,'publish retry idempotent');
select throws_ok($$select public.generate_tour_draw(gen_random_uuid(),'cccc7000-0000-4000-8000-000000000001','U13',2)$$,'22023','Published draw is locked','published graph cannot regenerate');
select set_config('request.jwt.claims','{"sub":"aaaa7000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*)::int from public.audit_logs where action='draw.published' and entity_id='eeee7000-0000-4000-8000-000000000002'),1,'publication audited once');
select set_config('request.jwt.claims','{"sub":"aaaa7000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*)::int from public.draw_revisions),1,'trainer can read published revision only');
select is((select count(*)::int from public.team_matches),96,'trainer can read published matches only');
select throws_ok($$update public.draw_entries set seed=999$$,'42501',null,'direct seed edits denied');
select throws_ok($$update public.team_matches set subteam_a=subteam_b$$,'42501',null,'direct participant edits denied');
select throws_ok($$delete from public.match_sources$$,'42501',null,'direct graph deletion denied');
select throws_ok($$update public.draw_seed_maps set slots='[]'$$,'42501',null,'seed mapping data immutable to staff');
set local role anon;
select throws_ok($$select * from public.draw_revisions$$,'42501',null,'anonymous base draws denied until public projections');
select throws_ok($$select * from public.draw_seed_players$$,'42501',null,'anonymous seed player base table denied');
select throws_ok($$select * from public.team_matches$$,'42501',null,'anonymous match base table denied');
select * from finish();
rollback;
