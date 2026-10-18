import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { requireDrawManager } from "@/features/draws/access";
import { hallMessages } from "@/features/hall/messages";
import { hallSnapshotSchema } from "@/features/hall/validation";
import { HallBatchForm, JudgeAssignmentForm } from "@/features/hall/forms";
import { HallRefresh } from "@/features/hall/refresh";
import { readyQueue } from "@/domain/scheduling";
import { localeOf, messages } from "@/lib/locales";
import { Card } from "@/components/ui/card";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tour?: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = hallMessages(locale),
    common = messages(locale),
    staff = await requireDrawManager(locale),
    query = await searchParams;
  const tours = await staff.supabase
    .from("tours")
    .select("id,name,starts_on,tournament_settings(id)")
    .order("starts_on", { ascending: false });
  if (tours.error) throw new Error(t.failed);
  const configured = tours.data.filter((v) => v.tournament_settings.length),
    tour = query.tour ?? configured[0]?.id;
  if (tour && !z.uuid().safeParse(tour).success) notFound();
  const result = tour
      ? await staff.supabase.rpc("get_hall_snapshot", { tournament: tour })
      : null,
    parsed =
      result && !result.error
        ? hallSnapshotSchema.safeParse(result.data)
        : null;
  if (tour && (!parsed || !parsed.success)) notFound();
  const s = parsed?.success ? parsed.data : null;
  const ready = new Set(
    s ? readyQueue(s.matches, Date.parse(s.server_now)).map((v) => v.id) : [],
  );
  return (
    <>
      <h1 className="text-3xl font-semibold">{t.title}</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">{t.intro}</p>
      <nav className="mt-6 flex flex-wrap gap-3" aria-label={t.select}>
        {configured.map((v) => (
          <Link
            key={v.id}
            className={`rounded-lg border px-4 py-3 text-sm ${v.id === tour ? "bg-primary text-primary-foreground" : "bg-card"}`}
            href={`/${locale}/hall?tour=${v.id}`}
            aria-current={v.id === tour ? "page" : undefined}
          >
            {v.name}
          </Link>
        ))}
      </nav>
      {!s ? (
        <p className="mt-6">{t.empty}</p>
      ) : (
        <>
          <HallRefresh locale={locale} tour={s.tour_id} />
          <p className="mt-2 font-mono text-sm">
            {s.venue_day} · {s.timezone}
          </p>
          {!s.event_day && (
            <p role="status" className="mt-4 rounded-lg border p-4">
              {t.notToday}
            </p>
          )}
          {s.event_day && (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {(["allocate", "start_all"] as const).map((op) => (
                <Card className="p-5" key={op}>
                  <HallBatchForm
                    locale={locale}
                    tour={s.tour_id}
                    operation={op}
                  />
                </Card>
              ))}
            </div>
          )}
          <h2 className="mt-10 text-xl font-semibold">{t.table}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {s.tables.map((table) => {
              const m = s.matches.find((m) => m.id === table.match_id);
              return (
                <Card className="min-w-0 p-5" key={table.number}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-semibold">
                      {t.table}{" "}
                      <span className="font-mono">{table.number}</span>
                    </h3>
                    <span className="text-xs">
                      {m
                        ? common[m.status]
                        : table.match_id
                          ? t.otherTour
                          : table.match_id
                            ? t.otherTour
                            : t.available}
                    </span>
                  </div>
                  <p className="mt-3 break-words font-semibold">
                    {m
                      ? `${m.team_a ?? common.toBeDetermined} / ${m.team_b ?? common.toBeDetermined}`
                      : table.match_id
                        ? t.otherTour
                        : t.available}
                  </p>
                  {m && (
                    <Link
                      className="mt-2 inline-block min-h-11 py-2 text-sm underline"
                      href={`/${locale}/matches/${m.id}/manage`}
                    >
                      {t.manage}
                    </Link>
                  )}
                  <p className="mt-2 text-sm">
                    {t.owner}: {table.owner_name ?? t.unassigned}
                  </p>
                  {s.event_day && (
                    <details className="mt-4 text-sm">
                      <summary className="min-h-11 cursor-pointer py-2 underline">
                        {t.assignJudge}
                      </summary>
                      <JudgeAssignmentForm
                        locale={locale}
                        snapshot={s}
                        table={table}
                      />
                    </details>
                  )}
                </Card>
              );
            })}
          </div>
          <h2 className="mt-10 text-xl font-semibold">{t.queue}</h2>
          <div className="mt-5 grid gap-3">
            {s.matches.map((m) => (
              <Card
                className={`p-5 ${m.status === "called" ? "border-primary border-2" : ""}`}
                key={m.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">
                    {m.team_a ?? common.toBeDetermined} /{" "}
                    {m.team_b ?? common.toBeDetermined}
                  </h3>
                  <span className="text-sm">
                    {common[m.status]} · {m.age_group}
                    {m.final ? ` · ${t.final}` : ""}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {m.blocked
                    ? t.blocked
                    : !m.sources_ready
                      ? t.source
                      : !m.revealed
                        ? t.hidden
                        : ready.has(m.id)
                          ? t.ready
                          : m.rest_until &&
                              Date.parse(m.rest_until) >
                                Date.parse(s.server_now)
                            ? `${t.rest} ${new Intl.DateTimeFormat(locale, { timeZone: s.timezone, dateStyle: "short", timeStyle: "short" }).format(new Date(m.rest_until))}`
                            : ""}
                </p>
                <Link
                  className="mt-2 inline-block min-h-11 py-2 text-sm underline"
                  href={`/${locale}/matches/${m.id}/manage`}
                >
                  {t.manage}
                </Link>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
