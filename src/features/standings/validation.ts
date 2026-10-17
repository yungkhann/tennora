import { z } from "zod";
export const standingCommand = z.object({
  group: z.uuid(),
  revision: z.coerce.number().int().positive().optional(),
});
export const standingData = z.object({
  unresolved: z.array(z.array(z.string())),
  rows: z.array(
    z.object({
      subteam_id: z.string(),
      rank: z.number().int(),
      place: z.number().int().nullable(),
      played: z.number().int(),
      wins: z.number().int(),
      losses: z.number().int(),
      games_for: z.number(),
      games_against: z.number(),
      sets_for: z.number(),
      sets_against: z.number(),
      points_for: z.number(),
      points_against: z.number(),
    }),
  ),
  evidence: z.array(
    z.object({
      members: z.array(z.string()),
      order: z.array(z.string()).optional(),
      criterion: z.enum([
        "wins",
        "games_ratio",
        "sets_ratio",
        "points_ratio",
        "lot",
        "unresolved",
      ]),
    }),
  ),
});
