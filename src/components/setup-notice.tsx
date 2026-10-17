import Link from "next/link";
import { Settings2, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function SetupNotice({ compact = false }: { compact?: boolean }) {
  return (
    <Card
      className={compact ? "border-dashed p-5" : "mx-auto max-w-xl p-8 md:p-12"}
    >
      <Settings2 className="mb-5 size-7 text-primary" />
      <p className="eyebrow mb-3">Workspace setup</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        Connect your workspace
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Authentication is unavailable until Supabase is configured. Follow the
        local setup steps in the project README, then refresh this page.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        No account or tournament data has been loaded.
      </p>
      {!compact && (
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">
            Back to Tennora <ArrowUpRight />
          </Link>
        </Button>
      )}
    </Card>
  );
}
