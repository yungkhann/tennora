import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { notFound } from "next/navigation";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { publicPlayers, playerHistory } from "@/features/public/data";
import { Card } from "@/components/ui/card";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  if (!z.uuid().safeParse(playerId).success) return {};
  const p = (await publicPlayers()).find((v) => v.id === playerId);
  return p
    ? { title: `${p.first_name} ${p.last_name} · ${p.team_name}` }
    : { title: "Tennora" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; playerId: string }>;
}) {
  const p = await params,
    locale = localeOf(p.locale),
    t = publicMessages(locale);
  if (!z.uuid().safeParse(p.playerId).success) notFound();
  const player = (await publicPlayers()).find((v) => v.id === p.playerId);
  if (!player) notFound();
  const history = await playerHistory(player.id),
    rated = history.filter((v) => v.after !== null),
    ratings = rated.length
      ? [rated[0].before!, ...rated.map((v) => v.after!)]
      : [player.rating],
    min = Math.min(...ratings) - 16,
    max = Math.max(...ratings) + 16,
    points = ratings
      .map(
        (value, i) =>
          `${24 + (i * 552) / Math.max(1, ratings.length - 1)},${156 - ((value - min) * 128) / (max - min)}`,
      )
      .join(" "),
    best = history
      .filter((v) => v.winner === v.side && v.kind === "played")
      .sort((a, b) => (b.opponent_rating ?? 0) - (a.opponent_rating ?? 0))
      .slice(0, 5);
  return (
    <>
      <Link className="text-sm underline" href={`/${locale}/ranking`}>
        {t.ranking}
      </Link>
      <header className="mt-6 flex flex-wrap items-center gap-6 border-b pb-8">
        {player.has_photo && (
          <Image
            src={`/api/public/player-photo/${player.id}`}
            width={128}
            height={128}
            alt={`${player.first_name} ${player.last_name}`}
            unoptimized
            className="size-28 rounded-xl object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            {player.team_name} · {player.age_group}
          </p>
          <h1 className="mt-2 break-words text-3xl font-semibold md:text-5xl">
            {player.first_name} {player.last_name}
          </h1>
        </div>
        <div className="rounded-xl border bg-card px-6 py-4">
          <p className="text-xs text-muted-foreground">{t.rating}</p>
          <p className="mt-1 font-mono text-4xl font-semibold tabular-nums">
            {new Intl.NumberFormat(locale).format(player.rating)}
          </p>
        </div>
      </header>
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">{t.history}</h2>
          <svg
            className="mt-4 w-full text-primary"
            viewBox="0 0 600 184"
            role="img"
            aria-label={t.ratingChange}
          >
            <path d="M24 156H576" stroke="currentColor" opacity=".15" />
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <text x="24" y="180" fontSize="11" fill="currentColor">
              {new Intl.NumberFormat(locale).format(ratings[0])}
            </text>
            <text
              x="576"
              y="180"
              textAnchor="end"
              fontSize="11"
              fill="currentColor"
            >
              {new Intl.NumberFormat(locale).format(player.rating)}
            </text>
          </svg>
          {!history.length && (
            <p className="mt-3 text-sm text-muted-foreground">{t.noHistory}</p>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold">{t.bestWins}</h2>
          {best.length ? (
            <ul className="mt-4 grid gap-4">
              {best.map((v) => (
                <li
                  className="flex justify-between gap-3 text-sm"
                  key={v.game_id}
                >
                  <Link
                    className="underline"
                    href={`/${locale}/live/${v.match_id}`}
                  >
                    {v.opponent_name}
                  </Link>
                  <span className="font-mono">
                    {new Intl.NumberFormat(locale).format(
                      v.opponent_rating ?? 0,
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {t.emptyResults}
            </p>
          )}
        </Card>
      </div>
      {history.length > 0 && (
        <div className="mt-8 overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b bg-secondary/40">
              <tr>
                {[t.dates, t.tour, t.match, t.sets, t.ratingChange].map(
                  (label) => (
                    <th key={label} className="p-4 font-medium">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {history.toReversed().map((v) => (
                <tr className="border-b last:border-0" key={v.game_id}>
                  <td className="p-4">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeZone: "Asia/Almaty",
                    }).format(new Date(v.ended_at))}
                  </td>
                  <td className="p-4">
                    <Link
                      className="underline"
                      href={`/${locale}/tournament/${v.tour_id}`}
                    >
                      {v.tour_name}
                    </Link>
                  </td>
                  <td className="p-4">
                    <Link
                      className="underline"
                      href={`/${locale}/live/${v.match_id}`}
                    >
                      {v.opponent_name}
                    </Link>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {v.kind === "played" ? t.played : t.withdrawal}
                    </span>
                  </td>
                  <td className="p-4 font-mono">
                    {v.sets.map((s) => `${s.a}:${s.b}`).join(" / ")}
                  </td>
                  <td className="p-4 font-mono">
                    {v.before === null || v.after === null
                      ? "—"
                      : `${v.before} → ${v.after}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-8 text-xs text-muted-foreground">{t.privacy}</p>
    </>
  );
}
