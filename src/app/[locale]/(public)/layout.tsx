import Link from "next/link";
import { PublicDataRefresh } from "@/features/public/refresh";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { PublicLocaleLinks } from "@/features/public/locale-links";
import { PublicInstall } from "@/features/public/install";
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
    <div className="mx-auto flex min-h-dvh max-w-[1480px] flex-col px-5 md:px-10">
      <PublicDataRefresh />
      <header className="flex flex-wrap items-center justify-between gap-5 border-b py-5">
        <Brand href={`/${locale}`} />
        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium"
          aria-label={t.navigation}
        >
          {[
            ["", t.home],
            ["/live", t.live],
            ["/ranking", t.ranking],
            ["/seasons", t.seasons],
            ["/teams", t.teams],
          ].map(([path, label]) => (
            <Link
              className="min-h-11 py-3 hover:underline"
              key={path}
              href={`/${locale}${path}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <PublicLocaleLinks locale={locale} label={t.language} />
          <ThemeToggle label={t.theme} />
          <Link
            className="rounded-lg border px-4 py-3 text-sm"
            href={`/${locale}/login`}
          >
            {t.staff}
          </Link>
        </div>
      </header>
      <main id="main-content" className="min-w-0 flex-1 py-8 md:py-12">
        {children}
      </main>
      <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t py-6 text-xs text-muted-foreground">
        <p>
          © {new Date().getUTCFullYear()} Tennora · {t.footer}
        </p>
        <Link href={`/${locale}/scoreboard`} className="underline">
          {t.scoreboard}
        </Link>
        <PublicInstall locale={locale} />
      </footer>
    </div>
  );
}
