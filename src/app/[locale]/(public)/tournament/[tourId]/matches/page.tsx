import { z } from "zod";
import { notFound } from "next/navigation";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { publicDirectory, publicMatches } from "@/features/public/data";
import {
  TournamentHeader,
  CompetitionTabs,
} from "@/features/public/competition";
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
  return (
    <>
      <TournamentHeader tour={tour} locale={locale} />
      <CompetitionTabs
        tour={tour}
        locale={locale}
        draws={d.draws}
        current="matches"
      />
      <h2 className="display-title mt-7 mb-5 text-3xl">{t.schedule}</h2>
      <LiveMatches
        initial={await publicMatches(tour.id)}
        locale={locale}
        tour={tour.id}
        all
        browse
      />
    </>
  );
}
