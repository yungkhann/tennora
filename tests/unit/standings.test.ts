import { expect, it } from "vitest";
import fixtures from "../fixtures/standings.json";
import { rankGroup, compareRatio } from "../../src/domain/standings";
it.each(fixtures.cases)("$name", (fixture) => {
  const result = rankGroup(fixture.teams, fixture.results, fixture.lots);
  expect(result.order).toEqual(fixture.order);
  expect(result.unresolved).toEqual(fixture.unresolved);
  expect(result.rows.reduce((n, r) => n + r.wins, 0)).toBe(
    fixture.results.length,
  );
  for (const row of result.rows) expect(row.wins + row.losses).toBe(row.played);
});
it("compares exact ratios and neutral empty ratios without division", () => {
  expect(compareRatio(3, 0, 2, 0)).toBe(0);
  expect(compareRatio(1, 0, 100, 1)).toBe(1);
  expect(compareRatio(0, 0, 1, 1)).toBe(0);
  expect(compareRatio(999999999, 1000000000, 1000000000, 1000000001)).toBe(-1);
});
it("duplicate lots cannot manufacture a resolved order", () => {
  const f = fixtures.cases[1],
    result = rankGroup(f.teams, f.results, { a: "same", b: "same", c: "same" });
  expect(result.unresolved).toEqual([["a", "b", "c"]]);
});
