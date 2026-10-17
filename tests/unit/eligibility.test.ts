import { describe, expect, it } from "vitest";
import { ageGroupForBirthYear, isEligibleForGroup } from "@/domain/eligibility";
import { seasonSchema, tourSchema } from "@/features/seasons/validation";
describe("confirmed age bands", () => {
  it.each([
    { birth: 2014, group: "U13" },
    { birth: 2013, group: "U15" },
    { birth: 2012, group: "U15" },
    { birth: 2011, group: "U17" },
    { birth: 2010, group: "U17" },
    { birth: 2009, group: null },
    { birth: 2027, group: null },
  ])("classifies $birth in season 2026", ({ birth, group }) =>
    expect(ageGroupForBirthYear(birth, 2026)).toBe(group),
  );
  it("forbids playing up and ages players into the next group by season year", () => {
    expect(isEligibleForGroup(2014, 2026, "U15")).toBe(false);
    expect(isEligibleForGroup(2014, 2027, "U15")).toBe(true);
  });
  it.each([NaN, 2014.5, 1899])("rejects invalid birth year %s", (year) =>
    expect(ageGroupForBirthYear(year, 2026)).toBeNull(),
  );
  it("validates real dates and start/end order", () => {
    const base = {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Season",
      year: 2026,
      startsOn: "2026-01-01",
      endsOn: "2026-12-31",
    };
    expect(seasonSchema.safeParse(base).success).toBe(true);
    expect(
      seasonSchema.safeParse({ ...base, startsOn: "2026-02-30" }).success,
    ).toBe(false);
    expect(
      seasonSchema.safeParse({ ...base, endsOn: "2025-01-01" }).success,
    ).toBe(false);
  });
  it("rejects zero tour order and strips forged status", () => {
    const base = {
      id: "11111111-1111-4111-8111-111111111111",
      seasonId: "22222222-2222-4222-8222-222222222222",
      name: "Tour",
      ordinal: 1,
      startsOn: "2026-01-01",
      endsOn: "2026-01-02",
      status: "started",
    };
    expect(tourSchema.parse(base)).not.toHaveProperty("status");
    expect(tourSchema.safeParse({ ...base, ordinal: 0 }).success).toBe(false);
  });
});
