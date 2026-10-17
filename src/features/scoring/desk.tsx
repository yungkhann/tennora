"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/locales";
import { deskSchema, type JudgeDesk } from "./validation";
import { scoringMessages } from "./messages";
export function JudgeDeskView({
  initial,
  locale,
}: {
  initial: JudgeDesk;
  locale: Locale;
}) {
  const [desk, setDesk] = useState(initial),
    [fresh, setFresh] = useState(false),
    t = scoringMessages(locale);
  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout>,
      controller: AbortController,
      delay = 3000;
    const schedule = (ms = delay) => {
      clearTimeout(timer);
      if (!stopped && document.visibilityState === "visible")
        timer = setTimeout(poll, ms);
    };
    async function poll() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      try {
        const response = await fetch("/api/staff/judge-desk", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unavailable");
        const value = deskSchema.parse(await response.json());
        if (!stopped) {
          setDesk(value);
          setFresh(true);
          delay = 3000;
        }
      } catch {
        if (!stopped) {
          setFresh(false);
          delay = Math.min(delay * 2, 30000);
        }
      } finally {
        clearTimeout(timeout);
        schedule();
      }
    }
    const visibility = () => {
      controller?.abort();
      setFresh(false);
      schedule(0);
    };
    document.addEventListener("visibilitychange", visibility);
    schedule(0);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return (
    <>
      <h1 className="text-3xl font-semibold">{t.desk}</h1>
      <p role="status" className="my-4 text-sm text-muted-foreground">
        {fresh ? t.connected : t.checking}
      </p>
      {!desk.length ? (
        <p className="rounded-xl border bg-card p-6">{t.empty}</p>
      ) : (
        desk.map((row) => {
          const m = row.match,
            g =
              m?.singles.find((v) => v.status === "in_progress") ??
              m?.singles.find((v) => v.status === "pending");
          return (
            <section
              key={row.assignment_id}
              className="mb-6 rounded-xl border bg-card p-6"
            >
              <p className="eyebrow">{row.venue_day}</p>
              <h2 className="my-3 text-2xl font-semibold">
                {t.table} {row.table_number}
              </h2>
              {!m ? (
                <p>{t.waiting}</p>
              ) : !m.lineups.revealed ? (
                <p>{t.hidden}</p>
              ) : m.status !== "in_progress" ? (
                <p>{t.waitingStart}</p>
              ) : g ? (
                <Link
                  className="text-link inline-block py-4"
                  href={`/${locale}/linear-judge/${g.id}`}
                >
                  {t.open} · {t.singles} {g.slot}
                </Link>
              ) : (
                <p>{t.waiting}</p>
              )}
            </section>
          );
        })
      )}
    </>
  );
}
