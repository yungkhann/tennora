"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserRound, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
export function WorkspaceNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Workspace navigation"
      className="flex flex-wrap gap-1 md:flex-col"
    >
      {[
        { href: "/dashboard", label: "Organizations", icon: LayoutDashboard },
        { href: "/settings/profile", label: "Your profile", icon: UserRound },
        { href: "/live", label: "Match center", icon: Radio },
      ].map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-secondary text-primary",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
