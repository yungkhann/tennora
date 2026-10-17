import { publicSupabaseEnv } from "@/lib/env";
import { requireAccount } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/features/auth/profile-form";
export const metadata = { title: "Your profile" };
export default async function ProfilePage() {
  if (!publicSupabaseEnv()) return null;
  const { supabase, user } = await requireAccount();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  if (error) throw new Error("Could not load your profile.");
  return (
    <>
      <p className="eyebrow mb-3">Account settings</p>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Your profile
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The name your tennis community knows you by.
      </p>
      <Card className="mt-9 p-6 md:p-9">
        <ProfileForm displayName={data.display_name} email={user.email ?? ""} />
      </Card>
    </>
  );
}
