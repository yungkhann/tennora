import { Brand } from "@/components/brand";
import { Court } from "@/components/court";
import { ThemeToggle } from "@/components/theme-toggle";
export const dynamic = "force-dynamic";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden min-h-full bg-[#164D39] p-12 lg:flex lg:flex-col">
        <Brand className="z-10 w-fit rounded-lg bg-background px-3 py-2" />
        <Court className="absolute inset-x-12 top-36 bottom-12" />
        <div className="absolute bottom-20 left-20 right-20 text-white">
          <p className="mb-4 text-[11px] uppercase tracking-[.18em] text-[#d5ef72]">
            A place for your game
          </p>
          <p className="font-serif text-5xl leading-tight italic">
            On your side
            <br />
            of the court.
          </p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex min-h-24 items-center justify-between gap-5 px-6 md:px-12">
          <span className="lg:invisible">
            <Brand />
          </span>
          <ThemeToggle />
        </header>
        <main
          id="main-content"
          className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center px-6 pb-16"
        >
          {children}
        </main>
        <footer className="px-6 pb-6 text-center text-xs text-muted-foreground">
          Tennora · Made for the love of the game.
        </footer>
      </div>
    </div>
  );
}
