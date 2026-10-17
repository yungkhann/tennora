import { z } from "zod";
const date = z.iso.date();
const name = z.string().trim().min(2).max(100);
export const seasonSchema = z
  .object({
    id: z.uuid(),
    name,
    year: z.coerce.number().int().min(1900).max(2200),
    startsOn: date,
    endsOn: date,
  })
  .refine((v) => v.startsOn <= v.endsOn, {
    message: "Invalid dates",
    path: ["endsOn"],
  });
export const tourSchema = z
  .object({
    id: z.uuid(),
    seasonId: z.uuid(),
    name,
    ordinal: z.coerce.number().int().min(1).max(100),
    startsOn: date,
    endsOn: date,
  })
  .refine((v) => v.startsOn <= v.endsOn, {
    message: "Invalid dates",
    path: ["endsOn"],
  });
