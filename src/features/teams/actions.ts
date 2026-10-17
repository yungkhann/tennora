"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import type { FormState } from "@/lib/validation";
import {
  teamSchema,
  registrationSchema,
  trainerAssignmentSchema,
} from "./validation";
export async function saveTeam(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale);
  const parsed = teamSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.invalid };
  const d = parsed.data,
    { error } = await supabase.rpc("save_team", {
      team_id: d.id,
      team_name: d.name,
      team_region: d.region,
    });
  if (error) return { status: "error", message: t.failed };
  revalidatePath(`/${locale}/team`, "layout");
  return { status: "success", message: t.saved };
}
export async function registerTeam(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale);
  const parsed = registrationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.invalid };
  const { error } = await supabase.rpc("register_season_team", {
    parent_season: parsed.data.seasonId,
    club: parsed.data.club,
  });
  if (error) return { status: "error", message: t.failed };
  revalidatePath(`/${locale}/team`, "layout");
  return { status: "success", message: t.saved };
}
export async function assignTrainer(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale);
  const parsed = trainerAssignmentSchema.safeParse({
    ...Object.fromEntries(form),
    subteams: form.getAll("subteams"),
  });
  if (!parsed.success) return { status: "error", message: t.invalid };
  const { error } = await supabase.rpc("assign_team_trainer", {
    trainer: parsed.data.trainer,
    club: parsed.data.club,
    coached_subteams: parsed.data.subteams,
  });
  if (error) return { status: "error", message: t.failed };
  revalidatePath(`/${locale}/team`, "layout");
  return { status: "success", message: t.saved };
}
