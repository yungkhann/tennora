import {
  Activity,
  Trophy,
  Users,
  ChartNoAxesColumnIncreasing,
  House,
} from "lucide-react";
import { NavLink } from "@/components/nav-link";
import type { Locale } from "@/lib/locales";
import { publicMessages } from "./messages";
import { designMessages } from "./design-messages";
export function PublicNavigation({ locale }: { locale: Locale }) {
  const t = publicMessages(locale),
    d = designMessages(locale);
  return (
    <nav className="public-navigation" aria-label={t.navigation}>
      {[
        { href: "", label: t.home, icon: House },
        { href: "/seasons", label: d.tournaments, icon: Trophy },
        { href: "/live", label: t.live, icon: Activity },
        {
          href: "/ranking",
          label: t.ranking,
          icon: ChartNoAxesColumnIncreasing,
        },
        { href: "/teams", label: d.clubs, icon: Users },
      ].map(({ href, label, icon: Icon }) => (
        <NavLink key={href} href={`/${locale}${href}`} className="nav-item">
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
