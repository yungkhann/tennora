import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/lib/locales";
import { publicMessages } from "./messages";
import type { PublicMatch, PublicPlayer } from "./validation";
export function EmptyCompetition({ locale }: { locale: Locale }) {
  const t = publicMessages(locale);
  return (
    <Card className="p-7 md:p-10">
      <h2 className="text-xl font-semibold">{t.empty}</h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
        {t.emptyHelp}
      </p>
    </Card>
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
  const t = publicMessages(locale),
    a =
      m.result?.games_a ??
      m.singles.filter((g) => g.status === "finished" && g.winner === "a")
        .length,
    b =
      m.result?.games_b ??
      m.singles.filter((g) => g.status === "finished" && g.winner === "b")
        .length;
  return (
    <Card
      className={`min-w-0 overflow-hidden ${m.status === "called" ? "border-2 border-primary" : ""}`}
    >
      <div className="flex flex-wrap justify-between gap-2 border-b bg-secondary/40 px-5 py-3 text-xs font-medium">
        <span>
          {m.age_group} · {t.round} {m.round}
          {m.table ? ` · ${t.table} ${m.table}` : ""}
        </span>
        <span>{t[`status_${m.status}`]}</span>
      </div>
      <div className="p-5">
        <div
          className={`grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-3 ${large ? "text-2xl" : "text-lg"}`}
        >
          <span className="min-w-0 break-words font-semibold">
            {m.a.name ?? t.pending}
          </span>
          <strong className="font-mono text-3xl tabular-nums">{a}</strong>
          <span className="min-w-0 break-words font-semibold">
            {m.b.name ?? t.pending}
          </span>
          <strong className="font-mono text-3xl tabular-nums">{b}</strong>
        </div>
        {m.singles.find((g) => g.status === "in_progress") && (
          <div className="mt-5 border-t border-dashed pt-4">
            {m.singles
              .filter((g) => g.status === "in_progress")
              .map((g) => (
                <div key={g.id}>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                    <span className="min-w-0 break-words">
                      {g.summary?.server === "a" && (
                        <span
                          aria-label={t.serve}
                          className="mr-2 inline-block size-2 rounded-full bg-primary"
                        />
                      )}
                      {g.a.name}
                    </span>
                    <strong
                      className={`whitespace-nowrap font-mono tabular-nums ${large ? "text-5xl md:text-6xl" : "text-2xl"}`}
                    >
                      {g.summary?.points_a ?? 0} : {g.summary?.points_b ?? 0}
                    </strong>
                    <span className="min-w-0 break-words text-right">
                      {g.b.name}
                      {g.summary?.server === "b" && (
                        <span
                          aria-label={t.serve}
                          className="ml-2 inline-block size-2 rounded-full bg-primary"
                        />
                      )}
                    </span>
                  </div>
                  <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
                    {g.sets.map((s) => `${s.a}:${s.b}`).join(" / ")}
                  </p>
                </div>
              ))}
          </div>
        )}
        <Link
          className="mt-5 inline-block min-h-11 py-2 text-sm underline"
          href={`/${locale}/live/${m.id}`}
        >
          {t.open}
        </Link>
      </div>
    </Card>
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
    <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-secondary/50 text-xs">
          <tr>
            {[t.rank, t.player, t.club, t.age, t.rating].map((v, index) => (
              <th
                className={`px-3 py-4 font-medium md:px-4 ${index === 2 ? "hidden md:table-cell" : index === 3 ? "hidden sm:table-cell" : ""}`}
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
              <td className="px-3 py-4 font-mono text-muted-foreground md:px-4">
                {offset + i + 1}
              </td>
              <td className="px-3 py-4 font-semibold md:px-4">
                <Link
                  className="[overflow-wrap:anywhere] hover:underline"
                  href={`/${locale}/player/${p.id}`}
                >
                  {p.first_name} {p.last_name}
                </Link>
                <span className="mt-1 block text-xs font-normal text-muted-foreground [overflow-wrap:anywhere] md:hidden">
                  {p.team_name} · {p.age_group}
                </span>
              </td>
              <td className="hidden px-4 py-4 md:table-cell">{p.team_name}</td>
              <td className="hidden px-4 py-4 sm:table-cell">{p.age_group}</td>
              <td className="px-3 py-4 text-right font-mono font-semibold tabular-nums md:px-4">
                {new Intl.NumberFormat(locale).format(p.rating)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
