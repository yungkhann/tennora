import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { requireDrawManager } from "@/features/draws/access";
import { ApplyCorrectionForm } from "@/features/corrections/forms";
import { correctionMessages } from "@/features/corrections/messages";
import { reviewSchema } from "@/features/corrections/validation";
import { localeOf } from "@/lib/locales";
import { Card } from "@/components/ui/card";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; requestId: string }>;
}) {
  const p = await params,
    locale = localeOf(p.locale),
    t = correctionMessages(locale),
    staff = await requireDrawManager(locale);
  if (!z.uuid().safeParse(p.requestId).success) notFound();
  const result = await staff.supabase.rpc("get_result_correction", {
      request_id: p.requestId,
    }),
    parsed = reviewSchema.safeParse(result.data);
  if (result.error || !parsed.success) notFound();
  const r = parsed.data,
    plan = r.plan;
  return (
    <>
      <Link
        className="text-sm underline"
        href={`/${locale}/matches/${r.current_match_id ?? plan.match_id}/corrections`}
      >
        {t.title}
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">
        {r.status === "applied" ? t.appliedTitle : t.review}
      </h1>
      <p className="mt-4">
        A {r.original.player_a_name} / B {r.original.player_b_name}
      </p>
      {r.original.k !== null && (
        <p className="mt-2 text-sm">
          {t.savedK}: <span className="font-mono">{r.original.k}</span>
        </p>
      )}
      <p className="mt-4 break-words">{r.reason}</p>
      <p className="mt-3">
        {r.winner && `${t.winner}: ${r.winner.toUpperCase()} · `}
        {r.kind === "reopen"
          ? t.reopen
          : r.kind === "team_forfeit"
            ? t.forfeit
            : r.kind === "played"
              ? t.played
              : t.withdrawal}
      </p>
      <p className="mt-2 font-mono tabular-nums">
        {r.score.sets.map((v) => `${v.a}:${v.b}`).join(" / ")}
      </p>
      {r.status === "applied" ? (
        <div className="mt-6">
          <p role="status">{t.applied}</p>
          {r.kind === "reopen" && r.current_match_id && (
            <Link
              className="mt-4 inline-block underline"
              href={`/${locale}/matches/${r.current_match_id}/lineup`}
            >
              {t.freshMatch}
            </Link>
          )}
        </div>
      ) : plan.stale ? (
        <p className="mt-6" role="alert">
          {t.stale}
        </p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-semibold">
              {t.team}:{" "}
              <span className="font-mono">
                {plan.games_a} : {plan.games_b}
              </span>
            </h2>
            {!plan.team_complete && (
              <p className="mt-3 text-sm">
                {r.kind === "reopen" ? t.reopenHelp : t.pending}
              </p>
            )}
            <p className="mt-4 text-sm">
              {t.trailing}:{" "}
              {plan.trailing_games?.map((v) => v.slot).join(", ") || "0"}
            </p>
            <h3 className="mt-4 font-semibold">
              {t.affected}: {plan.affected_matches?.length ?? 0}
            </h3>
            <ul className="mt-3 grid gap-2 text-sm">
              {plan.affected_matches?.map((v) => (
                <li className="break-all" key={v.id}>
                  {v.id} · {v.status}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">{t.history}</p>
          </Card>
          <Card className="p-5">
            <ApplyCorrectionForm
              locale={locale}
              request={r.id}
              digest={plan.digest!}
              requiresOrganizer={Boolean(plan.requires_organizer)}
              organizer={staff.roles.includes("organizer")}
            />
          </Card>
        </div>
      )}
    </>
  );
}
