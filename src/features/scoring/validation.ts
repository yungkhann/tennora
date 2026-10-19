import { z } from "zod";
const base = {
  command_id: z.uuid(),
  game: z.uuid(),
  expected_version: z.number().int().nonnegative().max(2147483647),
  note: z.string().trim().max(500).default(""),
  confirmed: z.boolean().default(false),
};
export const scoreCommandSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...base,
    kind: z.enum(["start", "point", "timeout"]),
    side: z.enum(["a", "b"]),
  }),
  z.strictObject({
    ...base,
    kind: z.enum(["undo_point", "undo_set", "resume_timeout"]),
    side: z.null(),
  }),
  z
    .strictObject({
      ...base,
      kind: z.literal("withdrawal"),
      side: z.enum(["a", "b"]).nullable(),
    })
    .superRefine((v, ctx) => {
      if (v.side !== null && !v.confirmed)
        ctx.addIssue({
          code: "custom",
          message: "Action confirmation required",
        });
    }),
]);
export type ScoreCommand = z.infer<typeof scoreCommandSchema>;
const side = z.enum(["a", "b"]);
const player = z.object({
  id: z.uuid(),
  name: z.string(),
  rating: z.number().nonnegative(),
});
const status = z.enum(["pending", "in_progress", "finished", "cancelled"]);
export const scoreSnapshotSchema = z.object({
  game_id: z.uuid(),
  match_id: z.uuid(),
  status,
  version: z.number().int(),
  match_version: z.number().int(),
  match_status: z.string(),
  can_score: z.boolean(),
  next_game_id: z.uuid().nullable(),
  table_number: z.number().nullable(),
  slot: z.number(),
  age_group: z.string(),
  timezone: z.string(),
  server_now: z.string(),
  players: z.object({ a: player, b: player }),
  teams: z.object({ a: z.string(), b: z.string() }),
  team_wins: z.object({ a: z.number(), b: z.number() }),
  score: z
    .object({ sets: z.array(z.object({ a: z.number(), b: z.number() })) })
    .nullable(),
  summary: z.object({
    set_number: z.number(),
    points_a: z.number(),
    points_b: z.number(),
    sets_a: z.number(),
    sets_b: z.number(),
    winner: side.nullable(),
    server: side.nullable(),
    ends_swapped: z.boolean(),
  }),
  availability: z.object({ a_active: z.boolean(), b_active: z.boolean() }),
  timeouts: z.object({ a: z.boolean(), b: z.boolean() }),
  timeout_until: z.string().nullable(),
  timeout_side: side.nullable(),
  last_point_side: side.nullable(),
  result: z
    .object({
      kind: z.string(),
      winner: side,
      sets_a: z.number(),
      sets_b: z.number(),
      points_a: z.number(),
      points_b: z.number(),
      k: z.number(),
    })
    .nullable(),
});
export type ScoreSnapshot = z.infer<typeof scoreSnapshotSchema>;
export const deskSchema = z.array(
  z.object({
    table_number: z.number(),
    venue_day: z.string(),
    assignment_id: z.uuid(),
    match: z
      .object({
        match_id: z.uuid(),
        status: z.string(),
        singles: z.array(z.object({ id: z.uuid(), slot: z.number(), status })),
        lineups: z.object({ revealed: z.boolean() }).passthrough(),
      })
      .nullable(),
  }),
);
export type JudgeDesk = z.infer<typeof deskSchema>;
