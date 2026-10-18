export type Side = "a" | "b";
export type SetScore = { a: number; b: number };
export type ScoreState = {
  initial_server: Side;
  sets: SetScore[];
  timeouts: { a: boolean; b: boolean };
};
export type ScoreCommand =
  | { kind: "point" | "undo_point" | "timeout"; side: Side }
  | { kind: "undo_set" };
const opposite = (side: Side): Side => (side === "a" ? "b" : "a");
export function setWinner(score: SetScore): Side | null {
  if (
    ![score.a, score.b].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    !Number.isSafeInteger(score.a + score.b)
  )
    throw new Error("Invalid set score");
  const high = Math.max(score.a, score.b),
    diff = Math.abs(score.a - score.b);
  if (high < 11 || diff < 2) return null;
  if (high !== 11 && diff !== 2) throw new Error("Invalid terminal set score");
  return score.a > score.b ? "a" : "b";
}
export function initialScore(first: Side): ScoreState {
  if (first !== "a" && first !== "b") throw new Error("Invalid initial server");
  return {
    initial_server: first,
    sets: [{ a: 0, b: 0 }],
    timeouts: { a: false, b: false },
  };
}
export function scoreSummary(state: ScoreState) {
  if (
    !state ||
    !["a", "b"].includes(state.initial_server) ||
    !Array.isArray(state.sets) ||
    state.sets.length < 1 ||
    state.sets.length > 5 ||
    typeof state.timeouts?.a !== "boolean" ||
    typeof state.timeouts?.b !== "boolean"
  )
    throw new Error("Invalid scoring state");
  const wins: SetScore = { a: 0, b: 0 };
  for (const [index, set] of state.sets.entries()) {
    const winner = setWinner(set);
    if (winner) wins[winner]++;
    if (
      index < state.sets.length - 1 &&
      (!winner || wins.a === 3 || wins.b === 3)
    )
      throw new Error("Invalid scoring state");
  }
  const current = state.sets.at(-1)!,
    winner: Side | null = wins.a === 3 ? "a" : wins.b === 3 ? "b" : null;
  if (!winner && setWinner(current)) throw new Error("Next set required");
  const first =
    state.sets.length % 2
      ? state.initial_server
      : opposite(state.initial_server);
  const total = current.a + current.b;
  const changes = total < 20 ? Math.floor(total / 2) : total - 20;
  return {
    set_number: state.sets.length,
    points_a: current.a,
    points_b: current.b,
    sets_a: wins.a,
    sets_b: wins.b,
    winner,
    server: winner ? null : changes % 2 ? opposite(first) : first,
    ends_swapped:
      ((state.sets.length - 1) % 2 === 1) !==
      (state.sets.length === 5 && Math.max(current.a, current.b) >= 5),
  };
}
/** The authoritative RPC must derive undo side from its last active point log. */
export function scoreTransition(
  state: ScoreState,
  command: ScoreCommand,
): ScoreState {
  const summary = scoreSummary(state),
    next: ScoreState = structuredClone(state);
  if (
    !["point", "undo_point", "undo_set", "timeout"].includes(command.kind) ||
    (command.kind !== "undo_set" &&
      command.side !== "a" &&
      command.side !== "b")
  )
    throw new Error("Invalid score command");
  let set = next.sets.at(-1)!;
  if (command.kind === "timeout") {
    if (summary.winner || next.timeouts[command.side])
      throw new Error("Timeout unavailable");
    next.timeouts[command.side] = true;
  } else if (command.kind === "point") {
    if (summary.winner) throw new Error("Singles already finished");
    set[command.side]++;
    const won = setWinner(set);
    if (won && (won === "a" ? summary.sets_a : summary.sets_b) + 1 < 3)
      next.sets.push({ a: 0, b: 0 });
  } else {
    if (set.a === 0 && set.b === 0 && next.sets.length > 1) {
      next.sets.pop();
      set = next.sets.at(-1)!;
    }
    if (command.kind === "undo_set") {
      if (set.a + set.b === 0) throw new Error("No set to undo");
      set.a = 0;
      set.b = 0;
    } else {
      const won = setWinner(set);
      if (!set[command.side] || (won && won !== command.side))
        throw new Error("Invalid undo point");
      set[command.side]--;
    }
  }
  scoreSummary(next);
  return next;
}
export function teamOutcome(games: (Side | null)[]) {
  if (
    games.length > 5 ||
    games.some((s) => s !== null && s !== "a" && s !== "b")
  )
    throw new Error("Invalid team results");
  const a = games.filter((s) => s === "a").length,
    b = games.filter((s) => s === "b").length;
  if (a > 3 || b > 3) throw new Error("Invalid team results");
  return {
    a,
    b,
    winner: a === 3 ? ("a" as const) : b === 3 ? ("b" as const) : null,
  };
}
