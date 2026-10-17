import { randomUUID } from "node:crypto";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import { Card } from "@/components/ui/card";
import {
  ProvisionForm,
  StaffEditForm,
  StaffResetForm,
} from "@/features/staff/forms";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = messages(locale),
    { supabase } = await requireStaff(locale, true);
  const [accounts, jobs] = await Promise.all([
    supabase
      .from("staff_accounts")
      .select("id,email,display_name,active,staff_roles(role)")
      .order("created_at"),
    supabase
      .from("staff_jobs")
      .select("id,operation,email,display_name,roles,status,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (accounts.error || jobs.error) throw new Error(t.failed);
  return (
    <>
      <h1 className="text-3xl font-semibold">{t.staff}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{t.staffIntro}</p>
      <div className="mt-8 grid items-start gap-8 xl:grid-cols-[1fr_360px]">
        <section aria-label={t.directory} className="grid gap-5">
          {accounts.data.length ? (
            accounts.data.map((a) => (
              <Card key={a.id} className="min-w-0 p-6">
                <h2 className="text-lg font-semibold">{a.display_name}</h2>
                <p className="mt-2 mb-5 break-all text-sm text-muted-foreground">
                  {a.email} · {a.active ? t.active : t.inactive}
                </p>
                <StaffEditForm
                  locale={locale}
                  target={a.id}
                  active={a.active}
                  roles={a.staff_roles.map((r) => r.role)}
                />
                {a.active && (
                  <details className="mt-6 border-t pt-4">
                    <summary className="cursor-pointer text-sm font-semibold">
                      {t.reset}
                    </summary>
                    <StaffResetForm
                      locale={locale}
                      target={a.id}
                      jobId={randomUUID()}
                    />
                  </details>
                )}
              </Card>
            ))
          ) : (
            <p>{t.noStaff}</p>
          )}
        </section>
        <Card className="p-6">
          <h2 className="mb-6 text-lg font-semibold">{t.create}</h2>
          <ProvisionForm locale={locale} jobId={randomUUID()} />
        </Card>
      </div>
      <section className="mt-10">
        <h2 className="text-xl font-semibold">{t.jobs}</h2>
        <div className="mt-5 grid gap-4">
          {jobs.data.length ? (
            jobs.data.map((j) => (
              <Card className="p-5" key={j.id}>
                <p className="break-all text-sm">
                  {j.email} · {j.operation === "create" ? t.create : t.reset} ·{" "}
                  {j.status === "complete"
                    ? t.complete
                    : j.status === "failed"
                      ? t.failedJob
                      : t.pending}
                </p>
                {j.operation === "create" && j.status !== "complete" && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold">
                      {t.retry}
                    </summary>
                    <div className="mt-5 max-w-md">
                      <ProvisionForm locale={locale} jobId={j.id} retry={j} />
                    </div>
                  </details>
                )}
              </Card>
            ))
          ) : (
            <p>{t.noJobs}</p>
          )}
        </div>
      </section>
    </>
  );
}
