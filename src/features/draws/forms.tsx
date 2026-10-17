import { MutationForm } from "@/components/mutation-form";
import { messages, type Locale } from "@/lib/locales";
import { generateDraw, publishDraw, swapSeeds } from "./actions";
export function GenerateDrawForm({
  locale,
  id,
  tourId,
  age,
  revision,
}: {
  locale: Locale;
  id: string;
  tourId: string;
  age: string;
  revision: number;
}) {
  const t = messages(locale);
  return (
    <MutationForm
      locale={locale}
      action={generateDraw}
      label={revision ? t.regenerateDraw : t.generateDraw}
      hidden={{ id, tourId, age, revision: String(revision) }}
      once
    >
      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          name="confirm"
          value="yes"
          required
          className="mt-1 size-4 shrink-0"
        />
        {t.seedFreezeConfirm}
      </label>
    </MutationForm>
  );
}
export function PublishDrawForm({
  locale,
  id,
  revision,
}: {
  locale: Locale;
  id: string;
  revision: number;
}) {
  const t = messages(locale);
  return (
    <MutationForm
      locale={locale}
      action={publishDraw}
      label={t.publishDraw}
      hidden={{ id, revision: String(revision) }}
      once
    >
      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          name="confirm"
          value="yes"
          required
          className="mt-1 size-4 shrink-0"
        />
        {t.publishDrawConfirm}
      </label>
    </MutationForm>
  );
}

export function SwapSeedsForm({
  locale,
  id,
  source,
  revision,
  entries,
}: {
  locale: Locale;
  id: string;
  source: string;
  revision: number;
  entries: { seed: number; name: string }[];
}) {
  const t = messages(locale);
  return (
    <MutationForm
      locale={locale}
      action={swapSeeds}
      label={t.swapSeeds}
      hidden={{ id, source, revision: String(revision) }}
      once
    >
      <p className="text-sm leading-6 text-muted-foreground">{t.swapHelp}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["seedA", "seedB"] as const).map((field, i) => (
          <label key={field} className="grid min-w-0 gap-2 text-sm">
            {i === 0 ? t.seedA : t.seedB}
            <select
              name={field}
              defaultValue=""
              required
              className="w-full min-w-0 rounded-lg border bg-background p-2"
            >
              <option value="">{t.chooseSeed}</option>
              {entries.map((e) => (
                <option key={e.seed} value={e.seed}>
                  {e.seed}. {e.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <label className="grid gap-2 text-sm">
        {t.reason}
        <textarea
          name="reason"
          required
          maxLength={500}
          className="min-h-20 rounded-lg border bg-background p-2"
        />
      </label>
      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          name="confirm"
          value="yes"
          required
          className="mt-1 size-4 shrink-0"
        />
        {t.swapConfirm}
      </label>
    </MutationForm>
  );
}
