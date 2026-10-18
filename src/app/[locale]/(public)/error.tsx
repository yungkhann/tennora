"use client";
import { useParams } from "next/navigation";
import { localeOf } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = publicMessages(localeOf(useParams().locale));
  return (
    <section role="alert" className="rounded-xl border bg-card p-8">
      <h1 className="text-xl font-semibold">{t.unavailable}</h1>
      <button
        className="mt-5 min-h-11 rounded-lg bg-primary px-5 text-primary-foreground"
        onClick={reset}
      >
        {t.refresh}
      </button>
    </section>
  );
}
