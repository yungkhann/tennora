export const ageGroups = ["U13", "U15", "U17"] as const;
export type AgeGroup = (typeof ageGroups)[number];
// Eligibility uses birth year only: age on December 31 of the explicit season year.
export function ageGroupForBirthYear(
  birthYear: number,
  seasonYear: number,
): AgeGroup | null {
  if (
    !Number.isInteger(birthYear) ||
    !Number.isInteger(seasonYear) ||
    birthYear < 1900 ||
    seasonYear < 1900 ||
    seasonYear > 2200
  )
    return null;
  const age = seasonYear - birthYear;
  if (age < 0 || age >= 17) return null;
  return age < 13 ? "U13" : age < 15 ? "U15" : "U17";
}
export function isEligibleForGroup(
  birthYear: number,
  seasonYear: number,
  group: AgeGroup,
) {
  const category = ageGroupForBirthYear(birthYear, seasonYear);
  return (
    category !== null && ageGroups.indexOf(category) <= ageGroups.indexOf(group)
  );
}
