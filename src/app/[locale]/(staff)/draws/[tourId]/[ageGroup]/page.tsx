import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { localeOf, messages } from "@/lib/locales";
import { requireDrawManager } from "@/features/draws/access";
import { GenerateDrawForm, PublishDrawForm } from "@/features/draws/forms";
import { Card } from "@/components/ui/card";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; tourId: string; ageGroup: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const p = await params,
    locale = localeOf(p.locale),
    t = messages(locale),
    { supabase } = await requireDrawManager(locale);
  const age = z.enum(["U13", "U15", "U17"]).safeParse(p.ageGroup);
  if (!z.uuid().safeParse(p.tourId).success || !age.success) notFound();
  const { data: tour, error } = await supabase
    .from("tours")
    .select("id,name,seasons(name,status)")
    .eq("id", p.tourId)
    .single();
  if (error || !tour) notFound();
  const planResult = await supabase
    .from("tour_stage_plans")
    .select("id")
    .eq("tour_id", tour.id)
    .eq("age_group", age.data)
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (planResult.error) throw new Error(t.failed);
  const plan = planResult.data;
  const drawResult = plan
    ? await supabase
        .from("draw_revisions")
        .select("id,revision,published_at")
        .eq("plan_id", plan.id)
        .order("revision", { ascending: false })
        .limit(1)
        .maybeSingle()
    : null;
  if (drawResult?.error) throw new Error(t.failed);
  const draw = drawResult?.data,
    base = `/${locale}/draws/${tour.id}/${age.data}`;
  const groupsResult = draw
    ? await supabase
        .from("stage_groups")
        .select("id,label,ordinal,stages(ordinal,kind,configuration)")
        .eq("draw_id", draw.id)
    : null;
  if (groupsResult?.error) throw new Error(t.failed);
  const groups = (groupsResult?.data ?? []).sort(
      (a, b) => a.stages.ordinal - b.stages.ordinal || a.ordinal - b.ordinal,
    ),
    requested = (await searchParams).group,
    selected = groups.find((g) => g.id === requested) ?? groups[0];
  const [entriesResult, matchesResult, countResult] = await Promise.all([
    selected && draw
      ? supabase
          .from("draw_entries")
          .select(
            "id,seed,rating_total,subteam_id,subteams(teams(name)),draw_seed_players(player_id,rating,gender,players(first_name,last_name))",
          )
          .eq("group_id", selected.id)
          .order("seed")
      : null,
    selected
      ? supabase
          .from("team_matches")
          .select(
            "id,match_no,round_no,placement_from,placement_to,subteam_a,subteam_b,match_sources!match_sources_match_id_fkey(side,source_group_id,source_place,source_match_id,outcome)",
          )
          .eq("group_id", selected.id)
          .order("round_no")
          .order("match_no")
      : null,
    draw
      ? supabase
          .from("team_matches")
          .select("id", { count: "exact", head: true })
          .eq("draw_id", draw.id)
      : null,
  ]);
  if (entriesResult?.error || matchesResult?.error || countResult?.error)
    throw new Error(t.failed);
  const entries = entriesResult?.data ?? [],
    matches = matchesResult?.data ?? [];
  const label = (group: (typeof groups)[number]) =>
    group.stages.kind === "round_robin"
      ? `${t.group} ${group.label}`
      : `${t.knockout} ${group.stages.ordinal - 1}`;
  const teamName = (id: string | null) =>
    entries.find((e) => e.subteam_id === id)?.subteams.teams.name ??
    t.toBeDetermined;
  const sourceName = (
    source: (typeof matches)[number]["match_sources"][number],
  ) =>
    source.source_group_id
      ? `${label(groups.find((g) => g.id === source.source_group_id)!)} · ${t.groupPlaces} ${source.source_place}`
      : `${source.outcome === "winner" ? t.winner : t.loser} · ${t.match} ${matches.find((m) => m.id === source.source_match_id)?.match_no ?? "—"}`;
  const number = new Intl.NumberFormat(locale);
  return (
    <>
      <Link href={`/${locale}/draws`} className="text-sm underline">
        {t.draws}
      </Link>
      <h1 className="mt-4 break-words text-3xl font-semibold">
        {tour.name} · {age.data}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {t.drawIntro}
      </p>
      {draw ? (
        <p className="mt-4 rounded-lg border p-4 text-sm" role="status">
          {t.revision} {draw.revision} ·{" "}
          {draw.published_at ? t.drawPublished : t.draft} · {t.matches}:{" "}
          {countResult?.count}
        </p>
      ) : (
        <p className="mt-4 text-sm">{t.noDraw}</p>
      )}
      {!draw?.published_at && (
        <Card className="mt-6 grid gap-5 p-6">
          {tour.seasons.status !== "started" || !plan ? (
            <p className="text-sm">{t.drawSeasonRequired}</p>
          ) : (
            <GenerateDrawForm
              locale={locale}
              id={randomUUID()}
              tourId={tour.id}
              age={age.data}
              revision={draw?.revision ?? 0}
            />
          )}
          {draw && (
            <div className="border-t pt-5">
              <PublishDrawForm
                locale={locale}
                id={draw.id}
                revision={draw.revision}
              />
            </div>
          )}
        </Card>
      )}
      {draw?.published_at && (
        <p className="mt-4 text-sm text-muted-foreground">
          {t.publishedDrawLocked}
        </p>
      )}
      {draw && (
        <>
          <nav aria-label={t.drawGroups} className="mt-8 flex flex-wrap gap-3">
            {groups.map((group) => (
              <Link
                key={group.id}
                className={`rounded-lg border px-3 py-2 text-sm ${selected?.id === group.id ? "bg-primary text-primary-foreground" : "bg-card"}`}
                href={`${base}?group=${group.id}`}
                aria-current={selected?.id === group.id ? "page" : undefined}
              >
                {label(group)}
              </Link>
            ))}
          </nav>
          {entries.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xl font-semibold">
                {t.frozenSeeds} · {selected && label(selected)}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {entries.map((entry) => (
                  <Card className="min-w-0 p-4" key={entry.id}>
                    <h3 className="break-words font-semibold">
                      {entry.seed}. {entry.subteams.teams.name}
                    </h3>
                    <p className="mt-2 text-sm">
                      {t.frozenRating}: {number.format(entry.rating_total)}
                    </p>
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer">
                        {t.seedingPlayers}
                      </summary>
                      <ul className="mt-2 grid gap-2">
                        {entry.draw_seed_players.map((player) => (
                          <li key={player.player_id}>
                            {player.players.first_name}{" "}
                            {player.players.last_name} ·{" "}
                            {player.gender === "boy" ? t.boy : t.girl} ·{" "}
                            {number.format(player.rating)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </Card>
                ))}
              </div>
            </section>
          )}
          <section className="mt-8">
            <h2 className="text-xl font-semibold">
              {t.matchGraph} · {selected && label(selected)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t.matchGraphHelp}
            </p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {matches.map((match) => (
                <li
                  className="rounded-lg border bg-card p-4 text-sm"
                  key={match.id}
                >
                  <p className="font-semibold">
                    {t.match} {match.match_no} · {t.round} {match.round_no}
                  </p>
                  <p className="mt-2 break-words">
                    {match.subteam_a
                      ? teamName(match.subteam_a)
                      : match.match_sources.find((s) => s.side === "a")
                        ? sourceName(
                            match.match_sources.find((s) => s.side === "a")!,
                          )
                        : t.toBeDetermined}{" "}
                    /{" "}
                    {match.subteam_b
                      ? teamName(match.subteam_b)
                      : match.match_sources.find((s) => s.side === "b")
                        ? sourceName(
                            match.match_sources.find((s) => s.side === "b")!,
                          )
                        : t.toBeDetermined}
                  </p>
                  {draw.published_at && match.subteam_a && match.subteam_b && (
                    <Link
                      className="mt-3 inline-block underline"
                      href={`/${locale}/matches/${match.id}/lineup`}
                    >
                      {t.manageLineup}
                    </Link>
                  )}
                  {match.placement_from && (
                    <p className="mt-2 text-muted-foreground">
                      {t.bracketPlaces} {match.placement_from}–
                      {match.placement_to}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </>
  );
}
