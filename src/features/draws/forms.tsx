import { MutationForm } from "@/components/mutation-form";
import { messages, type Locale } from "@/lib/locales";
import { generateDraw, publishDraw } from "./actions";
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
