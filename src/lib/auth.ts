import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const requireAccount = cache(async (locale = "ru") => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect(`/${locale}/login`);
  return { supabase, user };
});

export const requireStaff = cache(async (locale = "ru", organizer = false) => {
  const account = await requireAccount(locale);
  const { data: staff, error } = await account.supabase
    .from("staff_accounts")
    .select("id,display_name,active,staff_roles(role)")
    .eq("id", account.user.id)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error("Could not verify staff access.");
  if (!staff || !staff.staff_roles.length)
    redirect(`/${locale}/login?error=staff`);
  const roles = staff.staff_roles.map((r) => r.role);
  if (organizer && !roles.includes("organizer")) {
    notFound();
  }
  return { ...account, staff, roles };
});
