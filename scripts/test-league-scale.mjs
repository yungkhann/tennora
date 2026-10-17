import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
const actor = randomUUID(),
  season = randomUUID(),
  token = randomUUID();
const query = `begin;
insert into auth.users(id,email,raw_user_meta_data) values('${actor}','scale-${actor}@test.invalid','{"display_name":"Scale Fixture"}');
insert into public.staff_accounts(id,email,display_name) values('${actor}','scale-${actor}@test.invalid','Scale Fixture');
insert into public.staff_roles values('${actor}','organizer');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);
select public.save_season('${season}','Scale ${token}',2026,'2026-01-01','2026-12-31');
do $$declare club uuid; person uuid; subteam record; club_index integer; player_index integer; amount integer; begin
 for club_index in 1..24 loop
  club:=md5('${token}-club-'||club_index)::uuid;
  perform public.save_team(club,'Scale ${token} '||club_index,'Synthetic');
  perform public.register_season_team('${season}',club);
  for subteam in select id,age_group from public.subteams where team_id=club loop
   for player_index in 1..5 loop
    person:=md5('${token}-player-'||club_index||'-'||subteam.age_group||'-'||player_index)::uuid;
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
const start = Date.now();
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
console.log(
  `PASS: 24 clubs, 72 subteams, 360 eligible active players, 360 initial rating histories through authenticated RPCs (${Date.now() - start} ms); transaction rolled back.`,
);
