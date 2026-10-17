import { expect, it } from "vitest";
import vectors from "../fixtures/scoring.json";
import { eloPair } from "../../src/domain/elo";
it.each(vectors.elo)(
  "Elo $a/$b K=$k winner=$winner automatic=$automatic",
  (v) =>
    expect(eloPair(v.a, v.b, v.winner as "a" | "b", v.k, v.automatic)).toEqual(
      v.expected,
    ),
);
it("uses the K supplied for each result rather than a later setting", () => {
  expect(eloPair(1000, 1000, "a", 16)).toEqual({ a: 1008, b: 992 });
  expect(eloPair(1000, 1000, "a", 64)).toEqual({ a: 1032, b: 968 });
});
it("rejects invalid rating precision and nonpositive/nonfinite K", () => {
  for (const k of [0, -1, Infinity, NaN])
    expect(() => eloPair(1000, 1000, "a", k)).toThrow();
  expect(() => eloPair(-1, 1000, "a", 32)).toThrow();
  expect(() => eloPair(1000.5, 1000, "a", 32)).toThrow();
});
