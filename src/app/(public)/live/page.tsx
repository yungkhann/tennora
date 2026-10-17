import Link from "next/link";
import { Radio, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Match center" };
export default function LivePage() {
  return (
    <main id="main-content" className="w-full py-12 md:py-16">
      <p className="eyebrow">From the sidelines</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">
        Match center
      </h1>
      <p className="mt-3 text-muted-foreground">
        A place to follow the game, together.
      </p>
      <Card className="my-10 flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
        <span className="mb-6 rounded-full bg-secondary p-5">
          <Radio className="size-7 text-primary" />
        </span>
        <h2 className="text-xl font-semibold">The courts are quiet for now</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Public tournaments and live scores will arrive in a later release.
          There are no published matches to show yet.
        </p>
        <Button asChild variant="outline" className="mt-7">
          <Link href="/">
            Back to Tennora <ArrowUpRight />
          </Link>
        </Button>
      </Card>
    </main>
  );
}
