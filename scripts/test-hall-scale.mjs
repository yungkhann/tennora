import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
export function createHallScaleFixture(tableCount = 12) {
  const actor = randomUUID(),
    season = randomUUID(),
    tour = randomUUID(),
    template = randomUUID(),
    token = randomUUID();
  let query = `begin;
insert into auth.users(id,email,raw_user_meta_data) values('${actor}','scale-${actor}@test.invalid','{"display_name":"Scale Fixture"}');
insert into public.staff_accounts(id,email,display_name) values('${actor}','scale-${actor}@test.invalid','Scale Fixture');
insert into public.staff_roles values('${actor}','organizer');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);
select public.save_season('${season}','Scale ${token}',2026,'2026-01-01','2026-12-31');
do $$declare club uuid; person uuid; subteam record; club_index integer; player_index integer; amount integer; begin
 for club_index in 1..24 loop
  club:=gen_random_uuid();
  perform public.save_team(club,'Scale ${token} '||club_index,'Synthetic');
  perform public.register_season_team('${season}',club);
  for subteam in select id,age_group from public.subteams where team_id=club loop
   for player_index in 1..5 loop
    person:=gen_random_uuid();
    perform public.save_player(person,club,'Synthetic',club_index||'-'||subteam.age_group||'-'||player_index,case when player_index in(2,4) then 'girl'::public.player_gender else 'boy'::public.player_gender end,make_date(2026-case subteam.age_group when 'U13' then 12 when 'U15' then 14 else 16 end,6,15),'right','attack','junior',null);
    perform public.add_roster_player('${season}',subteam.id,person);
   end loop;
  end loop;
 end loop;
 select count(*) into amount from public.season_team_entries where season_id='${season}'; if amount<>24 then raise exception 'Expected 24 clubs'; end if;
 select count(*) into amount from public.subteams s join public.season_team_entries e on e.team_id=s.team_id where e.season_id='${season}'; if amount<>72 then raise exception 'Expected 72 subteams'; end if;
 select count(*) into amount from public.roster_memberships where season_id='${season}' and ended_at is null; if amount<>360 then raise exception 'Expected 360 active players'; end if;
 select count(*) into amount from public.rating_history h join public.roster_memberships m on m.player_id=h.player_id where m.season_id='${season}' and h.source='initial'; if amount<>360 then raise exception 'Expected 360 initial rating histories'; end if;
 if exists(select 1 from public.roster_memberships m join public.players p on p.id=m.player_id join public.subteams s on s.id=m.subteam_id where m.season_id='${season}' and public.age_group_for_birth_year(extract(year from p.date_of_birth)::integer,2026) is distinct from s.age_group::text) then raise exception 'Ineligible scale fixture'; end if;
end $$;
rollback;`;
  query = query.replace(
    "rollback;",
    () => `select public.save_tour('${tour}','${season}','Scale tour',1,(clock_timestamp() at time zone 'Asia/Almaty')::date,(clock_timestamp() at time zone 'Asia/Almaty')::date);
select public.create_stage_template('${template}','Scale format','{"nodes":[{"ordinal":1,"kind":"round_robin","group_count":4,"group_size":6},{"ordinal":2,"kind":"knockout","size":8,"source_ordinal":1,"place_from":1,"place_to":2},{"ordinal":3,"kind":"knockout","size":8,"source_ordinal":1,"place_from":3,"place_to":4},{"ordinal":4,"kind":"knockout","size":8,"source_ordinal":1,"place_from":5,"place_to":6}]}');
select public.configure_tour_stages('${tour}','${template}',array['U13','U15','U17']::public.age_group[]);
select public.save_tournament_settings(gen_random_uuid(),'${tour}',0,32,12,60,true,'Asia/Almaty');
select public.start_season('${season}');
do $$declare age public.age_group;draw uuid;begin foreach age in array array['U13','U15','U17']::public.age_group[] loop draw:=gen_random_uuid();perform public.generate_tour_draw(draw,'${tour}',age,0);perform public.publish_tour_draw(draw,1);end loop;end;$$;
reset role;
do $$declare club record;coach uuid;begin for club in select team_id from public.season_team_entries where season_id='${season}' loop
 coach:=md5('${token}-coach-'||club.team_id)::uuid;
 insert into auth.users(id,email,raw_user_meta_data) values(coach,'hall-scale-'||coach||'@test.invalid','{}');
 insert into public.staff_accounts(id,email,display_name) values(coach,'hall-scale-'||coach||'@test.invalid','Scale coach');
 insert into public.staff_roles(user_id,role) values(coach,'trainer');
 insert into public.trainer_profiles(user_id,team_id) values(coach,club.team_id);
 insert into public.subteam_trainers(subteam_id,trainer_id) select id,coach from public.subteams where team_id=club.team_id;
end loop;end;$$;
set local role authenticated;
do $$declare m record;sub uuid;club uuid;coach uuid;players uuid[];begin
 for m in select match.* from public.team_matches match join public.draw_revisions d on d.id=match.draw_id join public.tour_stage_plans p on p.id=d.plan_id where p.tour_id='${tour}' and match.placement_from is null loop
  foreach sub in array array[m.subteam_a,m.subteam_b] loop
   perform set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);
   select team_id into club from public.subteams where id=sub;coach:=md5('${token}-coach-'||club)::uuid;
   perform set_config('request.jwt.claims',jsonb_build_object('sub',coach,'role','authenticated')::text,true);
   select array_agg(r.player_id order by right(p.last_name,1)::integer) into players from public.roster_memberships r join public.players p on p.id=r.player_id where r.season_id='${season}' and r.subteam_id=sub and r.ended_at is null;
   perform public.submit_lineup(gen_random_uuid(),m.id,sub,players);
  end loop;
 end loop;
end;$$;
select set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);
select public.run_hall_command(gen_random_uuid(),'${tour}','allocate','72-subteam readiness proof');
reset role;
do $$declare amount integer;begin
 select count(*) into amount from public.team_matches m join public.draw_revisions d on d.id=m.draw_id join public.tour_stage_plans p on p.id=d.plan_id where p.tour_id='${tour}';if amount<>288 then raise exception 'Expected 288 group and classification matches, got %',amount;end if;
 select count(*) into amount from public.match_table_leases l join public.team_matches m on m.id=l.match_id join public.draw_revisions d on d.id=m.draw_id join public.tour_stage_plans p on p.id=d.plan_id where p.tour_id='${tour}';if amount<>12 then raise exception 'Expected 12 ready table assignments, got %',amount;end if;
 if exists(select sub from public.match_table_leases l join public.team_matches m on m.id=l.match_id join public.draw_revisions d on d.id=m.draw_id join public.tour_stage_plans p on p.id=d.plan_id cross join lateral unnest(array[m.subteam_a,m.subteam_b]) sub where p.tour_id='${tour}' group by sub having count(*)>1) then raise exception 'Duplicate allocated subteam';end if;
 if exists(select player from public.match_table_leases l join public.singles_games g on g.match_id=l.match_id join public.team_matches m on m.id=g.match_id join public.draw_revisions d on d.id=m.draw_id join public.tour_stage_plans p on p.id=d.plan_id cross join lateral unnest(array[g.player_a,g.player_b]) player where p.tour_id='${tour}' group by player having count(*)>1) then raise exception 'Duplicate allocated player';end if;
end;$$;
rollback;`,
  );
  query = query
    .replace("0,32,12,60", `0,32,${tableCount},60`)
    .replace("amount<>12", `amount<>${Math.min(tableCount, 36)}`);
  return { query, actor, season, tour, template, token };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { query } = createHallScaleFixture();
  const start = Date.now();
  try {
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_tennora",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-Atc",
        query,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (error) {
    throw new Error(error.stderr?.toString() || "Hall scale failed");
  }
  console.log(
    `PASS: 72 subteams/360 players, three published composite draws, 288 match queue nodes, 180 jointly revealed group lineups and 12 conflict-free allocations through authenticated RPCs (${Date.now() - start} ms); transaction rolled back.`,
  );
}
