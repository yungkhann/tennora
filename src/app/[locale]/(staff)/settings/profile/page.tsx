import { requireStaff } from "@/lib/auth";
import { localeOf, messages } from "@/lib/locales";
import { ProfileForm } from "@/features/auth/profile-form";
import { AuthForm } from "@/features/auth/auth-form";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = messages(locale),
    { staff, user } = await requireStaff(locale);
  return (
    <>
      <h1 className="text-3xl font-semibold">{t.profile}</h1>
      <div className="mt-8 max-w-md">
        <ProfileForm
          displayName={staff.display_name}
          email={user.email ?? ""}
          locale={locale}
        />
        <section className="mt-12 border-t pt-8">
          <AuthForm mode="reset" configured locale={locale} />
        </section>
      </div>
    </>
  );
}
