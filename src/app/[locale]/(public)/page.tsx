import Link from "next/link";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import {
  publicDirectory,
  publicMatches,
  publicPlayers,
} from "@/features/public/data";
import { EmptyCompetition, RankingTable } from "@/features/public/components";
import { LiveMatches } from "@/features/public/live";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = publicMessages(locale),
    [directory, players, matches] = await Promise.all([
      publicDirectory(),
      publicPlayers(),
      publicMatches(),
    ]);
  return (
    <>
      <div className="mb-9 grid items-end gap-5 border-b pb-8 md:grid-cols-[1fr_auto]">
        <div>
          <p className="eyebrow">Tennora · {t.home}</p>
          <h1 className="mt-5 max-w-3xl text-4xl leading-tight font-semibold tracking-tight md:text-6xl">
            {t.title}
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">{t.intro}</p>
        </div>
        <Link
          className="inline-block rounded-lg border bg-card px-5 py-3 text-sm"
          href={`/${locale}/scoreboard`}
        >
          {t.scoreboard} ↗
        </Link>
      </div>
      {directory.seasons.length ? (
        <>
          <section aria-labelledby="live-title">
            <h2 id="live-title" className="mb-4 text-xl font-semibold">
              {t.live}
            </h2>
            <LiveMatches locale={locale} initial={matches} />
          </section>
          <div className="mt-12 grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section className="min-w-0">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">{t.ranking}</h2>
                <Link className="text-sm underline" href={`/${locale}/ranking`}>
                  {t.all} ↗
                </Link>
              </div>
              <RankingTable locale={locale} players={players.slice(0, 10)} />
            </section>
            <section className="min-w-0">
              <h2 className="mb-5 text-xl font-semibold">{t.seasons}</h2>
              <div className="grid gap-4">
                {directory.seasons.map((s) => (
                  <Link
                    className="rounded-xl border bg-card p-5"
                    key={s.id}
                    href={`/${locale}/season/${s.id}`}
                  >
                    <p className="font-mono text-sm text-muted-foreground">
                      {s.year}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">{s.name} ↗</h3>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : (
        <EmptyCompetition locale={locale} />
      )}
    </>
  );
}
