import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { publicMatches } from "@/features/public/data";
import { designMessages } from "@/features/public/design-messages";
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
      <header className="page-heading">
        <div>
          <p className="eyebrow mb-3">
            Tennora / {designMessages(locale).matchCentre}
          </p>
          <h1>{t.live}</h1>
        </div>
        <p className="max-w-sm text-xs leading-6 text-muted-foreground">
          {designMessages(locale).liveHelp}
        </p>
      </header>
      <LiveMatches initial={await publicMatches()} locale={locale} browse />
    </>
  );
}
