begin;
create extension if not exists pgtap with schema extensions;
select plan(30);
-- Exercise historical organization invariants under a transaction-only fixture grant.
-- The staff suite separately proves production onboarding is revoked.
grant execute on function public.create_organization(text,text) to authenticated;
insert into auth.users (id, email, raw_user_meta_data) values
 ('11111111-1111-4111-8111-111111111111','alice@test.invalid','{"display_name":"Alice", "role":"platform_admin"}'),
 ('22222222-2222-4222-8222-222222222222','bob@test.invalid','{"display_name":"Bob"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select lives_ok($$select public.create_organization('Alice Club','alice-club')$$,'authenticated organization onboarding');
select is((select count(*)::int from public.organization_members),1,'one owner membership created');
select is((select roles::text from public.organization_members),'{owner}','metadata cannot grant platform role');
select is((select count(*)::int from public.audit_logs),1,'creation audit is atomic');
select is((select count(*)::int from public.profiles),1,'only self profile visible');
select lives_ok($$update public.profiles set display_name='Alice A' where id=auth.uid()$$,'self name editable');
select throws_ok($$update public.profiles set id='22222222-2222-4222-8222-222222222222'$$,'42501',null,'identity update denied');
select throws_ok($$insert into public.organization_members(organization_id,user_id,roles) select id,auth.uid(),array['owner']::public.organization_role[] from public.organizations$$,'42501',null,'direct role grant denied');
select throws_ok($$update public.organization_members set roles=array['owner']::public.organization_role[]$$,'42501',null,'role mutation denied');
select throws_ok($$update public.audit_logs set action='forged'$$,'42501',null,'audit rewrite denied');
select throws_ok($$update public.organizations set name='Forged'$$,'42501',null,'direct organization mutation denied');
select throws_ok($$delete from public.audit_logs$$,'42501',null,'audit deletion denied');
select throws_ok($$insert into public.audit_logs(organization_id,action,entity_id) values(gen_random_uuid(),'forged',gen_random_uuid())$$,'42501',null,'audit forgery denied');
select throws_ok($$select public.create_organization('Bad','../bad')$$,'22023','Invalid organization details','slug validation');
select throws_ok($$select public.create_organization('Duplicate','alice-club')$$,'23505',null,'duplicate slug rejected');
select is((select count(*)::int from public.organization_members),1,'failed create leaves no membership');
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select is((select count(*)::int from public.organizations),0,'Bob cannot read Alice private tenant');
select lives_ok($$select public.create_organization('Bob Club','bob-club')$$,'Bob creates isolated tenant');
select is((select count(*)::int from public.audit_logs),1,'Bob cannot read Alice audit');
reset role;
select throws_ok($$insert into public.organization_members(organization_id,user_id,roles) select id,'11111111-1111-4111-8111-111111111111',array[]::public.organization_role[] from public.organizations where slug='bob-club'$$,'23514',null,'empty role list rejected');
select throws_ok($$insert into public.organization_members(organization_id,user_id,roles) select id,'11111111-1111-4111-8111-111111111111',array['player','player']::public.organization_role[] from public.organizations where slug='bob-club'$$,'23514',null,'duplicate roles rejected');
insert into public.organization_members(organization_id,user_id,roles)
 select id,'11111111-1111-4111-8111-111111111111',array['scorekeeper','player']::public.organization_role[] from public.organizations where slug='bob-club';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select is((select count(*)::int from public.organizations),2,'one user accesses two member organizations');
select is((select roles::text from public.organization_members m join public.organizations o on o.id=m.organization_id where o.slug='bob-club'),'{scorekeeper,player}','distinct and coexisting tenant roles');
select is((select count(*)::int from public.audit_logs where organization_id=(select id from public.organizations where slug='bob-club')),0,'non-owner membership cannot read tenant audit');
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select throws_ok($$select public.create_organization('No user','no-user')$$,'42501','Authentication required','RPC requires a real user identity');
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select throws_ok($$select * from public.organizations$$,'42501',null,'anon cannot read private organizations');
select throws_ok($$select public.create_organization('Evil','evil-club')$$,'42501',null,'anon cannot create organizations');
select throws_ok($$select * from public.profiles$$,'42501',null,'anon profiles denied');
select throws_ok($$select * from public.organization_members$$,'42501',null,'anon memberships denied');
select throws_ok($$select * from public.audit_logs$$,'42501',null,'anon audit denied');
select * from finish();
rollback;
