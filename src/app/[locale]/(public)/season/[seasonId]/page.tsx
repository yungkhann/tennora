import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { publicDirectory, seasonStandings } from "@/features/public/data";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; seasonId: string }>;
}) {
  const p = await params,
    locale = localeOf(p.locale),
    t = publicMessages(locale);
  if (!z.uuid().safeParse(p.seasonId).success) notFound();
  const d = await publicDirectory(),
    s = d.seasons.find((v) => v.id === p.seasonId);
  if (!s) notFound();
  const standings = await seasonStandings(s.id),
    tours = d.tours.filter((v) => v.season_id === s.id);
  return (
    <>
      <Link href={`/${locale}/seasons`} className="text-sm underline">
        {t.seasons}
      </Link>
      <h1 className="mt-5 text-3xl font-semibold md:text-4xl">{s.name}</h1>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {tours.map((v) => (
          <Link
            className="rounded-xl border bg-card p-5"
            href={`/${locale}/tournament/${v.id}`}
            key={v.id}
          >
            <p className="text-xs text-muted-foreground">
              {t.tour} {v.ordinal} · {t.weight}{" "}
              {new Intl.NumberFormat(locale).format(v.weight)}
            </p>
            <h2 className="mt-2 text-xl font-semibold">{v.name} ↗</h2>
          </Link>
        ))}
      </div>
      <h2 className="mt-10 text-2xl font-semibold">{t.seasonStandings}</h2>
      <p className="mt-3 text-sm text-muted-foreground">{t.lowerWins}</p>
      {standings.some((v) => v.provisional) && (
        <p className="mt-4 rounded-lg border bg-card p-4 text-sm" role="status">
          {t.provisional}
        </p>
      )}
      {["U13", "U15", "U17"].map((age) => (
        <section key={age} className="mt-7">
          <h3 className="mb-3 text-xl font-semibold">{age}</h3>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b bg-secondary/40">
                <tr>
                  {[
                    t.rank,
                    t.club,
                    t.score,
                    t.headToHead,
                    ...tours.map((v) => v.name),
                  ].map((label, i) => (
                    <th className="p-4 font-medium" key={i}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings
                  .filter((v) => v.age_group === age)
                  .map((v) => (
                    <tr key={v.subteam_id} className="border-b last:border-0">
                      <td className="p-4 font-mono">
                        {v.rank}
                        {v.unresolved ? " =" : ""}
                      </td>
                      <td className="p-4 font-semibold">
                        {v.team_name}
                        {v.unresolved && (
                          <span className="mt-1 block text-xs font-normal text-muted-foreground">
                            {t.tied}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono">
                        {new Intl.NumberFormat(locale).format(v.score)}
                      </td>
                      <td className="p-4 font-mono">{v.head_to_head_wins}</td>
                      {tours.map((tour) => {
                        const place = v.tours.find(
                          (v) => v.tour_id === tour.id,
                        );
                        return (
                          <td key={tour.id} className="p-4 font-mono">
                            {place?.place ?? (place?.missed ? t.missing : "—")}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
