import "server-only";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
export async function requireDrawManager(locale: string) {
  const staff = await requireStaff(locale);
  if (
    !staff.roles.some((role) => role === "organizer" || role === "main_judge")
  )
    notFound();
  return staff;
}
