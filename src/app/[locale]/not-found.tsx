"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
export default function NotFound() {
  const locale = localeOf(usePathname().split("/")[1]),
    t = publicMessages(locale);
  return (
    <main id="main-content" className="mx-auto max-w-xl px-6 py-20">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-4 text-3xl font-semibold">{t.notFound}</h1>
      <p className="mt-4 text-muted-foreground">{t.notFoundHelp}</p>
      <Link
        className="mt-6 inline-block min-h-11 rounded-lg bg-primary px-5 py-3 text-primary-foreground"
        href={`/${locale}`}
      >
        {t.home}
      </Link>
    </main>
  );
}
