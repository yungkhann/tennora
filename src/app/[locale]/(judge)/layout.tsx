import { ThemeToggle } from "@/components/theme-toggle";
import { publicMessages } from "@/features/public/messages";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages, locales } from "@/lib/locales";
import { signOut } from "@/features/auth/actions";
export const dynamic = "force-dynamic";
export default async function JudgeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = messages(locale);
  await requireStaff(locale);
  return (
    <div className="min-h-dvh">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b bg-card px-4 py-3 sm:px-8">
        <Brand />
        <nav
          aria-label={t.workspace}
          className="flex flex-wrap items-center gap-5 text-sm"
        >
          <Link className="py-2" href={`/${locale}/workspace`}>
            {t.workspace}
          </Link>
          <nav aria-label={t.language} className="flex gap-4">
            {locales.map((l) => (
              <Link
                className="py-2"
                key={l}
                href={`/${l}/linear-judge`}
                hrefLang={l}
                aria-current={l === locale ? "true" : undefined}
              >
                {l.toUpperCase()}
              </Link>
            ))}
          </nav>
          <ThemeToggle label={publicMessages(locale).theme} />
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <Button variant="ghost" type="submit">
              {t.signOut}
            </Button>
          </form>
        </nav>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-3 py-5 sm:px-8">
        {children}
      </main>
    </div>
  );
}
