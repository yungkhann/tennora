import { MutationForm } from "@/components/mutation-form";
import { messages, type Locale } from "@/lib/locales";
import { refreshStandings, drawTies } from "./actions";
export function StandingsForm({
  locale,
  group,
  revision,
  tie = false,
}: {
  locale: Locale;
  group: string;
  revision?: number;
  tie?: boolean;
}) {
  const t = messages(locale);
  return (
    <MutationForm
      locale={locale}
      action={tie ? drawTies : refreshStandings}
      label={tie ? t.drawTies : t.refreshStandings}
      hidden={{ group, ...(revision ? { revision: String(revision) } : {}) }}
    >
      {tie ? (
        <label className="flex items-start gap-3 text-sm leading-6">
          <input
            type="checkbox"
            name="confirm"
            value="yes"
            required
            className="mt-1 size-4 shrink-0"
          />
          {t.tieDrawConfirm}
        </label>
      ) : null}
    </MutationForm>
  );
}
