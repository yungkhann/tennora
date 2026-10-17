import { randomUUID } from "node:crypto";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import { Card } from "@/components/ui/card";
import { SeasonForm, TourForm } from "@/features/seasons/forms";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = messages(locale),
    { supabase } = await requireStaff(locale, true);
  const { data: seasons, error } = await supabase
    .from("seasons")
    .select(
      "id,name,year,starts_on,ends_on,status,tours(id,name,ordinal,starts_on,ends_on)",
    )
    .order("year", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(t.failed);
  return (
    <>
      <h1 className="text-3xl font-semibold">{t.seasons}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t.seasonsIntro}
      </p>
      <p role="status" className="mt-5 rounded-lg border bg-card p-4 text-sm">
        {t.seasonReadiness}
      </p>
      <div className="mt-8 grid items-start gap-8 xl:grid-cols-[1fr_360px]">
        <section aria-label={t.seasons} className="grid gap-6">
          {seasons.length ? (
            seasons.map((s) => (
              <Card className="min-w-0 p-6" key={s.id}>
                <h2 className="break-words text-xl font-semibold">{s.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {s.year} · {s.starts_on} — {s.ends_on} ·{" "}
                  {s.status === "draft" ? t.draft : t.started}
                </p>
                {s.status === "draft" ? (
                  <details className="mt-5">
                    <summary className="cursor-pointer text-sm font-semibold">
                      {t.editSeason}
                    </summary>
                    <div className="mt-5">
                      <SeasonForm locale={locale} id={s.id} season={s} />
                    </div>
                  </details>
                ) : (
                  <p className="mt-5 text-sm">{t.configLocked}</p>
                )}
                <h3 className="mt-6 border-t pt-5 font-semibold">{t.tours}</h3>
                <div className="mt-4 grid gap-4">
                  {s.tours.length ? (
                    s.tours
                      .sort((a, b) => a.ordinal - b.ordinal)
                      .map((tour) => (
                        <div className="rounded-lg border p-4" key={tour.id}>
                          <h4 className="break-words font-semibold">
                            {tour.ordinal}. {tour.name}
                          </h4>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {tour.starts_on} — {tour.ends_on}
                          </p>
                          {s.status === "draft" && (
                            <details className="mt-4">
                              <summary className="cursor-pointer text-sm">
                                {t.editTour}
                              </summary>
                              <div className="mt-4">
                                <TourForm
                                  locale={locale}
                                  id={tour.id}
                                  seasonId={s.id}
                                  tour={tour}
                                  minDate={s.starts_on}
                                  maxDate={s.ends_on}
                                />
                              </div>
                            </details>
                          )}
                        </div>
                      ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{t.noTours}</p>
                  )}
                </div>
                {s.status === "draft" && (
                  <details className="mt-5">
                    <summary className="cursor-pointer text-sm font-semibold">
                      {t.newTour}
                    </summary>
                    <div className="mt-5">
                      <TourForm
                        locale={locale}
                        id={randomUUID()}
                        seasonId={s.id}
                        minDate={s.starts_on}
                        maxDate={s.ends_on}
                        ordinal={
                          Math.max(0, ...s.tours.map((tour) => tour.ordinal)) +
                          1
                        }
                      />
                    </div>
                  </details>
                )}
              </Card>
            ))
          ) : (
            <Card className="p-6 text-sm">{t.noSeasons}</Card>
          )}
        </section>
        <Card className="p-6">
          <h2 className="mb-6 text-lg font-semibold">{t.newSeason}</h2>
          <SeasonForm locale={locale} id={randomUUID()} />
        </Card>
      </div>
    </>
  );
}
