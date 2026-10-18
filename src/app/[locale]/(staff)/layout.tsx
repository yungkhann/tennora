import { NavLink } from "@/components/nav-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { publicMessages } from "@/features/public/messages";
import Link from "next/link";
import { hallMessages } from "@/features/hall/messages";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages, locales } from "@/lib/locales";
import { scoringMessages } from "@/features/scoring/messages";
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
    <div className="staff-shell">
      <aside className="staff-sidebar">
        <Brand />
        <p className="eyebrow mt-8 mb-5">{t.league}</p>
        <nav aria-label={t.workspace} className="staff-navigation">
          <NavLink href={`/${locale}/workspace`}>{t.workspace}</NavLink>
          {roles.some((r) => r === "organizer" || r === "main_judge") && (
            <NavLink href={`/${locale}/hall`}>
              {hallMessages(locale).title}
            </NavLink>
          )}
          {roles.includes("organizer") && (
            <NavLink href={`/${locale}/organizer/staff`}>{t.staff}</NavLink>
          )}
          {roles.includes("organizer") && (
            <NavLink href={`/${locale}/organizer/seasons`}>{t.seasons}</NavLink>
          )}
          {roles.some((r) =>
            ["organizer", "main_judge", "trainer"].includes(r),
          ) && <NavLink href={`/${locale}/team`}>{t.teams}</NavLink>}
          {roles.some((r) => r === "organizer" || r === "main_judge") && (
            <NavLink href={`/${locale}/draws`}>{t.draws}</NavLink>
          )}
          {roles.some((r) =>
            ["organizer", "main_judge", "trainer"].includes(r),
          ) && <NavLink href={`/${locale}/matches`}>{t.matches}</NavLink>}
          {roles.some((r) =>
            ["organizer", "main_judge", "line_judge"].includes(r),
          ) && (
            <NavLink href={`/${locale}/linear-judge`}>
              {scoringMessages(locale).desk}
            </NavLink>
          )}
          <NavLink href={`/${locale}/settings/profile`}>{t.profile}</NavLink>
          <NavLink href="/">{t.publicHome}</NavLink>
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
          <div className="flex items-center gap-3">
            <ThemeToggle label={publicMessages(locale).theme} />
            <form action={signOut}>
              <input type="hidden" name="locale" value={locale} />
              <Button variant="ghost" type="submit">
                {t.signOut}
              </Button>
            </form>
          </div>
        </header>
        <main
          id="main-content"
          className="staff-content mx-auto max-w-6xl p-5 md:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
