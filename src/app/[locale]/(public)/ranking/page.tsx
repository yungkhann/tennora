import { rankingPage } from "@/domain/rankings";
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
  searchParams: Promise<{
    q?: string;
    age?: string;
    page?: string;
    gender?: string;
  }>;
}) {
  const locale = localeOf((await params).locale),
    t = publicMessages(locale),
    query = await searchParams,
    all = await publicPlayers(),
    { gender, age, q, found, page, offset, players } = rankingPage(
      all,
      query,
      locale,
    );
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow mb-3">Tennora / {t.player}</p>
          <h1>{t.ranking}</h1>
        </div>
      </header>
      <nav aria-label={t.gender} className="mb-5 flex gap-2">
        {(["boy", "girl"] as const).map((value) => (
          <Link
            key={value}
            aria-current={gender === value ? "page" : undefined}
            className={`min-h-12 rounded-lg border px-5 py-3 text-sm font-semibold ${gender === value ? "bg-primary text-primary-foreground" : "bg-card"}`}
            href={`?${new URLSearchParams({ gender: value, q, age })}`}
          >
            {value === "boy" ? t.boys : t.girls}
          </Link>
        ))}
      </nav>
      <form className="mb-6 grid items-end gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-[1fr_auto_auto]">
        <input type="hidden" name="gender" value={gender} />
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
        <RankingTable players={players} offset={offset} locale={locale} />
      ) : (
        <p className="rounded-xl border bg-card p-6">{t.emptyResults}</p>
      )}
      <nav className="mt-5 flex gap-5 text-sm">
        {page > 1 && (
          <Link
            className="underline"
            href={`?${new URLSearchParams({ q, age, gender, page: String(page - 1) })}`}
          >
            {t.previous}
          </Link>
        )}
        {page * 50 < found.length && (
          <Link
            className="underline"
            href={`?${new URLSearchParams({ q, age, gender, page: String(page + 1) })}`}
          >
            {t.next}
          </Link>
        )}
      </nav>
    </>
  );
}
