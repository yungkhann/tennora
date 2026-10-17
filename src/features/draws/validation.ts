import { z } from "zod";
export const drawSchema = z.object({
  id: z.uuid(),
  tourId: z.uuid(),
  age: z.enum(["U13", "U15", "U17"]),
  revision: z.coerce.number().int().nonnegative(),
  confirm: z.literal("yes"),
});
export const publishSchema = z.object({
  id: z.uuid(),
  revision: z.coerce.number().int().positive(),
  confirm: z.literal("yes"),
});
