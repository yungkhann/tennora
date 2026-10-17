"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import type { FormState } from "@/lib/validation";
import { seasonSchema, tourSchema } from "./validation";
export async function saveSeason(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale, true);
  const parsed = seasonSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.seasonInvalid };
  const d = parsed.data;
  const { error } = await supabase.rpc("save_season", {
    season_id: d.id,
    season_name: d.name,
    season_year: d.year,
    first_day: d.startsOn,
    last_day: d.endsOn,
  });
  if (error)
    return {
      status: "error",
      message:
        error.message === "Season configuration locked"
          ? t.configLocked
          : t.seasonInvalid,
    };
  revalidatePath(`/${locale}/organizer/seasons`);
  return { status: "success", message: t.saved };
}
export async function saveTour(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale, true);
  const parsed = tourSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.tourInvalid };
  const d = parsed.data;
  const { error } = await supabase.rpc("save_tour", {
    tour_id: d.id,
    parent_season: d.seasonId,
    tour_name: d.name,
    tour_ordinal: d.ordinal,
    first_day: d.startsOn,
    last_day: d.endsOn,
  });
  if (error)
    return {
      status: "error",
      message:
        error.message === "Season configuration locked"
          ? t.configLocked
          : t.tourInvalid,
    };
  revalidatePath(`/${locale}/organizer/seasons`);
  return { status: "success", message: t.saved };
}
