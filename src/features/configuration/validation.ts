import { z } from "zod";
import { buildStageTemplate } from "@/domain/stage-templates";
const requiredNumber = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.coerce.number().finite(),
);
const integer = (min: number, max: number) =>
  requiredNumber.pipe(z.number().int().min(min).max(max));
export const settingsSchema = z.object({
  id: z.uuid(),
  tourId: z.uuid(),
  revision: integer(0, 2147483646),
  k: requiredNumber.pipe(z.number().positive().max(Number.MAX_SAFE_INTEGER)),
  tables: integer(1, 128),
  rest: integer(0, 1440),
  finals: z.enum(["true", "false"]),
  timezone: z
    .string()
    .min(1)
    .max(100)
    .refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }),
});
export const templateSchema = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(2).max(100),
    kind: z.enum(["round_robin", "knockout", "composite"]),
    groupCount: integer(1, 32),
    groupSize: integer(2, 32),
    bracketCount: integer(1, 32),
    knockoutSize: integer(2, 1024),
  })
  .refine((v) => {
    try {
      buildStageTemplate(v);
      return true;
    } catch {
      return false;
    }
  });
export const stagePlanSchema = z.object({
  tourId: z.uuid(),
  template: z.uuid(),
  ages: z
    .array(z.enum(["U13", "U15", "U17"]))
    .min(1)
    .max(3)
    .refine((v) => new Set(v).size === v.length),
});
export const startSchema = z.object({
  seasonId: z.uuid(),
  confirm: z.literal("yes"),
});
