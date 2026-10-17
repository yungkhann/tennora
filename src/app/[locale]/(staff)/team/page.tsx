import Link from "next/link";
import { randomUUID } from "node:crypto";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import { Card } from "@/components/ui/card";
import { TeamForm } from "@/features/teams/forms";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = messages(locale),
    { supabase, roles } = await requireStaff(locale);
  const { data, error } = await supabase
    .from("teams")
    .select("id,name,region,subteams(id,age_group)")
    .order("name");
  if (error) throw new Error(t.failed);
  const manageAll = roles.includes("organizer") || roles.includes("main_judge");
  return (
    <>
      <h1 className="text-3xl font-semibold">{t.teams}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{t.teamsIntro}</p>
      <div className="mt-8 grid items-start gap-8 xl:grid-cols-[1fr_360px]">
        <section className="grid gap-5" aria-label={t.teams}>
          {data.length ? (
            data.map((team) => (
              <Card className="p-6" key={team.id}>
                <Link
                  className="break-words text-lg font-semibold text-primary underline"
                  href={`/${locale}/team/${team.id}`}
                >
                  {team.name}
                </Link>
                <p className="mt-2 text-sm text-muted-foreground">
                  {team.region}
                </p>
                <div className="mt-5 flex flex-wrap gap-5">
                  {team.subteams
                    .sort((a, b) => a.age_group.localeCompare(b.age_group))
                    .map((s) => (
                      <Link
                        className="text-sm underline"
                        key={s.id}
                        href={`/${locale}/subteam/${s.id}`}
                      >
                        {s.age_group}
                      </Link>
                    ))}
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-6 text-sm">{t.noTeams}</Card>
          )}
        </section>
        {manageAll && (
          <Card className="p-6">
            <h2 className="mb-6 text-lg font-semibold">{t.newTeam}</h2>
            <TeamForm locale={locale} id={randomUUID()} />
          </Card>
        )}
      </div>
    </>
  );
}
