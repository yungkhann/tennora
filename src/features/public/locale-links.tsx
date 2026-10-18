"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/lib/locales";
export function PublicLocaleLinks({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-3 text-xs" aria-label={label}>
      {locales.map((l) => (
        <Link
          key={l}
          href={pathname.replace(/^\/(ru|kk|en)(?=\/|$)/, `/${l}`)}
          hrefLang={l}
          aria-current={l === locale ? "true" : undefined}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
