"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormFeedback } from "@/components/form-feedback";
import { initialFormState } from "@/lib/validation";
import { messages, type Locale } from "@/lib/locales";
import { updateProfile } from "./actions";
export function ProfileForm({
  displayName,
  email,
  locale = "ru",
}: {
  displayName: string;
  email: string;
  locale?: Locale;
}) {
  const t = messages(locale),
    [state, action, pending] = useActionState(updateProfile, initialFormState);
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="locale" value={locale} />
      <label className="field">
        {t.displayName}
        <Input
          name="displayName"
          defaultValue={displayName}
          minLength={2}
          maxLength={80}
          required
          autoComplete="name"
        />
      </label>
      <label className="field">
        {t.email}
        <Input value={email} type="email" readOnly />
      </label>
      <FormFeedback state={state} />
      <Button disabled={pending}>{pending ? t.working : t.save}</Button>
    </form>
  );
}
