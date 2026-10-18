import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { designMessages } from "@/features/public/design-messages";
import { publicDirectory } from "@/features/public/data";
import { EmptyCompetition } from "@/features/public/components";
import { TournamentCard } from "@/features/public/competition";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = publicMessages(locale),
    d = designMessages(locale),
    directory = await publicDirectory();
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow mb-3">Tennora / {t.seasons}</p>
          <h1>{d.tournaments}</h1>
        </div>
        <p className="max-w-sm text-xs leading-6 text-muted-foreground">
          {d.tournamentHelp}
        </p>
      </header>
      {directory.seasons.length ? (
        <div className="grid gap-10">
          {directory.seasons.map((s) => (
            <section key={s.id}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow mb-2">
                    {s.year} / {t.seasons}
                  </p>
                  <h2>{s.name}</h2>
                </div>
                <Link href={`/${locale}/season/${s.id}`}>
                  {t.seasonStandings}
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {directory.tours
                  .filter((v) => v.season_id === s.id)
                  .map((tour) => (
                    <TournamentCard key={tour.id} tour={tour} locale={locale} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyCompetition locale={locale} />
      )}
    </>
  );
}
