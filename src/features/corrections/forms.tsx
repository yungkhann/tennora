import { randomUUID } from "node:crypto";
import { MutationForm } from "@/components/mutation-form";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/lib/locales";
import { proposeCorrection, applyCorrection } from "./actions";
import { correctionMessages } from "./messages";
export function CorrectionForm({
  locale,
  match,
  game,
  base,
  sets,
  server,
}: {
  locale: Locale;
  match: string;
  game: string;
  base: string;
  sets: { a: number; b: number }[];
  server: string;
}) {
  const t = correctionMessages(locale);
  return (
    <MutationForm
      locale={locale}
      action={proposeCorrection}
      label={t.propose}
      hidden={{ id: randomUUID(), match, game, base }}
    >
      <label>
        {t.played}
        <select
          name="kind"
          className="mt-1 min-h-12 w-full rounded-lg border bg-background px-3"
        >
          <option value="played">{t.played}</option>
          <option value="withdrawal">{t.withdrawal}</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        {[
          ["winner", t.winner],
          ["server", t.server],
        ].map(([name, label]) => (
          <label key={name}>
            {label}
            <select
              name={name}
              defaultValue={name === "server" ? server : "a"}
              className="mt-1 min-h-12 w-full rounded-lg border bg-background px-3"
            >
              <option value="a">A</option>
              <option value="b">B</option>
            </select>
          </label>
        ))}
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm">{t.sets}</legend>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2"
            key={i}
          >
            <span className="font-mono text-sm">{i + 1}</span>
            {(["a", "b"] as const).map((side) => (
              <Input
                key={side}
                aria-label={`${i + 1} ${side.toUpperCase()}`}
                name={`${side}${i}`}
                type="number"
                min="0"
                max="9007199254740991"
                step="1"
                defaultValue={sets[i]?.[side]}
              />
            ))}
          </div>
        ))}
      </fieldset>
      <label>
        {t.reason}
        <Input name="reason" required maxLength={500} />
      </label>
    </MutationForm>
  );
}
export function ApplyCorrectionForm({
  locale,
  request,
  digest,
  requiresOrganizer,
  organizer,
}: {
  locale: Locale;
  request: string;
  digest: string;
  requiresOrganizer: boolean;
  organizer: boolean;
}) {
  const t = correctionMessages(locale);
  if (requiresOrganizer && !organizer) return <p role="status">{t.blocked}</p>;
  return (
    <MutationForm
      locale={locale}
      action={applyCorrection}
      once
      label={t.apply}
      hidden={{ id: randomUUID(), request, digest }}
    >
      <label>
        {t.reason}
        <Input name="reason" required maxLength={500} />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input
          className="mt-1 size-4 shrink-0"
          type="checkbox"
          name="confirm"
          value="yes"
          required
        />
        {t.confirm}
      </label>
      {requiresOrganizer && (
        <label className="flex items-start gap-3 text-sm">
          <input
            className="mt-1 size-4 shrink-0"
            type="checkbox"
            name="resolve"
            value="yes"
            required
          />
          {t.resolve}
        </label>
      )}
    </MutationForm>
  );
}
