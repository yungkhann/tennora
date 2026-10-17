import { z } from "zod";
export const photoUploadSchema = z.object({
  id: z.uuid(),
  player: z.uuid(),
  permission: z.literal("on"),
});
export const photoReviewSchema = z.object({
  asset: z.uuid(),
  decision: z.enum(["approve", "reject", "revoke"]),
  reason: z.string().trim().min(1).max(500),
});
