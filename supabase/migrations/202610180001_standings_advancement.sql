begin;
create table public.team_match_results(
 id uuid primary key default gen_random_uuid(),
 match_id uuid not null references public.team_matches(id) on delete restrict,
 revision integer not null check(revision>0),
 previous_result_id uuid references public.team_match_results(id) on delete restrict,
 winner uuid not null references public.subteams(id) on delete restrict,
 kind text not null check(kind in('played','team_forfeit')),
 games_a integer not null check(games_a between 0 and 3),games_b integer not null check(games_b between 0 and 3),
 sets_a integer not null check(sets_a>=0),sets_b integer not null check(sets_b>=0),
 points_a bigint not null check(points_a>=0),points_b bigint not null check(points_b>=0),
 created_by uuid not null references public.staff_accounts(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 unique(match_id,revision),
 check((games_a=3 and games_b<3) or (games_b=3 and games_a<3))
);
alter table public.team_matches add column result_id uuid references public.team_match_results(id) on delete restrict;
alter table public.team_matches add column result_revision integer not null default 0;
alter table public.team_matches add constraint result_pointer_revision check((result_id is null and result_revision=0) or (result_id is not null and result_revision>0));
create function private.validate_result_pointer() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.result_id is not null and not exists(select 1 from public.team_match_results r where r.id=new.result_id and r.match_id=new.id and r.revision=new.result_revision) then raise exception 'Consistent result pointer required' using errcode='22023';end if;
 return new;
end;$$;
revoke all on function private.validate_result_pointer() from public,anon,authenticated;
create trigger validate_result_pointer before update of result_id,result_revision on public.team_matches for each row execute function private.validate_result_pointer();
create table public.group_tie_draws(
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.stage_groups(id) on delete restrict,
 members jsonb not null check(jsonb_typeof(members)='array' and jsonb_array_length(members) between 2 and 32),
 lots jsonb not null check(jsonb_typeof(lots)='object'),
 created_by uuid not null references public.staff_accounts(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 unique(group_id,members)
);
create table public.group_standing_snapshots(
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.stage_groups(id) on delete restrict,
 revision integer not null check(revision>0),
 source_digest text not null,
 complete boolean not null,
 data jsonb not null,
 created_by uuid not null references public.staff_accounts(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 unique(group_id,revision)
);
create table public.group_standing_heads(
 group_id uuid primary key references public.stage_groups(id) on delete restrict,
 snapshot_id uuid not null references public.group_standing_snapshots(id) on delete restrict
);
create table public.tour_placements(
 draw_id uuid not null references public.draw_revisions(id) on delete restrict,
 subteam_id uuid not null references public.subteams(id) on delete restrict,
 place integer not null check(place>0),
 source_result_id uuid not null references public.team_match_results(id) on delete restrict,
 primary key(draw_id,subteam_id),unique(draw_id,place)
);
do $$declare relation text; begin
 foreach relation in array array['team_match_results','group_tie_draws','group_standing_snapshots','group_standing_heads','tour_placements'] loop
  execute format('alter table public.%I enable row level security',relation);
  execute format('revoke all on public.%I from anon,authenticated',relation);
  execute format('grant select on public.%I to authenticated',relation);
 end loop;
end;$$;
create policy result_read on public.team_match_results for select to authenticated using(exists(select 1 from public.team_matches m where m.id=match_id and private.can_read_draw(m.draw_id)));
create policy tie_read on public.group_tie_draws for select to authenticated using(exists(select 1 from public.stage_groups g where g.id=group_id and private.can_read_draw(g.draw_id)));
create policy standing_snapshot_read on public.group_standing_snapshots for select to authenticated using(exists(select 1 from public.stage_groups g where g.id=group_id and private.can_read_draw(g.draw_id)));
create policy standing_head_read on public.group_standing_heads for select to authenticated using(exists(select 1 from public.stage_groups g where g.id=group_id and private.can_read_draw(g.draw_id)));
create policy placement_read on public.tour_placements for select to authenticated using(private.can_read_draw(draw_id));
create function private.validate_team_result() returns trigger language plpgsql security definer set search_path='' as $$
declare m public.team_matches; a_wins boolean;
begin
 select * into m from public.team_matches where id=new.match_id;
 if m.subteam_a is null or m.subteam_b is null or new.winner not in(m.subteam_a,m.subteam_b) or new.revision<>m.result_revision+1 or new.previous_result_id is distinct from m.result_id then raise exception 'Consistent result revision required' using errcode='22023'; end if;
 a_wins:=new.winner=m.subteam_a;
 if (a_wins and (new.games_a<>3 or new.games_b>=3)) or (not a_wins and (new.games_b<>3 or new.games_a>=3)) then raise exception 'Winner requires three singles wins' using errcode='22023'; end if;
 if new.kind='team_forfeit' and ((a_wins and (new.games_b<>0 or new.sets_a<>9 or new.sets_b<>0 or new.points_a<>99 or new.points_b<>0)) or (not a_wins and (new.games_a<>0 or new.sets_b<>9 or new.sets_a<>0 or new.points_b<>99 or new.points_a<>0))) then raise exception 'Forfeit tie-break totals required' using errcode='22023'; end if;
 return new;
end;$$;
revoke all on function private.validate_team_result() from public,anon,authenticated;
create trigger validate_team_result before insert on public.team_match_results for each row execute function private.validate_team_result();

create function private.draw_command_lock(draw uuid) returns void language plpgsql set search_path='' as $$
begin perform pg_advisory_xact_lock(170030,hashtext(draw::text));end;$$;
revoke all on function private.draw_command_lock(uuid) from public,anon,authenticated;
-- E/F must take this draw-scoped coordination lock BEFORE match/player locks.
-- A separate shared replay barrier will allow normal scoring concurrency while
-- rare correction replay pauses conflicting commands. No league admin lock per point.
create function private.ratio_compare(a numeric,b numeric,c numeric,d numeric)
returns integer language plpgsql immutable set search_path='' as $$
declare left_value numeric; right_value numeric;
begin
 if b=0 and a>0 then return case when d=0 and c>0 then 0 else 1 end; end if;
 if d=0 and c>0 then return -1; end if;
 left_value:=(case when b=0 then 1 else a end)*(case when d=0 then 1 else d end);
 right_value:=(case when d=0 then 1 else c end)*(case when b=0 then 1 else b end);
 return case when left_value<right_value then -1 when left_value>right_value then 1 else 0 end;
end;$$;
create function private.standing_metrics(members text[],results jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare metrics jsonb:='{}'; member text; r jsonb; v jsonb; a text; b text; side integer; number numeric; key text;
begin
 foreach member in array members loop metrics:=metrics||jsonb_build_object(member,jsonb_build_object('played',0,'wins',0,'losses',0,'games_for',0,'games_against',0,'sets_for',0,'sets_against',0,'points_for',0,'points_against',0));end loop;
 for r in select value from jsonb_array_elements(results) loop
  a:=r->>'a'; b:=r->>'b';
  if not(a=any(members) and b=any(members)) then continue;end if;
  if a=b or r->>'winner' is null or r->>'winner' not in(a,b) then raise exception 'Invalid standing result' using errcode='22023';end if;
  foreach key in array array['gamesA','gamesB','setsA','setsB','pointsA','pointsB'] loop number:=(r->>key)::numeric;if number is null or number<0 or not(number<'Infinity'::numeric) or number<>trunc(number) then raise exception 'Invalid standing totals' using errcode='22023';end if;end loop;
  for side in 0..1 loop
   member:=case when side=0 then a else b end;v:=metrics->member;
   v:=v||jsonb_build_object('played',(v->>'played')::integer+1,'wins',(v->>'wins')::integer+case when r->>'winner'=member then 1 else 0 end,'losses',(v->>'losses')::integer+case when r->>'winner'=member then 0 else 1 end,
   'games_for',(v->>'games_for')::numeric+(r->>case when side=0 then 'gamesA' else 'gamesB' end)::numeric,'games_against',(v->>'games_against')::numeric+(r->>case when side=0 then 'gamesB' else 'gamesA' end)::numeric,
   'sets_for',(v->>'sets_for')::numeric+(r->>case when side=0 then 'setsA' else 'setsB' end)::numeric,'sets_against',(v->>'sets_against')::numeric+(r->>case when side=0 then 'setsB' else 'setsA' end)::numeric,
   'points_for',(v->>'points_for')::numeric+(r->>case when side=0 then 'pointsA' else 'pointsB' end)::numeric,'points_against',(v->>'points_against')::numeric+(r->>case when side=0 then 'pointsB' else 'pointsA' end)::numeric);
   metrics:=jsonb_set(metrics,array[member],v);
  end loop;
 end loop;
 return metrics;
end;$$;
create function private.standing_compare(a text,b text,metrics jsonb,criterion integer)
returns integer language plpgsql immutable set search_path='' as $$
declare x jsonb:=metrics->a;y jsonb:=metrics->b; area text;
begin
 if criterion=0 then return sign((x->>'wins')::numeric-(y->>'wins')::numeric)::integer;end if;
 area:=case criterion when 1 then 'games' when 2 then 'sets' else 'points' end;
 return private.ratio_compare((x->>(area||'_for'))::numeric,(x->>(area||'_against'))::numeric,(y->>(area||'_for'))::numeric,(y->>(area||'_against'))::numeric);
end;$$;
create function private.standing_buckets(members text[],metrics jsonb,criterion integer)
returns jsonb language plpgsql immutable set search_path='' as $$
declare ordered text[];i integer;j integer;swap text;buckets jsonb:='[]';bucket text[]:='{}';member text;
begin
 select array_agg(id order by id collate pg_catalog."C") into ordered from unnest(members) id;
 if cardinality(ordered)>1 then
  for i in 2..cardinality(ordered) loop j:=i;while j>1 loop exit when private.standing_compare(ordered[j],ordered[j-1],metrics,criterion)<=0;swap:=ordered[j-1];ordered[j-1]:=ordered[j];ordered[j]:=swap;j:=j-1;end loop;end loop;
 end if;
 foreach member in array ordered loop
  if cardinality(bucket)>0 and private.standing_compare(bucket[1],member,metrics,criterion)<>0 then buckets:=buckets||jsonb_build_array(to_jsonb(bucket));bucket:='{}';end if;
  bucket:=array_append(bucket,member);
 end loop;
 if cardinality(bucket)>0 then buckets:=buckets||jsonb_build_array(to_jsonb(bucket));end if;
 return buckets;
end;$$;
create function private.resolve_standing_tie(members text[],results jsonb,lots jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare metrics jsonb;criterion integer;buckets jsonb;bucket jsonb;ids text[];sub jsonb;ordered jsonb:='[]';unresolved jsonb:='[]';evidence jsonb:='[]';canonical text[];
begin
 if cardinality(members)<2 then return jsonb_build_object('order',to_jsonb(members),'unresolved','[]'::jsonb,'evidence','[]'::jsonb);end if;
 select array_agg(id order by id collate pg_catalog."C") into canonical from unnest(members) id;
 metrics:=private.standing_metrics(members,results);
 for criterion in 0..3 loop
  buckets:=private.standing_buckets(members,metrics,criterion);
  if jsonb_array_length(buckets)>1 then
   evidence:=jsonb_build_array(jsonb_build_object('members',to_jsonb(canonical),'criterion',case criterion when 0 then 'wins' when 1 then 'games_ratio' when 2 then 'sets_ratio' else 'points_ratio' end,'buckets',buckets));
   for bucket in select value from jsonb_array_elements(buckets) loop
    select array_agg(id) into ids from jsonb_array_elements_text(bucket) id;
    sub:=private.resolve_standing_tie(ids,results,lots);ordered:=ordered||(sub->'order');unresolved:=unresolved||(sub->'unresolved');evidence:=evidence||(sub->'evidence');
   end loop;
   return jsonb_build_object('order',ordered,'unresolved',unresolved,'evidence',evidence);
  end if;
 end loop;
 if (select count(*)=cardinality(members) and count(distinct lots->>id)=cardinality(members) from unnest(members) id where coalesce(lots->>id,'')<>'') then
  select jsonb_agg(id order by (lots->>id) collate pg_catalog."C") into ordered from unnest(members) id;
  return jsonb_build_object('order',ordered,'unresolved','[]'::jsonb,'evidence',jsonb_build_array(jsonb_build_object('members',to_jsonb(canonical),'criterion','lot','order',ordered)));
 end if;
 return jsonb_build_object('order',to_jsonb(canonical),'unresolved',jsonb_build_array(to_jsonb(canonical)),'evidence',jsonb_build_array(jsonb_build_object('members',to_jsonb(canonical),'criterion','unresolved')));
end;$$;
create function private.rank_group(members text[],results jsonb,lots jsonb default '{}')
returns jsonb language plpgsql immutable set search_path='' as $$
declare metrics jsonb;buckets jsonb;bucket jsonb;ids text[];sub jsonb;ordered jsonb:='[]';unresolved jsonb:='[]';evidence jsonb:='[]';rows jsonb:='[]';member text;tie jsonb;position integer:=0;rank integer;place integer;
begin
 if cardinality(members)>32 or cardinality(members)<>(select count(distinct id) from unnest(members) id) then raise exception 'Invalid standings members' using errcode='22023';end if;
 metrics:=private.standing_metrics(members,results);buckets:=private.standing_buckets(members,metrics,0);
 for bucket in select value from jsonb_array_elements(buckets) loop
  select array_agg(id) into ids from jsonb_array_elements_text(bucket) id;sub:=private.resolve_standing_tie(ids,results,lots);ordered:=ordered||(sub->'order');unresolved:=unresolved||(sub->'unresolved');evidence:=evidence||(sub->'evidence');
 end loop;
 for member in select value from jsonb_array_elements_text(ordered) loop
  position:=position+1;rank:=position;place:=position;
  select value into tie from jsonb_array_elements(unresolved) where value ? member;
  if found then select min(ord)::integer into rank from jsonb_array_elements_text(ordered) with ordinality v(id,ord) where tie ? id;place:=null;end if;
  rows:=rows||jsonb_build_array(jsonb_build_object('subteam_id',member,'rank',rank,'place',place)||(metrics->member));
 end loop;
 return jsonb_build_object('order',ordered,'unresolved',unresolved,'rows',rows,'evidence',evidence);
end;$$;
revoke all on function private.ratio_compare(numeric,numeric,numeric,numeric),private.standing_metrics(text[],jsonb),private.standing_compare(text,text,jsonb,integer),private.standing_buckets(text[],jsonb,integer),private.resolve_standing_tie(text[],jsonb,jsonb),private.rank_group(text[],jsonb,jsonb) from public,anon,authenticated;
alter table public.match_sources add column source_snapshot_id uuid references public.group_standing_snapshots(id) on delete restrict;
alter table public.match_sources add column source_result_id uuid references public.team_match_results(id) on delete restrict;

-- Source freshness is independently checked before accepting a new lineup or start.
create function private.match_dependencies_ready(match uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare edge public.match_sources; parent public.team_matches; snapshot public.group_standing_snapshots; expected uuid; actual uuid;
begin
 for edge in select * from public.match_sources where match_id=match loop
  select case edge.side when 'a' then subteam_a else subteam_b end into actual from public.team_matches where id=match;
  if edge.source_group_id is not null then
   select s.* into snapshot from public.group_standing_heads h join public.group_standing_snapshots s on s.id=h.snapshot_id where h.group_id=edge.source_group_id;
   if not found or not snapshot.complete or jsonb_array_length(snapshot.data->'unresolved')<>0 or edge.source_snapshot_id is distinct from snapshot.id then return false;end if;
   expected:=(snapshot.data->'order'->>(edge.source_place-1))::uuid;
  else
   select * into parent from public.team_matches where id=edge.source_match_id;
   if parent.status<>'finished' or parent.result_id is null or edge.source_result_id is distinct from parent.result_id then return false;end if;
   select case when edge.outcome='winner' then r.winner when r.winner=parent.subteam_a then parent.subteam_b else parent.subteam_a end into expected from public.team_match_results r where r.id=parent.result_id;
  end if;
  if expected is null or actual is distinct from expected then return false;end if;
 end loop;
 return true;
end;$$;
revoke all on function private.match_dependencies_ready(uuid) from public,anon,authenticated;

create function private.set_match_source(target uuid,side_name text,participant uuid,snapshot uuid,result uuid)
returns void language plpgsql security definer set search_path='' as $$
declare m public.team_matches; old uuid;
begin
 select * into m from public.team_matches where id=target for update;
 old:=case side_name when 'a' then m.subteam_a else m.subteam_b end;
 if old is distinct from participant then
  if m.status in('in_progress','finished','cancelled') or exists(select 1 from public.lineups where match_id=target) then raise exception 'Dependent match requires correction resolution' using errcode='55000';end if;
  update public.team_matches set subteam_a=case side_name when 'a' then participant else subteam_a end,subteam_b=case side_name when 'b' then participant else subteam_b end,status='scheduled',version=version+1,lineup_version=lineup_version+1 where id=target;
 end if;
 update public.match_sources set source_snapshot_id=snapshot,source_result_id=result where match_id=target and side=side_name;
end;$$;
revoke all on function private.set_match_source(uuid,text,uuid,uuid,uuid) from public,anon,authenticated;

create function private.rebuild_group_standings(group_uuid uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare g public.stage_groups; members text[]; results jsonb; ranked jsonb; subset jsonb; receipt public.group_tie_draws; lots jsonb:='{}'; used jsonb:='[]'; sources jsonb; fingerprint text; done boolean; head public.group_standing_snapshots; snapshot uuid; edge public.match_sources;
begin
 select * into g from public.stage_groups where id=group_uuid;
 if not found or not exists(select 1 from public.stages where id=g.stage_id and kind='round_robin') or not exists(select 1 from public.draw_revisions where id=g.draw_id and published_at is not null) then raise exception 'Published round-robin group required' using errcode='22023';end if;
 perform private.draw_command_lock(g.draw_id);
 select array_agg(subteam_id::text order by subteam_id::text) into members from public.draw_entries where group_id=g.id;
 select coalesce(jsonb_agg(jsonb_build_object('a',m.subteam_a,'b',m.subteam_b,'winner',r.winner,'gamesA',r.games_a,'gamesB',r.games_b,'setsA',r.sets_a,'setsB',r.sets_b,'pointsA',r.points_a,'pointsB',r.points_b) order by m.id),'[]') into results from public.team_matches m join public.team_match_results r on r.id=m.result_id where m.group_id=g.id and m.status='finished';
 select count(*)=cardinality(members)*(cardinality(members)-1)/2 and bool_and(status='finished' and result_id is not null),jsonb_agg(jsonb_build_object('match',id,'status',status,'result',result_id) order by id) into done,sources from public.team_matches where group_id=g.id;
 ranked:=private.rank_group(members,results);
 if done then
  for subset in select value from jsonb_array_elements(ranked->'unresolved') loop
   select * into receipt from public.group_tie_draws td where td.group_id=g.id and td.members=subset;
   if found then lots:=lots||receipt.lots;used:=used||jsonb_build_array(receipt.id);end if;
  end loop;
  ranked:=private.rank_group(members,results,lots);
 end if;
 fingerprint:=md5(jsonb_build_object('sources',sources,'lots',used)::text);
 select s.* into head from public.group_standing_heads h join public.group_standing_snapshots s on s.id=h.snapshot_id where h.group_id=g.id;
 if found and head.source_digest=fingerprint then return head.id;end if;
 insert into public.group_standing_snapshots(group_id,revision,source_digest,complete,data,created_by) values(g.id,coalesce(head.revision,0)+1,fingerprint,coalesce(done,false),ranked||jsonb_build_object('sources',sources,'tie_draws',used),auth.uid()) returning id into snapshot;
 insert into public.group_standing_heads(group_id,snapshot_id) values(g.id,snapshot) on conflict(group_id) do update set snapshot_id=excluded.snapshot_id;
 for edge in select * from public.match_sources where source_group_id=g.id order by match_id,side loop
  perform private.set_match_source(edge.match_id,edge.side,case when done and jsonb_array_length(ranked->'unresolved')=0 then (ranked->'order'->>(edge.source_place-1))::uuid else null end,snapshot,null);
 end loop;
 perform private.league_audit('standings.refreshed',g.id,'stage_group',case when head.id is null then null else jsonb_build_object('snapshot',head.id) end,jsonb_build_object('snapshot',snapshot,'complete',done,'unresolved',ranked->'unresolved'));
 return snapshot;
end;$$;
revoke all on function private.rebuild_group_standings(uuid) from public,anon,authenticated;

-- Scoring E calls this after installing a completed current result in the same transaction.
create function private.advance_team_result(match uuid)
returns void language plpgsql security definer set search_path='' as $$
declare m public.team_matches; r public.team_match_results; edge public.match_sources; loser uuid; offset_places integer;
begin
 select * into m from public.team_matches where id=match;
 perform private.draw_command_lock(m.draw_id);
 if m.status<>'finished' or m.result_id is null then raise exception 'Completed current result required' using errcode='22023';end if;
 select * into r from public.team_match_results where id=m.result_id;
 if r.match_id<>m.id or r.revision<>m.result_revision then raise exception 'Consistent result pointer required' using errcode='22023';end if;
 if m.placement_from is null then perform private.rebuild_group_standings(m.group_id);return;end if;
 loser:=case when r.winner=m.subteam_a then m.subteam_b else m.subteam_a end;
 for edge in select * from public.match_sources where source_match_id=m.id order by match_id,side loop
  perform private.set_match_source(edge.match_id,edge.side,case edge.outcome when 'winner' then r.winner else loser end,null,r.id);
 end loop;
 if m.placement_to=m.placement_from+1 then
  select coalesce(sum((s.configuration->>'size')::integer),0)::integer into offset_places from public.stages s join public.stages current on current.id=m.stage_id where s.plan_id=current.plan_id and s.kind='knockout' and s.ordinal<current.ordinal;
  -- Current projection only; immutable result revisions retain placement history.
  delete from public.tour_placements where draw_id=m.draw_id and source_result_id in(select id from public.team_match_results where match_id=m.id);
  insert into public.tour_placements(draw_id,subteam_id,place,source_result_id) values(m.draw_id,r.winner,offset_places+m.placement_from,r.id),(m.draw_id,loser,offset_places+m.placement_to,r.id);
 end if;
end;$$;
revoke all on function private.advance_team_result(uuid) from public,anon,authenticated;

create function public.refresh_group_standings(group_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
begin perform private.require_draw_manager();return private.rebuild_group_standings(group_id);end;$$;
create function public.draw_group_ties(group_id uuid,expected_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare snapshot public.group_standing_snapshots; subset jsonb; lots jsonb; receipt uuid; g public.stage_groups;
begin
 perform private.require_organizer();
 select * into g from public.stage_groups where id=group_id;
 perform private.draw_command_lock(g.draw_id);
 select * into snapshot from public.group_standing_snapshots where id=private.rebuild_group_standings(draw_group_ties.group_id);
 if not snapshot.complete then raise exception 'Complete group required for tie draw' using errcode='22023';end if;
 if jsonb_array_length(snapshot.data->'unresolved')=0 then return snapshot.id;end if;
 if expected_revision is distinct from snapshot.revision then raise exception 'Standings revision conflict' using errcode='40001';end if;
 -- Check all dependent locks before randomness, preventing outcome-dependent retries.
 if exists(select 1 from public.match_sources e join public.team_matches m on m.id=e.match_id where e.source_group_id=g.id and (m.status in('in_progress','finished','cancelled') or exists(select 1 from public.lineups l where l.match_id=m.id))) then raise exception 'Dependent match requires correction resolution' using errcode='55000';end if;
 for subset in select value from jsonb_array_elements(snapshot.data->'unresolved') loop
  select jsonb_object_agg(member,gen_random_uuid()::text) into lots from jsonb_array_elements_text(subset) member;
  insert into public.group_tie_draws(group_id,members,lots,created_by) values(g.id,subset,lots,auth.uid()) returning id into receipt;
  perform private.league_audit('standings.tie_drawn',receipt,'group_tie_draw',null,jsonb_build_object('group_id',g.id,'members',subset,'lots',lots));
 end loop;
 return private.rebuild_group_standings(group_id);
end;$$;
revoke all on function public.refresh_group_standings(uuid),public.draw_group_ties(uuid,integer) from public,anon;
grant execute on function public.refresh_group_standings(uuid),public.draw_group_ties(uuid,integer) to authenticated;

create or replace function private.lineup_status_data(match uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('sources_ready',private.match_dependencies_ready(m.id),'match_id',m.id,'version',m.version,'lineup_version',m.lineup_version,'revealed',m.lineups_revealed_at is not null,'reveal_version',m.lineups_reveal_version,'a_submitted',exists(select 1 from public.lineups l where l.match_id=m.id and l.subteam_id=m.subteam_a),'b_submitted',exists(select 1 from public.lineups l where l.match_id=m.id and l.subteam_id=m.subteam_b)) from public.team_matches m where m.id=match;
$$;

create or replace function public.submit_lineup(lineup_id uuid,match uuid,subteam uuid,players uuid[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare value public.team_matches; old public.lineups; season uuid; i integer;
begin
 perform pg_advisory_xact_lock(170002);
 perform pg_advisory_xact_lock(170005);
 if not private.is_subteam_trainer(subteam) then raise exception 'Assigned Trainer required' using errcode='42501'; end if;
 perform private.draw_command_lock((select draw_id from public.team_matches where id=match));
 select * into value from public.team_matches where id=match for update;
 if not found or subteam is null or subteam not in(value.subteam_a,value.subteam_b) or value.subteam_a is null or value.subteam_b is null or not exists(select 1 from public.draw_revisions where id=value.draw_id and published_at is not null) then raise exception 'Published participant match required' using errcode='22023'; end if;
 select * into old from public.lineups where id=lineup_id;
 if found then
  if old.match_id=match and old.subteam_id=subteam and old.original_players=players then return private.lineup_status_data(match); end if;
  raise exception 'Lineup ID conflict' using errcode='22023';
 end if;
 if not private.match_dependencies_ready(match) then raise exception 'Match sources are not ready' using errcode='55000';end if;
 if value.status not in('scheduled','called') or value.lineups_revealed_at is not null or exists(select 1 from public.lineups l where l.match_id=match and l.subteam_id=subteam) then raise exception 'Lineup already locked' using errcode='22023'; end if;
 if lineup_id is null or players is null or cardinality(players)<>5 or array_ndims(players)<>1 or array_lower(players,1)<>1 or array_position(players,null) is not null or (select count(distinct p) from unnest(players) p)<>5 then raise exception 'Five distinct lineup players required' using errcode='22023'; end if;
 select t.season_id into season from public.draw_revisions d join public.tour_stage_plans p on p.id=d.plan_id join public.tours t on t.id=p.tour_id where d.id=value.draw_id;
 for i in 1..5 loop
  if not private.eligible_lineup_player(players[i],subteam,season,i) then raise exception 'Eligible gendered roster player required' using errcode='22023'; end if;
 end loop;
 insert into public.lineups(id,match_id,subteam_id,original_players,submitted_by) values(lineup_id,match,subteam,players,auth.uid());
 insert into public.lineup_slots(lineup_id,slot,player_id,player_name,gender) select lineup_id,position,p.id,p.first_name||' '||p.last_name,p.gender from unnest(players) with ordinality selected(id,position) join public.players p on p.id=selected.id;
 -- Before reveal even an Organizer must not recover identities from audit hashes.
 insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),'trainer','lineup.submitted',lineup_id,'lineup',jsonb_build_object('match_id',match,'subteam_id',subteam,'submitted',true));
 update public.team_matches set version=version+1,lineup_version=lineup_version+1 where id=match;
 if (select count(*) from public.lineups l where l.match_id=match)=2 then
  insert into public.singles_games(match_id,slot,player_a,player_b)
  select match,a.slot,a.player_id,b.player_id from public.lineups la join public.lineup_slots a on a.lineup_id=la.id join public.lineups lb on lb.match_id=la.match_id and lb.subteam_id=value.subteam_b join public.lineup_slots b on b.lineup_id=lb.id and b.slot=a.slot where la.match_id=match and la.subteam_id=value.subteam_a;
  update public.team_matches set lineups_revealed_at=clock_timestamp(),lineups_reveal_version=lineup_version where id=match;
  insert into public.audit_logs(actor_id,actor_role,action,entity_id,entity_type,after_state) values(auth.uid(),'trainer','lineups.revealed',match,'team_match',jsonb_build_object('lineup_version',value.lineup_version+1));
 end if;
 return private.lineup_status_data(match);
end;$$;


commit;
