"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
import { initialFormState, type FormState } from "@/lib/validation";
import { messages, type Locale } from "@/lib/locales";
export function MutationForm({
  action: mutation,
  locale,
  hidden = {},
  label,
  children,
  once = false,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  locale: Locale;
  hidden?: Record<string, string>;
  label: string;
  children: React.ReactNode;
  once?: boolean;
}) {
  const t = messages(locale),
    [state, action, pending] = useActionState(mutation, initialFormState);
  return (
    <form
      action={action}
      aria-label={label}
      className="grid gap-4"
      onReset={(event) => event.preventDefault()}
    >
      <input type="hidden" name="locale" value={locale} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <fieldset disabled={pending} className="grid min-w-0 gap-4">
        {children}
      </fieldset>
      <FormFeedback state={state} />
      <Button disabled={pending || (once && state.status === "success")}>
        {pending ? t.working : label}
      </Button>
      {once && state.status === "success" && (
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
