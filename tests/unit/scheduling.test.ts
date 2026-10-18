import { describe, it, expect } from "vitest";
import { readyQueue, type QueueMatch } from "../../src/domain/scheduling";
const match = (id: string, extra: Partial<QueueMatch> = {}): QueueMatch => ({
  id,
  status: "scheduled",
  table: null,
  sources_ready: true,
  revealed: true,
  rest_until: null,
  round: 1,
  number: 1,
  final: false,
  ...extra,
});
describe("hall ready queue", () => {
  it("prioritizes ready finals while a resting final remains unavailable", () => {
    expect(
      readyQueue(
        [
          match("group"),
          match("resting", { final: true, rest_until: "2026-10-18T09:01:00Z" }),
          match("final", { final: true }),
        ],
        Date.parse("2026-10-18T09:00:00Z"),
      ).map((m) => m.id),
    ).toEqual(["final", "group"]);
  });
  it("honors the exact rest boundary and excludes allocated, unrevealed and unfinished sources", () => {
    expect(
      readyQueue(
        [
          match("ready", { rest_until: "2026-10-18T09:00:00Z" }),
          match("leased", { table: 1 }),
          match("hidden", { revealed: false }),
          match("pending", { sources_ready: false }),
          match("live", { status: "in_progress" }),
        ],
        Date.parse("2026-10-18T09:00:00Z"),
      ).map((m) => m.id),
    ).toEqual(["ready"]);
  });
  it("uses a deterministic queue and supports disabled finals priority without mutating input", () => {
    const source = [match("b", { round: 2, final: true }), match("a")];
    expect(readyQueue(source, 0, false).map((m) => m.id)).toEqual(["a", "b"]);
    expect(source[0].id).toBe("b");
  });
});
