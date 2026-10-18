"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ComponentProps } from "react";
export function NavLink({ href, ...props }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const anchor = useRef<HTMLAnchorElement>(null);
  const target = String(href);
  const active =
    pathname === target ||
    (target.split("/").length > 2 && pathname.startsWith(`${target}/`)) ||
    (target.endsWith("/seasons") && /\/(season|tournament)\//.test(pathname)) ||
    (target.endsWith("/ranking") && pathname.includes("/player/")) ||
    (target.endsWith("/organizer/seasons") &&
      pathname.includes("/organizer/tournaments/")) ||
    (target.endsWith("/matches") && pathname.includes("/corrections/"));
  useEffect(() => {
    const link = anchor.current;
    const nav = link?.closest<HTMLElement>(".public-navigation");
    if (!active || !link || !nav) return;
    const reveal = () => {
      const item = link.getBoundingClientRect(),
        bounds = nav.getBoundingClientRect();
      if (item.left < bounds.left) nav.scrollLeft += item.left - bounds.left;
      else if (item.right > bounds.right)
        nav.scrollLeft += item.right - bounds.right;
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [active]);
  return (
    <Link
      ref={anchor}
      href={href}
      aria-current={active ? "page" : undefined}
      {...props}
    />
  );
}
