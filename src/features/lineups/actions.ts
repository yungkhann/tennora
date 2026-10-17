"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import type { FormState } from "@/lib/validation";
import { lineupSchema, replacementSchema } from "./validation";
import { requireLineupMatch } from "./access";
export async function submitLineup(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale);
  await requireStaff(locale);
  const parsed = lineupSchema.safeParse({
    ...Object.fromEntries(form),
    players: form.getAll("players"),
  });
  if (!parsed.success) return { status: "error", message: t.lineupInvalid };
  const d = parsed.data,
    context = await requireLineupMatch(locale, d.match);
  if (!context.teams.some((team) => team.id === d.subteam && team.own))
    return { status: "error", message: t.lineupInvalid };
  const { error } = await context.supabase.rpc("submit_lineup", {
    lineup_id: d.id,
    match: d.match,
    subteam: d.subteam,
    players: d.players,
  });
  if (error) return { status: "error", message: t.lineupInvalid };
  revalidatePath(`/${locale}/matches`, "layout");
  return { status: "success", message: t.saved };
}
export async function replacePlayer(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale);
  await requireStaff(locale);
  const parsed = replacementSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { status: "error", message: t.replacementInvalid };
  const d = parsed.data,
    context = await requireLineupMatch(locale, d.match);
  if (!context.official || !context.status.revealed)
    return { status: "error", message: t.replacementInvalid };
  const { error } = await context.supabase.rpc("replace_lineup_player", {
    replacement_id: d.id,
    match: d.match,
    subteam: d.subteam,
    slot: d.slot,
    player: d.player,
    reason: d.reason,
    expected_lineup_version: d.revision,
  });
  if (error) return { status: "error", message: t.replacementInvalid };
  revalidatePath(`/${locale}/matches`, "layout");
  return { status: "success", message: t.saved };
}
