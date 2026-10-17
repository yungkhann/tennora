"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormFeedback } from "@/components/form-feedback";
import { initialFormState } from "@/lib/validation";
import { messages, type Locale } from "@/lib/locales";
import { login, requestRecovery, resetPassword } from "./actions";
export function AuthForm({
  mode,
  configured,
  callbackError = false,
  staffDenied = false,
  locale = "ru",
}: {
  mode: "login" | "recovery" | "reset";
  configured: boolean;
  callbackError?: boolean;
  staffDenied?: boolean;
  locale?: Locale;
}) {
  const t = messages(locale);
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState(
    { login, recovery: requestRecovery, reset: resetPassword }[mode],
    initialFormState,
  );
  const title =
    mode === "login"
      ? t.signIn
      : mode === "recovery"
        ? t.recoveryTitle
        : t.changePassword;
  const submit =
    mode === "login"
      ? t.signIn
      : mode === "recovery"
        ? t.sendReset
        : t.resetHeading;
  return (
    <>
      <p className="eyebrow mb-3">{t.league}</p>
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-4 text-sm text-muted-foreground">{t.accountsOnly}</p>
      {!configured && <p role="status">{t.unavailable}</p>}
      {callbackError && (
        <p role="alert" className="mt-4 text-destructive">
          {t.callbackError}
        </p>
      )}
      {staffDenied && (
        <p role="alert" className="mt-4 text-destructive">
          {t.staffDenied}
        </p>
      )}
      <form action={action} className="mt-8 grid gap-5" aria-label={submit}>
        <input type="hidden" name="locale" value={locale} />
        {mode !== "reset" && (
          <label className="field">
            {t.email}
            <Input
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              disabled={pending}
            />
          </label>
        )}
        {mode !== "recovery" && (
          <label className="field">
            {t.password}
            <Input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
              disabled={pending}
            />
          </label>
        )}
        {mode === "reset" && (
          <label className="field">
            {t.confirmPassword}
            <Input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              disabled={pending}
            />
          </label>
        )}
        <FormFeedback state={state} />
        <Button disabled={pending || !configured}>
          {pending ? t.working : submit}
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap gap-5 text-sm underline">
        {mode === "login" ? (
          <Link href={`/${locale}/forgot-password`}>{t.recovery}</Link>
        ) : (
          <Link href={`/${locale}/login`}>{t.back}</Link>
        )}
        {mode === "reset" && (
          <Link href={`/${locale}/workspace`}>{t.workspace}</Link>
        )}
      </div>
    </>
  );
}
