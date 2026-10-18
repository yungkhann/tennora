import { z } from "zod";
import {
  scoringAccount,
  privateHeaders,
  failure,
} from "@/features/scoring/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tourId: string }> },
) {
  const account = await scoringAccount("read");
  if (account.response) return account.response;
  const { tourId } = await params;
  if (!z.uuid().safeParse(tourId).success) return failure("not_found", 404);
  const result = await account.client.rpc("get_hall_snapshot", {
    tournament: tourId,
  });
  if (result.error)
    return failure("unavailable", result.error.code === "42501" ? 403 : 503);
  return Response.json(result.data, { headers: privateHeaders });
}
