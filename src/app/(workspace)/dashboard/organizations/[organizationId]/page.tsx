import { publicSupabaseEnv } from "@/lib/env";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ArrowLeft, Check } from "lucide-react";
import { requireAccount } from "@/lib/auth";
import { uuidSchema } from "@/lib/validation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Organization workspace" };
export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  if (!publicSupabaseEnv()) return null;
  const { organizationId } = await params;
  if (!uuidSchema.safeParse(organizationId).success) notFound();
  const { supabase, user } = await requireAccount();
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw new Error("Could not load the organization.");
  if (!organization) notFound();
  const { data: membership, error: memberError } = await supabase
    .from("organization_members")
    .select("roles")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .single();
  if (memberError || !membership) notFound();
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-8 -ml-3">
        <Link href="/dashboard">
          <ArrowLeft />
          All organizations
        </Link>
      </Button>
      <div className="mb-10 flex items-start gap-5">
        <span className="hidden rounded-2xl bg-secondary p-4 sm:block">
          <Building2 className="size-8 text-primary" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow mb-3">Organization workspace</p>
          <h1 className="break-words text-3xl font-semibold tracking-tight md:text-4xl">
            {organization.name}
          </h1>
          <p className="mt-3 text-sm capitalize text-muted-foreground">
            {membership.roles.map((r) => r.replaceAll("_", " ")).join(" · ")}
          </p>
        </div>
      </div>
      <Card className="grid overflow-hidden lg:grid-cols-[1.1fr_1fr]">
        <div className="p-8 md:p-10">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-primary">
            <Check className="size-3.5" />
            Workspace ready
          </span>
          <h2 className="text-2xl font-semibold tracking-tight">
            A good place to start.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">
            Your organization is set up. Your membership and roles apply only
            within this workspace.
          </p>
          <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground">
            Tournament management, team invitations and scheduling are coming in
            the next release.
          </p>
        </div>
        <div className="flex flex-col justify-center border-t bg-secondary/40 p-8 lg:border-t-0 lg:border-l md:p-10">
          <p className="eyebrow mb-5">Organization details</p>
          <dl className="grid gap-5 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="mt-1 font-medium">{organization.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Address</dt>
              <dd className="mt-1 break-all font-mono text-xs">
                {organization.slug}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Your roles</dt>
              <dd className="mt-1 capitalize">
                {membership.roles.map((r) => r.replaceAll("_", " ")).join(", ")}
              </dd>
            </div>
          </dl>
        </div>
      </Card>
    </>
  );
}
