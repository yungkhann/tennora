"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { authAdmin } from "@/lib/supabase/admin";
import { localeOf, messages } from "@/lib/locales";
import type { FormState } from "@/lib/validation";
import {
  provisionSchema,
  staffChangeSchema,
  staffResetSchema,
} from "./validation";

export async function provisionStaff(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale);
  const { supabase } = await requireStaff(locale, true);
  const parsed = provisionSchema.safeParse({
    ...Object.fromEntries(form),
    roles: form.getAll("roles"),
  });
  if (!parsed.success) return { status: "error", message: t.invalid };
  let admin;
  try {
    admin = authAdmin();
  } catch {
    return { status: "error", message: t.unavailableOperation };
  }
  const d = parsed.data;
  const { data: job, error } = await supabase.rpc("begin_staff_job", {
    job_id: d.jobId,
    job_operation: "create",
    target: "00000000-0000-0000-0000-000000000000",
    staff_email: d.email,
    staff_name: d.displayName,
    desired_roles: d.roles,
  });
  if (error || !job)
    return {
      status: "error",
      message: error?.code === "23505" ? t.jobConflict : t.failed,
    };
  if (job.status === "complete")
    return { status: "success", message: t.created };
  try {
    // Retry by the database-reserved identity only. Never look up/link a user by email.
    const existing = await admin.getUserById(job.target_id);
    let succeeded = existing.data.user?.email?.toLowerCase() === job.email;
    if (!existing.data.user) {
      const result = await admin.createUser({
        id: job.target_id,
        email: job.email,
        password: d.password,
        email_confirm: true,
        user_metadata: { display_name: job.display_name },
      });
      succeeded = !result.error && result.data.user?.id === job.target_id;
    }
    const result = await supabase.rpc("finish_staff_job", {
      job_id: job.id,
      succeeded,
    });
    if (result.error || !succeeded)
      return { status: "error", message: t.failed };
  } catch {
    await supabase.rpc("finish_staff_job", {
      job_id: job.id,
      succeeded: false,
    });
    return { status: "error", message: t.failed };
  }
  revalidatePath(`/${locale}/organizer/staff`);
  return { status: "success", message: t.created };
}
export async function changeStaff(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale);
  const { supabase } = await requireStaff(locale, true);
  const parsed = staffChangeSchema.safeParse({
    ...Object.fromEntries(form),
    roles: form.getAll("roles"),
  });
  if (!parsed.success) return { status: "error", message: t.invalid };
  const d = parsed.data;
  const { data, error } = await supabase.rpc("change_staff", {
    target: d.target,
    desired_roles: d.roles,
    is_active: d.active,
  });
  if (error || !data)
    return {
      status: "error",
      message:
        error?.message === "Self lockout forbidden"
          ? t.selfProtection
          : t.failed,
    };
  revalidatePath(`/${locale}`, "layout");
  try {
    const result = await authAdmin().updateUserById(data, {
      ban_duration: d.active ? "none" : "876000h",
    });
    if (result.error) return { status: "error", message: t.savedAuthFailed };
  } catch {
    return { status: "error", message: t.savedAuthFailed };
  }
  return { status: "success", message: t.saved };
}
export async function resetStaffPassword(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale);
  const { supabase } = await requireStaff(locale, true);
  const parsed = staffResetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.minPassword };
  let admin;
  try {
    admin = authAdmin();
  } catch {
    return { status: "error", message: t.unavailableOperation };
  }
  const d = parsed.data;
  const { data: job, error } = await supabase.rpc("begin_staff_job", {
    job_id: d.jobId,
    job_operation: "reset",
    target: d.target,
    staff_email: "",
    staff_name: "",
    desired_roles: [],
  });
  if (error || !job) return { status: "error", message: t.failed };
  if (job.status === "complete")
    return { status: "success", message: t.resetDone };
  let succeeded = false;
  try {
    succeeded = !(
      await admin.updateUserById(job.target_id, { password: d.password })
    ).error;
  } catch {
    /* Record failure without password/provider details. */
  }
  const result = await supabase.rpc("finish_staff_job", {
    job_id: job.id,
    succeeded,
  });
  revalidatePath(`/${locale}/organizer/staff`);
  return {
    status: succeeded && !result.error ? "success" : "error",
    message: succeeded && !result.error ? t.resetDone : t.failed,
  };
}
