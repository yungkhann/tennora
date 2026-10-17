import { expect, it } from "vitest";
import {
  snakePosition,
  roundRobin,
  classificationGraph,
} from "../../src/domain/draws";
it("snakes 24 seeds evenly through A–D without duplicate group slots", () => {
  const positions = Array.from({ length: 24 }, (_, i) =>
    snakePosition(i + 1, 4),
  );
  expect(positions.slice(0, 8).map((v) => v.group)).toEqual([
    1, 2, 3, 4, 4, 3, 2, 1,
  ]);
  expect(new Set(positions.map((v) => `${v.group}:${v.slot}`)).size).toBe(24);
  for (let group = 1; group <= 4; group++)
    expect(
      positions.filter((v) => v.group === group).map((v) => v.slot),
    ).toEqual([1, 2, 3, 4, 5, 6]);
});
it.each([2, 3, 4, 5, 6, 7, 8, 32])(
  "round robin size %i has every pair once and no double booking per round",
  (size) => {
    const matches = roundRobin(size);
    expect(matches).toHaveLength((size * (size - 1)) / 2);
    expect(
      new Set(matches.map((m) => [m.a, m.b].sort((a, b) => a - b).join(":")))
        .size,
    ).toBe(matches.length);
    for (const round of new Set(matches.map((m) => m.round))) {
      const players = matches
        .filter((m) => m.round === round)
        .flatMap((m) => [m.a, m.b]);
      expect(new Set(players).size).toBe(players.length);
    }
  },
);
it("classification produces all eight places via acyclic winner/loser paths in three rounds", () => {
  const initial = [
    { group: 1, place: 1 },
    { group: 2, place: 2 },
    { group: 3, place: 1 },
    { group: 4, place: 2 },
    { group: 2, place: 1 },
    { group: 1, place: 2 },
    { group: 4, place: 1 },
    { group: 3, place: 2 },
  ];
  const graph = classificationGraph(initial);
  expect(graph).toHaveLength(12);
  expect(graph.filter((m) => m.round === 3).map((m) => [m.from, m.to])).toEqual(
    [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ],
  );
  const participants = new Map<number, { winner: string; loser: string }>(),
    places = new Map<number, string>();
  for (const m of graph) {
    const resolve = (s: typeof m.a): string =>
      "group" in s
        ? `${s.group}:${s.place}`
        : participants.get(s.match)![s.outcome];
    const a = resolve(m.a),
      b = resolve(m.b);
    expect(a).not.toBe(b);
    for (const s of [m.a, m.b])
      if ("match" in s) expect(s.match).toBeLessThan(m.number);
    participants.set(m.number, { winner: a, loser: b });
    if (m.to - m.from === 1) {
      places.set(m.from, a);
      places.set(m.to, b);
    }
  }
  expect(places.size).toBe(8);
  expect(new Set(places.values()).size).toBe(8);
});
it.each([0, 1, 3, 6])("rejects invalid classification entry count %i", (size) =>
  expect(() =>
    classificationGraph(
      Array.from({ length: size }, (_, i) => ({ group: i + 1, place: 1 })),
    ),
  ).toThrow(),
);
