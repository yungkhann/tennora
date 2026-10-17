import { AuthForm } from "@/features/auth/auth-form";
import { publicSupabaseEnv } from "@/lib/env";
export const metadata = { title: "Create account" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = !!publicSupabaseEnv();
  const query = await searchParams;
  return (
    <AuthForm
      mode="register"
      configured={configured}
      callbackError={query.error === "callback"}
    />
  );
}
