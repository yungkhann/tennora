import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { publicMatch } from "@/features/public/data";
import { localeOf } from "@/lib/locales";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; tourId: string; matchId: string }>;
}) {
  const p = await params;
  if (
    !z.uuid().safeParse(p.matchId).success ||
    !z.uuid().safeParse(p.tourId).success
  )
    notFound();
  const m = await publicMatch(p.matchId);
  if (!m || m.tour_id !== p.tourId) notFound();
  redirect(`/${localeOf(p.locale)}/live/${p.matchId}`);
}
