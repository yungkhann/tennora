"use client";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
import { initialFormState } from "@/lib/validation";
import { messages, type Locale } from "@/lib/locales";
import { saveSeason, saveTour } from "./actions";
type Season = {
  id: string;
  name: string;
  year: number;
  starts_on: string;
  ends_on: string;
};
type Tour = {
  id: string;
  name: string;
  ordinal: number;
  starts_on: string;
  ends_on: string;
};
export function SeasonForm({
  locale,
  id,
  season,
}: {
  locale: Locale;
  id: string;
  season?: Season;
}) {
  const t = messages(locale),
    [state, action, pending] = useActionState(saveSeason, initialFormState);
  const [values, setValues] = useState({
    name: season?.name ?? "",
    year: String(season?.year ?? new Date().getUTCFullYear()),
    startsOn: season?.starts_on ?? "",
    endsOn: season?.ends_on ?? "",
  });
  const field =
    (name: keyof typeof values) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [name]: event.target.value }));
  return (
    <form
      action={action}
      className="grid gap-4"
      aria-label={season ? `${t.editSeason} ${season.name}` : t.newSeason}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <label className="field">
        {t.name}
        <Input
          name="name"
          value={values.name}
          onChange={field("name")}
          required
          minLength={2}
          maxLength={100}
        />
      </label>
      <label className="field">
        {t.seasonYear}
        <Input
          name="year"
          type="number"
          value={values.year}
          onChange={field("year")}
          required
          min={1900}
          max={2200}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          {t.firstDay}
          <Input
            name="startsOn"
            type="date"
            value={values.startsOn}
            onChange={field("startsOn")}
            required
          />
        </label>
        <label className="field">
          {t.lastDay}
          <Input
            name="endsOn"
            type="date"
            value={values.endsOn}
            onChange={field("endsOn")}
            required
            min={values.startsOn || undefined}
          />
        </label>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{t.ageRule}</p>
      <FormFeedback state={state} />
      <Button disabled={pending || (!season && state.status === "success")}>
        {pending ? t.working : season ? t.save : t.newSeason}
      </Button>
      {state.status === "success" && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => window.location.reload()}
        >
          {t.refreshForms}
        </Button>
      )}
    </form>
  );
}
export function TourForm({
  locale,
  id,
  seasonId,
  tour,
  minDate,
  maxDate,
  ordinal = 1,
}: {
  locale: Locale;
  id: string;
  seasonId: string;
  tour?: Tour;
  minDate: string;
  maxDate: string;
  ordinal?: number;
}) {
  const t = messages(locale),
    [state, action, pending] = useActionState(saveTour, initialFormState);
  const [values, setValues] = useState({
    name: tour?.name ?? "",
    ordinal: String(tour?.ordinal ?? ordinal),
    startsOn: tour?.starts_on ?? "",
    endsOn: tour?.ends_on ?? "",
  });
  const field =
    (name: keyof typeof values) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [name]: event.target.value }));
  return (
    <form
      action={action}
      className="grid gap-4"
      aria-label={tour ? `${t.editTour} ${tour.name}` : t.newTour}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="seasonId" value={seasonId} />
      <label className="field">
        {t.name}
        <Input
          name="name"
          value={values.name}
          onChange={field("name")}
          required
          minLength={2}
          maxLength={100}
        />
      </label>
      <label className="field">
        {t.ordinal}
        <Input
          name="ordinal"
          type="number"
          value={values.ordinal}
          onChange={field("ordinal")}
          min={1}
          max={100}
          required
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          {t.firstDay}
          <Input
            name="startsOn"
            type="date"
            value={values.startsOn}
            onChange={field("startsOn")}
            min={minDate}
            max={maxDate}
            required
          />
        </label>
        <label className="field">
          {t.lastDay}
          <Input
            name="endsOn"
            type="date"
            value={values.endsOn}
            onChange={field("endsOn")}
            min={values.startsOn || minDate}
            max={maxDate}
            required
          />
        </label>
      </div>
      <FormFeedback state={state} />
      <Button disabled={pending || (!tour && state.status === "success")}>
        {pending ? t.working : tour ? t.save : t.newTour}
      </Button>
      {state.status === "success" && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => window.location.reload()}
        >
          {t.refreshForms}
        </Button>
      )}
    </form>
  );
}
