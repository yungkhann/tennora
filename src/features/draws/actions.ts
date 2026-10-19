"use server";
import { revalidatePath } from "next/cache";
import { localeOf, messages } from "@/lib/locales";
import type { FormState } from "@/lib/validation";
import { requireDrawManager } from "./access";
import { drawSchema, publishSchema, swapSchema } from "./validation";
export async function generateDraw(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireDrawManager(locale);
  const parsed = drawSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.drawInvalid };
  const d = parsed.data;
  const { error } = await supabase.rpc("generate_tour_draw", {
    draw_id: d.id,
    tournament: d.tourId,
    age: d.age,
    expected_revision: d.revision,
  });
  if (error)
    return {
      status: "error",
      message:
        error.message ===
        "Every club needs three eligible boys and two eligible girls"
          ? t.seedRosterRequired
          : error.message === "Draw map not supported"
            ? t.drawUnsupported
            : t.drawInvalid,
    };
  revalidatePath(`/${locale}/draws`, "layout");
  return { status: "success", message: t.saved };
}
export async function publishDraw(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireDrawManager(locale);
  const parsed = publishSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.drawInvalid };
  const { error } = await supabase.rpc("publish_tour_draw", {
    draw: parsed.data.id,
    expected_revision: parsed.data.revision,
  });
  if (error) return { status: "error", message: t.drawInvalid };
  revalidatePath(`/${locale}/draws`, "layout");
  return { status: "success", message: t.saved };
}

export async function swapSeeds(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    staff = await requireDrawManager(locale);
  const parsed = swapSchema.safeParse(Object.fromEntries(form));
  if (!staff.roles.includes("organizer") || !parsed.success)
    return { status: "error", message: t.swapInvalid };
  const d = parsed.data;
  const { error } = await staff.supabase.rpc("swap_draw_seeds", {
    draw_id: d.id,
    source_draw: d.source,
    expected_revision: d.revision,
    seed_a: d.seedA,
    seed_b: d.seedB,
    confirmed: true,
  });
  if (error) return { status: "error", message: t.swapInvalid };
  revalidatePath(`/${locale}/draws`, "layout");
  return { status: "success", message: t.saved };
}
