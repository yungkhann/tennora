import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import { Card } from "@/components/ui/card";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = messages(locale),
    { roles } = await requireStaff(locale);
  return (
    <>
      <p className="eyebrow mb-3">{t.league}</p>
      <h1 className="text-3xl font-semibold">{t.workspace}</h1>
      <Card className="mt-8 p-6">
        <h2 className="font-semibold">{t.access}</h2>
        <p className="mt-3">{roles.map((r) => t[r]).join(" · ")}</p>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {t.coming}
        </p>
        {roles.includes("organizer") && (
          <Link
            className="mt-6 inline-block font-semibold text-primary underline"
            href={`/${locale}/organizer/staff`}
          >
            {t.staff}
          </Link>
        )}
      </Card>
    </>
  );
}
