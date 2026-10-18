import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { requireDrawManager } from "@/features/draws/access";
import { hallMessages } from "@/features/hall/messages";
import { hallSnapshotSchema } from "@/features/hall/validation";
import { MatchOperationForm } from "@/features/hall/forms";
import { HallRefresh } from "@/features/hall/refresh";
import { localeOf, messages } from "@/lib/locales";
import { Card } from "@/components/ui/card";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; matchId: string }>;
}) {
  const p = await params,
    locale = localeOf(p.locale),
    t = hallMessages(locale),
    common = messages(locale),
    staff = await requireDrawManager(locale);
  if (!z.uuid().safeParse(p.matchId).success) notFound();
  const match = await staff.supabase
    .from("team_matches")
    .select("draw_revisions(tour_stage_plans(tour_id))")
    .eq("id", p.matchId)
    .single();
  if (match.error) notFound();
  const tour = match.data.draw_revisions.tour_stage_plans.tour_id,
    result = await staff.supabase.rpc("get_hall_snapshot", {
      tournament: tour,
    }),
    parsed = hallSnapshotSchema.safeParse(result.data);
  if (result.error || !parsed.success) notFound();
  const s = parsed.data,
    m = s.matches.find((v) => v.id === p.matchId);
  if (!m) notFound();
  const operations: ("assign" | "release" | "call" | "start" | "resume")[] =
    ["scheduled", "called"].includes(m.status) && s.event_day
      ? [
          "assign",
          ...(m.table
            ? (["release", "call", m.started ? "resume" : "start"] as const)
            : []),
        ]
      : [];
  return (
    <>
      <Link className="text-sm underline" href={`/${locale}/hall?tour=${tour}`}>
        {t.title}
      </Link>
      <h1 className="mt-6 break-words text-3xl font-semibold">
        {m.team_a ?? common.toBeDetermined} /{" "}
        {m.team_b ?? common.toBeDetermined}
      </h1>
      <p className="mt-3">
        {common[m.status]} · {m.age_group}
        {m.table ? ` · ${t.table} ${m.table}` : ""}
      </p>
      <p className="mt-4 max-w-3xl text-sm text-muted-foreground">{t.help}</p>
      <HallRefresh locale={locale} tour={tour} />
      {m.blocked && (
        <p className="mt-4" role="status">
          {t.blocked}
        </p>
      )}
      <nav className="mt-5 flex gap-5 text-sm">
        {m.team_a && m.team_b && (
          <>
            <Link
              className="underline"
              href={`/${locale}/matches/${m.id}/lineup`}
            >
              {t.lineups}
            </Link>
            {m.revealed && (
              <Link
                className="underline"
                href={`/${locale}/matches/${m.id}/corrections`}
              >
                {t.corrections}
              </Link>
            )}
          </>
        )}
      </nav>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {operations.map((op) => (
          <Card className="p-5" key={op}>
            <h2 className="mb-4 font-semibold">{t[op]}</h2>
            <MatchOperationForm
              locale={locale}
              match={m.id}
              version={m.version}
              operation={op}
              tables={s.tables.length}
            />
          </Card>
        ))}
      </div>
    </>
  );
}
