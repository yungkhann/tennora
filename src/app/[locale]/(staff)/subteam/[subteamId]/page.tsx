import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import { uuidSchema } from "@/lib/validation";
import { Card } from "@/components/ui/card";
import { selectClass } from "@/features/teams/forms";
import { RosterForm, EndMembershipForm } from "@/features/players/forms";
import { ageGroupForBirthYear } from "@/domain/eligibility";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; subteamId: string }>;
  searchParams: Promise<{ seasonId?: string }>;
}) {
  const raw = await params,
    locale = localeOf(raw.locale),
    t = messages(locale);
  if (!uuidSchema.safeParse(raw.subteamId).success) notFound();
  const { supabase, user, roles } = await requireStaff(locale),
    id = raw.subteamId;
  const { data: subteam, error } = await supabase
    .from("subteams")
    .select("id,team_id,age_group,teams(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(t.failed);
  if (!subteam) notFound();
  const entries = await supabase
    .from("season_team_entries")
    .select("season_id,seasons(id,name,year)")
    .eq("team_id", subteam.team_id);
  if (entries.error) throw new Error(t.failed);
  const query = await searchParams;
  const seasons = entries.data
    .flatMap((e) => (e.seasons ? [e.seasons] : []))
    .sort((a, b) => b.year - a.year);
  const season = query.seasonId
    ? seasons.find((s) => s.id === query.seasonId)
    : seasons[0];
  if (query.seasonId && !season) notFound();
  const [roster, players, coached] = await Promise.all([
    supabase
      .from("roster_memberships")
      .select(
        "id,player_id,joined_at,ended_at,ended_reason,players(first_name,last_name)",
      )
      .eq("subteam_id", id)
      .eq("season_id", season?.id ?? "00000000-0000-0000-0000-000000000000")
      .order("joined_at"),
    supabase
      .from("players")
      .select("id,first_name,last_name,date_of_birth,status")
      .eq("team_id", subteam.team_id)
      .eq("status", "active")
      .order("last_name"),
    supabase
      .from("subteam_trainers")
      .select("trainer_id")
      .eq("subteam_id", id)
      .eq("trainer_id", user.id),
  ]);
  if (roster.error || players.error || coached.error) throw new Error(t.failed);
  const canEdit =
    roles.includes("organizer") ||
    roles.includes("main_judge") ||
    coached.data.length > 0;
  const active = roster.data.filter((m) => !m.ended_at),
    available = players.data.filter(
      (p) =>
        season &&
        ageGroupForBirthYear(
          Number(p.date_of_birth.slice(0, 4)),
          season.year,
        ) === subteam.age_group &&
        !active.some((m) => m.player_id === p.id),
    );
  return (
    <>
      <Link
        className="text-sm underline"
        href={`/${locale}/team/${subteam.team_id}`}
      >
        {subteam.teams?.name}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">
        {subteam.age_group} · {t.roster}
      </h1>
      {seasons.length > 0 ? (
        <form className="mt-6 flex flex-wrap gap-4" method="get">
          <label className="field min-w-0 flex-1">
            {t.seasons}
            <select
              className={selectClass}
              name="seasonId"
              defaultValue={season?.id}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="self-end rounded-lg border px-5 py-3 font-semibold"
            type="submit"
          >
            {t.choose}
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm">{t.registerFirst}</p>
      )}
      {season && (
        <>
          <p className="mt-6 text-sm">
            {t.active}: {active.length}/10 · {t.ageRule}
          </p>
          {!canEdit && (
            <p className="mt-4 text-sm text-muted-foreground">
              {t.notAssigned}
            </p>
          )}
          <div className="mt-8 grid items-start gap-8 xl:grid-cols-[1fr_360px]">
            <section className="grid gap-5" aria-label={t.roster}>
              {roster.data.length ? (
                roster.data.map((m) => (
                  <Card className="p-6" key={m.id}>
                    <h2 className="font-semibold">
                      {m.players
                        ? `${m.players.first_name} ${m.players.last_name}`
                        : t.formerPlayer}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {m.ended_at ? t.ended : t.active}
                    </p>
                    {m.ended_at && (
                      <p className="mt-2 break-words text-sm">
                        {m.ended_reason}
                      </p>
                    )}
                    {!m.ended_at && canEdit && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm">
                          {t.removeRoster}
                        </summary>
                        <div className="mt-4">
                          <EndMembershipForm
                            locale={locale}
                            membership={m.id}
                          />
                        </div>
                      </details>
                    )}
                  </Card>
                ))
              ) : (
                <Card className="p-6 text-sm">{t.noPlayers}</Card>
              )}
            </section>
            {canEdit && (
              <Card className="p-6">
                <h2 className="mb-5 font-semibold">{t.addRoster}</h2>
                {available.length && active.length < 10 ? (
                  <RosterForm
                    locale={locale}
                    seasonId={season.id}
                    subteam={id}
                    players={available.map((p) => ({
                      id: p.id,
                      name: `${p.first_name} ${p.last_name}`,
                    }))}
                  />
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {active.length >= 10 ? t.rosterFull : t.noEligiblePlayers}
                  </p>
                )}
              </Card>
            )}
          </div>
        </>
      )}
    </>
  );
}
