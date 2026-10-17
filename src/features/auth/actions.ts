"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { publicSupabaseEnv, siteUrl } from "@/lib/env";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import {
  loginSchema,
  recoverySchema,
  passwordSchema,
  profileSchema,
  type FormState,
} from "@/lib/validation";
export async function login(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale);
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.invalid };
  if (!publicSupabaseEnv()) return { status: "error", message: t.unavailable };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.user) return { status: "error", message: t.failed };
    const staff = await supabase
      .from("staff_accounts")
      .select("id")
      .eq("id", data.user.id)
      .eq("active", true)
      .maybeSingle();
    if (staff.error || !staff.data) {
      await supabase.auth.signOut({ scope: "local" });
      return { status: "error", message: t.staffDenied };
    }
  } catch {
    return { status: "error", message: t.failed };
  }
  revalidatePath("/", "layout");
  redirect(`/${locale}/workspace`);
}
// Retired action remains fail-closed for old deployed forms/bookmarks.
export async function register(): Promise<FormState> {
  return { status: "error", message: messages("ru").accountsOnly };
}
export async function requestRecovery(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale);
  const parsed = recoverySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.invalid };
  if (!publicSupabaseEnv()) return { status: "error", message: t.unavailable };
  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/${locale}/reset-password`,
    });
  } catch {
    /* Enumeration-safe response for provider and connection failures. */
  }
  return { status: "success", message: t.recoveryDone };
}
export async function resetPassword(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale);
  const parsed = passwordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.minPassword };
  const { supabase } = await requireStaff(locale);
  try {
    if (
      (await supabase.auth.updateUser({ password: parsed.data.password })).error
    )
      return { status: "error", message: t.failed };
  } catch {
    return { status: "error", message: t.failed };
  }
  revalidatePath("/", "layout");
  return { status: "success", message: t.resetDone };
}
export async function updateProfile(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale);
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.invalid };
  const { supabase } = await requireStaff(locale);
  const { error } = await supabase.rpc("update_staff_name", {
    new_name: parsed.data.displayName,
  });
  if (error) return { status: "error", message: t.failed };
  revalidatePath("/", "layout");
  return { status: "success", message: t.saved };
}
export async function signOut(form: FormData) {
  const locale = localeOf(form.get("locale"));
  if (publicSupabaseEnv()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw new Error(messages(locale).failed);
  }
  revalidatePath("/", "layout");
  redirect(`/${locale}/login`);
}
