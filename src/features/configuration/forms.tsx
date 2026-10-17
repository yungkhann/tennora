"use client";
import { useState } from "react";
import { MutationForm } from "@/components/mutation-form";
import { selectClass } from "@/features/teams/forms";
import { Input } from "@/components/ui/input";
import { messages, type Locale } from "@/lib/locales";
import type { Database } from "@/lib/supabase/database.types";
import {
  saveSettings,
  createTemplate,
  configureStages,
  startSeason,
} from "./actions";
type Settings = Database["public"]["Tables"]["tournament_settings"]["Row"];
export function SettingsForm({
  locale,
  id,
  tourId,
  settings,
  locked,
}: {
  locale: Locale;
  id: string;
  tourId: string;
  settings?: Settings;
  locked: boolean;
}) {
  const t = messages(locale);
  return (
    <MutationForm
      locale={locale}
      action={saveSettings}
      label={locked ? t.changeK : t.saveSettings}
      hidden={{
        id,
        tourId,
        revision: String(settings?.revision ?? 0),
        ...(locked && settings
          ? {
              tables: String(settings.table_count),
              rest: String(settings.rest_minutes),
              finals: String(settings.finals_priority),
              timezone: settings.venue_timezone,
            }
          : {}),
      }}
    >
      <label className="field">
        {t.kFactor}
        <Input
          name="k"
          type="number"
          required
          min="0"
          step="any"
          defaultValue={settings?.k_factor}
        />
      </label>
      {!locked && (
        <>
          <label className="field">
            {t.tableCount}
            <Input
              name="tables"
              type="number"
              required
              min={1}
              max={128}
              defaultValue={settings?.table_count ?? 12}
            />
          </label>
          <label className="field">
            {t.restMinutes}
            <Input
              name="rest"
              type="number"
              required
              min={0}
              max={1440}
              defaultValue={settings?.rest_minutes ?? 60}
            />
          </label>
          <label className="field">
            {t.finalsPriority}
            <select
              className={selectClass}
              name="finals"
              defaultValue={String(settings?.finals_priority ?? true)}
            >
              <option value="true">{t.finalsFirst}</option>
              <option value="false">{t.normalOrder}</option>
            </select>
          </label>
          <label className="field">
            {t.venueTimezone}
            <Input
              name="timezone"
              required
              maxLength={100}
              defaultValue={settings?.venue_timezone ?? "Asia/Almaty"}
            />
          </label>
        </>
      )}
      <p className="text-sm leading-6 text-muted-foreground">
        {t.settingsHelp}
      </p>
    </MutationForm>
  );
}
export function TemplateForm({ locale, id }: { locale: Locale; id: string }) {
  const t = messages(locale),
    [kind, setKind] = useState("composite");
  return (
    <MutationForm
      locale={locale}
      action={createTemplate}
      label={t.newTemplate}
      hidden={{ id }}
      once
    >
      <label className="field">
        {t.name}
        <Input name="name" required minLength={2} maxLength={100} />
      </label>
      <label className="field">
        {t.stageFormat}
        <select
          className={selectClass}
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="composite">{t.composite}</option>
          <option value="round_robin">{t.roundRobin}</option>
          <option value="knockout">{t.knockout}</option>
        </select>
      </label>
      <div
        className={kind === "knockout" ? "hidden" : "grid gap-4 sm:grid-cols-2"}
      >
        <label className="field">
          {t.groupCount}
          <Input
            name="groupCount"
            type="number"
            required
            min={1}
            max={32}
            defaultValue={4}
          />
        </label>
        <label className="field">
          {t.groupSize}
          <Input
            name="groupSize"
            type="number"
            required
            min={2}
            max={32}
            defaultValue={6}
          />
        </label>
      </div>
      <label className={kind !== "composite" ? "hidden" : "field"}>
        {t.bracketCount}
        <Input
          name="bracketCount"
          type="number"
          required
          min={1}
          max={32}
          defaultValue={3}
        />
      </label>
      <label className={kind !== "knockout" ? "hidden" : "field"}>
        {t.knockoutSize}
        <Input
          name="knockoutSize"
          type="number"
          required
          min={2}
          max={1024}
          defaultValue={8}
        />
      </label>
      <p className="text-sm leading-6 text-muted-foreground">
        {t.templateHelp}
      </p>
    </MutationForm>
  );
}
export function StagePlanForm({
  locale,
  tourId,
  templates,
}: {
  locale: Locale;
  tourId: string;
  templates: { id: string; name: string; entry_count: number }[];
}) {
  const t = messages(locale);
  return (
    <MutationForm
      locale={locale}
      action={configureStages}
      label={t.applyTemplate}
      hidden={{ tourId }}
    >
      <label className="field">
        {t.template}
        <select
          name="template"
          className={selectClass}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t.choose}
          </option>
          {templates.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.entry_count})
            </option>
          ))}
        </select>
      </label>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm">{t.subteams}</legend>
        {["U13", "U15", "U17"].map((age) => (
          <label key={age} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="ages" value={age} defaultChecked />
            {age}
          </label>
        ))}
      </fieldset>
      <p className="text-sm leading-6 text-muted-foreground">
        {t.stagePlanHelp}
      </p>
    </MutationForm>
  );
}
export function StartSeasonForm({
  locale,
  seasonId,
  ready,
}: {
  locale: Locale;
  seasonId: string;
  ready: boolean;
}) {
  const t = messages(locale);
  if (!ready)
    return <p className="text-sm text-muted-foreground">{t.notReady}</p>;
  return (
    <MutationForm
      locale={locale}
      action={startSeason}
      label={t.startSeason}
      hidden={{ seasonId }}
    >
      <label className="flex items-start gap-2 text-sm leading-6">
        <input
          type="checkbox"
          name="confirm"
          value="yes"
          required
          className="mt-1"
        />
        {t.startConfirm}
      </label>
    </MutationForm>
  );
}
