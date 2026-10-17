"use client";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
import { initialFormState } from "@/lib/validation";
import { updateProfile } from "./actions";
export function ProfileForm({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const [name, setName] = useState(displayName);
  const [state, action, pending] = useActionState(
    updateProfile,
    initialFormState,
  );
  return (
    <form action={action} className="grid max-w-lg gap-6">
      <div className="field">
        <label htmlFor="displayName">Display name</label>
        <Input
          id="displayName"
          name="displayName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          minLength={2}
          maxLength={80}
          required
          disabled={pending}
        />
      </div>
      <div className="field">
        <label htmlFor="profileEmail">Email address</label>
        <Input
          id="profileEmail"
          value={email}
          type="email"
          readOnly
          aria-describedby="email-hint"
        />
        <p id="email-hint" className="text-xs text-muted-foreground">
          Your sign-in email. Email changes are not available in this release.
        </p>
      </div>
      <FormFeedback state={state} />
      <Button
        type="submit"
        className="w-fit"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
