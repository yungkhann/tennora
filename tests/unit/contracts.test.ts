import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loginSchema,
  registrationSchema,
  passwordSchema,
  organizationSchema,
  profileSchema,
} from "@/lib/validation";
import { safeNext } from "@/lib/redirects";
import { publicSupabaseEnv, siteUrl } from "@/lib/env";
describe("auth input contracts", () => {
  it("normalizes email while preserving password whitespace", () => {
    expect(
      loginSchema.parse({ email: " Alice@Club.com ", password: " secret " }),
    ).toEqual({ email: "alice@club.com", password: " secret " });
  });
  it("validates registration and strips forged privilege fields", () => {
    const data = registrationSchema.parse({
      email: "a@example.com",
      password: "long-password-123",
      displayName: " Alice ",
      roles: ["owner"],
      platform_admin: true,
    });
    expect(data).toEqual({
      email: "a@example.com",
      password: "long-password-123",
      displayName: "Alice",
    });
    expect(
      registrationSchema.safeParse({ ...data, password: "short" }).success,
    ).toBe(false);
  });
  it("requires matching strong reset passwords", () => {
    expect(
      passwordSchema.safeParse({
        password: "long-password-123",
        confirmPassword: "different",
      }).success,
    ).toBe(false);
    expect(
      passwordSchema.safeParse({
        password: "long-password-123",
        confirmPassword: "long-password-123",
      }).success,
    ).toBe(true);
  });
  it.each(["", "x", "A".repeat(81)])(
    "rejects invalid profile name %s",
    (displayName) => {
      expect(profileSchema.safeParse({ displayName }).success).toBe(false);
    },
  );
});
describe("organization input boundary", () => {
  it.each([
    "../club",
    "Club",
    "club--one",
    "-club",
    "club-",
    "cl",
    "a".repeat(49),
  ])("rejects invalid slug %s", (slug) => {
    expect(organizationSchema.safeParse({ name: "Club", slug }).success).toBe(
      false,
    );
  });
  it("strips owner ID and roles from submitted onboarding fields", () => {
    expect(
      organizationSchema.parse({
        name: " Club ",
        slug: "club-one",
        ownerId: "forged",
        roles: ["owner"],
      }),
    ).toEqual({ name: "Club", slug: "club-one" });
  });
});
describe("callback destinations", () => {
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/%2f%2fevil.example",
    "javascript:alert(1)",
    "/dashboard?next=https://evil.example",
    "/dashboard/../auth/confirm",
    null,
    undefined,
  ])("fails closed for %s", (value) => {
    expect(safeNext(value)).toBe("/dashboard");
  });
  it.each([
    "/settings/profile",
    "/reset-password",
    "/dashboard/organizations/11111111-1111-4111-8111-111111111111",
  ])("allows known destination %s", (value) => {
    expect(safeNext(value)).toBe(value);
  });
});
describe("configuration boundary", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("has no implicit backend fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(publicSupabaseEnv()).toBeNull();
  });
  it("rejects a non-http backend", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "file:///tmp/database");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "x".repeat(30));
    expect(publicSupabaseEnv()).toBeNull();
  });
  it.each([
    "https://app.example/attacker",
    "https://user:pass@app.example",
    "http://app.example",
    "javascript:alert(1)",
  ])("rejects unsafe production email origin %s", (value) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
    expect(() => siteUrl()).toThrow();
  });
  it("uses only the configured trusted origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example/");
    expect(siteUrl()).toBe("https://app.example");
  });
});
