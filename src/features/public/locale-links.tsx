"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { locales, type Locale } from "@/lib/locales";
export function PublicLocaleLinks({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname();
  const links = locales.map((l) => (
    <Link
      key={l}
      href={pathname.replace(/^\/(ru|kk|en)(?=\/|$)/, `/${l}`)}
      hrefLang={l}
      aria-current={l === locale ? "true" : undefined}
    >
      {l.toUpperCase()}
    </Link>
  ));
  return (
    <>
      <nav className="locale-switch hidden sm:flex" aria-label={label}>
        {links}
      </nav>
      <details className="relative sm:hidden">
        <summary
          aria-label={label}
          className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-full border px-3 text-[10px] font-bold"
        >
          {locale.toUpperCase()}
          <ChevronDown className="size-3" />
        </summary>
        <nav
          className="absolute right-0 top-13 z-50 grid min-w-20 rounded-xl border bg-card p-1 shadow-lg [&_a]:grid [&_a]:min-h-11 [&_a]:place-items-center [&_a]:rounded-lg [&_a]:text-xs [&_a]:font-bold [&_a:hover]:bg-secondary [&_a[aria-current]]:bg-secondary"
          aria-label={label}
        >
          {links}
        </nav>
      </details>
    </>
  );
}
