import { redirect } from "next/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  redirect(
    "/ru/reset-password" + (error === "callback" ? "?error=callback" : ""),
  );
}
