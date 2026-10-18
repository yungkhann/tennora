import { randomUUID } from "node:crypto";
import { MutationForm } from "@/components/mutation-form";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/lib/locales";
import { hallCommand, matchCommand, judgeCommand } from "./actions";
import { hallMessages } from "./messages";
import type { HallSnapshot } from "./validation";
export function HallBatchForm({
  locale,
  tour,
  operation,
}: {
  locale: Locale;
  tour: string;
  operation: "allocate" | "start_all";
}) {
  const t = hallMessages(locale);
  return (
    <MutationForm
      once
      locale={locale}
      action={hallCommand}
      label={operation === "allocate" ? t.allocate : t.startAll}
      hidden={{ id: randomUUID(), tour, operation }}
    >
      <label>
        {t.reason}
        <Input name="reason" maxLength={500} required />
      </label>
      <label className="flex gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0"
          name="confirm"
          value="yes"
          required
        />
        {t.bulk}
      </label>
    </MutationForm>
  );
}
export function MatchOperationForm({
  locale,
  match,
  version,
  operation,
  tables,
}: {
  locale: Locale;
  match: string;
  version: number;
  operation: "assign" | "release" | "call" | "start" | "resume";
  tables: number;
}) {
  const t = hallMessages(locale);
  return (
    <MutationForm
      once
      locale={locale}
      action={matchCommand}
      label={t[operation]}
      hidden={{ id: randomUUID(), match, version: String(version), operation }}
    >
      {operation === "assign" && (
        <label>
          {t.table}
          <Input name="table" type="number" min="1" max={tables} required />
        </label>
      )}
      <label>
        {t.reason}
        <Input name="reason" maxLength={500} required />
      </label>
    </MutationForm>
  );
}
export function JudgeAssignmentForm({
  locale,
  snapshot,
  table,
}: {
  locale: Locale;
  snapshot: HallSnapshot;
  table: HallSnapshot["tables"][number];
}) {
  const t = hallMessages(locale);
  return (
    <MutationForm
      once
      locale={locale}
      action={judgeCommand}
      label={t.assignJudge}
      hidden={{
        id: randomUUID(),
        tour: snapshot.tour_id,
        day: snapshot.venue_day,
        table: String(table.number),
        version: String(table.assignment_version),
      }}
    >
      <select
        aria-label={t.assignJudge}
        name="operation"
        className="min-h-12 rounded-lg border bg-background px-3"
      >
        <option value="assign">{t.assignJudge}</option>
        <option value="takeover">{t.takeover}</option>
        <option value="release">{t.releaseJudge}</option>
      </select>
      <select
        aria-label={t.owner}
        name="staff"
        className="min-h-12 rounded-lg border bg-background px-3"
        defaultValue={table.owner ?? ""}
      >
        <option value="">{t.unassigned}</option>
        {snapshot.judges.map((j) => (
          <option key={j.id} value={j.id}>
            {j.name}
          </option>
        ))}
      </select>
      <label>
        {t.reason}
        <Input name="reason" maxLength={500} required />
      </label>
    </MutationForm>
  );
}
