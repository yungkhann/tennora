import { z } from "zod";
import { registrationSchema, passwordSchema } from "@/lib/validation";
import { staffRoles } from "./permissions";
export const rolesSchema = z
  .array(z.enum(staffRoles))
  .min(1)
  .max(4)
  .refine((v) => new Set(v).size === v.length);
export const provisionSchema = registrationSchema.extend({
  jobId: z.uuid(),
  roles: rolesSchema,
});
export const staffChangeSchema = z.object({
  target: z.uuid(),
  roles: rolesSchema,
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
});
export const staffResetSchema = passwordSchema.extend({
  jobId: z.uuid(),
  target: z.uuid(),
});
