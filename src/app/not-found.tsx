import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto max-w-xl px-6 py-24">
      <p className="eyebrow mb-4">Out of bounds · 404</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        This page isn’t available.
      </h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        The link may have changed, or you may not have access to this workspace.
      </p>
      <Button asChild className="mt-7">
        <Link href="/dashboard">Your organizations</Link>
      </Button>
    </main>
  );
}
