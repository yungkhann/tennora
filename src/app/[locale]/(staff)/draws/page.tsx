import Link from "next/link";
import { localeOf, messages } from "@/lib/locales";
import { requireDrawManager } from "@/features/draws/access";
import { Card } from "@/components/ui/card";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = localeOf((await params).locale),
    t = messages(locale),
    { supabase } = await requireDrawManager(locale);
  const { data: tours, error } = await supabase
    .from("tours")
    .select("id,name,ordinal,seasons(name,status)")
    .order("starts_on", { ascending: false });
  if (error) throw new Error(t.failed);
  return (
    <>
      <h1 className="text-3xl font-semibold">{t.draws}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {t.drawIntro}
      </p>
      <div className="mt-8 grid gap-4">
        {tours.length ? (
          tours.map((tour) => (
            <Card key={tour.id} className="p-6">
              <p className="text-sm text-muted-foreground">
                {tour.seasons.name}
              </p>
              <h2 className="mt-2 break-words text-xl font-semibold">
                {tour.ordinal}. {tour.name}
              </h2>
              <div className="mt-4 flex flex-wrap gap-4">
                {["U13", "U15", "U17"].map((age) => (
                  <Link
                    key={age}
                    className="underline"
                    href={`/${locale}/draws/${tour.id}/${age}`}
                  >
                    {age}
                  </Link>
                ))}
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-6 text-sm">{t.noTours}</Card>
        )}
      </div>
    </>
  );
}
