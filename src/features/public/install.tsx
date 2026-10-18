"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/locales";
import { publicMessages } from "./messages";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function PublicInstall({ locale }: { locale: Locale }) {
  const [install, setInstall] = useState<InstallEvent | null>(null),
    t = publicMessages(locale);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      void navigator.serviceWorker
        .register("/league-sw.js", { scope: "/" })
        .catch(() => {});
    const handler = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  if (!install) return null;
  return (
    <button
      className="min-h-11 underline"
      title={t.installHelp}
      onClick={async () => {
        await install.prompt();
        await install.userChoice;
        setInstall(null);
      }}
    >
      {t.install}
    </button>
  );
}
