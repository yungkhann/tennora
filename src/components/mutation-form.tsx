"use client";
import { useActionState, useEffect, useRef, useState } from "react";
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
  confirmation = false,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  locale: Locale;
  hidden?: Record<string, string>;
  label: string;
  children?: React.ReactNode;
  once?: boolean;
  confirmation?: boolean;
}) {
  const t = messages(locale),
    [confirmed, setConfirmed] = useState(false),
    formRef = useRef<HTMLFormElement>(null),
    [state, action, pending] = useActionState(
      async (old: FormState, form: FormData) => {
        try {
          return await mutation(old, form);
        } finally {
          setConfirmed(false);
        }
      },
      initialFormState,
    );
  useEffect(() => {
    const ancestors: Element[] = [];
    let element = formRef.current?.parentElement;
    while (element) {
      if (element.matches("details, dialog")) ancestors.push(element);
      element = element.parentElement;
    }
    const reset = () => setConfirmed(false);
    for (const ancestor of ancestors) {
      ancestor.addEventListener("toggle", reset);
      ancestor.addEventListener("close", reset);
    }
    return () => {
      for (const ancestor of ancestors) {
        ancestor.removeEventListener("toggle", reset);
        ancestor.removeEventListener("close", reset);
      }
    };
  }, []);
  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(event) => {
        if (confirmation && !confirmed) event.preventDefault();
      }}
      aria-label={label}
      className="grid gap-4"
      onReset={(event) => {
        event.preventDefault();
        setConfirmed(false);
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <fieldset disabled={pending} className="grid min-w-0 gap-4">
        {children}
        {confirmation && (
          <label className="flex items-start gap-3 text-sm leading-6">
            <input
              type="checkbox"
              name="confirm"
              value="yes"
              required
              className="mt-1 size-4 shrink-0"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            {t.confirmAction}
          </label>
        )}
      </fieldset>
      <FormFeedback state={state} />
      <Button
        disabled={
          pending ||
          (confirmation && !confirmed) ||
          (once && state.status === "success")
        }
      >
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
