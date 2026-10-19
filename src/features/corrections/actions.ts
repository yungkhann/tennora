"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireDrawManager } from "@/features/draws/access";
import { localeOf } from "@/lib/locales";
import type { FormState } from "@/lib/validation";
import { proposalSchema, applySchema, teamProposalSchema } from "./validation";
import { correctionMessages } from "./messages";
export async function proposeCorrection(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = correctionMessages(locale),
    staff = await requireDrawManager(locale);
  const sets = Array.from({ length: 5 }, (_, i) => ({
    a: String(form.get(`a${i}`) ?? ""),
    b: String(form.get(`b${i}`) ?? ""),
  }))
    .filter((v) => v.a !== "" || v.b !== "")
    .map((v) => ({ a: Number(v.a), b: Number(v.b) }));
  const parsed = proposalSchema.safeParse({
    ...Object.fromEntries(form),
    score: {
      initial_server: form.get("server"),
      sets,
      timeouts: { a: false, b: false },
    },
  });
  if (!parsed.success) return { status: "error", message: t.failed };
  const d = parsed.data;
  const game = await staff.supabase
    .from("singles_games")
    .select("match_id")
    .eq("id", d.game)
    .single();
  if (game.error || game.data.match_id !== d.match)
    return { status: "error", message: t.failed };
  const result = await staff.supabase.rpc("submit_result_correction", {
    request_id: d.id,
    game: d.game,
    base_result: d.base,
    kind: d.kind,
    winner: d.winner,
    score: d.score,
    confirmed: true,
  });
  if (result.error) return { status: "error", message: t.failed };
  redirect(`/${locale}/corrections/${d.id}`);
}
export async function applyCorrection(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = correctionMessages(locale),
    staff = await requireDrawManager(locale),
    parsed = applySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.failed };
  const d = parsed.data;
  const result = await staff.supabase.rpc("apply_result_correction", {
    command_id: d.id,
    request_id: d.request,
    expected_digest: d.digest,
    resolve_started: form.get("resolve") === "yes",
    confirmed: true,
  });
  if (result.error) return { status: "error", message: t.failed };
  revalidatePath(`/${locale}/matches`, "layout");
  revalidatePath(`/${locale}/draws`, "layout");
  revalidatePath(`/${locale}/corrections/${d.request}`);
  return { status: "success", message: t.applied };
}

export async function proposeTeamCorrection(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = correctionMessages(locale),
    staff = await requireDrawManager(locale),
    parsed = teamProposalSchema.safeParse({
      ...Object.fromEntries(form),
      winner: form.get("kind") === "reopen" ? null : form.get("winner"),
    });
  if (!parsed.success) return { status: "error", message: t.failed };
  const d = parsed.data;
  const result = await staff.supabase.rpc("submit_team_result_correction", {
    request_id: d.id,
    match: d.match,
    base_result: d.base,
    kind: d.kind,
    winner: d.winner!,
    confirmed: true,
  });
  if (result.error) return { status: "error", message: t.failed };
  redirect(`/${locale}/corrections/${d.id}`);
}
