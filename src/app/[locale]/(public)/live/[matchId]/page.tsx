import { z } from "zod";
import { notFound } from "next/navigation";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { publicMatch } from "@/features/public/data";
import { LiveMatches } from "@/features/public/live";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; matchId: string }>;
}) {
  const p = await params,
    locale = localeOf(p.locale),
    t = publicMessages(locale);
  if (!z.uuid().safeParse(p.matchId).success) notFound();
  const match = await publicMatch(p.matchId);
  if (!match) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-semibold">
        {t.match} · {match.data.a.name ?? t.pending} /{" "}
        {match.data.b.name ?? t.pending}
      </h1>
      <LiveMatches initial={[match]} locale={locale} match={p.matchId} large />
    </div>
  );
}
