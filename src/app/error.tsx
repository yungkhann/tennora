"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="mx-auto max-w-xl px-6 py-20">
      <p className="eyebrow mb-4">Connection interrupted</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        We couldn’t load this page.
      </h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Try again in a moment. If this keeps happening, check your connection or
        contact your workspace administrator.
      </p>
      <div className="mt-7 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
