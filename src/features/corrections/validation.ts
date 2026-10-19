import { z } from "zod";
import { scoreSummary } from "@/domain/scoring";
export const correctionScore = z.object({
  initial_server: z.enum(["a", "b"]),
  sets: z
    .array(
      z.object({
        a: z.number().int().nonnegative().max(9007199254740991),
        b: z.number().int().nonnegative().max(9007199254740991),
      }),
    )
    .min(1)
    .max(5),
  timeouts: z.object({ a: z.boolean(), b: z.boolean() }),
});
export const proposalSchema = z
  .object({
    id: z.uuid(),
    match: z.uuid(),
    game: z.uuid(),
    base: z.uuid(),
    kind: z.enum(["played", "withdrawal"]),
    winner: z.enum(["a", "b"]),
    score: correctionScore,
    confirm: z.literal("yes"),
  })
  .superRefine((v, ctx) => {
    if (v.kind !== "played") return;
    try {
      if (scoreSummary(v.score).winner !== v.winner) throw new Error();
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Valid terminal score required",
      });
    }
  });
export const applySchema = z.object({
  id: z.uuid(),
  request: z.uuid(),
  digest: z.string().regex(/^[a-f0-9]{32}$/),
  confirm: z.literal("yes"),
});
export const teamProposalSchema = z
  .object({
    id: z.uuid(),
    match: z.uuid(),
    base: z.uuid(),
    kind: z.enum(["team_forfeit", "reopen"]),
    winner: z.enum(["a", "b"]).nullable(),
    confirm: z.literal("yes"),
  })
  .superRefine((v, ctx) => {
    if ((v.kind === "reopen") !== (v.winner === null))
      ctx.addIssue({
        code: "custom",
        message: "Valid forfeit correction required",
      });
  });
export const reviewSchema = z.object({
  id: z.uuid(),
  game_id: z.uuid().nullable(),
  current_match_id: z.uuid().optional(),
  kind: z.string(),
  winner: z.string().nullable(),
  reason: z.string(),
  score: z.object({
    sets: z.array(z.object({ a: z.number(), b: z.number() })),
  }),
  status: z.string(),
  original: z.object({
    player_a_name: z.string(),
    player_b_name: z.string(),
    k: z.number().nullable(),
  }),
  plan: z.object({
    stale: z.boolean(),
    digest: z.string().optional(),
    match_id: z.uuid(),
    team_complete: z.boolean().optional(),
    games_a: z.number().optional(),
    games_b: z.number().optional(),
    requires_organizer: z.boolean().optional(),
    trailing_games: z
      .array(z.object({ id: z.uuid(), slot: z.number() }))
      .optional(),
    affected_matches: z
      .array(
        z.object({ id: z.uuid(), status: z.string(), started: z.boolean() }),
      )
      .optional(),
  }),
});
