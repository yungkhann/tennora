import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import { Card } from "@/components/ui/card";
import {
  SettingsForm,
  TemplateForm,
  StagePlanForm,
} from "@/features/configuration/forms";
import type { Json } from "@/lib/supabase/database.types";
function numberField(value: Json, key: string) {
  return value &&
    !Array.isArray(value) &&
    typeof value === "object" &&
    typeof value[key] === "number"
    ? value[key]
    : "—";
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; tourId: string }>;
}) {
  const p = await params,
    locale = localeOf(p.locale),
    t = messages(locale),
    { supabase } = await requireStaff(locale, true);
  if (!z.uuid().safeParse(p.tourId).success) notFound();
  const { data: tour, error } = await supabase
    .from("tours")
    .select("id,name,season_id,seasons(name,status)")
    .eq("id", p.tourId)
    .single();
  if (error || !tour) notFound();
  const [settingsResult, templatesResult, plansResult] = await Promise.all([
    supabase
      .from("tournament_settings")
      .select("*")
      .eq("tour_id", tour.id)
      .order("revision", { ascending: false }),
    supabase
      .from("stage_templates")
      .select("id,name,entry_count")
      .order("created_at", { ascending: false }),
    supabase
      .from("tour_stage_plans")
      .select(
        "id,age_group,revision,stage_templates(name,entry_count),stages(ordinal,kind,configuration)",
      )
      .eq("tour_id", tour.id)
      .order("revision", { ascending: false }),
  ]);
  if (settingsResult.error || templatesResult.error || plansResult.error)
    throw new Error(t.failed);
  const settings = settingsResult.data,
    templates = templatesResult.data,
    plans = plansResult.data,
    locked = tour.seasons.status === "started";
  const number = new Intl.NumberFormat(locale);
  return (
    <>
      <Link className="text-sm underline" href={`/${locale}/organizer/seasons`}>
        {t.seasons} · {tour.seasons.name}
      </Link>
      <h1 className="mt-4 break-words text-3xl font-semibold">{tour.name}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {t.configurationIntro}
      </p>
      {locked && (
        <p className="mt-4 rounded-lg border p-4 text-sm">
          {t.configLocked} {t.settingsHelp}
        </p>
      )}
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid min-w-0 gap-6">
          <Card className="min-w-0 p-6">
            <h2 className="text-xl font-semibold">{t.stagePlans}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t.drawsPending}
            </p>
            <div className="mt-5 grid gap-5">
              {["U13", "U15", "U17"].map((age) => {
                const plan = plans.find((v) => v.age_group === age);
                return (
                  <section
                    className="rounded-lg border p-4"
                    key={age}
                    aria-label={`${t.stagePlans} ${age}`}
                  >
                    <h3 className="font-semibold">{age}</h3>
                    {plan ? (
                      <>
                        <p className="mt-2 break-words text-sm">
                          {plan.stage_templates.name} · {t.revision}{" "}
                          {plan.revision} · {t.entries}{" "}
                          {plan.stage_templates.entry_count}
                        </p>
                        <ol className="mt-3 grid gap-2 text-sm">
                          {plan.stages
                            .sort((a, b) => a.ordinal - b.ordinal)
                            .map((stage) => (
                              <li
                                key={stage.ordinal}
                                className="rounded border p-3"
                              >
                                {stage.ordinal}.{" "}
                                {stage.kind === "round_robin" ? (
                                  <>
                                    {t.roundRobin}:{" "}
                                    {numberField(
                                      stage.configuration,
                                      "group_count",
                                    )}{" "}
                                    ×{" "}
                                    {numberField(
                                      stage.configuration,
                                      "group_size",
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {t.knockout}:{" "}
                                    {numberField(stage.configuration, "size")}{" "}
                                    {t.entries}
                                    {stage.configuration &&
                                    typeof stage.configuration === "object" &&
                                    !Array.isArray(stage.configuration) &&
                                    stage.configuration.source_ordinal ? (
                                      <>
                                        {" "}
                                        · {t.groupPlaces}{" "}
                                        {numberField(
                                          stage.configuration,
                                          "place_from",
                                        )}
                                        –
                                        {numberField(
                                          stage.configuration,
                                          "place_to",
                                        )}
                                      </>
                                    ) : null}
                                  </>
                                )}
                              </li>
                            ))}
                        </ol>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t.noStagePlan}
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
            {!locked && (
              <div className="mt-6 border-t pt-5">
                <StagePlanForm
                  locale={locale}
                  tourId={tour.id}
                  templates={templates}
                />
              </div>
            )}
            {plans.length > 3 && (
              <details className="mt-5 text-sm">
                <summary className="cursor-pointer">{t.planHistory}</summary>
                <ul className="mt-3 grid gap-2">
                  {plans.map((v) => (
                    <li key={v.id}>
                      {v.age_group} · {t.revision} {v.revision} ·{" "}
                      {v.stage_templates.name}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
          {!locked && (
            <Card className="min-w-0 p-6">
              <h2 className="mb-5 text-lg font-semibold">{t.newTemplate}</h2>
              <TemplateForm locale={locale} id={randomUUID()} />
            </Card>
          )}
        </section>
        <Card className="min-w-0 p-6">
          <h2 className="mb-5 text-xl font-semibold">{t.tournamentSettings}</h2>
          <SettingsForm
            locale={locale}
            id={randomUUID()}
            tourId={tour.id}
            settings={settings[0]}
            locked={locked}
          />
          {settings.length > 0 && (
            <details className="mt-6 border-t pt-5">
              <summary className="cursor-pointer text-sm font-semibold">
                {t.settingsHistory}
              </summary>
              <ol className="mt-4 grid gap-3 text-sm">
                {settings.map((s) => (
                  <li key={s.id} className="break-words rounded border p-3">
                    {t.revision} {s.revision} · K {number.format(s.k_factor)}
                    <br />
                    {t.tableCount}: {s.table_count} · {t.restMinutes}:{" "}
                    {s.rest_minutes}
                    <br />
                    {s.finals_priority ? t.finalsFirst : t.normalOrder}
                    <br />
                    {s.venue_timezone}
                    <br />
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: s.venue_timezone,
                    }).format(new Date(s.effective_at))}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </Card>
      </div>
    </>
  );
}
