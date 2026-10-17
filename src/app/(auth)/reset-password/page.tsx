import { AuthForm } from "@/features/auth/auth-form";
import { publicSupabaseEnv } from "@/lib/env";
import { requireAccount } from "@/lib/auth";
export const metadata = { title: "New password" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = !!publicSupabaseEnv();
  if (configured) await requireAccount();
  const query = await searchParams;
  return (
    <AuthForm
      mode="reset"
      configured={configured}
      callbackError={query.error === "callback"}
    />
  );
}
