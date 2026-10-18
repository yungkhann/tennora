import Link from "next/link";
import { cn } from "@/lib/utils";
export function Brand({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Tennora home"
      className={cn(
        "inline-flex items-center gap-2.5 text-2xl font-bold tracking-[-0.07em]",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className="size-8 shrink-0 text-primary"
      >
        <rect width="32" height="32" rx="10" fill="currentColor" />
        <path
          d="M7 9h18M16 9v16M9 15h14"
          stroke="var(--brand-mark)"
          strokeWidth="2.5"
          fill="none"
        />
      </svg>
      tennora<span className="text-primary">.</span>
    </Link>
  );
}
