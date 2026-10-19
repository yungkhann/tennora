import { actionNote } from "@/lib/locales";
import { PhotoUploadForm, PhotoReviewForm } from "@/features/photos/forms";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import { uuidSchema } from "@/lib/validation";
import { Card } from "@/components/ui/card";
import {
  TeamForm,
  TeamRegistrationForm,
  TrainerAssignmentForm,
} from "@/features/teams/forms";
import {
  PlayerForm,
  DropPlayerForm,
  TransferPlayerForm,
  TrainerRefForm,
} from "@/features/players/forms";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; teamId: string }>;
}) {
  const raw = await params,
    locale = localeOf(raw.locale),
    t = messages(locale);
  if (!uuidSchema.safeParse(raw.teamId).success) notFound();
  const { supabase, roles, user } = await requireStaff(locale),
    club = raw.teamId;
  const { data: team, error } = await supabase
    .from("teams")
    .select("id,name,region,subteams(id,age_group)")
    .eq("id", club)
    .maybeSingle();
  if (error) throw new Error(t.failed);
  if (!team) notFound();
  const manageAll = roles.includes("organizer") || roles.includes("main_judge");
  const [players, trainers, seasons, entries, clubs, refs, photos] =
    await Promise.all([
      supabase
        .from("players")
        .select("*")
        .eq("team_id", club)
        .order("last_name"),
      supabase.rpc("available_team_trainers"),
      supabase
        .from("seasons")
        .select("id,name,status")
        .eq("status", "draft")
        .order("year", { ascending: false }),
      supabase
        .from("season_team_entries")
        .select("season_id,seasons(name)")
        .eq("team_id", club),
      supabase.from("teams").select("id,name").neq("id", club).order("name"),
      supabase
        .from("player_trainer_refs")
        .select("player_id,kind,trainer_id,free_first_name,free_last_name"),
      supabase
        .from("player_photo_assets")
        .select(
          "id,player_id,uploader_id,state,review_reason,players!inner(team_id)",
        )
        .eq("players.team_id", club)
        .order("created_at", { ascending: false }),
    ]);
  if (
    players.error ||
    trainers.error ||
    seasons.error ||
    entries.error ||
    clubs.error ||
    refs.error ||
    photos.error
  )
    throw new Error(t.failed);
  const choices = trainers.data.map((r) => ({
    id: r.id,
    name: r.display_name,
  }));
  return (
    <>
      <Link href={`/${locale}/team`} className="text-sm underline">
        {t.teams}
      </Link>
      <h1 className="mt-4 break-words text-3xl font-semibold">{team.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{team.region}</p>
      <div className="mt-6 flex flex-wrap gap-5">
        {team.subteams.map((s) => (
          <Link
            key={s.id}
            className="font-semibold text-primary underline"
            href={`/${locale}/subteam/${s.id}`}
          >
            {s.age_group}
          </Link>
        ))}
      </div>
      <div className="mt-8 grid items-start gap-8 xl:grid-cols-[1fr_360px]">
        <section className="grid min-w-0 gap-5" aria-label={t.players}>
          <h2 className="text-xl font-semibold">{t.players}</h2>
          {players.data.length ? (
            players.data.map((p) => (
              <Card className="min-w-0 p-6" key={p.id}>
                <h3 className="break-words text-lg font-semibold">
                  {p.first_name} {p.last_name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t.rating}: {p.current_rating} ·{" "}
                  {p.status === "active" ? t.active : t.droppedOut}
                </p>
                <details className="mt-5">
                  <summary className="cursor-pointer text-sm font-semibold">
                    {t.editPlayer}
                  </summary>
                  <div className="mt-5">
                    <PlayerForm
                      locale={locale}
                      id={p.id}
                      club={club}
                      player={p}
                    />
                  </div>
                </details>
                <details className="mt-5">
                  <summary className="cursor-pointer text-sm font-semibold">
                    {t.trainerRefs}
                  </summary>
                  <ul className="mt-3 grid gap-2 text-sm">
                    {refs.data
                      .filter((r) => r.player_id === p.id)
                      .map((r) => (
                        <li key={r.kind}>
                          {r.kind === "first"
                            ? t.firstTrainer
                            : t.personalTrainer}
                          :{" "}
                          {r.trainer_id
                            ? (choices.find((c) => c.id === r.trainer_id)
                                ?.name ?? t.linkedTrainer)
                            : `${r.free_first_name} ${r.free_last_name}`}
                        </li>
                      ))}
                  </ul>
                  <div className="mt-5">
                    <TrainerRefForm
                      locale={locale}
                      player={p.id}
                      trainers={choices}
                    />
                  </div>
                </details>
                <details className="mt-5">
                  <summary className="cursor-pointer text-sm font-semibold">
                    {t.photos}
                  </summary>
                  <div className="mt-5 grid gap-5">
                    {photos.data
                      .filter((a) => a.player_id === p.id)
                      .map((a) => (
                        <section className="rounded-lg border p-4" key={a.id}>
                          <p className="text-sm font-semibold">
                            {
                              {
                                pending_upload: t.photoPendingUpload,
                                pending_review: t.photoPendingReview,
                                approved: t.photoApproved,
                                rejected: t.photoRejected,
                                revoked: t.photoRevoked,
                              }[a.state]
                            }
                          </p>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm underline">
                            {a.state !== "pending_upload" && (
                              <a
                                href={`/api/staff/photos/${a.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {t.viewPrivatePhoto}
                              </a>
                            )}
                            {(roles.includes("organizer") ||
                              a.uploader_id === user.id) &&
                              a.state !== "pending_upload" && (
                                <a
                                  href={`/api/staff/photos/${a.id}?kind=evidence`}
                                >
                                  {t.downloadConsent}
                                </a>
                              )}
                            {a.state === "approved" && (
                              <a
                                href={`/api/public/player-photo/${p.id}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {t.viewPublicPhoto}
                              </a>
                            )}
                          </div>
                          {a.review_reason && (
                            <p className="mt-3 break-words text-sm">
                              {actionNote(locale, a.review_reason)}
                            </p>
                          )}
                          {roles.includes("organizer") &&
                            [
                              "pending_upload",
                              "pending_review",
                              "approved",
                            ].includes(a.state) && (
                              <div className="mt-5">
                                <PhotoReviewForm
                                  locale={locale}
                                  asset={a.id}
                                  state={a.state}
                                />
                              </div>
                            )}
                        </section>
                      ))}
                    {!photos.data.some((a) => a.player_id === p.id) && (
                      <p className="text-sm text-muted-foreground">
                        {t.noPhotos}
                      </p>
                    )}
                    {roles.some(
                      (r) => r === "trainer" || r === "organizer",
                    ) && (
                      <PhotoUploadForm
                        locale={locale}
                        id={randomUUID()}
                        player={p.id}
                      />
                    )}
                  </div>
                </details>
                {p.status === "active" && (
                  <details className="mt-5">
                    <summary className="cursor-pointer text-sm font-semibold">
                      {t.dropPlayer}
                    </summary>
                    <div className="mt-5">
                      <DropPlayerForm locale={locale} player={p.id} />
                    </div>
                  </details>
                )}
                {roles.includes("organizer") && clubs.data.length > 0 && (
                  <details className="mt-5">
                    <summary className="cursor-pointer text-sm font-semibold">
                      {t.transferPlayer}
                    </summary>
                    <div className="mt-5">
                      <TransferPlayerForm
                        locale={locale}
                        player={p.id}
                        clubs={clubs.data}
                      />
                    </div>
                  </details>
                )}
              </Card>
            ))
          ) : (
            <Card className="p-6 text-sm">{t.noPlayers}</Card>
          )}
          <Card className="p-6">
            <h2 className="mb-6 text-lg font-semibold">{t.newPlayer}</h2>
            <PlayerForm locale={locale} id={randomUUID()} club={club} />
          </Card>
        </section>
        <aside className="grid min-w-0 gap-5">
          <Card className="p-6">
            <h2 className="mb-5 font-semibold">{t.editTeam}</h2>
            <TeamForm locale={locale} id={club} team={team} />
          </Card>
          <Card className="p-6">
            <h2 className="font-semibold">{t.registeredSeasons}</h2>
            <ul className="mt-4 grid gap-2 text-sm">
              {entries.data.map((e) => (
                <li key={e.season_id}>{e.seasons?.name}</li>
              ))}
            </ul>
            {manageAll &&
              seasons.data.filter(
                (s) => !entries.data.some((e) => e.season_id === s.id),
              ).length > 0 && (
                <div className="mt-5">
                  <TeamRegistrationForm
                    locale={locale}
                    club={club}
                    seasons={seasons.data.filter(
                      (s) => !entries.data.some((e) => e.season_id === s.id),
                    )}
                  />
                </div>
              )}
          </Card>
          <Card className="p-6">
            <h2 className="font-semibold">{t.trainers}</h2>
            <ul className="mt-4 grid gap-2 text-sm">
              {trainers.data
                .filter((r) => r.team_id === club)
                .map((r) => (
                  <li key={r.id}>{r.display_name}</li>
                ))}
            </ul>
            {manageAll && choices.length > 0 && (
              <div className="mt-5">
                <TrainerAssignmentForm
                  locale={locale}
                  club={club}
                  trainers={choices}
                  subteams={team.subteams}
                />
              </div>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
