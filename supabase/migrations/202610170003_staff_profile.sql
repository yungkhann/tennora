begin;
create function public.update_staff_name(new_name text) returns void language plpgsql security definer set search_path='' as $$
declare previous_name text;
begin
 if not private.has_staff_role() then raise exception 'Active staff required' using errcode='42501'; end if;
 if new_name is null or char_length(btrim(new_name)) not between 2 and 80 then raise exception 'Invalid name' using errcode='22023'; end if;
 select display_name into previous_name from public.staff_accounts where id=auth.uid() for update;
 update public.staff_accounts set display_name=btrim(new_name) where id=auth.uid();
 update public.profiles set display_name=btrim(new_name) where id=auth.uid();
 insert into public.audit_logs(actor_id,action,entity_id,entity_type,before_state,after_state)
 values(auth.uid(),'staff.name_changed',auth.uid(),'staff_account',jsonb_build_object('display_name',previous_name),jsonb_build_object('display_name',btrim(new_name)));
end;
$$;
revoke all on function public.update_staff_name(text) from public,anon;
grant execute on function public.update_staff_name(text) to authenticated;
commit;
