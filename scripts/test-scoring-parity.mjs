import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  initialScore,
  scoreTransition,
  scoreSummary,
  teamOutcome,
} from "../src/domain/scoring.ts";
import { eloPair } from "../src/domain/elo.ts";
const vectors = JSON.parse(
  readFileSync(new URL("../tests/fixtures/scoring.json", import.meta.url)),
);
const quote = (value) =>
  `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
function sql(query) {
  return JSON.parse(
    execFileSync(
      "docker",
      [
        "exec",
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
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 4 * 1024 * 1024,
      },
    ),
  );
}
let seed = 284117;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed;
};
const trajectories = [...vectors.cases];
for (let path = 0; path < 16; path++) {
  const initial = initialScore(path % 2 ? "a" : "b");
  let state = initial;
  const commands = [],
    active = [];
  for (let step = 0; step < 100; step++) {
    const summary = scoreSummary(state),
      choice = random() % 12;
    let command;
    if ((summary.winner || choice === 0) && active.length) {
      command = { kind: "undo_point", side: active.pop().side };
    } else if (choice === 1 && active.length) {
      const target =
        summary.points_a + summary.points_b
          ? summary.set_number
          : summary.set_number - 1;
      while (active.at(-1)?.set >= target) active.pop();
      command = { kind: "undo_set" };
    } else if (
      choice === 2 &&
      !summary.winner &&
      (!state.timeouts.a || !state.timeouts.b)
    ) {
      command = { kind: "timeout", side: !state.timeouts.a ? "a" : "b" };
    } else {
      command = { kind: "point", side: random() % 5 === 0 ? "b" : "a" };
      active.push({ side: command.side, set: summary.set_number });
    }
    state = scoreTransition(state, command);
    commands.push(command);
  }
  trajectories.push({
    name: `generated trajectory ${path}`,
    initial,
    commands,
  });
}
let transitions = 0;
for (const v of trajectories) {
  let state = v.initial;
  const expected = [{ state, summary: scoreSummary(state) }];
  for (const command of v.commands) {
    state = scoreTransition(state, command);
    expected.push({ state, summary: scoreSummary(state) });
  }
  const actual = sql(
    `with recursive path(step,state) as(select 0,${quote(v.initial)} union all select step+1,private.score_transition(state,${quote(v.commands)}->step) from path where step<${v.commands.length}) select jsonb_agg(jsonb_build_object('state',state,'summary',private.score_summary(state)) order by step) from path`,
  );
  assert.deepEqual(actual, expected, v.name);
  transitions += v.commands.length;
}
const elo = [...vectors.elo];
for (let i = 0; i < 500; i++)
  elo.push({
    a: random() % 6000,
    b: random() % 6000,
    winner: random() % 2 ? "a" : "b",
    k: [1, 16, 32, 64, 128, 32.5][random() % 6],
    automatic: i % 11 === 0,
  });
const actual = sql(
  `select jsonb_agg(private.elo_pair((v->>'a')::numeric,(v->>'b')::numeric,v->>'winner',(v->>'k')::numeric,coalesce((v->>'automatic')::boolean,false)) order by ord) from jsonb_array_elements(${quote(elo)}) with ordinality f(v,ord)`,
);
assert.deepEqual(
  actual,
  elo.map((v) => eloPair(v.a, v.b, v.winner, v.k, v.automatic)),
  "Elo parity",
);
const teams = [
  [],
  ["a", "b", null, null, null],
  ["a", "a", "a", null, null],
  ["b", "a", "b", "a", "b"],
];
assert.deepEqual(
  sql(
    `select jsonb_agg(private.team_outcome(v) order by ord) from jsonb_array_elements(${quote(teams)}) with ordinality f(v,ord)`,
  ),
  teams.map(teamOutcome),
  "Team outcome parity",
);
console.log(
  `PASS: ${transitions} score transitions with every state/serve/timeout/undo snapshot, ${elo.length} Elo vectors and ${teams.length} team outcomes match SQL/TypeScript.`,
);
