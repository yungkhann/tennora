import Link from "next/link";
import { Brand } from "@/components/brand";
import { locales } from "@/lib/locales";
export const dynamic = "force-dynamic";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/30 px-6 py-8">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-5">
        <Brand />
        <nav aria-label="Language" className="flex gap-4 text-sm">
          {locales.map((l) => (
            <Link key={l} href={`/${l}/login`} hrefLang={l}>
              {l.toUpperCase()}
            </Link>
          ))}
        </nav>
      </header>
      <main
        id="main-content"
        className="mx-auto mt-12 max-w-md rounded-2xl border bg-card p-6 sm:p-9"
      >
        {children}
      </main>
    </div>
  );
}
