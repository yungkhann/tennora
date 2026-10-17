import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { localeOf } from "@/lib/locales";
import { deskSchema } from "@/features/scoring/validation";
import { JudgeDeskView } from "@/features/scoring/desk";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    { supabase } = await requireStaff(locale);
  const { data, error } = await supabase.rpc("get_judge_desk"),
    parsed = deskSchema.safeParse(data);
  if (error || !parsed.success) notFound();
  return <JudgeDeskView initial={parsed.data} locale={locale} />;
}
