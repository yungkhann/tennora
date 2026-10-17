import { notFound } from "next/navigation";
import { AuthForm } from "@/features/auth/auth-form";
import { publicSupabaseEnv } from "@/lib/env";
import { localeOf } from "@/lib/locales";
import { requireStaff } from "@/lib/auth";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; authPage: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale: raw, authPage } = await params,
    locale = localeOf(raw),
    query = await searchParams;
  if (!["login", "forgot-password", "reset-password"].includes(authPage))
    notFound();
  if (authPage === "reset-password") await requireStaff(locale);
  return (
    <AuthForm
      locale={locale}
      mode={
        authPage === "login"
          ? "login"
          : authPage === "forgot-password"
            ? "recovery"
            : "reset"
      }
      configured={!!publicSupabaseEnv()}
      callbackError={query.error === "callback"}
      staffDenied={query.error === "staff"}
    />
  );
}
