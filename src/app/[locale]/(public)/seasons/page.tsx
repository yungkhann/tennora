import Link from "next/link";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { publicDirectory } from "@/features/public/data";
import { EmptyCompetition } from "@/features/public/components";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = publicMessages(locale),
    d = await publicDirectory();
  return (
    <>
      <h1 className="mb-7 text-3xl font-semibold">{t.seasons}</h1>
      {d.seasons.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {d.seasons.map((s) => (
            <Link
              className="rounded-xl border bg-card p-6"
              href={`/${locale}/season/${s.id}`}
              key={s.id}
            >
              <p className="font-mono text-sm">{s.year}</p>
              <h2 className="mt-3 text-2xl font-semibold">{s.name} ↗</h2>
              <p className="mt-4 text-sm text-muted-foreground">
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeZone: "UTC",
                }).format(new Date(s.starts_on))}{" "}
                /{" "}
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeZone: "UTC",
                }).format(new Date(s.ends_on))}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyCompetition locale={locale} />
      )}
    </>
  );
}
