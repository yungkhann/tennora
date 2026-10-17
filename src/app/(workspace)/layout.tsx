import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceNav } from "@/components/workspace-nav";
import { SetupNotice } from "@/components/setup-notice";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { publicSupabaseEnv } from "@/lib/env";
import { requireAccount } from "@/lib/auth";
import { signOut } from "@/features/auth/actions";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!publicSupabaseEnv())
    return (
      <div className="min-h-dvh p-6">
        <header className="mx-auto mb-12 flex max-w-6xl items-center justify-between">
          <Brand />
          <ThemeToggle />
        </header>
        <main id="main-content">
          <SetupNotice />
        </main>
      </div>
    );
  const { supabase, user } = await requireAccount();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  if (error) throw new Error("Could not load your profile.");
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-b bg-card p-5 md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0 md:px-5 md:py-8">
        <div className="mb-6 flex items-center justify-between px-2 md:mb-12">
          <Brand />
          <span className="md:hidden">
            <ThemeToggle />
          </span>
        </div>
        <p className="eyebrow mb-3 hidden px-3 md:block">Your workspace</p>
        <WorkspaceNav />
        <div className="mt-auto hidden border-t px-3 pt-6 md:block">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
              {profile.display_name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {profile.display_name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tennora member
              </p>
            </div>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex min-h-20 items-center justify-between gap-3 border-b px-6 md:px-10">
          <p className="text-xs text-muted-foreground">Your game, organized.</p>
          <div className="flex items-center gap-2">
            <span className="hidden md:block">
              <ThemeToggle />
            </span>
            <form action={signOut}>
              <Button type="submit" size="sm" variant="ghost">
                <LogOut />
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto max-w-7xl px-6 py-9 md:px-10 md:py-12"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
