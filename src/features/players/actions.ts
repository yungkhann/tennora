"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import type { FormState } from "@/lib/validation";
import {
  playerSchema,
  rosterSchema,
  endRosterSchema,
  dropSchema,
  transferSchema,
  trainerRefSchema,
} from "./validation";
function refresh(locale: string) {
  revalidatePath(`/${locale}/team`, "layout");
  revalidatePath(`/${locale}/subteam`, "layout");
}
export async function savePlayer(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale);
  const p = playerSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { status: "error", message: t.playerInvalid };
  const d = p.data;
  const { error } = await supabase.rpc("save_player", {
    player_id: d.id,
    club: d.club,
    first_name: d.firstName,
    last_name: d.lastName,
    gender: d.gender,
    dob: d.dob,
    hand: d.hand,
    style: d.style,
    sports_level: d.sportsLevel,
    external_id: d.externalId ?? undefined,
  });
  if (error) return { status: "error", message: t.playerInvalid };
  refresh(locale);
  return { status: "success", message: t.saved };
}
export async function addRosterPlayer(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale);
  const p = rosterSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { status: "error", message: t.invalid };
  const d = p.data;
  const { error } = await supabase.rpc("add_roster_player", {
    parent_season: d.seasonId,
    target_subteam: d.subteam,
    player: d.player,
  });
  if (error)
    return {
      status: "error",
      message:
        error.message === "Player exceeds lineup age limit"
          ? t.ageIneligible
          : t.rosterInvalid,
    };
  refresh(locale);
  return { status: "success", message: t.saved };
}
export async function endMembership(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale);
  const p = endRosterSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { status: "error", message: t.invalid };
  const { error } = await supabase.rpc("end_roster_membership", {
    membership: p.data.membership,
    confirmed: true,
  });
  if (error) return { status: "error", message: t.failed };
  refresh(locale);
  return { status: "success", message: t.saved };
}
export async function dropPlayer(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale);
  const p = dropSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { status: "error", message: t.invalid };
  const { error } = await supabase.rpc("drop_player", {
    player: p.data.player,
    effective_date: p.data.date,
    confirmed: true,
  });
  if (error) return { status: "error", message: t.failed };
  refresh(locale);
  return { status: "success", message: t.saved };
}
export async function transferPlayer(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale, true);
  const p = transferSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { status: "error", message: t.invalid };
  const { error } = await supabase.rpc("transfer_player", {
    player: p.data.player,
    new_club: p.data.club,
    confirmed: true,
  });
  if (error) return { status: "error", message: t.failed };
  refresh(locale);
  return { status: "success", message: t.saved };
}
export async function setTrainerRef(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale);
  const p = trainerRefSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { status: "error", message: t.trainerRefInvalid };
  const d = p.data,
    { error } = await supabase.rpc("set_player_trainer_reference", {
      player: d.player,
      ref_kind: d.kind,
      reference: {
        trainer_id: d.trainer,
        first_name: d.firstName,
        last_name: d.lastName,
      },
    });
  if (error) return { status: "error", message: t.trainerRefInvalid };
  refresh(locale);
  return { status: "success", message: t.saved };
}
