import {
  failure,
  privateHeaders,
  scoringAccount,
} from "@/features/scoring/http";
export const dynamic = "force-dynamic";
export async function GET() {
  const account = await scoringAccount("read");
  if (account.response) return account.response;
  const { data, error } = await account.client.rpc("get_judge_desk");
  if (error) return failure("unavailable", error.code === "42501" ? 404 : 503);
  return Response.json(data, { headers: privateHeaders });
}
