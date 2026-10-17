"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormFeedback } from "@/components/form-feedback";
import { initialFormState } from "@/lib/validation";
import { messages, type Locale } from "@/lib/locales";
import { staffRoles, type StaffRole } from "./permissions";
import { provisionStaff, changeStaff, resetStaffPassword } from "./actions";
export function RoleFields({
  roles = [],
  locale,
}: {
  roles?: StaffRole[];
  locale: Locale;
}) {
  const t = messages(locale);
  const [selected, setSelected] = useState(roles);
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-semibold">{t.roles}</legend>
      {staffRoles.map((role) => (
        <label key={role} className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="roles"
            value={role}
            checked={selected.includes(role)}
            onChange={(event) =>
              setSelected((current) =>
                event.target.checked
                  ? [...current, role]
                  : current.filter((r) => r !== role),
              )
            }
            className="size-4 accent-primary"
          />
          {t[role]}
        </label>
      ))}
    </fieldset>
  );
}
type RetryJob = {
  id: string;
  email: string;
  display_name: string;
  roles: StaffRole[];
};
export function ProvisionForm({
  locale,
  jobId,
  retry,
}: {
  locale: Locale;
  jobId: string;
  retry?: RetryJob;
}) {
  const t = messages(locale),
    [state, action, pending] = useActionState(provisionStaff, initialFormState);
  const [displayName, setDisplayName] = useState(retry?.display_name ?? "");
  const [email, setEmail] = useState(retry?.email ?? "");
  return (
    <form
      action={action}
      className="grid gap-5"
      aria-label={retry ? t.retry : t.create}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="jobId" value={jobId} />
      <label className="field">
        {t.name}
        <Input
          name="displayName"
          required
          minLength={2}
          maxLength={80}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          readOnly={!!retry}
        />
      </label>
      <label className="field">
        {t.email}
        <Input
          name="email"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          readOnly={!!retry}
        />
      </label>
      <label className="field">
        {t.initialPassword}
        <Input
          name="password"
          type="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      {retry ? (
        <>
          <input type="hidden" name="roles" value={retry.roles[0]} />
          {retry.roles.slice(1).map((r) => (
            <input key={r} type="hidden" name="roles" value={r} />
          ))}
        </>
      ) : (
        <RoleFields locale={locale} />
      )}
      <p className="text-sm leading-6 text-muted-foreground">{t.createHelp}</p>
      <FormFeedback state={state} />
      <Button disabled={pending || state.status === "success"}>
        {pending ? t.working : retry ? t.retry : t.create}
      </Button>
    </form>
  );
}
export function StaffEditForm({
  locale,
  target,
  roles,
  active,
}: {
  locale: Locale;
  target: string;
  roles: StaffRole[];
  active: boolean;
}) {
  const t = messages(locale),
    [state, action, pending] = useActionState(changeStaff, initialFormState);
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="target" value={target} />
      <RoleFields roles={roles} locale={locale} />
      <label className="field">
        {t.activate}
        <select
          name="active"
          defaultValue={String(active)}
          className="rounded-md border bg-background p-2"
        >
          <option value="true">{t.active}</option>
          <option value="false">{t.inactive}</option>
        </select>
      </label>
      <FormFeedback state={state} />
      <Button disabled={pending} variant="outline">
        {pending ? t.working : t.save}
      </Button>
    </form>
  );
}
export function StaffResetForm({
  locale,
  target,
  jobId,
}: {
  locale: Locale;
  target: string;
  jobId: string;
}) {
  const t = messages(locale),
    [state, action, pending] = useActionState(
      resetStaffPassword,
      initialFormState,
    );
  return (
    <form action={action} className="mt-5 grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="jobId" value={jobId} />
      <p className="text-sm text-muted-foreground">{t.resetHelp}</p>
      <label className="field">
        {t.password}
        <Input
          name="password"
          type="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <label className="field">
        {t.confirmPassword}
        <Input
          name="confirmPassword"
          type="password"
          required
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <FormFeedback state={state} />
      <Button
        variant="outline"
        disabled={pending || state.status === "success"}
      >
        {pending ? t.working : t.reset}
      </Button>
    </form>
  );
}
