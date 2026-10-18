import { z } from "zod";
const team = z.object({ id: z.uuid().nullable(), name: z.string().nullable() });
const summary = z.object({
  points_a: z.number(),
  points_b: z.number(),
  sets_a: z.number(),
  sets_b: z.number(),
  server: z.enum(["a", "b"]).nullable(),
  ends_swapped: z.boolean(),
});
export const publicMatchSchema = z.object({
  id: z.uuid(),
  tour_id: z.uuid(),
  season_id: z.uuid(),
  draw_id: z.uuid(),
  group_id: z.uuid(),
  age_group: z.string(),
  round: z.number(),
  number: z.number(),
  placement_from: z.number().nullable(),
  placement_to: z.number().nullable(),
  status: z.enum([
    "scheduled",
    "called",
    "in_progress",
    "finished",
    "cancelled",
  ]),
  a: team,
  b: team,
  table: z.number().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  revealed: z.boolean(),
  singles: z.array(
    z.object({
      id: z.uuid(),
      slot: z.number(),
      status: z.enum(["pending", "in_progress", "finished", "cancelled"]),
      a: z.object({ id: z.uuid(), name: z.string().nullable() }),
      b: z.object({ id: z.uuid(), name: z.string().nullable() }),
      sets: z.array(z.object({ a: z.number(), b: z.number() })),
      summary: summary.nullable(),
      winner: z.enum(["a", "b"]).nullable(),
      kind: z.string().nullable(),
      timeout_until: z.string().nullable(),
    }),
  ),
  result: z
    .object({
      winner: z.uuid(),
      kind: z.string(),
      games_a: z.number(),
      games_b: z.number(),
      sets_a: z.number(),
      sets_b: z.number(),
      points_a: z.number(),
      points_b: z.number(),
    })
    .nullable(),
});
export const publicRowSchema = z.object({
  match_id: z.uuid(),
  tour_id: z.uuid(),
  version: z.number().int().positive(),
  data: publicMatchSchema,
  updated_at: z.string(),
});
export type PublicRow = z.infer<typeof publicRowSchema>;
export type PublicMatch = z.infer<typeof publicMatchSchema>;
export const directorySchema = z.object({
  seasons: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      year: z.number(),
      starts_on: z.string(),
      ends_on: z.string(),
    }),
  ),
  tours: z.array(
    z.object({
      id: z.uuid(),
      season_id: z.uuid(),
      name: z.string(),
      ordinal: z.number(),
      starts_on: z.string(),
      ends_on: z.string(),
      weight: z.number(),
    }),
  ),
  draws: z.array(
    z.object({
      id: z.uuid(),
      tour_id: z.uuid(),
      age_group: z.string(),
      groups: z.array(
        z.object({
          id: z.uuid(),
          name: z.string(),
          kind: z.string(),
          size: z.number(),
          ordinal: z.number(),
          stage: z.number(),
          entries: z.array(
            z.object({
              subteam_id: z.uuid(),
              team_name: z.string(),
              seed: z.number(),
              rating: z.number(),
            }),
          ),
          standings: z
            .object({
              rows: z.array(
                z.object({
                  subteam_id: z.uuid(),
                  rank: z.number(),
                  place: z.number().nullable(),
                  played: z.number(),
                  wins: z.number(),
                  losses: z.number(),
                  games_for: z.number(),
                  games_against: z.number(),
                  sets_for: z.number(),
                  sets_against: z.number(),
                  points_for: z.number(),
                  points_against: z.number(),
                }),
              ),
              complete: z.boolean(),
              order: z.array(z.uuid()),
              unresolved: z.array(z.array(z.uuid())),
            })
            .nullable(),
        }),
      ),
    }),
  ),
});
export type PublicDirectory = z.infer<typeof directorySchema>;
export const publicPlayerSchema = z.object({
  id: z.uuid(),
  first_name: z.string(),
  last_name: z.string(),
  rating: z.number(),
  team_id: z.uuid(),
  team_name: z.string(),
  age_group: z.string(),
  has_photo: z.boolean(),
});
export type PublicPlayer = z.infer<typeof publicPlayerSchema>;
export const historySchema = z.array(
  z.object({
    game_id: z.uuid(),
    match_id: z.uuid(),
    tour_id: z.uuid(),
    tour_name: z.string(),
    ended_at: z.string(),
    winner: z.string(),
    side: z.string(),
    opponent_name: z.string(),
    opponent_rating: z.number().nullable(),
    sets: z.array(z.object({ a: z.number(), b: z.number() })),
    kind: z.string(),
    before: z.number().nullable(),
    after: z.number().nullable(),
    k: z.number().nullable(),
  }),
);
export const seasonStandingSchema = z.array(
  z.object({
    subteam_id: z.uuid(),
    team_name: z.string(),
    age_group: z.string(),
    score: z.number(),
    rank: z.number(),
    head_to_head_wins: z.number(),
    unresolved: z.boolean(),
    provisional: z.boolean(),
    tours: z.array(
      z.object({
        tour_id: z.uuid(),
        place: z.number().nullable(),
        weight: z.number(),
        missed: z.boolean().nullable(),
        final: z.boolean(),
      }),
    ),
  }),
);
