begin;
create function private.set_winner(a bigint,b bigint)
returns text language plpgsql immutable set search_path='' as $$
declare high bigint:=greatest(a,b);diff bigint:=abs(a-b);
begin
 if a is null or b is null or a<0 or b<0 or a>9007199254740991 or b>9007199254740991 or a::numeric+b>9007199254740991 then raise exception 'Invalid set score' using errcode='22023';end if;
 if high<11 or diff<2 then return null;end if;
 if high<>11 and diff<>2 then raise exception 'Invalid terminal set score' using errcode='22023';end if;
 return case when a>b then 'a' else 'b' end;
end;$$;
create function private.score_summary(state jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare length integer;set_value jsonb;a bigint;b bigint;wins_a integer:=0;wins_b integer:=0;index integer;won text;winner text;first_server text;changes bigint;total bigint;
begin
 if jsonb_typeof(state) is distinct from 'object' or coalesce(state->>'initial_server','') not in('a','b') or jsonb_typeof(state->'sets') is distinct from 'array' or jsonb_typeof(state->'timeouts'->'a') is distinct from 'boolean' or jsonb_typeof(state->'timeouts'->'b') is distinct from 'boolean' then raise exception 'Invalid scoring state' using errcode='22023';end if;
 length:=jsonb_array_length(state->'sets');
 if length not between 1 and 5 then raise exception 'Invalid scoring state' using errcode='22023';end if;
 for index in 0..length-1 loop
  set_value:=state->'sets'->index;
  if jsonb_typeof(set_value->'a') is distinct from 'number' or jsonb_typeof(set_value->'b') is distinct from 'number' or (set_value->>'a')::numeric<>trunc((set_value->>'a')::numeric) or (set_value->>'b')::numeric<>trunc((set_value->>'b')::numeric) then raise exception 'Invalid set score' using errcode='22023';end if;
  a:=(set_value->>'a')::bigint;b:=(set_value->>'b')::bigint;won:=private.set_winner(a,b);
  if won='a' then wins_a:=wins_a+1;elsif won='b' then wins_b:=wins_b+1;end if;
  if index<length-1 and (won is null or wins_a=3 or wins_b=3) then raise exception 'Invalid scoring state' using errcode='22023';end if;
 end loop;
 winner:=case when wins_a=3 then 'a' when wins_b=3 then 'b' else null end;
 if winner is null and won is not null then raise exception 'Next set required' using errcode='22023';end if;
 first_server:=case when length%2=1 then state->>'initial_server' when state->>'initial_server'='a' then 'b' else 'a' end;
 total:=a+b;changes:=case when total<20 then total/2 else total-20 end;
 return jsonb_build_object('set_number',length,'points_a',a,'points_b',b,'sets_a',wins_a,'sets_b',wins_b,'winner',winner,'server',case when winner is not null then null when changes%2=0 then first_server when first_server='a' then 'b' else 'a' end,'ends_swapped',(length-1)%2=1);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'Invalid scoring state' using errcode='22023';
end;$$;
create function private.score_transition(state jsonb,command jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare summary jsonb;next_state jsonb:=state;sets jsonb:=state->'sets';index integer;set_value jsonb;a bigint;b bigint;kind text:=command->>'kind';side text:=command->>'side';won text;
begin
 summary:=private.score_summary(state);
 if kind is null or kind not in('point','undo_point','undo_set','timeout') or (kind<>'undo_set' and coalesce(side,'') not in('a','b')) then raise exception 'Invalid score command' using errcode='22023';end if;
 index:=jsonb_array_length(sets)-1;set_value:=sets->index;a:=(set_value->>'a')::bigint;b:=(set_value->>'b')::bigint;
 if kind='timeout' then
  if summary->>'winner' is not null or (state->'timeouts'->>side)::boolean then raise exception 'Timeout unavailable' using errcode='22023';end if;
  next_state:=jsonb_set(next_state,array['timeouts',side],'true');
 elsif kind='point' then
  if summary->>'winner' is not null then raise exception 'Singles already finished' using errcode='22023';end if;
  if side='a' then a:=a+1;else b:=b+1;end if;
  won:=private.set_winner(a,b);
  sets:=jsonb_set(sets,array[index::text],jsonb_build_object('a',a,'b',b));
  if won is not null and (summary->>case when won='a' then 'sets_a' else 'sets_b' end)::integer+1<3 then sets:=sets||jsonb_build_array(jsonb_build_object('a',0,'b',0));end if;
  next_state:=jsonb_set(next_state,'{sets}',sets);
 else
  if a=0 and b=0 and index>0 then sets:=sets-index;index:=index-1;set_value:=sets->index;a:=(set_value->>'a')::bigint;b:=(set_value->>'b')::bigint;end if;
  if kind='undo_set' then
   if a+b=0 then raise exception 'No set to undo' using errcode='22023';end if;
   a:=0;b:=0;
  else
   won:=private.set_winner(a,b);
   if (side='a' and a=0) or (side='b' and b=0) or (won is not null and won<>side) then raise exception 'Invalid undo point' using errcode='22023';end if;
   if side='a' then a:=a-1;else b:=b-1;end if;
  end if;
  sets:=jsonb_set(sets,array[index::text],jsonb_build_object('a',a,'b',b));next_state:=jsonb_set(next_state,'{sets}',sets);
 end if;
 perform private.score_summary(next_state);
 return next_state;
end;$$;
create function private.elo_pair(a numeric,b numeric,winner text,k numeric,automatic boolean default false)
returns jsonb language plpgsql immutable set search_path='' as $$
declare expected numeric;score integer;next_a numeric;next_b numeric;delta numeric;
begin
 if a is null or b is null or a<0 or b<0 or a>9007199254740991 or b>9007199254740991 or a<>trunc(a) or b<>trunc(b) or k is null or not(k>0 and k<=9007199254740991) or coalesce(winner,'') not in('a','b') or automatic is null then raise exception 'Invalid Elo inputs' using errcode='22023';end if;
 if automatic then return jsonb_build_object('a',a,'b',b);end if;
 -- Beyond this gap, expected values cannot affect whole ratings at supported K.
 expected:=case when b-a>200000 then 0 when a-b>200000 then 1 else 1/(1+power(10::numeric,(b-a)/400)) end;
 score:=case winner when 'a' then 1 else 0 end;
 delta:=k*(score-expected);next_a:=greatest(0,a+floor(delta+0.5));next_b:=greatest(0,b+floor(-delta+0.5));
 if next_a>9007199254740991 or next_b>9007199254740991 then raise exception 'Elo exceeds integer precision' using errcode='22023';end if;
 return jsonb_build_object('a',next_a,'b',next_b);
end;$$;
create function private.team_outcome(games jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare game text;a integer:=0;b integer:=0;
begin
 if jsonb_typeof(games) is distinct from 'array' then raise exception 'Invalid team results' using errcode='22023';end if;
 if jsonb_array_length(games)>5 then raise exception 'Invalid team results' using errcode='22023';end if;
 for game in select value from jsonb_array_elements_text(games) loop
  if game='a' then a:=a+1;elsif game='b' then b:=b+1;elsif game is not null then raise exception 'Invalid team results' using errcode='22023';end if;
 end loop;
 if a>3 or b>3 then raise exception 'Invalid team results' using errcode='22023';end if;
 return jsonb_build_object('a',a,'b',b,'winner',case when a=3 then 'a' when b=3 then 'b' else null end);
end;$$;
revoke all on function private.team_outcome(jsonb) from public,anon,authenticated;
revoke all on function private.set_winner(bigint,bigint),private.score_summary(jsonb),private.score_transition(jsonb,jsonb),private.elo_pair(numeric,numeric,text,numeric,boolean) from public,anon,authenticated;
commit;
