"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/locales";
import { Button } from "@/components/ui/button";
import {
  scoreCommandSchema,
  scoreSnapshotSchema,
  type ScoreCommand,
  type ScoreSnapshot,
} from "./validation";
import { scoringMessages } from "./messages";
const staleSince = (stamp: number) => performance.now() - stamp > 7000;
type Connection = "checking" | "connected" | "stale";
export function Scoreboard({
  initial,
  locale,
  staffId,
}: {
  initial: ScoreSnapshot;
  locale: Locale;
  staffId: string;
}) {
  const t = scoringMessages(locale),
    [snapshot, setSnapshot] = useState(initial),
    [connection, setConnection] = useState<Connection>("checking"),
    [pending, setPending] = useState<ScoreCommand | null>(null),
    [sending, setSending] = useState(false),
    [message, setMessage] = useState(""),
    [storageOk, setStorageOk] = useState(false),
    [serverNow, setServerNow] = useState(Date.parse(initial.server_now)),
    [visible, setVisible] = useState(true);
  const current = useRef(initial),
    inFlight = useRef(false),
    pendingRef = useRef<ScoreCommand | null>(null),
    received = useRef(-Infinity),
    serverClock = useRef({ server: Date.parse(initial.server_now), local: 0 }),
    refresh = useRef<() => void>(() => {}),
    mounted = useRef(false);
  const storageKey = `tennora-score:${staffId}:${initial.game_id}`;
  function accept(value: unknown) {
    const next = scoreSnapshotSchema.parse(value);
    if (next.game_id !== current.current.game_id) throw new Error("Wrong game");
    if (
      next.version < current.current.version ||
      next.match_version < current.current.match_version
    )
      return;
    current.current = next;
    received.current = performance.now();
    serverClock.current = {
      server: Date.parse(next.server_now),
      local: performance.now(),
    };
    setServerNow(Date.parse(next.server_now));
    setSnapshot(next);
    setConnection("connected");
  }
  useEffect(() => {
    mounted.current = true;
    const startup = setTimeout(() => {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          const parsed = scoreCommandSchema.parse(JSON.parse(stored));
          if (parsed.game !== initial.game_id) throw new Error("Wrong game");
          pendingRef.current = parsed;
          setPending(parsed);
        } else {
          sessionStorage.setItem(storageKey, "test");
          sessionStorage.removeItem(storageKey);
        }
        setStorageOk(true);
      } catch {
        setMessage(t.storage);
      }
    }, 0);
    let stopped = false,
      timer: ReturnType<typeof setTimeout>,
      controller: AbortController | undefined,
      delay = 3000;
    const schedule = (ms = delay) => {
      clearTimeout(timer);
      if (!stopped && document.visibilityState === "visible")
        timer = setTimeout(poll, ms);
    };
    async function poll() {
      if (inFlight.current) {
        schedule();
        return;
      }
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 7000);
      try {
        const response = await fetch(`/api/staff/scoring/${initial.game_id}`, {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unavailable");
        const value: unknown = await response.json();
        if (!stopped && !inFlight.current) {
          accept(value);
          delay = 3000;
        }
      } catch {
        if (!stopped) {
          setConnection("stale");
          delay = Math.min(delay * 2, 30000);
        }
      } finally {
        clearTimeout(timeout);
        schedule();
      }
    }
    const visibility = () => {
      const active = document.visibilityState === "visible";
      setVisible(active);
      setConnection("checking");
      controller?.abort();
      schedule(0);
    };
    const online = () => {
      setConnection("checking");
      schedule(0);
    };
    const offline = () => {
      setConnection("stale");
      controller?.abort();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    const clock = setInterval(() => {
      setServerNow(
        serverClock.current.server +
          performance.now() -
          serverClock.current.local,
      );
      if (performance.now() - received.current > 7000) setConnection("stale");
    }, 1000);
    refresh.current = () => schedule(0);
    schedule(0);
    return () => {
      mounted.current = false;
      stopped = true;
      clearTimeout(timer);
      clearInterval(clock);
      clearTimeout(startup);
      controller?.abort();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
    // A new game is mounted with a distinct key; snapshots are coordinated through refs.
  }, [initial.game_id, storageKey, t.storage]);
  function forget() {
    sessionStorage.removeItem(storageKey);
    pendingRef.current = null;
    setPending(null);
  }
  async function transmit(command: ScoreCommand) {
    if (
      inFlight.current ||
      document.visibilityState !== "visible" ||
      !navigator.onLine
    )
      return;
    inFlight.current = true;
    setSending(true);
    setMessage("");
    pendingRef.current = command;
    setPending(command);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(command));
    } catch {
      setStorageOk(false);
      setMessage(t.storage);
      setSending(false);
      inFlight.current = false;
      return;
    }
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("/api/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(command),
        signal: controller.signal,
      });
      if (!mounted.current) return;
      if (!response.ok) {
        if ([400, 401, 403, 404, 409, 422, 429].includes(response.status)) {
          forget();
          setConnection("checking");
          setMessage(
            response.status === 429
              ? t.rate
              : response.status === 422 || response.status === 400
                ? t.invalid
                : t.conflict,
          );
          refresh.current();
          return;
        }
        throw new Error("Unknown outcome");
      }
      accept(await response.json());
      forget();
    } catch {
      if (mounted.current) {
        setConnection("stale");
        setMessage(t.uncertain);
      }
    } finally {
      clearTimeout(timeout);
      inFlight.current = false;
      if (mounted.current) {
        setSending(false);
        refresh.current();
      }
    }
  }
  const fresh =
    connection === "connected" && visible && storageOk && !pending && !sending;
  const writable =
    fresh && snapshot.can_score && snapshot.match_status === "in_progress";
  const unavailable =
      !snapshot.availability.a_active || !snapshot.availability.b_active,
    bothOut =
      !snapshot.availability.a_active && !snapshot.availability.b_active;
  const timeoutLeft = snapshot.timeout_until
    ? Math.max(
        0,
        Math.ceil((Date.parse(snapshot.timeout_until) - serverNow) / 1000),
      )
    : 0;
  const playing =
    writable &&
    snapshot.status === "in_progress" &&
    !unavailable &&
    timeoutLeft === 0;
  function send(kind: ScoreCommand["kind"], side: "a" | "b" | null = null) {
    if (
      !writable ||
      pendingRef.current ||
      inFlight.current ||
      staleSince(received.current)
    )
      return;
    const command = scoreCommandSchema.parse({
      command_id: crypto.randomUUID(),
      game: snapshot.game_id,
      kind,
      side,
      expected_version: current.current.version,
      note: "",
    });
    void transmit(command);
  }
  const sides: Array<"a" | "b"> = snapshot.summary.ends_swapped
    ? ["b", "a"]
    : ["a", "b"];
  return (
    <div className="judge-score">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-link" href={`/${locale}/linear-judge`}>
          {t.desk}
        </Link>
        <p className="font-mono text-sm">
          {t.table} {snapshot.table_number ?? "—"} · {snapshot.age_group} ·{" "}
          {t.singles} {snapshot.slot}/5
        </p>
      </div>
      <div className="my-5 flex flex-wrap items-center justify-between gap-2 border-y py-3">
        <p role="status" aria-live="polite" className="text-sm font-semibold">
          {sending
            ? t.sending
            : pending
              ? t.uncertain
              : connection === "connected"
                ? t.connected
                : connection === "checking"
                  ? t.checking
                  : t.stale}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setConnection("checking");
            refresh.current();
          }}
          disabled={sending}
        >
          {t.refresh}
        </Button>
      </div>
      {message && (
        <p role="alert" className="mb-4 rounded-lg border p-4 text-sm">
          {message}
        </p>
      )}
      {pending && (
        <Button
          className="mb-5 min-h-12"
          onClick={() => void transmit(pending)}
          disabled={sending || !visible}
        >
          {t.retry}
        </Button>
      )}
      {!snapshot.can_score && <p className="mb-4 text-sm">{t.readOnly}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2">
        <h1 className="text-xl font-semibold">
          {t.set} {snapshot.summary.set_number}
        </h1>
        <p className="text-sm">
          {t.teamWins} · A {snapshot.team_wins.a} : {snapshot.team_wins.b} B
        </p>
      </div>
      <div className="relative grid grid-cols-2 overflow-hidden rounded-xl border bg-card">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 z-10 border-l-2 border-dashed border-border"
        />
        {sides.map((side) => {
          const player = snapshot.players[side],
            serving = snapshot.summary.server === side;
          return (
            <section
              key={side}
              aria-label={`${side} ${player.name}`}
              className="flex min-w-0 flex-col p-3 sm:p-5"
            >
              <p className="min-h-8 text-xs text-muted-foreground break-words sm:min-h-4">
                {side.toUpperCase()} · {snapshot.teams[side]}
              </p>
              <h2 className="mt-2 min-h-14 text-lg leading-tight font-semibold break-words">
                {player.name}
              </h2>
              <p className="mt-2 min-h-6 text-xs font-semibold text-primary">
                {serving ? `● ${t.server}` : "\u00a0"}
              </p>
              <Button
                variant="ghost"
                data-testid={`point-${side}`}
                aria-label={`${t.point} ${side.toUpperCase()}`}
                disabled={!playing}
                onKeyDown={(e) => {
                  if (e.repeat) e.preventDefault();
                }}
                onClick={() => send("point", side)}
                className="my-2 h-auto min-h-36 w-full flex-col gap-0 rounded-lg border border-border bg-secondary py-5 font-mono text-7xl tabular-nums sm:min-h-44 sm:text-8xl"
              >
                <span data-testid={`points-${side}`}>
                  {side === "a"
                    ? snapshot.summary.points_a
                    : snapshot.summary.points_b}
                </span>
                <span className="mt-3 font-sans text-xs font-semibold">
                  + {t.point}
                </span>
              </Button>
              <p className="text-sm">
                {t.sets}{" "}
                <strong>
                  {side === "a"
                    ? snapshot.summary.sets_a
                    : snapshot.summary.sets_b}
                </strong>{" "}
                · Elo {player.rating}
              </p>
              <Button
                className="mt-4 min-h-12 w-full whitespace-normal"
                variant="outline"
                disabled={!playing || snapshot.timeouts[side]}
                onClick={() => send("timeout", side)}
              >
                {snapshot.timeouts[side]
                  ? t.timeoutUsed
                  : `${t.timeout} · 60 s`}
              </Button>
            </section>
          );
        })}
      </div>
      {snapshot.summary.ends_swapped && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t.changeEnds}
        </p>
      )}
      {snapshot.status === "pending" && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            className="min-h-14 whitespace-normal"
            disabled={!writable}
            onClick={() => send("start", "a")}
          >
            {t.startA}
          </Button>
          <Button
            className="min-h-14 whitespace-normal"
            disabled={!writable}
            onClick={() => send("start", "b")}
          >
            {t.startB}
          </Button>
        </div>
      )}
      {timeoutLeft > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-secondary p-5">
          <p className="font-mono text-xl" role="timer">
            {t.timeout} {snapshot.timeout_side?.toUpperCase()} · {timeoutLeft}s
          </p>
          <Button disabled={!writable} onClick={() => send("resume_timeout")}>
            {t.resume}
          </Button>
        </div>
      )}
      {snapshot.status === "in_progress" && unavailable && (
        <div className="mt-5 rounded-lg border p-5">
          <p>{bothOut ? t.bothOut : t.rest}</p>
          {!bothOut && (
            <Button
              className="mt-4 min-h-12"
              disabled={!writable}
              onClick={() => send("withdrawal")}
            >
              {t.withdrawal}
            </Button>
          )}
        </div>
      )}
      {snapshot.status === "in_progress" && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="min-h-12 whitespace-normal"
            disabled={!playing || !snapshot.last_point_side}
            onClick={() => send("undo_point")}
          >
            {t.undoPoint}
          </Button>
          <Button
            variant="outline"
            className="min-h-12 whitespace-normal"
            disabled={!playing || !snapshot.last_point_side}
            onClick={() => {
              if (window.confirm(t.undoSetConfirm)) send("undo_set");
            }}
          >
            {t.undoSet}
          </Button>
        </div>
      )}
      {snapshot.score && (
        <ol
          aria-label={t.sets}
          className="mt-5 flex flex-wrap gap-3 font-mono text-sm"
        >
          {snapshot.score.sets.map((set, i) => (
            <li className="rounded border px-3 py-2" key={i}>
              {i + 1} · {set.a}:{set.b}
            </li>
          ))}
        </ol>
      )}
      {(snapshot.status === "finished" || snapshot.status === "cancelled") && (
        <div className="mt-5 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">
            {snapshot.status === "finished" ? t.finished : t.cancelled}
          </h2>
          {snapshot.result && (
            <p className="mt-2">
              {snapshot.result.kind === "withdrawal" ? t.automatic : t.sets} ·{" "}
              {snapshot.result.sets_a}:{snapshot.result.sets_b} · {t.savedK}{" "}
              {snapshot.result.k}
            </p>
          )}
          {snapshot.match_status === "finished" ? (
            <p className="mt-3">{t.completeTeam}</p>
          ) : (
            snapshot.next_game_id && (
              <Link
                className="text-link mt-4 inline-block py-3"
                href={`/${locale}/linear-judge/${snapshot.next_game_id}`}
              >
                {t.next}
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
