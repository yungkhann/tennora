import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import { Card } from "@/components/ui/card";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = messages(locale),
    { supabase, roles, user } = await requireStaff(locale),
    official = roles.some((r) => r === "organizer" || r === "main_judge");
  if (!official && !roles.includes("trainer")) notFound();
  const requested = Number((await searchParams).page ?? 1),
    page =
      Number.isSafeInteger(requested) && requested >= 1 && requested <= 10000
        ? requested
        : 1;
  const coached = roles.includes("trainer")
    ? await supabase
        .from("subteam_trainers")
        .select("subteam_id")
        .eq("trainer_id", user.id)
    : null;
  if (coached?.error) throw new Error(t.failed);
  const ids = (coached?.data ?? []).map((v) => v.subteam_id);
  let query = supabase
    .from("team_matches")
    .select(
      "id,status,round_no,match_no,subteam_a,subteam_b,draw_revisions!inner(published_at,tour_stage_plans(age_group,tours(name)))",
      { count: "exact" },
    )
    .not("draw_revisions.published_at", "is", null)
    .order("round_no")
    .order("id");
  if (!official && ids.length)
    query = query.or(
      `subteam_a.in.(${ids.join(",")}),subteam_b.in.(${ids.join(",")})`,
    );
  const result =
    !official && !ids.length
      ? null
      : await query.range((page - 1) * 25, page * 25 - 1);
  if (result?.error) throw new Error(t.failed);
  const matches = result?.data ?? [];
  const namesResult = matches.length
    ? await supabase.rpc("lineup_match_names", {
        matches: matches.map((v) => v.id),
      })
    : null;
  if (namesResult?.error) throw new Error(t.failed);
  const name = (id: string, side: string) =>
    namesResult?.data?.find((v) => v.match_id === id && v.side === side)
      ?.name ?? t.toBeDetermined;
  return (
    <>
      <h1 className="text-3xl font-semibold">{t.matches}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {t.lineupIntro}
      </p>
      <div className="mt-8 grid gap-4">
        {matches.length ? (
          matches.map((match) => (
            <Card className="min-w-0 p-5" key={match.id}>
              <p className="text-xs text-muted-foreground">
                {match.draw_revisions.tour_stage_plans.tours.name} ·{" "}
                {match.draw_revisions.tour_stage_plans.age_group} · {t.round}{" "}
                {match.round_no}
              </p>
              <h2 className="mt-2 break-words font-semibold">
                {name(match.id, "a")} / {name(match.id, "b")}
              </h2>
              <p className="mt-2 text-sm">{t[match.status]}</p>
              {match.subteam_a && match.subteam_b ? (
                <Link
                  className="mt-4 inline-block text-sm underline"
                  href={`/${locale}/matches/${match.id}/lineup`}
                >
                  {t.manageLineup}
                </Link>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t.toBeDetermined}
                </p>
              )}
            </Card>
          ))
        ) : (
          <Card className="p-6 text-sm">{t.noMatches}</Card>
        )}
      </div>
      <nav className="mt-6 flex gap-5 text-sm" aria-label={t.pagination}>
        {page > 1 && (
          <Link
            className="underline"
            href={`/${locale}/matches?page=${page - 1}`}
          >
            {t.previousPage}
          </Link>
        )}
        {(result?.count ?? 0) > page * 25 && (
          <Link
            className="underline"
            href={`/${locale}/matches?page=${page + 1}`}
          >
            {t.nextPage}
          </Link>
        )}
      </nav>
    </>
  );
}
