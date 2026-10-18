import Link from "next/link";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { publicPlayers } from "@/features/public/data";
import { RankingTable, EmptyCompetition } from "@/features/public/components";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; age?: string; page?: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = publicMessages(locale),
    query = await searchParams,
    all = await publicPlayers(),
    q = (query.q ?? "").slice(0, 80).trim(),
    age = ["U13", "U15", "U17"].includes(query.age ?? "") ? query.age! : "",
    found = all.filter(
      (p) =>
        (!age || p.age_group === age) &&
        `${p.first_name} ${p.last_name} ${p.team_name}`
          .toLocaleLowerCase(locale)
          .includes(q.toLocaleLowerCase(locale)),
    ),
    page = Math.max(
      1,
      Math.min(
        Math.ceil(found.length / 50) || 1,
        Number.parseInt(query.page ?? "1", 10) || 1,
      ),
    );
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow mb-3">Tennora / {t.player}</p>
          <h1>{t.ranking}</h1>
        </div>
      </header>
      <form className="mb-6 grid items-end gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-[1fr_auto_auto]">
        <label className="text-sm">
          {t.search}
          <Input name="q" defaultValue={q} maxLength={80} />
        </label>
        <label className="text-sm">
          {t.age}
          <select
            name="age"
            defaultValue={age}
            className="block min-h-12 w-full rounded-lg border bg-background px-3"
          >
            <option value="">{t.all}</option>
            {["U13", "U15", "U17"].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <Button>{t.filter}</Button>
      </form>
      {!all.length ? (
        <EmptyCompetition locale={locale} />
      ) : found.length ? (
        <RankingTable
          players={found.slice((page - 1) * 50, page * 50)}
          offset={(page - 1) * 50}
          locale={locale}
        />
      ) : (
        <p className="rounded-xl border bg-card p-6">{t.emptyResults}</p>
      )}
      <nav className="mt-5 flex gap-5 text-sm">
        {page > 1 && (
          <Link
            className="underline"
            href={`?${new URLSearchParams({ q, age, page: String(page - 1) })}`}
          >
            {t.previous}
          </Link>
        )}
        {page * 50 < found.length && (
          <Link
            className="underline"
            href={`?${new URLSearchParams({ q, age, page: String(page + 1) })}`}
          >
            {t.next}
          </Link>
        )}
      </nav>
    </>
  );
}
