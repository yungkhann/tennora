"use server";
import { revalidatePath } from "next/cache";
import { requireDrawManager } from "@/features/draws/access";
import { localeOf } from "@/lib/locales";
import type { FormState } from "@/lib/validation";
import {
  hallActionSchema,
  matchActionSchema,
  judgeActionSchema,
} from "./validation";
import { hallMessages } from "./messages";
async function mutate(
  form: FormData,
  kind: "hall" | "match" | "judge",
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = hallMessages(locale),
    staff = await requireDrawManager(locale),
    values = Object.fromEntries(form);
  if (kind === "hall") {
    const p = hallActionSchema.safeParse(values);
    if (!p.success) return { status: "error", message: t.failed };
    const d = p.data,
      r = await staff.supabase.rpc("run_hall_command", {
        command_id: d.id,
        tournament: d.tour,
        operation: d.operation,
        reason: d.reason,
      });
    if (r.error) return { status: "error", message: t.failed };
  } else if (kind === "match") {
    const p = matchActionSchema.safeParse(values);
    if (!p.success) return { status: "error", message: t.failed };
    const d = p.data;
    const r =
      d.operation === "resume"
        ? await staff.supabase.rpc("resume_corrected_match", {
            command_id: d.id,
            match: d.match,
            expected_version: d.version,
            reason: d.reason,
          })
        : await staff.supabase.rpc("manage_match", {
            command_id: d.id,
            match: d.match,
            operation: d.operation,
            table_no: d.operation === "assign" ? d.table! : null!,
            expected_version: d.version,
            reason: d.reason,
          });
    if (r.error) return { status: "error", message: t.failed };
  } else {
    const p = judgeActionSchema.safeParse(values);
    if (!p.success) return { status: "error", message: t.failed };
    const d = p.data;
    if (d.operation === "assign" && !d.staff)
      return { status: "error", message: t.failed };
    const common = {
      assignment_id: d.id,
      tournament: d.tour,
      table_no: d.table,
      venue_day: d.day,
      expected_version: d.version,
      reason: d.reason,
    };
    const r =
      d.operation === "takeover"
        ? await staff.supabase.rpc("takeover_table", common)
        : await staff.supabase.rpc("assign_table_judge", {
            ...common,
            staff: d.operation === "release" ? null! : d.staff!,
          });
    if (r.error) return { status: "error", message: t.failed };
  }
  revalidatePath(`/${locale}/hall`);
  revalidatePath(`/${locale}/matches`, "layout");
  return {
    status: "success",
    message: kind === "hall" ? t.bulkResult : t.saved,
  };
}
export async function hallCommand(_old: FormState, form: FormData) {
  return mutate(form, "hall");
}
export async function matchCommand(_old: FormState, form: FormData) {
  return mutate(form, "match");
}
export async function judgeCommand(_old: FormState, form: FormData) {
  return mutate(form, "judge");
}
