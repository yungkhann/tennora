import { AuthForm } from "@/features/auth/auth-form";
import { publicSupabaseEnv } from "@/lib/env";
export const metadata = { title: "Reset password" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = !!publicSupabaseEnv();
  const query = await searchParams;
  return (
    <AuthForm
      mode="recovery"
      configured={configured}
      callbackError={query.error === "callback"}
    />
  );
}
