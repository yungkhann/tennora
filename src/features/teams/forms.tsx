import { MutationForm } from "@/components/mutation-form";
import { Input } from "@/components/ui/input";
import { messages, type Locale } from "@/lib/locales";
import { saveTeam, registerTeam, assignTrainer } from "./actions";
type Choice = { id: string; name: string };
export const selectClass =
  "h-12 min-w-0 w-full rounded-lg border bg-background px-3 text-base";
export function TeamForm({
  locale,
  id,
  team,
}: {
  locale: Locale;
  id: string;
  team?: { name: string; region: string };
}) {
  const t = messages(locale);
  return (
    <MutationForm
      action={saveTeam}
      locale={locale}
      hidden={{ id }}
      label={team ? t.save : t.newTeam}
      once={!team}
    >
      <label className="field">
        {t.name}
        <Input
          name="name"
          defaultValue={team?.name}
          required
          minLength={2}
          maxLength={100}
        />
      </label>
      <label className="field">
        {t.region}
        <Input
          name="region"
          defaultValue={team?.region}
          required
          maxLength={100}
        />
      </label>
    </MutationForm>
  );
}
export function TeamRegistrationForm({
  locale,
  club,
  seasons,
}: {
  locale: Locale;
  club: string;
  seasons: Choice[];
}) {
  const t = messages(locale);
  return (
    <MutationForm
      action={registerTeam}
      locale={locale}
      hidden={{ club }}
      label={t.registerTeam}
    >
      <label className="field">
        {t.seasons}
        <select
          name="seasonId"
          required
          className={selectClass}
          defaultValue=""
        >
          <option value="" disabled>
            {t.choose}
          </option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </MutationForm>
  );
}
export function TrainerAssignmentForm({
  locale,
  club,
  trainers,
  subteams,
}: {
  locale: Locale;
  club: string;
  trainers: Choice[];
  subteams: { id: string; age_group: string }[];
}) {
  const t = messages(locale);
  return (
    <MutationForm
      action={assignTrainer}
      locale={locale}
      hidden={{ club }}
      label={t.assignTrainer}
    >
      <label className="field">
        {t.trainer}
        <select name="trainer" required className={selectClass} defaultValue="">
          <option value="" disabled>
            {t.choose}
          </option>
          {trainers.map((trainer) => (
            <option key={trainer.id} value={trainer.id}>
              {trainer.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">{t.subteams}</legend>
        {subteams.map((s) => (
          <label className="flex gap-3 text-sm" key={s.id}>
            <input
              type="checkbox"
              name="subteams"
              value={s.id}
              defaultChecked
            />
            {s.age_group}
          </label>
        ))}
      </fieldset>
      <p className="text-sm text-muted-foreground">{t.trainerScopeHelp}</p>
    </MutationForm>
  );
}
