import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { localeOf, messages } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { publicDirectory, publicMatches } from "@/features/public/data";
import { MatchCard } from "@/features/public/components";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; tourId: string; drawId: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const p = await params,
    locale = localeOf(p.locale),
    t = publicMessages(locale),
    common = messages(locale);
  if (
    !z.uuid().safeParse(p.tourId).success ||
    !z.uuid().safeParse(p.drawId).success
  )
    notFound();
  const d = await publicDirectory(),
    draw = d.draws.find((v) => v.id === p.drawId && v.tour_id === p.tourId);
  if (!draw) notFound();
  const selected = (await searchParams).group,
    group = draw.groups.find((v) => v.id === selected) ?? draw.groups[0],
    matches = (await publicMatches(p.tourId))
      .filter(
        (v) => v.data.draw_id === draw.id && v.data.group_id === group?.id,
      )
      .sort(
        (a, b) => a.data.round - b.data.round || a.data.number - b.data.number,
      ),
    names = new Map(
      draw.groups.flatMap((g) =>
        g.entries.map((e) => [e.subteam_id, e.team_name] as const),
      ),
    );
  const groupLabel = (g: (typeof draw.groups)[number]) => {
    const offset = draw.groups
      .filter((v) => v.kind === "knockout" && v.stage < g.stage)
      .reduce((sum, v) => sum + v.size, 0);
    return g.kind === "round_robin"
      ? `${t.group} ${g.name}`
      : `${t.draws} ${offset + 1}–${offset + g.size}`;
  };
  return (
    <>
      <Link
        className="text-sm underline"
        href={`/${locale}/tournament/${p.tourId}`}
      >
        {t.tour}
      </Link>
      <h1 className="mt-5 text-3xl font-semibold">
        {t.draws} · {draw.age_group}
      </h1>
      <nav className="mt-6 flex flex-wrap gap-3">
        {draw.groups.map((g) => (
          <Link
            className={`rounded-lg border px-4 py-3 text-sm ${g.id === group?.id ? "bg-primary text-primary-foreground" : "bg-card"}`}
            href={`?group=${g.id}`}
            key={g.id}
          >
            {groupLabel(g)}
          </Link>
        ))}
      </nav>
      {group && (
        <section className="mt-8">
          <h2 className="text-2xl font-semibold">{groupLabel(group)}</h2>
          {group.standings && (
            <div className="mt-5 rounded-xl border bg-card p-5">
              <h3 className="font-semibold">
                {t.standings} ·{" "}
                {group.standings.complete ? t.complete : t.provisional}
              </h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[580px] text-left text-sm">
                  <thead className="border-b">
                    <tr>
                      {[
                        t.rank,
                        t.club,
                        common.standingPlayed,
                        common.standingWins,
                        common.standingGames,
                        common.standingSets,
                        common.standingPoints,
                      ].map((v) => (
                        <th className="p-3 font-medium" key={v}>
                          {v}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.standings.rows.map((row) => (
                      <tr
                        className="border-b last:border-0"
                        key={row.subteam_id}
                      >
                        <td className="p-3 font-mono">
                          {row.rank}
                          {row.place === null ? " =" : ""}
                        </td>
                        <td className="p-3">
                          {names.get(row.subteam_id) ?? t.pending}
                        </td>
                        <td className="p-3 font-mono">{row.played}</td>
                        <td className="p-3 font-mono">{row.wins}</td>
                        <td className="p-3 font-mono">
                          {row.games_for}:{row.games_against}
                        </td>
                        <td className="p-3 font-mono">
                          {row.sets_for}:{row.sets_against}
                        </td>
                        <td className="p-3 font-mono">
                          {row.points_for}:{row.points_against}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {group.standings.unresolved.length > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">{t.tied}</p>
              )}
            </div>
          )}
          {group.entries.length > 0 && (
            <div className="mt-5 overflow-x-auto rounded-xl border bg-card">
              <table className="w-full min-w-[380px] text-left text-sm">
                <thead className="border-b bg-secondary/40">
                  <tr>
                    {[t.seed, t.club, t.seedRating].map((v) => (
                      <th className="p-4 font-medium" key={v}>
                        {v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.entries.map((e) => (
                    <tr key={e.subteam_id} className="border-b last:border-0">
                      <td className="p-4 font-mono">{e.seed}</td>
                      <td className="p-4 font-semibold">{e.team_name}</td>
                      <td className="p-4 font-mono">
                        {new Intl.NumberFormat(locale).format(e.rating)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {matches.map((v) => (
              <MatchCard key={v.match_id} locale={locale} match={v.data} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
