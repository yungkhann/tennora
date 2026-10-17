import { z } from "zod";
const configuration = z.object({
  url: z.url().refine((v) => {
    try {
      return ["http:", "https:"].includes(new URL(v).protocol);
    } catch {
      return false;
    }
  }),
  key: z.string().min(20),
});
export function publicSupabaseEnv() {
  const parsed = configuration.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return parsed.success ? parsed.data : null;
}
export function siteUrl() {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  const parsed = z.url().safeParse(value);
  if (!parsed.success)
    throw new Error(
      "Set NEXT_PUBLIC_SITE_URL to the trusted application origin.",
    );
  const url = new URL(parsed.data);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (process.env.NODE_ENV === "production" && url.protocol !== "https:")
  )
    throw new Error("Invalid application origin.");
  return url.origin;
}
