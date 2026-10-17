import { redirect } from "next/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  redirect(
    "/ru/forgot-password" + (error === "callback" ? "?error=callback" : ""),
  );
}
