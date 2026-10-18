"use client";
import { useParams } from "next/navigation";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "./messages";
export function LoadingSkeleton() {
  const params = useParams<{ locale: string }>();
  return (
    <section role="status" aria-live="polite" className="space-y-6 py-3">
      <span className="sr-only">
        {publicMessages(localeOf(params.locale)).connecting}
      </span>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="h-3 w-28 rounded bg-secondary" />
        <div className="h-12 w-3/4 max-w-xl rounded-lg bg-secondary" />
        <div className="h-px bg-border" />
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-5 rounded-2xl border bg-card p-6">
              <div className="h-3 w-24 rounded bg-secondary" />
              <div className="h-5 w-3/4 rounded bg-secondary" />
              <div className="h-5 w-2/3 rounded bg-secondary" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
