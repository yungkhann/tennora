import type { FormState } from "@/lib/validation";
export function FormFeedback({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={
        state.status === "error"
          ? "rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          : "rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm text-foreground"
      }
    >
      {state.message}
    </p>
  );
}
