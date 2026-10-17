import { randomUUID } from "node:crypto";
import Link from "next/link";
import { requireLineupMatch } from "@/features/lineups/access";
import {
  LineupForm,
  ReplacementForm,
  type LineupCandidate,
} from "@/features/lineups/forms";
import { LineupRefresh } from "@/features/lineups/refresh";
import { localeOf, messages } from "@/lib/locales";
import { ageGroupForBirthYear } from "@/domain/eligibility";
import { Card } from "@/components/ui/card";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; matchId: string }>;
}) {
  const p = await params,
    locale = localeOf(p.locale),
    t = messages(locale),
    context = await requireLineupMatch(locale, p.matchId),
    { supabase, match, status } = context;
  const [lineupsResult, gamesResult, replacementsResult] = await Promise.all([
    supabase
      .from("lineups")
      .select("id,subteam_id,lineup_slots(slot,player_id,player_name,gender)")
      .eq("match_id", match.id),
    status.revealed
      ? supabase
          .from("singles_games")
          .select("slot,status")
          .eq("match_id", match.id)
      : null,
    status.revealed
      ? supabase
          .from("lineup_replacements")
          .select("id,lineup_id,slot,old_player_name,new_player_name,reason")
          .eq("match_id", match.id)
          .order("changed_at")
      : null,
  ]);
  if (lineupsResult.error || gamesResult?.error || replacementsResult?.error)
    throw new Error(t.failed);
  const lineups = lineupsResult.data,
    games = gamesResult?.data ?? [],
    replacements = replacementsResult?.data ?? [];
  const candidates = await Promise.all(
    context.teams.map(async (team) => {
      if (!team.own && !(context.official && status.revealed)) return [];
      const result = await supabase
        .from("roster_memberships")
        .select(
          "players(id,first_name,last_name,gender,status,team_id,date_of_birth)",
        )
        .eq("season_id", context.season)
        .eq("subteam_id", team.id)
        .is("ended_at", null);
      if (result.error) throw new Error(t.failed);
      return result.data
        .filter(
          ({ players: v }) =>
            v.status === "active" &&
            v.team_id === team.club &&
            ageGroupForBirthYear(
              Number(v.date_of_birth.slice(0, 4)),
              context.year,
            ) === context.age,
        )
        .map(({ players: v }): LineupCandidate => ({
          id: v.id,
          name: `${v.first_name} ${v.last_name}`,
          gender: v.gender,
        }));
    }),
  );
  return (
    <>
      <Link className="text-sm underline" href={`/${locale}/matches`}>
        {t.matches}
      </Link>
      <p className="mt-4 text-sm text-muted-foreground">
        {context.tourName} · {context.age}
      </p>
      <h1 className="mt-2 break-words text-3xl font-semibold">
        {context.teams[0].name} / {context.teams[1].name}
      </h1>
      <p className="mt-4 rounded-lg border bg-card p-4 text-sm" role="status">
        {status.revealed ? t.lineupsRevealed : t.lineupsHidden}
      </p>
      <LineupRefresh
        locale={locale}
        match={match.id}
        version={status.lineup_version}
      />
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        {context.teams.map((team, index) => {
          const lineup = lineups.find((v) => v.subteam_id === team.id),
            submitted = index === 0 ? status.a_submitted : status.b_submitted,
            pending = games
              .filter((g) => g.status === "pending")
              .map((g) => g.slot);
          return (
            <Card key={team.id} className="min-w-0 p-6">
              <h2 className="break-words text-xl font-semibold">{team.name}</h2>
              <p className="mt-3 text-sm">
                {submitted ? t.lineupSubmitted : t.lineupNotSubmitted}
              </p>
              {lineup ? (
                <ol className="mt-4 grid gap-3">
                  {lineup.lineup_slots
                    .sort((a, b) => a.slot - b.slot)
                    .map((slot) => (
                      <li
                        key={slot.slot}
                        className="rounded-lg border p-3 text-sm"
                      >
                        {slot.slot}. {slot.player_name} ·{" "}
                        {slot.gender === "boy" ? t.boy : t.girl}
                      </li>
                    ))}
                </ol>
              ) : submitted ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {t.hiddenPlayers}
                </p>
              ) : null}
              {team.own &&
                !submitted &&
                ["scheduled", "called"].includes(match.status) && (
                  <div className="mt-6">
                    <LineupForm
                      locale={locale}
                      id={randomUUID()}
                      match={match.id}
                      subteam={team.id}
                      candidates={candidates[index]}
                    />
                  </div>
                )}
              {submitted && !status.revealed && (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {t.waitingForReveal}
                </p>
              )}
              {context.official &&
                status.revealed &&
                lineup &&
                ["scheduled", "called", "in_progress"].includes(
                  match.status,
                ) && (
                  <details className="mt-6 border-t pt-5">
                    <summary className="cursor-pointer text-sm font-semibold">
                      {t.replacePlayer}
                    </summary>
                    <div className="mt-4">
                      <ReplacementForm
                        locale={locale}
                        id={randomUUID()}
                        match={match.id}
                        subteam={team.id}
                        revision={status.lineup_version}
                        candidates={candidates[index]}
                        used={lineup.lineup_slots.map((s) => s.player_id)}
                        pendingSlots={pending}
                      />
                    </div>
                  </details>
                )}
              {replacements.some((r) => r.lineup_id === lineup?.id) && (
                <details className="mt-6 border-t pt-5">
                  <summary className="cursor-pointer text-sm">
                    {t.replacementHistory}
                  </summary>
                  <ol className="mt-4 grid gap-3 text-sm">
                    {replacements
                      .filter((r) => r.lineup_id === lineup?.id)
                      .map((r) => (
                        <li key={r.id} className="break-words">
                          {t.slot} {r.slot}: {r.old_player_name} →{" "}
                          {r.new_player_name}
                          <br />
                          {r.reason}
                        </li>
                      ))}
                  </ol>
                </details>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
