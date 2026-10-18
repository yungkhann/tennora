begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaaa025-0000-4000-8000-000000000001','lineup-org-audit-a025@test.invalid','{"display_name":"Lineup Organizer"}'),
 ('aaaaa025-0000-4000-8000-000000000002','lineup-judge-audit-a025@test.invalid','{"display_name":"Lineup Judge"}'),
 ('aaaaa025-0000-4000-8000-000000000003','lineup-coach-a-audit-a025@test.invalid','{"display_name":"Lineup Trainer A"}'),
 ('aaaaa025-0000-4000-8000-000000000004','lineup-coach-b-audit-a025@test.invalid','{"display_name":"Lineup Trainer B"}'),
 ('aaaaa025-0000-4000-8000-000000000005','lineup-outsider-audit-a025@test.invalid','{"display_name":"Lineup Outsider"}');
insert into public.staff_accounts(id,email,display_name) select id,email,'Lineup Fixture' from auth.users where id::text like 'aaaaa025-%';
insert into public.staff_roles values('aaaaa025-0000-4000-8000-000000000001','organizer'),('aaaaa025-0000-4000-8000-000000000002','main_judge'),('aaaaa025-0000-4000-8000-000000000003','trainer'),('aaaaa025-0000-4000-8000-000000000004','trainer'),('aaaaa025-0000-4000-8000-000000000004','main_judge'),('aaaaa025-0000-4000-8000-000000000005','trainer');
create temp table lineup_fixture(match uuid,subteam_a uuid,subteam_b uuid,players_a uuid[],players_b uuid[],reserve_a uuid);
grant all on lineup_fixture to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaa025-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.save_season('bbbba025-0000-4000-8000-000000000001','Lineup Season',2026,(clock_timestamp() at time zone 'Asia/Almaty')::date-7,(clock_timestamp() at time zone 'Asia/Almaty')::date+7);
select public.save_tour('cccca025-0000-4000-8000-000000000001','bbbba025-0000-4000-8000-000000000001','Lineup Tour',1,(clock_timestamp() at time zone 'Asia/Almaty')::date,(clock_timestamp() at time zone 'Asia/Almaty')::date);
select public.create_stage_template('dddda025-0000-4000-8000-000000000001','Lineup Format','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":1,"group_size":2}]}');
select public.configure_tour_stages('cccca025-0000-4000-8000-000000000001','dddda025-0000-4000-8000-000000000001',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'cccca025-0000-4000-8000-000000000001',0,32,128,60,true,'Asia/Almaty');
do $$declare club uuid; sub uuid; person uuid; i integer; j integer; begin
 for i in 1..2 loop
  club:=gen_random_uuid(); perform public.save_team(club,'Lineup Club '||i,'Synthetic'); perform public.register_season_team('bbbba025-0000-4000-8000-000000000001',club);
  select id into sub from public.subteams where team_id=club and age_group='U13';
  for j in 1..5 loop
   person:=gen_random_uuid(); perform public.save_player(person,club,'Hidden','Slot '||j,case when j in(1,3,5) then 'boy' else 'girl' end::public.player_gender,'2014-01-01','right','attack','junior'); perform public.add_roster_player('bbbba025-0000-4000-8000-000000000001',sub,person);
  end loop;
 end loop;
end;$$;
select public.start_season('bbbba025-0000-4000-8000-000000000001');
select public.generate_tour_draw('eeeea025-0000-4000-8000-000000000001','cccca025-0000-4000-8000-000000000001','U13',0);
select public.publish_tour_draw('eeeea025-0000-4000-8000-000000000001',1);
insert into lineup_fixture(match,subteam_a,subteam_b) select id,subteam_a,subteam_b from public.team_matches where draw_id='eeeea025-0000-4000-8000-000000000001';
update lineup_fixture f set players_a=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_a and m.ended_at is null),players_b=(select array_agg(p.id order by right(p.last_name,1)::integer) from public.roster_memberships m join public.players p on p.id=m.player_id where m.subteam_id=f.subteam_b and m.ended_at is null);
select public.assign_team_trainer('aaaaa025-0000-4000-8000-000000000003',(select team_id from public.subteams where id=(select subteam_a from lineup_fixture)),array[(select subteam_a from lineup_fixture)]);
select public.assign_team_trainer('aaaaa025-0000-4000-8000-000000000004',(select team_id from public.subteams where id=(select subteam_b from lineup_fixture)),array[(select subteam_b from lineup_fixture)]);
do $$declare person uuid:=gen_random_uuid();club uuid;sub uuid;begin select subteam_a into sub from lineup_fixture;select team_id into club from public.subteams where id=sub;perform public.save_player(person,club,'Reserve','Boy','boy','2014-01-01','right','attack','junior');perform public.add_roster_player('bbbba025-0000-4000-8000-000000000001',sub,person);update lineup_fixture set reserve_a=person;end;$$;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values('aaaaa025-0000-4000-8000-000000000006','line-a025@test.invalid','{"display_name":"Life Line Judge"}');
insert into public.staff_accounts(id,email,display_name) values('aaaaa025-0000-4000-8000-000000000006','line-a025@test.invalid','Life Line Judge');
insert into public.staff_roles values('aaaaa025-0000-4000-8000-000000000006','line_judge');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaa025-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.submit_lineup('ffffa025-0000-4000-8000-000000000001',match,subteam_a,players_a) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaa025-0000-4000-8000-000000000004","role":"authenticated"}',true);
select public.submit_lineup('ffffa025-0000-4000-8000-000000000002',match,subteam_b,players_b) from lineup_fixture;
select set_config('request.jwt.claims','{"sub":"aaaaa025-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.assign_table_judge('ffffa025-0000-4000-8000-000000000003','cccca025-0000-4000-8000-000000000001',127,(clock_timestamp() at time zone 'Asia/Almaty')::date,'aaaaa025-0000-4000-8000-000000000006',0,'Lifecycle fixture judge');

select public.end_roster_membership(id,'Unavailable for starting lineup') from public.roster_memberships where player_id=(select players_a[1] from lineup_fixture) and ended_at is null;
select public.manage_match(gen_random_uuid(),id,'assign',127,version,'Forfeit fixture table') from public.team_matches where id=(select match from lineup_fixture);
select public.manage_match(gen_random_uuid(),id,'start',null,version,'Forfeit fixture start') from public.team_matches where id=(select match from lineup_fixture);
create temp table team_review(value jsonb,second jsonb,child uuid,original uuid,new_root uuid);
grant all on team_review to authenticated;
insert into team_review(original) select result_id from public.team_matches where id=(select match from lineup_fixture);
select lives_ok($$update team_review set value=public.submit_team_result_correction('ffffa025-0000-4000-8000-000000000090',m.id,m.result_id,'team_forfeit','a','Wrong team recorded absent') from public.team_matches m where m.id=(select match from lineup_fixture)$$,'official can review a team forfeit without fabricated singles');
select is((select result_id from public.team_matches where id=(select match from lineup_fixture)),(select original from team_review),'review does not change official result');
select is((select value->'plan'->>'team_complete' from team_review),'true','forfeit revision preview remains complete');
select is((select value->'plan'->>'games_a' from team_review),'3','forfeit revision previews canonical 3-0');
select public.submit_team_result_correction('ffffa025-0000-4000-8000-000000000090',id,result_id,'team_forfeit','a','Wrong team recorded absent') from public.team_matches where id=(select match from lineup_fixture);
select is((select count(*)::int from public.result_correction_events where request_id='ffffa025-0000-4000-8000-000000000090'),1,'duplicate review is idempotent');
select set_config('request.jwt.claims','{"sub":"aaaaa025-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.submit_team_result_correction(gen_random_uuid(),id,result_id,'reopen',null,'Unauthorized') from public.team_matches where id=(select match from lineup_fixture)$$,'42501','Match management permission required','Trainer cannot reopen a forfeit');
select set_config('request.jwt.claims','{"sub":"aaaaa025-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.apply_result_correction(gen_random_uuid(),(value->>'id')::uuid,'00000000000000000000000000000000',false,'Stale preview') from team_review$$,'40001','Correction review version conflict','forfeit application requires reviewed digest');
reset role;
create function pg_temp.reject_forfeit_audit() returns trigger language plpgsql as $$begin if new.action='correction.applied' and new.entity_id='ffffa025-0000-4000-8000-000000000090'::uuid then raise exception 'Injected forfeit audit failure' using errcode='P0001';end if;return new;end;$$;
create trigger audit_forfeit_failure before insert on public.audit_logs for each row execute function pg_temp.reject_forfeit_audit();
set local role authenticated;
select throws_ok($$select public.apply_result_correction(gen_random_uuid(),(value->>'id')::uuid,value->'plan'->>'digest',false,'Failure injection') from team_review$$,'P0001','Injected forfeit audit failure','late failure rolls back the entire forfeit correction');
select is((select count(*)::int from public.team_match_results where match_id=(select match from lineup_fixture)),1,'failed application leaves no partial team result');
select is((select result_id from public.team_matches where id=(select match from lineup_fixture)),(select original from team_review),'failed application preserves authoritative pointer');
reset role;
drop trigger audit_forfeit_failure on public.audit_logs;
set local role authenticated;
select public.apply_result_correction('ffffa025-0000-4000-8000-000000000091',(value->>'id')::uuid,value->'plan'->>'digest',false,'Reviewed corrected winner') from team_review;
select public.apply_result_correction('ffffa025-0000-4000-8000-000000000091',(value->>'id')::uuid,value->'plan'->>'digest',false,'Reviewed corrected winner') from team_review;
select is((select count(*)::int from public.team_match_results where match_id=(select match from lineup_fixture)),2,'forfeit correction appends one revision under retry');
select is((select r.winner from public.team_matches m join public.team_match_results r on r.id=m.result_id where m.id=(select match from lineup_fixture)),(select subteam_a from lineup_fixture),'corrected forfeit winner is authoritative');
select is((select count(*)::int from public.tour_placements where draw_id='eeeea025-0000-4000-8000-000000000001'),2,'corrected round-robin standings update placements');
reset role;
select set_config('request.jwt.claims','{"sub":"aaaaa025-0000-4000-8000-000000000001","role":"authenticated"}',true);
-- A started downstream attempt must be retained and explicitly resolved.
do $$declare child_id uuid:=gen_random_uuid();club uuid:=gen_random_uuid();third uuid;root public.team_matches;begin
 select * into root from public.team_matches where id=(select match from lineup_fixture);
 perform public.save_team(club,'Other downstream club','Synthetic');select id into third from public.subteams where team_id=club and age_group='U13';
 update public.team_matches set placement_from=1,placement_to=4 where id=root.id;
 insert into public.team_matches(id,draw_id,stage_id,group_id,match_no,round_no,placement_from,placement_to,subteam_a,subteam_b,status,started_at) values(child_id,root.draw_id,root.stage_id,root.group_id,2,2,1,2,root.subteam_a,third,'in_progress',clock_timestamp());
 insert into public.match_sources(match_id,side,source_match_id,outcome,source_result_id) values(child_id,'a',root.id,'winner',root.result_id);
 insert into public.singles_games(id,match_id,slot,player_a,player_b,status,score_state,player_a_name,player_b_name,started_at) values(gen_random_uuid(),child_id,1,(select players_a[2] from lineup_fixture),(select players_b[2] from lineup_fixture),'in_progress','{"initial_server":"a","sets":[{"a":2,"b":1}],"timeouts":{"a":false,"b":false}}','Playing A','Playing B',clock_timestamp());
 update team_review set child=child_id,second=null;
end;$$;
set local role authenticated;
update team_review set second=public.submit_team_result_correction('ffffa025-0000-4000-8000-000000000092',m.id,m.result_id,'team_forfeit','b','Correct forfeit winner again') from public.team_matches m where m.id=(select match from lineup_fixture);
select is((select second->'plan'->>'requires_organizer' from team_review),'true','started downstream play requires Organizer resolution');
select set_config('request.jwt.claims','{"sub":"aaaaa025-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.apply_result_correction(gen_random_uuid(),(second->>'id')::uuid,second->'plan'->>'digest',true,'Main Judge cannot invalidate play') from team_review$$,'42501','Explicit Organizer resolution required','Main Judge cannot approve started-play invalidation');
select set_config('request.jwt.claims','{"sub":"aaaaa025-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.apply_result_correction(gen_random_uuid(),(second->>'id')::uuid,second->'plan'->>'digest',false,'Missing confirmation') from team_review$$,'42501','Explicit Organizer resolution required','Organizer must explicitly confirm invalidation');
select public.apply_result_correction(gen_random_uuid(),(second->>'id')::uuid,second->'plan'->>'digest',true,'Approved invalidation') from team_review;
reset role;
select ok((select superseded_by is not null from public.team_matches where id=(select child from team_review)),'started dependent attempt is preserved and superseded');
select is((select count(*)::int from public.player_end_events where game_id in(select id from public.singles_games where match_id=(select child from team_review))),2,'interrupted physical play records rest for both players');
set local role authenticated;
update team_review set value=public.submit_team_result_correction('ffffa025-0000-4000-8000-000000000093',m.id,m.result_id,'reopen',null,'Forfeit should be played') from public.team_matches m where m.id=(select match from lineup_fixture);
select is((select value->'plan'->>'requires_organizer' from team_review),'false','historic superseded play does not contaminate a fresh review');
select is((select value->'plan'->>'team_complete' from team_review),'false','reopening does not award a winner');
update team_review set value=public.get_result_correction((value->>'id')::uuid);
update team_review set new_root=(public.apply_result_correction(gen_random_uuid(),(value->>'id')::uuid,value->'plan'->>'digest',false,'Reviewed reopening')->>'match_id')::uuid;
select is((select status::text from public.team_matches where id=(select new_root from team_review)),'scheduled','reopened forfeit creates a scheduled current attempt');
select is((select count(*)::int from public.lineups where match_id=(select new_root from team_review)),0,'reopened attempt requires fresh lineups');
select is((select count(*)::int from public.singles_results where game_id in(select id from public.singles_games where match_id=(select new_root from team_review))),0,'reopen manufactures no singles or ratings');
reset role;
select is((select superseded_by from public.team_matches where id=(select match from lineup_fixture)),(select new_root from team_review),'old forfeit links to fresh root');
select is((select count(*)::int from public.team_match_results where match_id=(select match from lineup_fixture)),3,'all original forfeit revisions remain stored');
select is((select count(*)::int from public.rating_calculations where player_a in(select unnest(players_a||players_b) from lineup_fixture)),0,'forfeit revisions and reopening change no unplayed Elo');
select is(has_function_privilege('anon','public.submit_team_result_correction(uuid,uuid,uuid,text,text,text)','execute'),false,'anonymous callers have no forfeit correction RPC');
select is(has_function_privilege('authenticated','private.apply_team_result_correction(uuid,uuid,text,boolean,text)','execute'),false,'private applier is inaccessible directly');
select * from finish();rollback;
