import { z } from "zod";
import { distinctLineup } from "@/domain/lineups";
export const lineupSchema = z.object({
  id: z.uuid(),
  match: z.uuid(),
  subteam: z.uuid(),
  players: z.array(z.uuid()).refine(distinctLineup),
  confirm: z.literal("yes"),
});
export const replacementSchema = z.object({
  id: z.uuid(),
  match: z.uuid(),
  subteam: z.uuid(),
  slot: z.coerce.number().int().min(1).max(5),
  player: z.uuid(),
  reason: z.string().trim().min(1).max(500),
  revision: z.coerce.number().int().nonnegative(),
});
