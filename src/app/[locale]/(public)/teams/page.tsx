import Link from "next/link";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { publicPlayers } from "@/features/public/data";
import { EmptyCompetition } from "@/features/public/components";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = publicMessages(locale),
    players = await publicPlayers(),
    clubs = [
      ...new Map(players.map((p) => [p.team_id, p.team_name])).entries(),
    ].sort((a, b) => a[1].localeCompare(b[1], locale));
  return (
    <>
      <h1 className="mb-7 text-3xl font-semibold">{t.teams}</h1>
      {!clubs.length ? (
        <EmptyCompetition locale={locale} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {clubs.map(([id, name]) => (
            <section
              className="scroll-mt-6 rounded-xl border bg-card p-6"
              id={id}
              key={id}
            >
              <h2 className="text-2xl font-semibold">{name}</h2>
              {["U13", "U15", "U17"]
                .filter((age) =>
                  players.some((p) => p.team_id === id && p.age_group === age),
                )
                .map((age) => (
                  <div key={age} className="mt-5">
                    <h3 className="font-mono text-sm font-semibold">{age}</h3>
                    <ul className="mt-3 grid gap-3">
                      {players
                        .filter((p) => p.team_id === id && p.age_group === age)
                        .map((p) => (
                          <li
                            className="flex justify-between gap-4 text-sm"
                            key={p.id}
                          >
                            <Link
                              className="underline"
                              href={`/${locale}/player/${p.id}`}
                            >
                              {p.first_name} {p.last_name}
                            </Link>
                            <span className="font-mono">
                              {new Intl.NumberFormat(locale).format(p.rating)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
