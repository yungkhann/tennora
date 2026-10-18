import { SkipLink } from "@/components/skip-link";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Tennora · Table Tennis League",
    template: "%s · Tennora",
  },
  manifest: "/manifest.webmanifest",
  description:
    "One table tennis league. Results, rankings and committed live scores.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SkipLink />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
