"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { publicBrowserClient } from "@/lib/supabase/public-browser";
import { publicRowSchema } from "./validation";
export function PublicDataRefresh() {
  const router = useRouter();
  useEffect(() => {
    let stopped = false;
    let queued: ReturnType<typeof setTimeout> | undefined;
    const signatures = new Map<string, string>();
    const refresh = () => {
      // A draw/result transaction may emit many rows. One trailing refresh avoids
      // racing ranking tab/pagination navigation with a burst of old-route requests.
      clearTimeout(queued);
      const href = window.location.href;
      queued = setTimeout(() => {
        if (
          !stopped &&
          window.location.href === href &&
          document.visibilityState === "visible" &&
          !document.activeElement?.closest("form")
        )
          router.refresh();
      }, 250);
    };
    const client = publicBrowserClient(),
      channel = client
        ?.channel("public-directory-results")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "public_match_snapshots" },
          (payload) => {
            const parsed = publicRowSchema.safeParse(payload.new);
            if (!parsed.success) {
              refresh();
              return;
            }
            const r = parsed.data,
              signature = JSON.stringify([
                r.data.status,
                r.data.a.id,
                r.data.b.id,
                r.data.singles
                  .filter((s) => s.status === "finished")
                  .map((s) => [s.id, s.winner, s.kind, s.sets]),
              ]);
            if (signatures.get(r.match_id) !== signature) {
              signatures.set(r.match_id, signature);
              refresh();
            }
          },
        )
        .subscribe();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true;
      clearInterval(timer);
      clearTimeout(queued);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [router]);
  return null;
}
