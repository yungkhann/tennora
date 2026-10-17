"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import type { FormState } from "@/lib/validation";
import { buildStageTemplate } from "@/domain/stage-templates";
import {
  settingsSchema,
  templateSchema,
  stagePlanSchema,
  startSchema,
} from "./validation";
function refresh(locale: string) {
  revalidatePath(`/${locale}/organizer`, "layout");
}
export async function saveSettings(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale, true);
  const parsed = settingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.settingsInvalid };
  const d = parsed.data;
  const { error } = await supabase.rpc("save_tournament_settings", {
    settings_id: d.id,
    tournament: d.tourId,
    expected_revision: d.revision,
    k: d.k,
    tables: d.tables,
    rest: d.rest,
    prioritize_finals: d.finals === "true",
    timezone_name: d.timezone,
  });
  if (error)
    return {
      status: "error",
      message:
        error.message === "Season configuration locked"
          ? t.configLocked
          : t.settingsInvalid,
    };
  refresh(locale);
  return { status: "success", message: t.saved };
}
export async function createTemplate(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale, true);
  const parsed = templateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.templateInvalid };
  const d = parsed.data;
  const { error } = await supabase.rpc("create_stage_template", {
    template_id: d.id,
    template_name: d.name,
    definition: buildStageTemplate(d),
  });
  if (error) return { status: "error", message: t.templateInvalid };
  refresh(locale);
  return { status: "success", message: t.saved };
}
export async function configureStages(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale, true);
  const parsed = stagePlanSchema.safeParse({
    ...Object.fromEntries(form),
    ages: form.getAll("ages"),
  });
  if (!parsed.success) return { status: "error", message: t.stagePlanInvalid };
  const { error } = await supabase.rpc("configure_tour_stages", {
    tournament: parsed.data.tourId,
    template: parsed.data.template,
    age_groups: parsed.data.ages,
  });
  if (error)
    return {
      status: "error",
      message:
        error.message === "Season configuration locked"
          ? t.configLocked
          : t.stagePlanInvalid,
    };
  refresh(locale);
  return { status: "success", message: t.saved };
}
export async function startSeason(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale, true);
  const parsed = startSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.startConfirm };
  const { error } = await supabase.rpc("start_season", {
    season_id: parsed.data.seasonId,
  });
  if (error) return { status: "error", message: t.notReady };
  refresh(locale);
  return { status: "success", message: t.saved };
}
