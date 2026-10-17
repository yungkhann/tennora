import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1440px] flex-col px-5 md:px-12">
      <header className="flex min-h-24 flex-wrap items-center justify-between gap-4 border-b py-4">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="flex flex-wrap items-center gap-2 sm:gap-5"
        >
          <Link href="/live" className="text-sm font-medium">
            Match center
          </Link>
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </nav>
      </header>
      {children}
      <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t py-7 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Tennora</span>
        <span>Made for the love of the game.</span>
      </footer>
    </div>
  );
}
