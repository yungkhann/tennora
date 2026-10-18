import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { publicMatches } from "@/features/public/data";
import { LiveMatches } from "@/features/public/live";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = publicMessages(locale);
  return (
    <>
      <h1 className="mb-6 text-3xl font-semibold">{t.scoreboard}</h1>
      <LiveMatches initial={await publicMatches()} locale={locale} large />
    </>
  );
}
