import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { rankGroup } from "../src/domain/standings.ts";
const fixtures = JSON.parse(
  readFileSync(new URL("../tests/fixtures/standings.json", import.meta.url)),
);
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
for (const fixture of fixtures.cases) {
  const query = `select private.rank_group(array[${fixture.teams.map(quote).join(",")} ]::text[],${quote(JSON.stringify(fixture.results))}::jsonb,${quote(JSON.stringify(fixture.lots ?? {}))}::jsonb);`;
  const actual = JSON.parse(
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
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  );
  assert.deepEqual(
    actual,
    rankGroup(fixture.teams, fixture.results, fixture.lots),
    fixture.name,
  );
}
console.log(
  `${fixtures.cases.length} shared SQL/TypeScript standings fixtures match exactly.`,
);
