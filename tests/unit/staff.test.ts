import { describe, expect, it } from "vitest";
import {
  provisionSchema,
  rolesSchema,
  staffChangeSchema,
  staffResetSchema,
} from "@/features/staff/validation";
import { canManageStaff } from "@/features/staff/permissions";
import { localeOf, messages } from "@/lib/locales";
describe("staff boundary", () => {
  it("accepts multiple staff roles without granting organizer", () => {
    const data = provisionSchema.parse({
      jobId: "11111111-1111-4111-8111-111111111111",
      email: " Trainer@Example.com ",
      displayName: " Coach ",
      password: "long-initial-password",
      roles: ["trainer", "line_judge"],
      active: true,
      actorId: "forged",
    });
    expect(data.email).toBe("trainer@example.com");
    expect(data).not.toHaveProperty("actorId");
    expect(data).not.toHaveProperty("active");
    expect(canManageStaff(data.roles)).toBe(false);
  });
  it.each([
    { roles: [] },
    { roles: ["organizer", "organizer"] },
    { roles: ["owner"] },
    { roles: [null] },
  ])("rejects invalid role combinations $roles", ({ roles }) => {
    expect(rolesSchema.safeParse(roles).success).toBe(false);
  });
  it("parses inactive state explicitly rather than truthy strings", () => {
    expect(
      staffChangeSchema.parse({
        target: "11111111-1111-4111-8111-111111111111",
        roles: ["trainer"],
        active: "false",
      }).active,
    ).toBe(false);
  });
  it("requires matching strong administrative passwords", () => {
    expect(
      staffResetSchema.safeParse({
        jobId: "11111111-1111-4111-8111-111111111111",
        target: "11111111-1111-4111-8111-111111111111",
        password: "long-initial-password",
        confirmPassword: "mismatch",
      }).success,
    ).toBe(false);
  });
  it("falls back to Russian and supplies all staff strings", () => {
    expect(localeOf("de")).toBe("ru");
    expect(Object.keys(messages("ru"))).toEqual(Object.keys(messages("en")));
    expect(Object.keys(messages("kk"))).toEqual(Object.keys(messages("en")));
  });
});
