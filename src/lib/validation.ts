import { z } from "zod";
const email = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .toLowerCase()
  .max(254);
const password = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use at most 128 characters.");
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128),
});
export const registrationSchema = z.object({
  email,
  password,
  displayName: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters for your name.")
    .max(80),
});
export const recoverySchema = z.object({ email });
export const passwordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });
export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters for your name.")
    .max(80),
});
export const organizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters for the organization name.")
    .max(80),
  slug: z
    .string()
    .min(3, "Use at least 3 characters for the address.")
    .max(48)
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and single hyphens.",
    ),
});
export const uuidSchema = z.uuid();
export type FormState = {
  status: "idle" | "error" | "success";
  message: string;
};
export const initialFormState: FormState = { status: "idle", message: "" };
export function invalidInput(error: z.ZodError): FormState {
  return {
    status: "error",
    message: error.issues[0]?.message ?? "Check your details and try again.",
  };
}
