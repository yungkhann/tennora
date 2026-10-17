import Link from "next/link";
import { ArrowUpRight, Layers3, UsersRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Court } from "@/components/court";
export default function HomePage() {
  return (
    <main id="main-content" className="py-10 md:py-16">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <section className="py-4 md:py-8">
          <p className="eyebrow mb-7 flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            One table tennis league
          </p>
          <h1 className="max-w-xl text-5xl leading-[1.08] font-semibold tracking-[-.055em] sm:text-6xl xl:text-7xl">
            A better day
            <br />
            on{" "}
            <span className="font-serif font-normal italic text-primary">
              court.
            </span>
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-muted-foreground">
            A shared workspace for league staff. Organizers manage accounts;
            each staff member receives the roles they need.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/ru/login">
                Staff sign in <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Open workspace</Link>
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Staff accounts are created by the league Organizer.
          </p>
        </section>
        <div className="relative">
          <Court className="h-[440px] sm:h-[540px]" />
          <div className="absolute bottom-9 left-8 right-8 text-white">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[.2em] text-[#d5ef72]">
              Room for your whole club
            </p>
            <p className="max-w-xs font-serif text-3xl leading-tight italic sm:text-4xl">
              Great tennis starts
              <br />
              with good company.
            </p>
          </div>
        </div>
      </div>
      <section
        aria-label="Your workspace"
        className="mt-14 grid gap-8 border-t pt-9 md:mt-20 md:grid-cols-3"
      >
        {[
          {
            icon: Layers3,
            title: "One league workspace",
            text: "Staff access is managed centrally by the league Organizer.",
          },
          {
            icon: UsersRound,
            title: "Your name. Your game.",
            text: "Set up your profile and make yourself at home in your workspace.",
          },
          {
            icon: ShieldCheck,
            title: "Access with intention",
            text: "Staff roles control access, and account changes are audited.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-4">
            <Icon className="mt-1 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                {text}
              </p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
