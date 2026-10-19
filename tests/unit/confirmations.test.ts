import { expect, it } from "vitest";
import {
  endRosterSchema,
  dropSchema,
  transferSchema,
} from "@/features/players/validation";
import { replacementSchema } from "@/features/lineups/validation";
import { swapSchema } from "@/features/draws/validation";
import {
  hallActionSchema,
  matchActionSchema,
  judgeActionSchema,
} from "@/features/hall/validation";
import { photoReviewSchema } from "@/features/photos/validation";
import {
  proposalSchema,
  teamProposalSchema,
  applySchema,
} from "@/features/corrections/validation";
const id = "11111111-1111-4111-8111-111111111111";
const cases = [
  ["roster exit", endRosterSchema, { membership: id }],
  ["dropout", dropSchema, { player: id, date: "2026-10-19" }],
  ["transfer", transferSchema, { player: id, club: id }],
  [
    "replacement",
    replacementSchema,
    { id, match: id, subteam: id, slot: 1, player: id, revision: 2 },
  ],
  [
    "seed swap",
    swapSchema,
    { id, source: id, revision: 1, seedA: 1, seedB: 2 },
  ],
  ["bulk hall", hallActionSchema, { id, tour: id, operation: "allocate" }],
  [
    "match",
    matchActionSchema,
    { id, match: id, operation: "start", version: 0 },
  ],
  [
    "judge",
    judgeActionSchema,
    {
      id,
      tour: id,
      table: 1,
      day: "2026-10-19",
      version: 0,
      operation: "takeover",
    },
  ],
  ["photo review", photoReviewSchema, { asset: id, decision: "approve" }],
  [
    "singles proposal",
    proposalSchema,
    {
      id,
      match: id,
      game: id,
      base: id,
      kind: "played",
      winner: "a",
      score: {
        initial_server: "a",
        sets: Array.from({ length: 3 }, () => ({ a: 11, b: 0 })),
        timeouts: { a: false, b: false },
      },
    },
  ],
  [
    "team proposal",
    teamProposalSchema,
    { id, match: id, base: id, kind: "reopen", winner: null },
  ],
  [
    "correction application",
    applySchema,
    { id, request: id, digest: "a".repeat(32) },
  ],
] as const;
it.each(cases)(
  "%s requires explicit confirmation and no reason",
  (_name, schema, fields) => {
    for (const confirm of [undefined, false, "on", "no"])
      expect(schema.safeParse({ ...fields, confirm }).success).toBe(false);
    const result = schema.safeParse({
      ...fields,
      confirm: "yes",
      reason: "discarded legacy input",
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("reason");
  },
);
