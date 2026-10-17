"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { publicSupabaseEnv, siteUrl } from "@/lib/env";
import { requireAccount } from "@/lib/auth";
import {
  invalidInput,
  loginSchema,
  registrationSchema,
  recoverySchema,
  passwordSchema,
  profileSchema,
  type FormState,
} from "@/lib/validation";
const unavailable: FormState = {
  status: "error",
  message:
    "Authentication is not configured. Follow the project setup guide, then try again.",
};
const networkError: FormState = {
  status: "error",
  message: "We could not connect. Please try again.",
};
export async function login(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalidInput(parsed.error);
  if (!publicSupabaseEnv()) return unavailable;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error)
      return {
        status: "error",
        message:
          "Unable to sign in. Check your email, password and email confirmation.",
      };
  } catch {
    return networkError;
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
export async function register(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = registrationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalidInput(parsed.error);
  if (!publicSupabaseEnv()) return unavailable;
  let signedIn = false;
  try {
    const { email, password, displayName } = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${siteUrl()}/auth/callback?next=/dashboard`,
      },
    });
    if (error)
      return {
        status: "error",
        message:
          "Unable to create an account. Try again, or sign in if you already have an account.",
      };
    signedIn = !!data.session;
  } catch {
    return networkError;
  }
  if (signedIn) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }
  return {
    status: "success",
    message:
      "Check your inbox for a confirmation link. If you already have an account, sign in instead.",
  };
}
export async function requestRecovery(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = recoverySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalidInput(parsed.error);
  if (!publicSupabaseEnv()) return unavailable;
  try {
    const supabase = await createClient();
    // Do not expose account existence, provider errors or rate-limit differences.
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
    });
  } catch {
    return networkError;
  }
  return {
    status: "success",
    message:
      "If an account exists for this email, you will receive a password reset link.",
  };
}
export async function resetPassword(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalidInput(parsed.error);
  if (!publicSupabaseEnv()) return unavailable;
  const { supabase } = await requireAccount();
  try {
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error)
      return {
        status: "error",
        message:
          "Could not change your password. Use a new password or request another reset link.",
      };
  } catch {
    return networkError;
  }
  revalidatePath("/", "layout");
  return {
    status: "success",
    message:
      "Your password has been updated. You can return to your workspace.",
  };
}
export async function updateProfile(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalidInput(parsed.error);
  if (!publicSupabaseEnv()) return unavailable;
  const { supabase, user } = await requireAccount();
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: parsed.data.displayName })
      .eq("id", user.id)
      .select("id")
      .single();
    if (error || !data)
      return {
        status: "error",
        message: "Could not save your profile. Please try again.",
      };
  } catch {
    return networkError;
  }
  revalidatePath("/", "layout");
  return { status: "success", message: "Your profile has been saved." };
}
export async function signOut() {
  if (!publicSupabaseEnv()) redirect("/login");
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("Could not sign out. Please try again.");
  revalidatePath("/", "layout");
  redirect("/login");
}
