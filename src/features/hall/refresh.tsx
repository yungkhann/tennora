"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/locales";
import { hallMessages } from "./messages";
export function HallRefresh({
  locale,
  tour,
}: {
  locale: Locale;
  tour: string;
}) {
  const router = useRouter(),
    [stale, setStale] = useState(false),
    t = hallMessages(locale);
  useEffect(() => {
    let stopped = false,
      running = false,
      controller: AbortController | undefined;
    const check = async () => {
      if (
        stopped ||
        running ||
        document.visibilityState !== "visible" ||
        document.activeElement?.closest("form")
      )
        return;
      running = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 7000);
      try {
        const response = await fetch(`/api/staff/hall/${tour}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        if (!stopped) {
          setStale(false);
          router.refresh();
        }
      } catch {
        if (!stopped) setStale(true);
      } finally {
        clearTimeout(timeout);
        running = false;
      }
    };
    const timer = setInterval(check, 10000);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", check);
    };
  }, [router, tour]);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
      <button
        type="button"
        className="min-h-11 underline"
        onClick={() => router.refresh()}
      >
        {t.refresh}
      </button>
      {stale && <p role="status">{t.stale}</p>}
    </div>
  );
}
