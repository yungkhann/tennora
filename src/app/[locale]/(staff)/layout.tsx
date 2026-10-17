import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages, locales } from "@/lib/locales";
import { signOut } from "@/features/auth/actions";
export const dynamic = "force-dynamic";
export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = messages(locale);
  const { staff, roles } = await requireStaff(locale);
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[250px_1fr]">
      <aside className="border-b bg-card p-6 md:border-r">
        <Brand />
        <p className="eyebrow mt-8 mb-5">{t.league}</p>
        <nav aria-label={t.workspace} className="grid gap-4 text-sm">
          <Link href={`/${locale}/workspace`}>{t.workspace}</Link>
          {roles.includes("organizer") && (
            <Link href={`/${locale}/organizer/staff`}>{t.staff}</Link>
          )}
          {roles.includes("organizer") && (
            <Link href={`/${locale}/organizer/seasons`}>{t.seasons}</Link>
          )}
          {roles.some((r) =>
            ["organizer", "main_judge", "trainer"].includes(r),
          ) && <Link href={`/${locale}/team`}>{t.teams}</Link>}
          {roles.some((r) => r === "organizer" || r === "main_judge") && (
            <Link href={`/${locale}/draws`}>{t.draws}</Link>
          )}
          <Link href={`/${locale}/settings/profile`}>{t.profile}</Link>
          <Link href="/">{t.publicHome}</Link>
        </nav>
        <p className="mt-8 break-words text-sm font-semibold">
          {staff.display_name}
        </p>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          {roles.map((r) => t[r]).join(" · ")}
        </p>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4">
          <nav aria-label={t.language} className="flex gap-4 text-sm">
            {locales.map((l) => (
              <Link
                href={`/${l}/workspace`}
                key={l}
                hrefLang={l}
                aria-current={l === locale ? "true" : undefined}
              >
                {l.toUpperCase()}
              </Link>
            ))}
          </nav>
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <Button variant="ghost" type="submit">
              {t.signOut}
            </Button>
          </form>
        </header>
        <main id="main-content" className="mx-auto max-w-6xl p-6 md:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
