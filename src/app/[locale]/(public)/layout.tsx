import Link from "next/link";
import { ArrowUpRight, UserRound } from "lucide-react";
import { PublicDataRefresh } from "@/features/public/refresh";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { PublicLocaleLinks } from "@/features/public/locale-links";
import { PublicInstall } from "@/features/public/install";
import { PublicNavigation } from "@/features/public/navigation";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = publicMessages(locale);
  return (
    <div className="public-shell">
      <PublicDataRefresh />
      <header className="site-header">
        <div className="header-top">
          <Brand href={`/${locale}`} />
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <PublicLocaleLinks locale={locale} label={t.language} />
            <ThemeToggle label={t.theme} />
            <Link
              className="staff-entry"
              href={`/${locale}/login`}
              aria-label={t.staff}
            >
              <UserRound className="size-4" aria-hidden="true" />
              <span className="hidden xl:inline">{t.staff}</span>
            </Link>
          </div>
        </div>
        <PublicNavigation locale={locale} />
      </header>
      <main id="main-content" className="min-w-0 flex-1 py-6 md:py-9">
        {children}
      </main>
      <footer className="mt-10 flex flex-wrap items-center justify-between gap-5 border-t py-7 text-[11px] text-muted-foreground">
        <div>
          <Brand href={`/${locale}`} className="mb-2 text-foreground" />
          <p>
            © {new Date().getUTCFullYear()} · {t.footer}
          </p>
        </div>
        <Link
          href={`/${locale}/scoreboard`}
          className="inline-flex min-h-11 items-center gap-2 font-semibold"
        >
          {t.scoreboard}
          <ArrowUpRight className="size-4" />
        </Link>
        <PublicInstall locale={locale} />
      </footer>
    </div>
  );
}
