"use server";
import type { FormState } from "@/lib/validation";
export async function createOrganization(): Promise<FormState> {
  return {
    status: "error",
    message:
      "Organization onboarding is retired. Contact the league Organizer.",
  };
}
