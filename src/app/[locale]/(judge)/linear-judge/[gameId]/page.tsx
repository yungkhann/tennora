import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { localeOf } from "@/lib/locales";
import { scoreSnapshotSchema } from "@/features/scoring/validation";
import { Scoreboard } from "@/features/scoring/scoreboard";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; gameId: string }>;
}) {
  const { locale: value, gameId } = await params,
    locale = localeOf(value),
    { supabase, user } = await requireStaff(locale);
  if (!z.uuid().safeParse(gameId).success) notFound();
  const { data, error } = await supabase.rpc("get_game_score", {
      game: gameId,
    }),
    parsed = scoreSnapshotSchema.safeParse(data);
  if (error || !parsed.success) notFound();
  return (
    <Scoreboard
      key={gameId}
      initial={parsed.data}
      staffId={user.id}
      locale={locale}
    />
  );
}
