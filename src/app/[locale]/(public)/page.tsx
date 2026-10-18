import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  ChartNoAxesColumnIncreasing,
  Trophy,
} from "lucide-react";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { designMessages } from "@/features/public/design-messages";
import {
  publicDirectory,
  publicMatches,
  publicPlayers,
} from "@/features/public/data";
import {
  EmptyCompetition,
  RankingTable,
  MatchCard,
} from "@/features/public/components";
import { TournamentCard } from "@/features/public/competition";
import { LiveMatches } from "@/features/public/live";
import { CourtArt } from "@/features/public/court-art";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = publicMessages(locale),
    d = designMessages(locale),
    [directory, players, matches] = await Promise.all([
      publicDirectory(),
      publicPlayers(),
      publicMatches(),
    ]),
    recent = matches
      .filter((v) => v.data.status === "finished")
      .sort((a, b) =>
        (b.data.completed_at ?? "").localeCompare(a.data.completed_at ?? ""),
      )
      .slice(0, 3);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-tag">
            <span className="size-1.5 rounded-full bg-current" />
            {d.leagueEdition}
          </span>
          <h1 className="display-title">
            {d.heroFirst}
            <br />
            <span>{d.heroSecond}</span>
            <br />
            {d.heroThird}
          </h1>
          <p>{t.intro}</p>
          <div className="hero-actions">
            <Link className="hero-primary" href={`/${locale}/seasons`}>
              {d.explore}
              <ArrowUpRight className="size-4" />
            </Link>
            <Link className="hero-secondary" href={`/${locale}/live`}>
              <Activity className="size-4" />
              {t.live}
            </Link>
          </div>
        </div>
        <div className="hero-art">
          <CourtArt />
          <div className="hero-art-label">
            <span>{d.sport}</span>
            <span>U13 / U15 / U17</span>
          </div>
        </div>
      </section>
      <div className="feature-rail">
        {[
          {
            href: "live",
            label: d.matchCentre,
            help: d.liveHelp,
            icon: Activity,
          },
          {
            href: "seasons",
            label: d.tournaments,
            help: d.tournamentHelp,
            icon: Trophy,
          },
          {
            href: "ranking",
            label: t.ranking,
            help: d.rankingHelp,
            icon: ChartNoAxesColumnIncreasing,
          },
        ].map(({ href, label, help, icon: Icon }) => (
          <Link key={href} href={`/${locale}/${href}`} className="feature-link">
            <span className="flex min-w-0 items-center gap-3">
              <span className="feature-icon">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <strong>{label}</strong>
                <small>{help}</small>
              </span>
            </span>
            <ArrowUpRight className="size-4 shrink-0" />
          </Link>
        ))}
      </div>
      {!directory.seasons.length ? (
        <div className="mt-8">
          <EmptyCompetition locale={locale} />
        </div>
      ) : (
        <>
          <section className="mt-10" aria-labelledby="live-title">
            <div className="section-heading">
              <h2 id="live-title" className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[var(--live)]" />
                {t.live}
              </h2>
              <Link href={`/${locale}/live`}>
                {d.viewAll}
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <LiveMatches locale={locale} initial={matches} />
          </section>
          <div className="mt-12 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <section className="min-w-0">
              <div className="section-heading">
                <h2>{d.tournaments}</h2>
                <Link href={`/${locale}/seasons`}>
                  {d.viewAll}
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {directory.tours.slice(0, 4).map((tour) => (
                  <TournamentCard key={tour.id} tour={tour} locale={locale} />
                ))}
              </div>
            </section>
            <section className="min-w-0">
              <div className="section-heading">
                <h2>{t.ranking}</h2>
                <Link href={`/${locale}/ranking`}>
                  {d.viewAll}
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
              {players.length ? (
                <RankingTable locale={locale} players={players.slice(0, 5)} />
              ) : (
                <p className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                  {d.noPlayers}
                </p>
              )}
            </section>
          </div>
          {!!recent.length && (
            <section className="mt-12">
              <div className="section-heading">
                <h2>{d.results}</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {recent.map((v) => (
                  <MatchCard key={v.match_id} match={v.data} locale={locale} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
