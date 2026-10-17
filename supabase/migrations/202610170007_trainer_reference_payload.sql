begin;
-- JSON preserves explicit nulls for the linked-or-free-name contract across generated RPC types.
create function public.set_player_trainer_reference(player uuid,ref_kind text,reference jsonb)
returns void language sql set search_path='' as $$
 select public.set_player_trainer(player,ref_kind,(reference->>'trainer_id')::uuid,reference->>'first_name',reference->>'last_name');
$$;
revoke all on function public.set_player_trainer_reference(uuid,text,jsonb) from public,anon;
grant execute on function public.set_player_trainer_reference(uuid,text,jsonb) to authenticated;
commit;
