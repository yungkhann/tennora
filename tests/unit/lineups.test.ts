import { it, expect } from "vitest";
import { lineupGender, distinctLineup } from "../../src/domain/lineups";
it("requires boy/girl/boy/girl/boy in the five slots", () =>
  expect([1, 2, 3, 4, 5].map(lineupGender)).toEqual([
    "boy",
    "girl",
    "boy",
    "girl",
    "boy",
  ]));
it.each([0, 6, 1.5])("rejects invalid slot %i", (slot) =>
  expect(() => lineupGender(slot)).toThrow(),
);
it("requires all five distinct identities", () => {
  expect(distinctLineup(["a", "b", "c", "d", "e"])).toBe(true);
  for (const ids of [
    ["a", "b", "c", "d"],
    ["a", "b", "a", "d", "e"],
    ["a", "b", "c", "d", ""],
  ])
    expect(distinctLineup(ids)).toBe(false);
});
