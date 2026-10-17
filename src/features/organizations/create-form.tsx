"use client";
import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
import { initialFormState } from "@/lib/validation";
import { createOrganization } from "./actions";
export function CreateOrganizationForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [state, action, pending] = useActionState(
    createOrganization,
    initialFormState,
  );
  return (
    <form action={action} className="grid gap-5">
      <div className="field">
        <label htmlFor="organizationName">Organization name</label>
        <Input
          id="organizationName"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your tennis club"
          autoComplete="organization"
          minLength={2}
          maxLength={80}
          required
          disabled={pending}
        />
      </div>
      <div className="field">
        <label htmlFor="organizationSlug">Organization address</label>
        <Input
          id="organizationSlug"
          name="slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="your-tennis-club"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          minLength={3}
          maxLength={48}
          aria-describedby="slug-hint"
          required
          disabled={pending}
        />
        <p id="slug-hint" className="text-xs leading-5 text-muted-foreground">
          A unique name using lowercase letters, numbers and hyphens.
        </p>
      </div>
      <FormFeedback state={state} />
      <Button
        type="submit"
        className="w-fit"
        disabled={pending}
        aria-busy={pending}
      >
        <Plus />
        {pending ? "Creating…" : "Create organization"}
      </Button>
    </form>
  );
}
