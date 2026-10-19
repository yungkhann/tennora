import { actionNote } from "@/lib/locales";
import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { requireDrawManager } from "@/features/draws/access";
import {
  CorrectionForm,
  TeamCorrectionForm,
} from "@/features/corrections/forms";
import { correctionMessages } from "@/features/corrections/messages";
import { localeOf } from "@/lib/locales";
import { Card } from "@/components/ui/card";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; matchId: string }>;
}) {
  const p = await params,
    locale = localeOf(p.locale),
    t = correctionMessages(locale),
    staff = await requireDrawManager(locale);
  if (!z.uuid().safeParse(p.matchId).success) notFound();
  const [match, games, requests, teamRequests] = await Promise.all([
    staff.supabase
      .from("team_matches")
      .select(
        "id,status,result_id,team_match_results!team_matches_result_id_fkey(kind),a:subteams!team_matches_subteam_a_fkey(teams(name)),b:subteams!team_matches_subteam_b_fkey(teams(name))",
      )
      .eq("id", p.matchId)
      .single(),
    staff.supabase
      .from("singles_games")
      .select(
        "id,slot,result_id,score_state,singles_results!singles_games_result_id_fkey(player_a_name,player_b_name,actual_sets)",
      )
      .eq("match_id", p.matchId)
      .eq("status", "finished")
      .order("slot"),
    staff.supabase
      .from("result_correction_requests")
      .select(
        "id,game_id,reason,result_correction_states(status),singles_games!inner(match_id)",
      )
      .eq("singles_games.match_id", p.matchId),
    staff.supabase
      .from("result_correction_requests")
      .select("id,reason,result_correction_states(status)")
      .eq("match_id", p.matchId),
  ]);
  if (match.error) notFound();
  if (games.error || requests.error || teamRequests.error)
    throw new Error(t.failed);
  const forfeit =
    match.data.status === "finished" &&
    match.data.result_id &&
    match.data.team_match_results?.kind === "team_forfeit";
  const score = z.object({
    initial_server: z.string(),
    sets: z.array(z.object({ a: z.number(), b: z.number() })),
  });
  return (
    <>
      <Link
        className="text-sm underline"
        href={`/${locale}/matches/${p.matchId}/lineup`}
      >
        {t.back}
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">{t.title}</h1>
      <p className="mt-3 break-words">
        A · {match.data.a?.teams.name} / B · {match.data.b?.teams.name}
      </p>
      <p className="mt-3 max-w-2xl text-muted-foreground">{t.help}</p>
      {forfeit && (
        <TeamCorrectionForm
          locale={locale}
          match={p.matchId}
          base={match.data.result_id!}
        />
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {games.data.map((g) => {
          const s = score.safeParse(g.score_state);
          return (
            g.result_id &&
            s.success && (
              <Card key={g.id} className="p-5">
                <h2 className="mb-4 font-semibold">
                  {g.slot} · A {g.singles_results?.player_a_name} / B{" "}
                  {g.singles_results?.player_b_name}
                </h2>
                <CorrectionForm
                  locale={locale}
                  match={p.matchId}
                  game={g.id}
                  base={g.result_id}
                  sets={s.data.sets}
                  server={s.data.initial_server}
                />
              </Card>
            )
          );
        })}
      </div>
      {!games.data.length && !forfeit && <p className="mt-6">{t.empty}</p>}
      <ul className="mt-6 grid gap-3">
        {[...requests.data, ...teamRequests.data].map((r) => (
          <li key={r.id}>
            <Link className="underline" href={`/${locale}/corrections/${r.id}`}>
              {actionNote(locale, r.reason)} ·{" "}
              {r.result_correction_states?.status}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
