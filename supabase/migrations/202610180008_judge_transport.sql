begin;
create table private.score_http_budgets(
 staff_id uuid not null references public.staff_accounts(id) on delete cascade,
 operation text not null check(operation in('read','write')),
 window_start timestamptz not null,used integer not null,
 primary key(staff_id,operation)
);
revoke all on private.score_http_budgets from public,anon,authenticated;
create function public.claim_score_http_request(operation text)
returns boolean language plpgsql security definer set search_path='' as $$
declare stamp timestamptz:=date_trunc('minute',clock_timestamp());requests integer;
begin
 if not private.has_staff_role() then raise exception 'Scoring access required' using errcode='42501';end if;
 if coalesce(operation,'') not in('read','write') then raise exception 'Invalid operation' using errcode='22023';end if;
 insert into private.score_http_budgets as b(staff_id,operation,window_start,used) values(auth.uid(),operation,stamp,1)
 on conflict on constraint score_http_budgets_pkey do update set window_start=excluded.window_start,used=case when b.window_start=excluded.window_start then least(b.used+1,1000) else 1 end returning used into requests;
 return requests<=case when operation='read' then 240 else 120 end;
end;$$;
revoke all on function public.claim_score_http_request(text) from public,anon;
grant execute on function public.claim_score_http_request(text) to authenticated;
create function public.get_judge_desk()
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;
begin
 if not(private.has_staff_role('line_judge') or private.manages_all_teams()) then raise exception 'Judge access required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('table_number',h.table_number,'venue_day',h.venue_day,'assignment_id',h.assignment_id,'match',case when private.can_read_match_operation(m.id) then private.match_operation_snapshot(m.id) else null end) order by h.table_number),'[]'::jsonb) into result
 from public.table_day_heads h join public.table_judge_assignments a on a.id=h.assignment_id
 left join public.match_table_leases l on l.table_number=h.table_number
 left join public.team_matches m on m.id=l.match_id
 left join public.draw_revisions d on d.id=m.draw_id
 left join public.tour_stage_plans p on p.id=d.plan_id
 where h.staff_id=auth.uid() and private.owns_scoring_table(h.table_number,coalesce(p.tour_id,a.context_tour_id)) and h.venue_day=(clock_timestamp() at time zone (select venue_timezone from public.tournament_settings where tour_id=coalesce(p.tour_id,a.context_tour_id) order by revision desc limit 1))::date;
 return result;
end;$$;
revoke all on function public.get_judge_desk() from public,anon;
grant execute on function public.get_judge_desk() to authenticated;
-- Wrap the safe projection; management read authority alone does not enable scoring.
alter function private.game_score_snapshot(uuid) rename to game_score_snapshot_base;
create function private.game_score_snapshot(target uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select private.game_score_snapshot_base(target)||jsonb_build_object('can_score',exists(select 1 from public.match_table_leases l join public.team_matches m on m.id=l.match_id join public.draw_revisions d on d.id=m.draw_id join public.tour_stage_plans p on p.id=d.plan_id where m.id=g.match_id and private.owns_scoring_table(l.table_number,p.tour_id)),'next_game_id',(select id from public.singles_games where match_id=g.match_id and status in('pending','in_progress') order by case when status='in_progress' then 0 else 1 end,slot limit 1)) from public.singles_games g where g.id=target;
$$;
revoke all on function private.game_score_snapshot(uuid) from public,anon,authenticated;
commit;
