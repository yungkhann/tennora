import { z } from "zod";
const name = z.string().trim().min(1).max(80);
export const playerSchema = z.object({
  id: z.uuid(),
  club: z.uuid(),
  firstName: name,
  lastName: name,
  gender: z.enum(["boy", "girl"]),
  dob: z.iso.date(),
  hand: z.enum(["left", "right"]),
  style: z.string().trim().min(1).max(100),
  sportsLevel: z.string().trim().min(1).max(100),
  externalId: z
    .string()
    .trim()
    .max(100)
    .transform((v) => v || null),
});
export const rosterSchema = z.object({
  seasonId: z.uuid(),
  subteam: z.uuid(),
  player: z.uuid(),
});
export const endRosterSchema = z.object({
  membership: z.uuid(),
  reason: z.string().trim().min(1).max(500),
});
export const dropSchema = z.object({
  player: z.uuid(),
  date: z.iso.date(),
  reason: z.string().trim().min(1).max(500),
});
export const transferSchema = z.object({
  player: z.uuid(),
  club: z.uuid(),
  reason: z.string().trim().min(1).max(500),
});
export const trainerRefSchema = z
  .object({
    player: z.uuid(),
    kind: z.enum(["first", "personal"]),
    trainer: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
    firstName: z
      .string()
      .trim()
      .max(80)
      .transform((v) => v || null),
    lastName: z
      .string()
      .trim()
      .max(80)
      .transform((v) => v || null),
  })
  .refine((v) =>
    v.trainer ? !v.firstName && !v.lastName : !!v.firstName && !!v.lastName,
  );
