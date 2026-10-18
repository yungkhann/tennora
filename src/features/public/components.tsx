import Link from "next/link";
import { ArrowUpRight, Trophy } from "lucide-react";
import type { Locale } from "@/lib/locales";
import { publicMessages } from "./messages";
import type { PublicMatch, PublicPlayer } from "./validation";

export function EmptyCompetition({ locale }: { locale: Locale }) {
  const t = publicMessages(locale);
  return (
    <div className="empty-competition">
      <div className="empty-icon">
        <Trophy className="size-6" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-lg font-bold">{t.empty}</h2>
        <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
          {t.emptyHelp}
        </p>
      </div>
    </div>
  );
}
export function PlayerIdentity({
  name,
  subtitle,
  placeholder = false,
}: {
  name: string;
  subtitle?: string;
  placeholder?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="team-monogram" aria-hidden="true">
        {placeholder
          ? "—"
          : name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((v) => v[0])
              .join("")}
      </span>
      <span className="min-w-0">
        <span className="block break-words font-bold">{name}</span>
        {subtitle && (
          <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
export function MatchStatusBadge({
  status,
  locale,
}: {
  status: PublicMatch["status"];
  locale: Locale;
}) {
  const live = status === "in_progress",
    t = publicMessages(locale);
  return (
    <span className="match-status" data-live={live}>
      {live && <span className="live-dot" aria-hidden="true" />}
      {t[`status_${status}`]}
    </span>
  );
}
export function ScoreCell({
  children,
  current = false,
}: {
  children: React.ReactNode;
  current?: boolean;
}) {
  return (
    <span className="score-cell" data-current={current}>
      {children}
    </span>
  );
}
export function LiveScoreboard({
  match: m,
  locale,
  large = false,
}: {
  match: PublicMatch;
  locale: Locale;
  large?: boolean;
}) {
  const t = publicMessages(locale),
    a =
      m.result?.games_a ??
      m.singles.filter((g) => g.status === "finished" && g.winner === "a")
        .length,
    b =
      m.result?.games_b ??
      m.singles.filter((g) => g.status === "finished" && g.winner === "b")
        .length,
    current = m.singles.find((g) => g.status === "in_progress");
  return (
    <>
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 ${large ? "text-base sm:text-xl" : "text-sm"}`}
      >
        <PlayerIdentity name={m.a.name ?? t.pending} placeholder={!m.a.name} />
        <strong className="team-score" data-winner={a > b}>
          {a}
        </strong>
        <PlayerIdentity name={m.b.name ?? t.pending} placeholder={!m.b.name} />
        <strong className="team-score" data-winner={b > a}>
          {b}
        </strong>
      </div>
      {current && (
        <div className="mt-5 border-t pt-4">
          {large && (
            <div className="mb-5 rounded-xl bg-secondary/60 py-5 text-center">
              <p className="eyebrow">{t.score}</p>
              <p className="display-title mt-2 text-6xl tabular-nums sm:text-7xl">
                {current.summary?.points_a ?? 0} :{" "}
                {current.summary?.points_b ?? 0}
              </p>
            </div>
          )}
          <div className="mb-3 flex items-center justify-between gap-3 text-[10px] font-bold text-muted-foreground">
            <span>
              {t.match} {current.slot} / 5
            </span>
            <span>{t.sets}</span>
          </div>
          <table className="w-full table-fixed text-left" aria-label={t.sets}>
            <thead>
              <tr className="text-[9px] font-semibold text-muted-foreground">
                <th scope="col" className="pb-2 font-medium">
                  {t.player}
                </th>
                {current.sets.map((_, i) => (
                  <th
                    scope="col"
                    className="w-7 pb-2 text-center font-medium"
                    key={i}
                  >
                    {i + 1}
                  </th>
                ))}
                {!large && (
                  <th scope="col" className="w-11 pb-2 text-center font-medium">
                    {t.score}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {(["a", "b"] as const).map((side) => (
                <tr key={side}>
                  <th
                    scope="row"
                    className="py-2 pr-2 text-xs font-normal sm:text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${current.summary?.server === side ? "bg-primary" : "bg-transparent"}`}
                        aria-label={
                          current.summary?.server === side ? t.serve : undefined
                        }
                      />
                      <span className="min-w-0 break-words">
                        {current[side].name ?? t.pending}
                      </span>
                    </span>
                  </th>
                  {current.sets.map((set, i) => (
                    <td key={i} className="text-center">
                      <ScoreCell
                        current={
                          large &&
                          i === current.sets.length - 1 &&
                          set.a === current.summary?.points_a &&
                          set.b === current.summary?.points_b
                        }
                      >
                        {set[side]}
                      </ScoreCell>
                    </td>
                  ))}
                  {!large && (
                    <td className="pl-1 text-center">
                      <span className="inline-flex min-w-9 items-center justify-center rounded-lg bg-accent px-2 py-1 font-display text-2xl font-bold text-accent-foreground tabular-nums">
                        {side === "a"
                          ? (current.summary?.points_a ?? 0)
                          : (current.summary?.points_b ?? 0)}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
export function MatchCard({
  match: m,
  locale,
  large = false,
}: {
  match: PublicMatch;
  locale: Locale;
  large?: boolean;
}) {
  const t = publicMessages(locale);
  return (
    <article className="match-card" data-live={m.status === "in_progress"}>
      <div className="match-card-top">
        <span>
          {m.age_group} <span className="mx-1.5 text-muted-foreground">/</span>{" "}
          {t.round} {m.round}
          {m.table ? ` · ${t.table} ${m.table}` : ""}
        </span>
        <MatchStatusBadge status={m.status} locale={locale} />
      </div>
      <div className={large ? "p-5 sm:p-7" : "p-4 sm:p-5"}>
        <LiveScoreboard match={m} locale={locale} large={large} />
      </div>
      <Link
        className="flex min-h-12 items-center justify-between gap-3 border-t px-5 text-[11px] font-bold transition-colors hover:bg-secondary"
        href={`/${locale}/live/${m.id}`}
      >
        {t.open}
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </article>
  );
}
export function RankingTable({
  players,
  locale,
  offset = 0,
}: {
  players: PublicPlayer[];
  locale: Locale;
  offset?: number;
}) {
  const t = publicMessages(locale);
  return (
    <div className="min-w-0 max-w-full overflow-x-auto rounded-2xl border bg-card">
      <table className="rank-table w-full text-left text-sm">
        <thead className="border-b">
          <tr>
            {[t.rank, t.player, t.club, t.age, t.rating].map((v, index) => (
              <th
                className={`px-3 py-4 font-semibold md:px-4 ${index === 2 ? "hidden md:table-cell" : index === 3 ? "hidden sm:table-cell" : ""} ${index === 4 ? "text-right" : ""}`}
                key={v}
              >
                {v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="w-12 px-3 py-4 font-mono text-xs text-muted-foreground md:px-4">
                {String(offset + i + 1).padStart(2, "0")}
              </td>
              <td className="px-3 py-4 md:px-4">
                <Link
                  className="[overflow-wrap:anywhere] hover:underline"
                  href={`/${locale}/player/${p.id}`}
                >
                  <PlayerIdentity name={`${p.first_name} ${p.last_name}`} />
                </Link>
                <span className="mt-1 block pl-11 text-[10px] text-muted-foreground [overflow-wrap:anywhere] md:hidden">
                  {p.team_name} · {p.age_group}
                </span>
              </td>
              <td className="hidden px-4 py-4 text-xs md:table-cell">
                {p.team_name}
              </td>
              <td className="hidden px-4 py-4 text-xs text-muted-foreground sm:table-cell">
                {p.age_group}
              </td>
              <td className="px-3 py-4 text-right font-mono text-sm font-semibold tabular-nums md:px-4">
                {new Intl.NumberFormat(locale).format(p.rating)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
