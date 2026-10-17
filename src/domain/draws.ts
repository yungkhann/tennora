export function snakePosition(seed: number, groupCount: number) {
  if (
    !Number.isInteger(seed) ||
    seed < 1 ||
    !Number.isInteger(groupCount) ||
    groupCount < 1
  )
    throw new Error("Invalid seed");
  const tier = Math.floor((seed - 1) / groupCount),
    offset = (seed - 1) % groupCount;
  return {
    group: tier % 2 === 0 ? offset + 1 : groupCount - offset,
    slot: tier + 1,
  };
}
export function roundRobin(size: number) {
  if (!Number.isInteger(size) || size < 2 || size > 32)
    throw new Error("Invalid group size");
  const positions = Array.from({ length: size }, (_, i) => i + 1);
  if (size % 2) positions.push(0);
  const fixtures: { round: number; a: number; b: number }[] = [];
  for (let round = 1; round < positions.length; round++) {
    for (let i = 0; i < positions.length / 2; i++) {
      const a = positions[i],
        b = positions[positions.length - 1 - i];
      if (a && b) fixtures.push({ round, a, b });
    }
    positions.splice(1, 0, positions.pop()!);
  }
  return fixtures;
}
export type DrawSource =
  | { seed: number }
  | { group: number; place: number }
  | { match: number; outcome: "winner" | "loser" };
export type ClassificationMatch = {
  number: number;
  round: number;
  from: number;
  to: number;
  a: DrawSource;
  b: DrawSource;
};
export function classificationGraph(sources: DrawSource[]) {
  const size = sources.length;
  if (size < 2 || size > 1024 || (size & (size - 1)) !== 0)
    throw new Error("Invalid bracket size");
  const matches: ClassificationMatch[] = [];
  function expand(
    entries: DrawSource[],
    round: number,
    from: number,
    to: number,
  ) {
    const winners: DrawSource[] = [],
      losers: DrawSource[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      const number = matches.length + 1;
      matches.push({
        number,
        round,
        from,
        to,
        a: entries[i],
        b: entries[i + 1],
      });
      winners.push({ match: number, outcome: "winner" });
      losers.push({ match: number, outcome: "loser" });
    }
    if (entries.length > 2) {
      const middle = Math.floor((from + to) / 2);
      expand(winners, round + 1, from, middle);
      expand(losers, round + 1, middle + 1, to);
    }
  }
  expand(sources, 1, 1, size);
  return matches;
}

export function balancedSeedOrder(size: number): number[] {
  if (
    !Number.isInteger(size) ||
    size < 2 ||
    size > 32 ||
    (size & (size - 1)) !== 0
  )
    throw new Error("Unsupported seeded knockout size");
  let order = [1, 2];
  for (let capacity = 4; capacity <= size; capacity *= 2)
    order = order.flatMap((seed) => [seed, capacity + 1 - seed]);
  return order;
}
