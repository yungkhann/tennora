begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
-- Isolate the first-Organizer proof inside this rolled-back transaction.
-- Other connections retain their real account state through MVCC.
update public.staff_accounts set active=false;
insert into auth.users(id,email,raw_user_meta_data) values
 ('aaaa0000-0000-4000-8000-000000000001','organizer@staff.invalid','{"display_name":"Organizer"}'),
 ('aaaa0000-0000-4000-8000-000000000002','judge@staff.invalid','{"display_name":"Main Judge","roles":["organizer"]}'),
 ('aaaa0000-0000-4000-8000-000000000003','legacy@staff.invalid','{"display_name":"Legacy Owner"}');
select public.bootstrap_organizer('aaaa0000-0000-4000-8000-000000000001');
select throws_ok($$select public.bootstrap_organizer('aaaa0000-0000-4000-8000-000000000002')$$,'22023','Organizer already exists','bootstrap cannot run twice');
insert into public.staff_accounts(id,email,display_name) values('aaaa0000-0000-4000-8000-000000000002','judge@staff.invalid','Main Judge');
insert into public.staff_roles values('aaaa0000-0000-4000-8000-000000000002','main_judge');
-- Historical owner is not staff.
select set_config('request.jwt.claims','{"sub":"aaaa0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.create_organization('Legacy Club','legacy-staff-test');
set local role authenticated;
select is(private.has_staff_role(),false,'legacy owner has no league authority');
select is((select count(*)::int from public.staff_accounts),0,'legacy owner cannot see directory');
select throws_ok($$select public.create_organization('Retired','retired-test')$$,'42501',null,'organization onboarding retired');
select throws_ok($$select public.bootstrap_organizer(auth.uid())$$,'42501',null,'bootstrap not callable by user');
select throws_ok($$select public.change_staff('aaaa0000-0000-4000-8000-000000000002',array['organizer']::public.staff_role[],true)$$,'42501','Organizer required','legacy owner cannot grant roles');
select set_config('request.jwt.claims','{"sub":"aaaa0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(private.has_staff_role('main_judge'),true,'main judge role recognized');
select is(private.has_staff_role('organizer'),false,'metadata cannot grant organizer');
select is((select count(*)::int from public.staff_accounts),1,'judge sees only own account');
select is((select count(*)::int from public.audit_logs where organization_id is null),0,'judge cannot read league audit');
select throws_ok($$select public.begin_staff_job(gen_random_uuid(),'create',null,'fake@staff.invalid','Fake',array['trainer']::public.staff_role[])$$,'42501','Organizer required','judge cannot provision staff');
select throws_ok($$select public.change_staff(auth.uid(),array['organizer']::public.staff_role[],true)$$,'42501','Organizer required','judge cannot self promote');
select throws_ok($$insert into public.staff_roles values(auth.uid(),'organizer')$$,'42501',null,'direct role insertion denied');
select throws_ok($$update public.staff_accounts set active=false$$,'42501',null,'direct account update denied');
select throws_ok($$delete from public.staff_roles$$,'42501',null,'direct role deletion denied');
select throws_ok($$select public.finish_staff_job(gen_random_uuid(),true)$$,'42501','Organizer required','judge cannot finish provisioning');
select set_config('request.jwt.claims','{"sub":"aaaa0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*)::int from public.staff_accounts where id in('aaaa0000-0000-4000-8000-000000000001','aaaa0000-0000-4000-8000-000000000002')),2,'organizer sees staff directory');
select throws_ok($$select public.change_staff(auth.uid(),array['trainer']::public.staff_role[],true)$$,'22023','Self lockout forbidden','organizer cannot remove own authority');
select throws_ok($$select public.change_staff(auth.uid(),array['organizer']::public.staff_role[],false)$$,'22023','Self lockout forbidden','organizer cannot deactivate self');
select throws_ok($$select public.change_staff('aaaa0000-0000-4000-8000-000000000002',array['trainer','trainer']::public.staff_role[],true)$$,'22023','Invalid staff details','duplicate roles rejected');
select throws_ok($$select public.change_staff('aaaa0000-0000-4000-8000-000000000002',array[]::public.staff_role[],true)$$,'22023','Invalid staff details','empty roles rejected');
select lives_ok($$select public.change_staff('aaaa0000-0000-4000-8000-000000000002',array['trainer','line_judge']::public.staff_role[],true)$$,'coexisting roles accepted');
select is((select count(*)::int from public.staff_roles where user_id='aaaa0000-0000-4000-8000-000000000002'),2,'both roles persisted');
select lives_ok($$select public.begin_staff_job('bbbb0000-0000-4000-8000-000000000001','create','aaaa0000-0000-4000-8000-000000000003','new@staff.invalid','New Trainer',array['trainer','line_judge']::public.staff_role[])$$,'provision begins');
select isnt((select target_id from public.staff_jobs where id='bbbb0000-0000-4000-8000-000000000001'),'aaaa0000-0000-4000-8000-000000000003'::uuid,'client cannot choose identity');
select lives_ok($$select public.begin_staff_job('bbbb0000-0000-4000-8000-000000000001','create',null,'new@staff.invalid','New Trainer',array['trainer','line_judge']::public.staff_role[])$$,'same job retry accepted');
select throws_ok($$select public.begin_staff_job('bbbb0000-0000-4000-8000-000000000001','create',null,'other@staff.invalid','New Trainer',array['trainer','line_judge']::public.staff_role[])$$,'22023','Job payload conflict','payload reuse rejected');
select throws_ok($$select public.finish_staff_job('bbbb0000-0000-4000-8000-000000000001',true)$$,'22023','Auth identity mismatch','cannot activate absent Auth identity');
select lives_ok($$select public.finish_staff_job('bbbb0000-0000-4000-8000-000000000001',false)$$,'failure recorded');
select is((select status from public.staff_jobs where id='bbbb0000-0000-4000-8000-000000000001'),'failed','failed state preserved');
reset role;
-- Simulate successful Auth step with the reserved UUID.
insert into auth.users(id,email,raw_user_meta_data) select target_id,email,jsonb_build_object('display_name',display_name) from public.staff_jobs where id='bbbb0000-0000-4000-8000-000000000001';
set local role authenticated;
select lives_ok($$select public.finish_staff_job('bbbb0000-0000-4000-8000-000000000001',true)$$,'failed job can complete after Auth succeeds');
select lives_ok($$select public.finish_staff_job('bbbb0000-0000-4000-8000-000000000001',true)$$,'completion retry is idempotent');
select is((select count(*)::int from public.staff_accounts where email='new@staff.invalid'),1,'exactly one staff account');
select is((select count(*)::int from public.audit_logs where action='staff.job_completed' and entity_id=(select target_id from public.staff_jobs where id='bbbb0000-0000-4000-8000-000000000001')),1,'exactly one completion audit');
select lives_ok($$select public.begin_staff_job('bbbb0000-0000-4000-8000-000000000002','reset','aaaa0000-0000-4000-8000-000000000002','','',array[]::public.staff_role[])$$,'password reset job begins');
select lives_ok($$select public.finish_staff_job('bbbb0000-0000-4000-8000-000000000002',true)$$,'password reset receipt completes');
select lives_ok($$select public.change_staff('aaaa0000-0000-4000-8000-000000000002',array['trainer','line_judge']::public.staff_role[],false)$$,'deactivation accepted');
select set_config('request.jwt.claims','{"sub":"aaaa0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(private.has_staff_role(),false,'old JWT immediately loses authority');
select is((select count(*)::int from public.staff_roles),0,'inactive user cannot read roles');
select is((select count(*)::int from public.staff_accounts),0,'inactive user cannot read directory');
select throws_ok($$select public.update_staff_name('Still Active')$$,'42501','Active staff required','inactive profile RPC denied');
select set_config('request.jwt.claims','{"sub":"aaaa0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.update_staff_name('New Organizer Name')$$,'active staff updates audited name');
select is((select display_name from public.profiles where id=auth.uid()),'New Organizer Name','profile remains synchronized');
select throws_ok($$delete from public.audit_logs$$,'42501',null,'organizer cannot delete audit');
select throws_ok($$update public.audit_logs set actor_role='main_judge'$$,'42501',null,'organizer cannot rewrite audit');
set local role anon;
select throws_ok($$select * from public.staff_accounts$$,'42501',null,'anonymous directory denied');
select throws_ok($$select * from public.staff_roles$$,'42501',null,'anonymous roles denied');
select throws_ok($$select * from public.staff_jobs$$,'42501',null,'anonymous provisioning history denied');
select throws_ok($$select public.change_staff(gen_random_uuid(),array['organizer']::public.staff_role[],true)$$,'42501',null,'anonymous staff command denied');
select * from finish();
rollback;
