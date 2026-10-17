import { MutationForm } from "@/components/mutation-form";
import { Input } from "@/components/ui/input";
import { messages, type Locale } from "@/lib/locales";
import { selectClass } from "@/features/teams/forms";
import {
  savePlayer,
  addRosterPlayer,
  endMembership,
  dropPlayer,
  transferPlayer,
  setTrainerRef,
} from "./actions";
import type { Database } from "@/lib/supabase/database.types";
type Player = Database["public"]["Tables"]["players"]["Row"];
type Choice = { id: string; name: string };
export function PlayerForm({
  locale,
  id,
  club,
  player,
}: {
  locale: Locale;
  id: string;
  club: string;
  player?: Player;
}) {
  const t = messages(locale);
  return (
    <MutationForm
      action={savePlayer}
      locale={locale}
      hidden={{ id, club }}
      label={player ? t.save : t.newPlayer}
      once={!player}
    >
      <label className="field">
        {t.firstName}
        <Input
          name="firstName"
          defaultValue={player?.first_name}
          required
          maxLength={80}
        />
      </label>
      <label className="field">
        {t.lastName}
        <Input
          name="lastName"
          defaultValue={player?.last_name}
          required
          maxLength={80}
        />
      </label>
      <label className="field">
        {t.gender}
        <select
          name="gender"
          className={selectClass}
          required
          defaultValue={player?.gender ?? ""}
        >
          <option value="" disabled>
            {t.choose}
          </option>
          <option value="boy">{t.boy}</option>
          <option value="girl">{t.girl}</option>
        </select>
      </label>
      <label className="field">
        {t.dob}
        <Input
          name="dob"
          type="date"
          defaultValue={player?.date_of_birth}
          min="1900-01-01"
          max={new Date().toISOString().slice(0, 10)}
          required
        />
      </label>
      <label className="field">
        {t.hand}
        <select
          name="hand"
          className={selectClass}
          required
          defaultValue={player?.playing_hand ?? ""}
        >
          <option value="" disabled>
            {t.choose}
          </option>
          <option value="right">{t.right}</option>
          <option value="left">{t.left}</option>
        </select>
      </label>
      <label className="field">
        {t.style}
        <Input
          name="style"
          defaultValue={player?.playing_style}
          required
          maxLength={100}
        />
      </label>
      <label className="field">
        {t.sportsLevel}
        <Input
          name="sportsLevel"
          defaultValue={player?.sports_level}
          required
          maxLength={100}
        />
      </label>
      <label className="field">
        {t.externalId}
        <Input
          name="externalId"
          defaultValue={player?.external_rating_id ?? ""}
          maxLength={100}
        />
      </label>
      <p className="text-sm leading-6 text-muted-foreground">
        {t.playerPrivacy}
      </p>
    </MutationForm>
  );
}
export function RosterForm({
  locale,
  seasonId,
  subteam,
  players,
}: {
  locale: Locale;
  seasonId: string;
  subteam: string;
  players: Choice[];
}) {
  const t = messages(locale);
  return (
    <MutationForm
      action={addRosterPlayer}
      locale={locale}
      hidden={{ seasonId, subteam }}
      label={t.addRoster}
    >
      <label className="field">
        {t.players}
        <select name="player" className={selectClass} required defaultValue="">
          <option value="" disabled>
            {t.choose}
          </option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-muted-foreground">{t.rosterHelp}</p>
    </MutationForm>
  );
}
export function EndMembershipForm({
  locale,
  membership,
}: {
  locale: Locale;
  membership: string;
}) {
  const t = messages(locale);
  return (
    <MutationForm
      action={endMembership}
      locale={locale}
      hidden={{ membership }}
      label={t.removeRoster}
      once
    >
      <label className="field">
        {t.reason}
        <Input name="reason" required maxLength={500} />
      </label>
    </MutationForm>
  );
}
export function DropPlayerForm({
  locale,
  player,
}: {
  locale: Locale;
  player: string;
}) {
  const t = messages(locale);
  return (
    <MutationForm
      action={dropPlayer}
      locale={locale}
      hidden={{ player }}
      label={t.dropPlayer}
      once
    >
      <label className="field">
        {t.effectiveDate}
        <Input
          name="date"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
        />
      </label>
      <label className="field">
        {t.reason}
        <Input name="reason" required maxLength={500} />
      </label>
    </MutationForm>
  );
}
export function TransferPlayerForm({
  locale,
  player,
  clubs,
}: {
  locale: Locale;
  player: string;
  clubs: Choice[];
}) {
  const t = messages(locale);
  return (
    <MutationForm
      action={transferPlayer}
      locale={locale}
      hidden={{ player }}
      label={t.transferPlayer}
      once
    >
      <label className="field">
        {t.receivingClub}
        <select name="club" className={selectClass} required defaultValue="">
          <option value="" disabled>
            {t.choose}
          </option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {t.reason}
        <Input name="reason" required maxLength={500} />
      </label>
      <p className="text-sm leading-6 text-muted-foreground">
        {t.transferHelp}
      </p>
    </MutationForm>
  );
}
export function TrainerRefForm({
  locale,
  player,
  trainers,
}: {
  locale: Locale;
  player: string;
  trainers: Choice[];
}) {
  const t = messages(locale);
  return (
    <MutationForm
      action={setTrainerRef}
      locale={locale}
      hidden={{ player }}
      label={t.saveTrainerRef}
    >
      <label className="field">
        {t.refKind}
        <select name="kind" className={selectClass} required>
          <option value="first">{t.firstTrainer}</option>
          <option value="personal">{t.personalTrainer}</option>
        </select>
      </label>
      <label className="field">
        {t.linkedTrainer}
        <select name="trainer" className={selectClass} defaultValue="">
          <option value="">{t.freeTrainer}</option>
          {trainers.map((trainer) => (
            <option key={trainer.id} value={trainer.id}>
              {trainer.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {t.firstName}
        <Input name="firstName" maxLength={80} />
      </label>
      <label className="field">
        {t.lastName}
        <Input name="lastName" maxLength={80} />
      </label>
      <p className="text-sm leading-6 text-muted-foreground">
        {t.trainerRefHelp}
      </p>
    </MutationForm>
  );
}
