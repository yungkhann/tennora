export type TeamResult = {
  a: string;
  b: string;
  winner: string;
  gamesA: number;
  gamesB: number;
  setsA: number;
  setsB: number;
  pointsA: number;
  pointsB: number;
};
export type StandingMetric = {
  played: number;
  wins: number;
  losses: number;
  games_for: number;
  games_against: number;
  sets_for: number;
  sets_against: number;
  points_for: number;
  points_against: number;
};
export type TieEvidence = {
  members: string[];
  criterion: string;
  buckets?: string[][];
  order?: string[];
};
const lexical = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function compareRatio(a: number, b: number, c: number, d: number) {
  if (!b && a) return !d && c ? 0 : 1;
  if (!d && c) return -1;
  const left = BigInt(b ? a : 1) * BigInt(d || 1),
    right = BigInt(d ? c : 1) * BigInt(b || 1);
  return left < right ? -1 : left > right ? 1 : 0;
}
function metrics(members: string[], results: TeamResult[]) {
  const values: Record<string, StandingMetric> = Object.fromEntries(
    members.map((id) => [
      id,
      {
        played: 0,
        wins: 0,
        losses: 0,
        games_for: 0,
        games_against: 0,
        sets_for: 0,
        sets_against: 0,
        points_for: 0,
        points_against: 0,
      },
    ]),
  );
  for (const r of results) {
    if (!values[r.a] || !values[r.b]) continue;
    for (const [id, side] of [
      [r.a, "a"],
      [r.b, "b"],
    ] as const) {
      const v = values[id],
        a = side === "a";
      v.played++;
      v.wins += Number(r.winner === id);
      v.losses += Number(r.winner !== id);
      v.games_for += a ? r.gamesA : r.gamesB;
      v.games_against += a ? r.gamesB : r.gamesA;
      v.sets_for += a ? r.setsA : r.setsB;
      v.sets_against += a ? r.setsB : r.setsA;
      v.points_for += a ? r.pointsA : r.pointsB;
      v.points_against += a ? r.pointsB : r.pointsA;
    }
  }
  return values;
}
export function rankGroup(
  teams: string[],
  results: TeamResult[],
  lots: Record<string, string> = {},
) {
  if (new Set(teams).size !== teams.length || teams.length > 32)
    throw new Error("Invalid standings members");
  const all = metrics(teams, results),
    unresolved: string[][] = [],
    evidence: TieEvidence[] = [];
  function partition(ids: string[], compare: (a: string, b: string) => number) {
    const ordered = [...ids].sort((a, b) => -compare(a, b) || lexical(a, b)),
      buckets: string[][] = [];
    for (const id of ordered) {
      const last = buckets.at(-1);
      if (last && compare(last[0], id) === 0) last.push(id);
      else buckets.push([id]);
    }
    return buckets;
  }
  function resolve(ids: string[]): string[] {
    if (ids.length < 2) return ids;
    const mini = metrics(ids, results),
      criteria = ["wins", "games_ratio", "sets_ratio", "points_ratio"];
    for (const key of criteria) {
      const compare = (a: string, b: string) => {
        const x = mini[a],
          y = mini[b];
        if (key === "wins") return Math.sign(x.wins - y.wins);
        const area =
          key === "games_ratio"
            ? "games"
            : key === "sets_ratio"
              ? "sets"
              : "points";
        return compareRatio(
          x[`${area}_for`],
          x[`${area}_against`],
          y[`${area}_for`],
          y[`${area}_against`],
        );
      };
      const buckets = partition(ids, compare);
      if (buckets.length > 1) {
        evidence.push({
          members: [...ids].sort(lexical),
          criterion: key,
          buckets,
        });
        return buckets.flatMap(resolve);
      }
    }
    if (
      ids.every((id) => lots[id]) &&
      new Set(ids.map((id) => lots[id])).size === ids.length
    ) {
      const order = [...ids].sort((a, b) => lexical(lots[a], lots[b]));
      evidence.push({
        members: [...ids].sort(lexical),
        criterion: "lot",
        order,
      });
      return order;
    }
    const tied = [...ids].sort(lexical);
    unresolved.push(tied);
    evidence.push({ members: tied, criterion: "unresolved" });
    return tied;
  }
  const top = partition(teams, (a, b) => Math.sign(all[a].wins - all[b].wins)),
    order = top.flatMap(resolve);
  const rows = order.map((id, index) => {
    const tie = unresolved.find((ids) => ids.includes(id));
    return {
      subteam_id: id,
      rank: tie ? Math.min(...tie.map((v) => order.indexOf(v))) + 1 : index + 1,
      place: tie ? null : index + 1,
      ...all[id],
    };
  });
  return { order, unresolved, rows, evidence };
}
