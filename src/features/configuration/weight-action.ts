"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import type { FormState } from "@/lib/validation";
const schema = z.object({
  tour: z.uuid(),
  weight: z.coerce
    .number()
    .positive()
    .max(1000)
    .refine((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-8),
});
export async function saveTourWeight(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    staff = await requireStaff(locale, true),
    parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.failed };
  const result = await staff.supabase.rpc("configure_tour_weight", {
    tournament: parsed.data.tour,
    weight: parsed.data.weight,
  });
  if (result.error) return { status: "error", message: t.failed };
  revalidatePath(`/${locale}/organizer/tournaments/${parsed.data.tour}`);
  return { status: "success", message: t.saved };
}
