import Link from "next/link";
import { ArrowUpRight, CalendarDays, Trophy } from "lucide-react";
import type { Locale } from "@/lib/locales";
import type { PublicDirectory, PublicRow } from "./validation";
import { publicMessages } from "./messages";
import { designMessages } from "./design-messages";
import { MatchCard } from "./components";
type Tour = PublicDirectory["tours"][number];
export function TournamentCard({
  tour,
  locale,
}: {
  tour: Tour;
  locale: Locale;
}) {
  const t = publicMessages(locale),
    format = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return (
    <Link href={`/${locale}/tournament/${tour.id}`} className="tournament-card">
      <div className="tournament-card-top">
        <span className="text-[10px] font-bold uppercase tracking-wider">
          {t.tour} {tour.ordinal}
        </span>
        <Trophy className="size-6" aria-hidden="true" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="display-title text-2xl break-words">{tour.name}</h3>
        <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {format.format(new Date(tour.starts_on))} —{" "}
          {format.format(new Date(tour.ends_on))}
        </p>
        <div className="mt-6 flex items-center justify-between border-t pt-4 text-[11px] font-bold">
          <span>
            {t.draws} · {t.schedule}
          </span>
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}
export function TournamentHeader({
  tour,
  locale,
}: {
  tour: Tour;
  locale: Locale;
}) {
  const t = publicMessages(locale),
    d = designMessages(locale),
    date = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    });
  return (
    <header className="tournament-header">
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wider">
        <span className="inline-flex items-center gap-2 text-[#c9ef59]">
          <Trophy className="size-4" />
          {t.tour} {tour.ordinal}
        </span>
        <Link
          className="inline-flex min-h-11 items-center gap-2"
          href={`/${locale}/season/${tour.season_id}`}
        >
          {t.seasonStandings}
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
      <h1 className="display-title">{tour.name}</h1>
      <p className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[#caddce]">
        <CalendarDays className="size-4" />
        {date.format(new Date(tour.starts_on))} —{" "}
        {date.format(new Date(tour.ends_on))}
        <span className="hidden sm:inline">/</span>
        <span>{d.sport}</span>
      </p>
    </header>
  );
}
export function CompetitionTabs({
  tour,
  draws,
  locale,
  current = "overview",
}: {
  tour: Tour;
  draws: PublicDirectory["draws"];
  locale: Locale;
  current?: string;
}) {
  const t = publicMessages(locale),
    d = designMessages(locale);
  return (
    <nav className="tournament-tabs" aria-label={t.tour}>
      <Link
        className="competition-tab"
        aria-current={current === "overview" ? "page" : undefined}
        href={`/${locale}/tournament/${tour.id}`}
      >
        {d.overview}
      </Link>
      <Link
        className="competition-tab"
        aria-current={current === "matches" ? "page" : undefined}
        href={`/${locale}/tournament/${tour.id}/matches`}
      >
        {t.schedule}
      </Link>
      {draws
        .filter((v) => v.tour_id === tour.id)
        .map((v) => (
          <Link
            key={v.id}
            className="competition-tab"
            aria-current={current === v.id ? "page" : undefined}
            href={`/${locale}/tournament/${tour.id}/draws/${v.id}`}
          >
            {t.draws} · {v.age_group}
          </Link>
        ))}
    </nav>
  );
}
export function BracketMatches({
  matches,
  locale,
}: {
  matches: PublicRow[];
  locale: Locale;
}) {
  const t = publicMessages(locale),
    rounds = [...new Set(matches.map((v) => v.data.round))].sort(
      (a, b) => a - b,
    );
  if (!matches.length)
    return (
      <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        {t.emptyResults}
      </p>
    );
  return (
    <div
      className="bracket-scroll"
      tabIndex={0}
      role="region"
      aria-label={t.draws}
    >
      <div className="flex min-w-max gap-12">
        {rounds.map((round) => (
          <section key={round} className="bracket-round">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t.round} {round}
            </h3>
            <div className="flex flex-1 flex-col justify-around gap-5">
              {matches
                .filter((v) => v.data.round === round)
                .map((v) => (
                  <MatchCard key={v.match_id} locale={locale} match={v.data} />
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
