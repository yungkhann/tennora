import { expect, it } from "vitest";
import vectors from "../fixtures/scoring.json";
import {
  initialScore,
  scoreTransition,
  scoreSummary,
  setWinner,
  teamOutcome,
  type ScoreCommand,
  type ScoreState,
} from "../../src/domain/scoring";
it.each(vectors.cases)("$name", (v) => {
  let state = v.initial as ScoreState;
  for (const command of v.commands)
    state = scoreTransition(state, command as ScoreCommand);
  expect(scoreSummary(state)).toMatchObject(v.expected);
  if (v.name.includes("retains timeout")) expect(state.timeouts.a).toBe(true);
});
it("serve switches after two points and every point from 10:10", () => {
  let state = initialScore("a");
  expect(scoreSummary(state).server).toBe("a");
  state = scoreTransition(state, { kind: "point", side: "a" });
  expect(scoreSummary(state).server).toBe("a");
  state = scoreTransition(state, { kind: "point", side: "b" });
  expect(scoreSummary(state).server).toBe("b");
  state = { ...state, sets: [{ a: 10, b: 10 }] };
  expect(scoreSummary(state).server).toBe("a");
  state = scoreTransition(state, { kind: "point", side: "b" });
  expect(scoreSummary(state).server).toBe("b");
  state = scoreTransition(state, { kind: "point", side: "a" });
  expect(scoreSummary(state).server).toBe("a");
});
it("timeout is once per player and does not alter points or serve", () => {
  const first = scoreTransition(initialScore("b"), {
    kind: "timeout",
    side: "a",
  });
  expect(scoreSummary(first)).toEqual(scoreSummary(initialScore("b")));
  expect(() => scoreTransition(first, { kind: "timeout", side: "a" })).toThrow(
    "Timeout unavailable",
  );
  expect(
    scoreTransition(first, { kind: "timeout", side: "b" }).timeouts,
  ).toEqual({ a: true, b: true });
});
it("set undo resets a nonempty current set before touching previous results", () => {
  let state = initialScore("a");
  for (let i = 0; i < 11; i++)
    state = scoreTransition(state, { kind: "point", side: "a" });
  state = scoreTransition(state, { kind: "point", side: "b" });
  state = scoreTransition(state, { kind: "undo_set" });
  expect(state.sets).toEqual([
    { a: 11, b: 0 },
    { a: 0, b: 0 },
  ]);
  expect(scoreSummary(state).server).toBe("b");
});
it("invalid terminal scores and events after completion are rejected", () => {
  expect(() => setWinner({ a: 12, b: 0 })).toThrow();
  expect(() => setWinner({ a: -1, b: 0 })).toThrow();
  const finished: ScoreState = {
    ...initialScore("a"),
    sets: [
      { a: 11, b: 0 },
      { a: 11, b: 0 },
      { a: 11, b: 0 },
    ],
  };
  expect(() => scoreTransition(finished, { kind: "point", side: "b" })).toThrow(
    "Singles already finished",
  );
  expect(() =>
    scoreTransition(finished, { kind: "undo_point", side: "b" }),
  ).toThrow("Invalid undo point");
  expect(() =>
    scoreTransition(initialScore("a"), { kind: "undo_set" }),
  ).toThrow();
  expect(() =>
    scoreSummary({ ...initialScore("a"), sets: [{ a: 11, b: 0 }] }),
  ).toThrow("Next set required");
});
it("team match stops at three wins and has no sixth game", () => {
  expect(teamOutcome(["a", "b", "a", "a", null])).toEqual({
    a: 3,
    b: 1,
    winner: "a",
  });
  expect(teamOutcome(["a", "b", null, null, null]).winner).toBeNull();
  expect(() => teamOutcome(["a", "a", "a", "a"])).toThrow();
  expect(() => teamOutcome([null, null, null, null, null, null])).toThrow();
});

it.each(["a", "b"] as const)(
  "deciding-set ends change at %s's fifth point and reverse on undo",
  (side) => {
    const state: ScoreState = {
      ...initialScore("a"),
      sets: [
        { a: 11, b: 0 },
        { a: 0, b: 11 },
        { a: 11, b: 0 },
        { a: 0, b: 11 },
        { a: side === "a" ? 4 : 0, b: side === "b" ? 4 : 0 },
      ],
    };
    expect(scoreSummary(state).ends_swapped).toBe(false);
    const changed = scoreTransition(state, { kind: "point", side });
    expect(scoreSummary(changed).ends_swapped).toBe(true);
    expect(
      scoreSummary(scoreTransition(changed, { kind: "undo_point", side }))
        .ends_swapped,
    ).toBe(false);
    expect(
      scoreSummary(scoreTransition(changed, { kind: "undo_set" })).ends_swapped,
    ).toBe(false);
  },
);
