import { MutationForm } from "@/components/mutation-form";
import { Input } from "@/components/ui/input";
import { messages, type Locale } from "@/lib/locales";
import { selectClass } from "@/features/teams/forms";
import { uploadPhoto, reviewPhoto } from "./actions";
export function PhotoUploadForm({
  locale,
  id,
  player,
}: {
  locale: Locale;
  id: string;
  player: string;
}) {
  const t = messages(locale);
  return (
    <MutationForm
      action={uploadPhoto}
      locale={locale}
      hidden={{ id, player }}
      label={t.uploadPhoto}
      once
    >
      <label className="field">
        {t.photoFile}
        <Input
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
        />
      </label>
      <label className="field">
        {t.consentEvidence}
        <Input
          name="evidence"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          required
        />
      </label>
      <label className="flex items-start gap-3 text-sm leading-6">
        <input
          type="checkbox"
          name="permission"
          required
          className="mt-1 size-4 shrink-0"
        />
        {t.guardianPermission}
      </label>
      <p className="text-sm leading-6 text-muted-foreground">{t.photoHelp}</p>
    </MutationForm>
  );
}
export function PhotoReviewForm({
  locale,
  asset,
  state,
}: {
  locale: Locale;
  asset: string;
  state: string;
}) {
  const t = messages(locale);
  return (
    <MutationForm
      action={reviewPhoto}
      locale={locale}
      hidden={{ asset }}
      label={t.savePhotoReview}
    >
      <label className="field">
        {t.reviewDecision}
        <select
          name="decision"
          className={selectClass}
          required
          defaultValue=""
        >
          <option value="" disabled>
            {t.choose}
          </option>
          {state === "pending_review" && (
            <option value="approve">{t.approvePhoto}</option>
          )}
          {(state === "pending_upload" || state === "pending_review") && (
            <option value="reject">{t.rejectPhoto}</option>
          )}
          {state === "approved" && (
            <option value="revoke">{t.revokePhoto}</option>
          )}
        </select>
      </label>
      <label className="field">
        {t.reason}
        <Input name="reason" required maxLength={500} />
      </label>
      <p className="text-sm leading-6 text-muted-foreground">
        {t.reviewPhotoHelp}
      </p>
    </MutationForm>
  );
}
