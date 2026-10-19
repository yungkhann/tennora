import { z } from "zod";
export const hallActionSchema = z.object({
  id: z.uuid(),
  tour: z.uuid(),
  operation: z.enum(["allocate", "start_all"]),
  confirm: z.literal("yes"),
});
export const matchActionSchema = z.object({
  id: z.uuid(),
  match: z.uuid(),
  operation: z.enum(["assign", "release", "call", "start", "resume"]),
  version: z.coerce.number().int().nonnegative().max(2147483647),
  table: z.coerce.number().int().min(1).max(128).optional(),
  confirm: z.literal("yes"),
});
export const judgeActionSchema = z.object({
  id: z.uuid(),
  tour: z.uuid(),
  table: z.coerce.number().int().min(1).max(128),
  day: z.iso.date(),
  version: z.coerce.number().int().nonnegative().max(2147483647),
  operation: z.enum(["assign", "release", "takeover"]),
  staff: z.preprocess((v) => (v === "" ? undefined : v), z.uuid().optional()),
  confirm: z.literal("yes"),
});
export const hallSnapshotSchema = z.object({
  tour_id: z.uuid(),
  name: z.string(),
  venue_day: z.string(),
  event_day: z.boolean(),
  timezone: z.string(),
  rest_minutes: z.number(),
  server_now: z.string(),
  tables: z.array(
    z.object({
      number: z.number(),
      match_id: z.uuid().nullable(),
      owner: z.uuid().nullable(),
      owner_name: z.string().nullable(),
      assignment_version: z.number(),
    }),
  ),
  judges: z.array(z.object({ id: z.uuid(), name: z.string() })),
  matches: z.array(
    z.object({
      id: z.uuid(),
      version: z.number(),
      status: z.enum(["scheduled", "called", "in_progress", "finished"]),
      started: z.boolean(),
      age_group: z.string(),
      round: z.number(),
      number: z.number(),
      final: z.boolean().nullable(),
      team_a: z.string().nullable(),
      team_b: z.string().nullable(),
      table: z.number().nullable(),
      sources_ready: z.boolean(),
      a_submitted: z.boolean(),
      b_submitted: z.boolean(),
      revealed: z.boolean(),
      rest_until: z.string().nullable(),
      blocked: z.string().nullable(),
      completed_at: z.string().nullable(),
    }),
  ),
});
export type HallSnapshot = z.infer<typeof hallSnapshotSchema>;
