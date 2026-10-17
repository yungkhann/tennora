import { z } from "zod";
export const teamSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(100),
  region: z.string().trim().min(1).max(100),
});
export const registrationSchema = z.object({
  club: z.uuid(),
  seasonId: z.uuid(),
});
export const trainerAssignmentSchema = z.object({
  club: z.uuid(),
  trainer: z.uuid(),
  subteams: z
    .array(z.uuid())
    .min(1)
    .max(3)
    .refine((v) => new Set(v).size === v.length),
});
