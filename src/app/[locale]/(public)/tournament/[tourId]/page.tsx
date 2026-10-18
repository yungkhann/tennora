import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { publicDirectory, publicMatches } from "@/features/public/data";
import { LiveMatches } from "@/features/public/live";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; tourId: string }>;
}) {
  const p = await params,
    locale = localeOf(p.locale),
    t = publicMessages(locale);
  if (!z.uuid().safeParse(p.tourId).success) notFound();
  const d = await publicDirectory(),
    tour = d.tours.find((v) => v.id === p.tourId);
  if (!tour) notFound();
  const matches = await publicMatches(tour.id);
  return (
    <>
      <Link
        className="text-sm underline"
        href={`/${locale}/season/${tour.season_id}`}
      >
        {t.seasonStandings}
      </Link>
      <p className="mt-6 text-sm text-muted-foreground">
        {t.tour} {tour.ordinal} ·{" "}
        {new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeZone: "UTC",
        }).format(new Date(tour.starts_on))}{" "}
        /{" "}
        {new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeZone: "UTC",
        }).format(new Date(tour.ends_on))}
      </p>
      <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{tour.name}</h1>
      <nav className="mt-6 flex flex-wrap gap-3">
        <Link
          className="rounded-lg border bg-card px-4 py-3 text-sm"
          href={`/${locale}/tournament/${tour.id}/matches`}
        >
          {t.schedule}
        </Link>
        {d.draws
          .filter((v) => v.tour_id === tour.id)
          .map((v) => (
            <Link
              key={v.id}
              className="rounded-lg border bg-card px-4 py-3 text-sm"
              href={`/${locale}/tournament/${tour.id}/draws/${v.id}`}
            >
              {t.draws} · {v.age_group}
            </Link>
          ))}
      </nav>
      <h2 className="mt-10 mb-4 text-xl font-semibold">{t.live}</h2>
      <LiveMatches initial={matches} locale={locale} tour={tour.id} />
    </>
  );
}
