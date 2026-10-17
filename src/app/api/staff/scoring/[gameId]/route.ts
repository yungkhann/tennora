import { z } from "zod";
import {
  failure,
  privateHeaders,
  scoringAccount,
} from "@/features/scoring/http";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const account = await scoringAccount("read");
  if (account.response) return account.response;
  const { gameId } = await params;
  if (!z.uuid().safeParse(gameId).success) return failure("not_found", 404);
  const { data, error } = await account.client.rpc("get_game_score", {
    game: gameId,
  });
  if (error) return failure("unavailable", error.code === "42501" ? 404 : 503);
  return Response.json(data, { headers: privateHeaders });
}
