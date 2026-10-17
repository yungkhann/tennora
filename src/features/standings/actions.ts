"use server";
import { revalidatePath } from "next/cache";
import { requireDrawManager } from "@/features/draws/access";
import { localeOf, messages } from "@/lib/locales";
import type { FormState } from "@/lib/validation";
import { standingCommand } from "./validation";
async function mutate(form: FormData, random: boolean): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    staff = await requireDrawManager(locale);
  const parsed = standingCommand.safeParse(Object.fromEntries(form));
  if (
    !parsed.success ||
    (random &&
      (!staff.roles.includes("organizer") ||
        !parsed.data.revision ||
        form.get("confirm") !== "yes"))
  )
    return { status: "error", message: t.standingsInvalid };
  const { error } = random
    ? await staff.supabase.rpc("draw_group_ties", {
        group_id: parsed.data.group,
        expected_revision: parsed.data.revision!,
      })
    : await staff.supabase.rpc("refresh_group_standings", {
        group_id: parsed.data.group,
      });
  if (error)
    return {
      status: "error",
      message:
        error.code === "55000" ? t.dependencyBlocked : t.standingsInvalid,
    };
  revalidatePath(`/${locale}/draws`, "layout");
  revalidatePath(`/${locale}/matches`, "layout");
  return { status: "success", message: t.saved };
}
export async function refreshStandings(_old: FormState, form: FormData) {
  return mutate(form, false);
}
export async function drawTies(_old: FormState, form: FormData) {
  return mutate(form, true);
}
