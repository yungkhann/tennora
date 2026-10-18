"use client";
import { usePathname } from "next/navigation";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
export function SkipLink() {
  const t = publicMessages(localeOf(usePathname().split("/")[1]));
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-4"
    >
      {t.skip}
    </a>
  );
}
