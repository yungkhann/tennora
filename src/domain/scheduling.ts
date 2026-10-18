export type QueueMatch = {
  id: string;
  status: string;
  table: number | null;
  sources_ready: boolean;
  revealed: boolean;
  rest_until: string | null;
  round: number;
  number: number;
  final: boolean | null;
};
export function readyQueue<T extends QueueMatch>(
  matches: readonly T[],
  now: number,
  finalsPriority = true,
): T[] {
  return matches
    .filter(
      (m) =>
        ["scheduled", "called"].includes(m.status) &&
        m.table === null &&
        m.sources_ready &&
        m.revealed &&
        (!m.rest_until || Date.parse(m.rest_until) <= now),
    )
    .sort(
      (a, b) =>
        (finalsPriority
          ? Number(Boolean(b.final)) - Number(Boolean(a.final))
          : 0) ||
        a.round - b.round ||
        a.number - b.number ||
        a.id.localeCompare(b.id),
    );
}
