"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import type { FormState } from "@/lib/validation";
import {
  imageMime,
  evidenceMime,
  publishableJpeg,
  maxUploadBytes,
} from "./image";
import { photoUploadSchema, photoReviewSchema } from "./validation";
export async function uploadPhoto(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase, roles } = await requireStaff(locale);
  if (!roles.includes("trainer") && !roles.includes("organizer"))
    return { status: "error", message: t.failed };
  const parsed = photoUploadSchema.safeParse(Object.fromEntries(form));
  const photo = form.get("photo"),
    evidence = form.get("evidence");
  if (
    !parsed.success ||
    !(photo instanceof File) ||
    !(evidence instanceof File) ||
    photo.size > maxUploadBytes ||
    evidence.size > maxUploadBytes
  )
    return { status: "error", message: t.photoInvalid };
  const p = parsed.data;
  try {
    const photoBytes = new Uint8Array(await photo.arrayBuffer()),
      evidenceBytes = new Uint8Array(await evidence.arrayBuffer());
    const [mime, proofMime] = await Promise.all([
      imageMime(photoBytes),
      evidenceMime(evidenceBytes),
    ]);
    const { data: asset, error } = await supabase.rpc("begin_player_photo", {
      asset: p.id,
      player: p.player,
      photo_mime: mime,
      evidence_mime: proofMime,
      photo_size: photoBytes.byteLength,
      evidence_size: evidenceBytes.byteLength,
      photo_hash: createHash("sha256").update(photoBytes).digest("hex"),
      evidence_hash: createHash("sha256").update(evidenceBytes).digest("hex"),
      permission_confirmed: true,
    });
    if (error || !asset) return { status: "error", message: t.photoInvalid };
    if (asset.state === "pending_upload") {
      for (const [path, bytes, contentType] of [
        [asset.photo_path, photoBytes, mime],
        [asset.evidence_path, evidenceBytes, proofMime],
      ] as const) {
        const result = await supabase.storage
          .from("player-private")
          .upload(path, bytes, {
            contentType,
            upsert: false,
            cacheControl: "0",
          });
        if (
          result.error &&
          !(
            result.error.statusCode === "409" ||
            result.error.message === "The resource already exists"
          )
        )
          return { status: "error", message: t.photoUploadFailed };
      }
      if (
        (await supabase.rpc("finish_player_photo", { asset: asset.id })).error
      )
        return { status: "error", message: t.photoUploadFailed };
    }
  } catch {
    return { status: "error", message: t.photoInvalid };
  }
  revalidatePath(`/${locale}/team`, "layout");
  return { status: "success", message: t.photoUploaded };
}
export async function reviewPhoto(
  _old: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form.get("locale")),
    t = messages(locale),
    { supabase } = await requireStaff(locale, true);
  const parsed = photoReviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", message: t.invalid };
  const d = parsed.data;
  try {
    let publication;
    if (d.decision === "approve") {
      const asset = await supabase
        .from("player_photo_assets")
        .select(
          "photo_path,photo_sha256,photo_mime,evidence_path,evidence_sha256,evidence_mime",
        )
        .eq("id", d.asset)
        .single();
      if (asset.error) return { status: "error", message: t.failed };
      const [download, proof] = await Promise.all([
        supabase.storage.from("player-private").download(asset.data.photo_path),
        supabase.storage
          .from("player-private")
          .download(asset.data.evidence_path),
      ]);
      if (download.error || proof.error)
        return { status: "error", message: t.failed };
      const originalBytes = new Uint8Array(await download.data.arrayBuffer()),
        proofBytes = new Uint8Array(await proof.data.arrayBuffer());
      if (
        createHash("sha256").update(originalBytes).digest("hex") !==
          asset.data.photo_sha256 ||
        createHash("sha256").update(proofBytes).digest("hex") !==
          asset.data.evidence_sha256 ||
        (await imageMime(originalBytes)) !== asset.data.photo_mime ||
        (await evidenceMime(proofBytes)) !== asset.data.evidence_mime
      )
        return { status: "error", message: t.failed };
      const image = await publishableJpeg(originalBytes);
      publication = { jpeg_base64: image.toString("base64") };
    }
    if (
      (
        await supabase.rpc("review_player_photo", {
          asset: d.asset,
          decision: d.decision,
          reason: d.reason,
          publication,
        })
      ).error
    )
      return { status: "error", message: t.failed };
  } catch {
    return { status: "error", message: t.failed };
  }
  revalidatePath(`/${locale}/team`, "layout");
  return { status: "success", message: t.saved };
}
