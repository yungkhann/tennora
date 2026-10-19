"use client";
import { useState } from "react";
import { MutationForm } from "@/components/mutation-form";
import { selectClass } from "@/features/teams/forms";
import { lineupGender } from "@/domain/lineups";
import { messages, type Locale } from "@/lib/locales";
import { submitLineup, replacePlayer } from "./actions";
export type LineupCandidate = {
  id: string;
  name: string;
  gender: "boy" | "girl";
};
export function LineupForm({
  locale,
  id,
  match,
  subteam,
  candidates,
}: {
  locale: Locale;
  id: string;
  match: string;
  subteam: string;
  candidates: LineupCandidate[];
}) {
  const t = messages(locale);
  return (
    <MutationForm
      locale={locale}
      action={submitLineup}
      label={t.submitLineup}
      hidden={{ id, match, subteam }}
      once
    >
      {[1, 2, 3, 4, 5].map((slot) => (
        <label key={slot} className="field">
          {t.slot} {slot} · {lineupGender(slot) === "boy" ? t.boy : t.girl}
          <select
            name="players"
            className={selectClass}
            required
            defaultValue=""
          >
            <option value="" disabled>
              {t.choose}
            </option>
            {candidates
              .filter((v) => v.gender === lineupGender(slot))
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
          </select>
        </label>
      ))}
      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          name="confirm"
          value="yes"
          type="checkbox"
          required
          className="mt-1 size-4 shrink-0"
        />
        {t.lineupConfirm}
      </label>
    </MutationForm>
  );
}
export function ReplacementForm({
  locale,
  id,
  match,
  subteam,
  revision,
  candidates,
  used,
  pendingSlots,
}: {
  locale: Locale;
  id: string;
  match: string;
  subteam: string;
  revision: number;
  candidates: LineupCandidate[];
  used: string[];
  pendingSlots: number[];
}) {
  const t = messages(locale),
    available = candidates.filter((v) => !used.includes(v.id)),
    [slot, setSlot] = useState(
      pendingSlots.find((s) =>
        available.some((v) => v.gender === lineupGender(s)),
      ) ??
        pendingSlots[0] ??
        1,
    );
  if (!pendingSlots.length || !available.length)
    return <p className="text-sm text-muted-foreground">{t.noReplacement}</p>;
  return (
    <MutationForm
      confirmation
      locale={locale}
      action={replacePlayer}
      label={t.replacePlayer}
      hidden={{ id, match, subteam, revision: String(revision) }}
    >
      <label className="field">
        {t.slot}
        <select
          name="slot"
          className={selectClass}
          value={slot}
          onChange={(e) => setSlot(Number(e.target.value))}
        >
          {pendingSlots.map((v) => (
            <option key={v} value={v}>
              {v} · {lineupGender(v) === "boy" ? t.boy : t.girl}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {t.replacementPlayer}
        <select
          key={`${slot}:${revision}`}
          name="player"
          className={selectClass}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t.choose}
          </option>
          {available
            .filter((v) => v.gender === lineupGender(slot))
            .map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
        </select>
      </label>
      <p className="text-sm leading-6 text-muted-foreground">
        {t.replacementHelp}
      </p>
    </MutationForm>
  );
}
