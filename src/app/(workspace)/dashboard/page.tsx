import { publicSupabaseEnv } from "@/lib/env";
import Link from "next/link";
import { ArrowUpRight, Building2, Plus } from "lucide-react";
import { requireAccount } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { CreateOrganizationForm } from "@/features/organizations/create-form";
export const metadata = { title: "Your organizations" };
export default async function DashboardPage() {
  if (!publicSupabaseEnv()) return null;
  const { supabase, user } = await requireAccount();
  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("roles, organizations(id, name, slug)")
    .eq("user_id", user.id)
    .order("created_at");
  if (error) throw new Error("Could not load your organizations.");
  return (
    <>
      <div className="mb-10">
        <p className="eyebrow mb-3">The clubhouse</p>
        <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-4xl">
          Your organizations
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          A dedicated space for every club you call home.
        </p>
      </div>
      <div className="grid items-start gap-7 xl:grid-cols-[1.2fr_1fr]">
        <section aria-label="Organization list">
          {memberships.length ? (
            <div className="grid gap-4">
              {memberships.map(
                (m) =>
                  m.organizations && (
                    <Link
                      key={m.organizations.id}
                      href={`/dashboard/organizations/${m.organizations.id}`}
                      className="group block rounded-2xl"
                    >
                      <Card className="flex items-center gap-4 p-6 transition-colors group-hover:border-primary">
                        <span className="rounded-xl bg-secondary p-3">
                          <Building2 className="size-6 text-primary" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-lg font-semibold">
                            {m.organizations.name}
                          </h2>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {m.roles
                              .map((r) => r.replaceAll("_", " "))
                              .join(" · ")}
                          </p>
                        </div>
                        <ArrowUpRight className="size-5 text-primary" />
                      </Card>
                    </Link>
                  ),
              )}
            </div>
          ) : (
            <Card className="flex min-h-[390px] flex-col items-center justify-center border-dashed px-6 py-12 text-center">
              <span className="mb-6 rounded-2xl bg-secondary p-5">
                <Building2 className="size-8 text-primary" />
              </span>
              <h2 className="text-xl font-semibold">Make room for your club</h2>
              <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
                You don’t belong to an organization yet. Create one to open your
                first workspace.
              </p>
            </Card>
          )}
        </section>
        <Card className="p-6 md:p-8">
          <div className="mb-7 flex items-start gap-3">
            <Plus className="mt-1 size-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Start an organization</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Create a home for your tennis community. You’ll join as its
                owner.
              </p>
            </div>
          </div>
          <CreateOrganizationForm />
        </Card>
      </div>
    </>
  );
}
