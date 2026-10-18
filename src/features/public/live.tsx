"use client";
import { useEffect, useRef, useState } from "react";
import { publicBrowserClient } from "@/lib/supabase/public-browser";
import type { Locale } from "@/lib/locales";
import { publicRowSchema, type PublicRow } from "./validation";
import { publicMessages } from "./messages";
import { MatchCard } from "./components";
function PublicTimeout({ until, label }: { until: string; label: string }) {
  const [active, setActive] = useState(true);
  useEffect(() => {
    const update = () => setActive(Date.parse(until) > Date.now());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [until]);
  return active ? <p className="mt-2 text-center text-sm">{label}</p> : null;
}
export function LiveMatches({
  initial,
  locale,
  tour,
  match,
  large = false,
  all = false,
}: {
  initial: PublicRow[];
  locale: Locale;
  tour?: string;
  match?: string;
  large?: boolean;
  all?: boolean;
}) {
  const [rows, setRows] = useState(initial),
    [connection, setConnection] = useState<
      "connecting" | "connected" | "polling" | "offline" | "resync"
    >("connecting"),
    current = useRef(initial),
    t = publicMessages(locale);
  useEffect(() => {
    let stopped = false,
      controller: AbortController | undefined,
      timer: ReturnType<typeof setTimeout>,
      inflight = false,
      changes = 0,
      delay = 5000;
    const deleted = new Set<string>();
    const commit = (value: PublicRow[]) => {
      current.current = value;
      setRows(value);
    };
    const refresh = async (fresh = false) => {
      if (stopped || inflight || document.visibilityState !== "visible") return;
      inflight = true;
      controller = new AbortController();
      const stamp = changes,
        timeout = setTimeout(() => controller?.abort(), 7000);
      try {
        const params = new URLSearchParams();
        if (tour) params.set("tour", tour);
        if (fresh) params.set("fresh", String(Date.now()));
        const response = await fetch(
          match
            ? `/api/public/matches/${match}?${params}`
            : `/api/public/matches?${params}`,
          { cache: "no-store", credentials: "omit", signal: controller.signal },
        );
        if (!response.ok) throw new Error();
        const parsed = publicRowSchema
          .array()
          .safeParse(match ? [await response.json()] : await response.json());
        if (!parsed.success) throw new Error();
        if (!stopped && stamp === changes) {
          const merged = parsed.data
            .filter((r) => !deleted.has(r.match_id))
            .map((r) => {
              const old = current.current.find(
                (v) => v.match_id === r.match_id,
              );
              return old && old.version > r.version ? old : r;
            });
          commit(merged);
          setConnection((v) => (v === "connected" ? v : "polling"));
          delay = 5000;
        }
      } catch {
        if (!stopped) {
          setConnection("offline");
          delay = Math.min(30000, delay * 1.5);
        }
      } finally {
        clearTimeout(timeout);
        inflight = false;
      }
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!stopped)
        timer = setTimeout(async () => {
          await refresh();
          schedule();
        }, delay);
    };
    const client = publicBrowserClient();
    const channel = client
      ?.channel(`public-league-${match ?? tour ?? "board"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "public_match_snapshots",
          ...(match
            ? { filter: `match_id=eq.${match}` }
            : tour
              ? { filter: `tour_id=eq.${tour}` }
              : {}),
        },
        (payload) => {
          if (stopped) return;
          changes++;
          if (payload.eventType === "DELETE") {
            const id = payload.old.match_id;
            if (typeof id === "string") {
              deleted.add(id);
              commit(current.current.filter((v) => v.match_id !== id));
            }
            return;
          }
          const parsed = publicRowSchema.safeParse(payload.new);
          if (!parsed.success) {
            void refresh(true);
            return;
          }
          const row = parsed.data,
            old = current.current.find((v) => v.match_id === row.match_id);
          if (old && old.version >= row.version) return;
          if (old && row.version > old.version + 1) {
            void refresh(true);
            return;
          }
          commit([
            ...current.current.filter((v) => v.match_id !== row.match_id),
            row,
          ]);
        },
      )
      .subscribe((status) => {
        if (stopped) return;
        if (status === "SUBSCRIBED") {
          setConnection("connected");
          void refresh(true);
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setConnection("resync");
          void refresh(true);
        }
      });
    void refresh(true);
    schedule();
    const refocus = () => {
      if (document.visibilityState === "visible") {
        delay = 5000;
        void refresh(true);
        schedule();
      }
    };
    document.addEventListener("visibilitychange", refocus);
    window.addEventListener("online", refocus);
    const disconnected = () => setConnection("offline");
    window.addEventListener("offline", disconnected);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", refocus);
      window.removeEventListener("online", refocus);
      window.removeEventListener("offline", disconnected);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [tour, match]);
  const matches = rows
    .map((r) => r.data)
    .filter((m) => all || match || ["called", "in_progress"].includes(m.status))
    .sort(
      (a, b) =>
        (a.table ?? 999) - (b.table ?? 999) ||
        a.round - b.round ||
        a.number - b.number,
    );
  return (
    <>
      <p
        role="status"
        aria-live="polite"
        className="mb-5 text-xs text-muted-foreground"
      >
        {t[connection]}
      </p>
      {matches.length ? (
        <div
          className={`grid grid-cols-1 gap-5 ${match ? "" : "lg:grid-cols-2"} ${large && !match ? "2xl:grid-cols-3" : ""}`}
        >
          {matches.map((m) => (
            <div key={m.id} className="min-w-0">
              <MatchCard match={m} locale={locale} large={large} />
              {match && (
                <div className="mt-6 grid gap-4">
                  {!m.revealed && (
                    <p className="rounded-lg border p-5 text-sm">{t.hidden}</p>
                  )}
                  {m.singles.map((g) => (
                    <section
                      key={g.id}
                      className="rounded-xl border bg-card p-5"
                    >
                      <div className="flex flex-wrap justify-between gap-3 text-xs text-muted-foreground">
                        <span>
                          {g.slot} · {t[`status_${g.status}`]}
                        </span>
                        {g.kind && (
                          <span>
                            {g.kind === "played" ? t.played : t.withdrawal}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <span className="break-words font-semibold">
                          {g.summary?.server === "a" &&
                          g.status === "in_progress"
                            ? "● "
                            : ""}
                          {g.a.name}
                        </span>
                        <strong className="font-mono text-2xl">
                          {g.summary?.sets_a ?? 0} : {g.summary?.sets_b ?? 0}
                        </strong>
                        <span className="break-words text-right font-semibold">
                          {g.b.name}
                          {g.summary?.server === "b" &&
                          g.status === "in_progress"
                            ? " ●"
                            : ""}
                        </span>
                      </div>
                      <p className="mt-3 text-center font-mono text-sm">
                        {g.sets.map((s) => `${s.a}:${s.b}`).join(" / ")}
                      </p>
                      {g.timeout_until && (
                        <PublicTimeout
                          until={g.timeout_until}
                          label={t.timeout}
                        />
                      )}
                    </section>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          {t.noLive}
        </p>
      )}
    </>
  );
}
