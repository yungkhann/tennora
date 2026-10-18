import { MutationForm } from "@/components/mutation-form";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/lib/locales";
import { publicMessages } from "@/features/public/messages";
import { saveTourWeight } from "./weight-action";
export function TourWeightForm({
  locale,
  tour,
  weight,
}: {
  locale: Locale;
  tour: string;
  weight: number;
}) {
  const t = publicMessages(locale);
  return (
    <MutationForm
      locale={locale}
      action={saveTourWeight}
      label={t.saveWeight}
      hidden={{ tour }}
    >
      <label>
        {t.weight}
        <Input
          type="number"
          name="weight"
          min="0.001"
          max="1000"
          step="0.001"
          defaultValue={weight}
          required
        />
      </label>
      <p className="text-sm text-muted-foreground">{t.tourWeightHelp}</p>
    </MutationForm>
  );
}
