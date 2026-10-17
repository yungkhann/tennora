import { cn } from "@/lib/utils";
export function Court({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "court relative overflow-hidden rounded-[2rem] bg-[#164D39]",
        className,
      )}
    >
      <svg
        viewBox="0 0 520 620"
        className="absolute inset-0 h-full w-full"
        fill="none"
      >
        <path d="M0 0H520V620H0Z" fill="#164D39" />
        <path
          d="M65 55H455V565H65Z M110 55V565 M410 55V565 M65 310H455 M110 175H410 M110 445H410 M260 175V445"
          stroke="#B7D2BC"
          strokeWidth="2"
          opacity=".55"
        />
        <path d="M50 310H470" stroke="#F7F9F6" strokeWidth="4" />
        <path d="M52 305V315 M468 305V315" stroke="#F7F9F6" strokeWidth="7" />
        <circle cx="350" cy="215" r="27" fill="#D5EF72" />
        <path
          d="M333 194c20 9 25 27 18 47 M366 194c-20 9-25 27-18 47"
          stroke="#164D39"
          opacity=".45"
          strokeWidth="2"
        />
      </svg>
      <div className="absolute inset-0 bg-linear-to-t from-[#0e3024] via-transparent to-transparent" />
    </div>
  );
}
