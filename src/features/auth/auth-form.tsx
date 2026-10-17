"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormFeedback } from "@/components/form-feedback";
import { initialFormState } from "@/lib/validation";
import { login, register, requestRecovery, resetPassword } from "./actions";
type Mode = "login" | "register" | "recovery" | "reset";
const modes = {
  login: {
    action: login,
    title: "Welcome back.",
    description: "Your club. Your community. Your next day on court.",
    submit: "Sign in",
  },
  register: {
    action: register,
    title: "Make yourself at home.",
    description: "Create your account and find your place on court.",
    submit: "Create account",
  },
  recovery: {
    action: requestRecovery,
    title: "Back in the game.",
    description: "Enter your email and we'll send you a reset link.",
    submit: "Send reset link",
  },
  reset: {
    action: resetPassword,
    title: "A fresh start.",
    description: "Choose a new password for your account.",
    submit: "Update password",
  },
};
export function AuthForm({
  mode,
  configured,
  callbackError = false,
}: {
  mode: Mode;
  configured: boolean;
  callbackError?: boolean;
}) {
  const settings = modes[mode];
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [state, action, pending] = useActionState(
    settings.action,
    initialFormState,
  );
  const hasPassword = mode !== "recovery";
  return (
    <>
      <p className="eyebrow mb-3">
        {mode === "register" ? "Join Tennora" : "Your Tennora account"}
      </p>
      <h1 className="text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
        {settings.title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {settings.description}
      </p>
      {!configured && (
        <p
          role="status"
          className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm leading-6"
        >
          Authentication is not configured. Follow the project README to connect
          Supabase.
        </p>
      )}
      {callbackError && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-destructive/30 p-4 text-sm text-destructive"
        >
          This link is invalid or has expired. Try signing in or request a new
          reset link.
        </p>
      )}
      <form
        action={action}
        className="mt-8 grid gap-5"
        aria-label={settings.submit}
      >
        {mode === "register" && (
          <div className="field">
            <label htmlFor="displayName">Your name</label>
            <Input
              id="displayName"
              name="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              placeholder="Alex Morgan"
              minLength={2}
              maxLength={80}
              required
              disabled={pending}
            />
          </div>
        )}
        {mode !== "reset" && (
          <div className="field">
            <label htmlFor="email">Email address</label>
            <Input
              id="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@yourclub.com"
              maxLength={254}
              required
              disabled={pending}
            />
          </div>
        )}
        {hasPassword && (
          <div className="field">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="password">
                {mode === "reset" ? "New password" : "Password"}
              </label>
              {mode === "login" && (
                <Link className="text-link text-xs" href="/forgot-password">
                  Forgot password?
                </Link>
              )}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
              required
              disabled={pending}
              aria-describedby={mode !== "login" ? "password-hint" : undefined}
            />
            {mode !== "login" && (
              <p id="password-hint" className="text-xs text-muted-foreground">
                At least 12 characters. Make it your own.
              </p>
            )}
          </div>
        )}
        {mode === "reset" && (
          <div className="field">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              maxLength={128}
              disabled={pending}
            />
          </div>
        )}
        <FormFeedback state={state} />
        <Button
          type="submit"
          className="mt-1 w-full"
          disabled={pending || !configured}
          aria-busy={pending}
        >
          {pending ? (
            <>
              <LoaderCircle className="animate-spin" />
              Please wait…
            </>
          ) : (
            <>
              {settings.submit}
              <ArrowRight />
            </>
          )}
        </Button>
      </form>
      <p className="mt-7 text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            New to Tennora?{" "}
            <Link className="text-link" href="/register">
              Create an account
            </Link>
          </>
        ) : mode === "register" ? (
          <>
            Already a member?{" "}
            <Link className="text-link" href="/login">
              Sign in
            </Link>
          </>
        ) : (
          <Link
            className="text-link"
            href={mode === "reset" ? "/dashboard" : "/login"}
          >
            {mode === "reset" ? "Return to workspace" : "Back to sign in"}
          </Link>
        )}
      </p>
    </>
  );
}
