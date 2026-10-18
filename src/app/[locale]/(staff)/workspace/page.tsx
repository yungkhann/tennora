import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  LayoutGrid,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import { scoringMessages } from "@/features/scoring/messages";
import { hallMessages } from "@/features/hall/messages";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = messages(locale),
    { roles } = await requireStaff(locale),
    manager = roles.some((r) => r === "organizer" || r === "main_judge");
  const actions = [
    {
      href: "hall",
      label: hallMessages(locale).title,
      icon: LayoutGrid,
      show: manager,
    },
    {
      href: "matches",
      label: t.matches,
      icon: Activity,
      show: manager || roles.includes("trainer"),
    },
    {
      href: "team",
      label: t.teams,
      icon: Users,
      show: manager || roles.includes("trainer"),
    },
    { href: "draws", label: t.draws, icon: Trophy, show: manager },
    {
      href: "organizer/seasons",
      label: t.seasons,
      icon: CalendarDays,
      show: roles.includes("organizer"),
    },
    {
      href: "linear-judge",
      label: scoringMessages(locale).desk,
      icon: Activity,
      show: manager || roles.includes("line_judge"),
    },
    {
      href: "organizer/staff",
      label: t.staff,
      icon: ShieldCheck,
      show: roles.includes("organizer"),
    },
  ];
  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow mb-3">{t.league}</p>
          <h1>{t.workspace}</h1>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions
          .filter((v) => v.show)
          .map(({ href, label, icon: Icon }) => (
            <Link
              className="feature-link min-h-24"
              href={`/${locale}/${href}`}
              key={href}
            >
              <span className="flex items-center gap-3">
                <span className="feature-icon">
                  <Icon className="size-5" />
                </span>
                <strong>{label}</strong>
              </span>
              <ArrowUpRight className="size-4 shrink-0" />
            </Link>
          ))}
      </div>
      <section className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-5">
        <h2 className="mr-auto text-sm font-bold">{t.access}</h2>
        {roles.map((r) => (
          <span
            key={r}
            className="rounded-full bg-secondary px-3 py-2 text-xs font-semibold"
          >
            {t[r]}
          </span>
        ))}
      </section>
    </>
  );
}
