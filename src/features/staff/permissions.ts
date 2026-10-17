export const staffRoles = [
  "organizer",
  "main_judge",
  "trainer",
  "line_judge",
] as const;
export type StaffRole = (typeof staffRoles)[number];
export function canManageStaff(roles: readonly StaffRole[]) {
  return roles.includes("organizer");
}
