begin;
create function public.get_public_health() returns timestamptz language sql volatile set search_path='' as $$select clock_timestamp();$$;
revoke all on function public.get_public_health() from public;
grant execute on function public.get_public_health() to anon,authenticated;
commit;
