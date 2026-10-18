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
  return (
    <>
      <Link
        className="text-sm underline"
        href={`/${locale}/tournament/${tour.id}`}
      >
        {tour.name}
      </Link>
      <h1 className="mt-5 mb-6 text-3xl font-semibold">{t.schedule}</h1>
      <LiveMatches
        initial={await publicMatches(tour.id)}
        locale={locale}
        tour={tour.id}
        all
      />
    </>
  );
}
