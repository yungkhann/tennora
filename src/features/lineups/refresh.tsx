"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { messages, type Locale } from "@/lib/locales";
export function LineupRefresh({
  locale,
  match,
  version,
}: {
  locale: Locale;
  match: string;
  version: number;
}) {
  const router = useRouter(),
    [state, setState] = useState<"checking" | "ok" | "stale">("checking"),
    t = messages(locale);
  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      controller: AbortController | undefined,
      delay = 3000;
    function schedule(ms = delay) {
      clearTimeout(timer);
      if (!stopped && document.visibilityState === "visible")
        timer = setTimeout(poll, ms);
    }
    async function poll() {
      controller = new AbortController();
      try {
        const response = await fetch(
          `/api/staff/matches/${match}/lineup-status`,
          {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          },
        );
        if ([401, 403, 404].includes(response.status)) {
          router.refresh();
          return;
        }
        if (!response.ok) throw new Error("Status unavailable");
        const value: unknown = await response.json();
        if (
          !value ||
          typeof value !== "object" ||
          !("lineup_version" in value) ||
          !Number.isInteger(value.lineup_version)
        )
          throw new Error("Invalid status");
        if (stopped) return;
        setState("ok");
        delay = 3000;
        if (value.lineup_version !== version) router.refresh();
      } catch (error) {
        if (
          stopped ||
          (error instanceof DOMException && error.name === "AbortError")
        )
          return;
        setState("stale");
        delay = Math.min(delay * 2, 30000);
      } finally {
        schedule();
      }
    }
    function visibility() {
      clearTimeout(timer);
      controller?.abort();
      if (document.visibilityState === "visible") schedule(0);
    }
    document.addEventListener("visibilitychange", visibility);
    schedule(0);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [match, version, router]);
  return (
    <p role="status" className="mt-3 text-xs text-muted-foreground">
      {state === "ok"
        ? t.lineupUpdates
        : state === "stale"
          ? t.lineupUpdatesStale
          : t.lineupUpdatesChecking}
    </p>
  );
}
