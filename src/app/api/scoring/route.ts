import { observedResponse } from "@/lib/observability";
import { scoreCommandSchema } from "@/features/scoring/validation";
import {
  boundedJson,
  failure,
  privateHeaders,
  scoringAccount,
  trustedScoreOrigin,
} from "@/features/scoring/http";
export const dynamic = "force-dynamic";
async function command(request: Request) {
  if (!trustedScoreOrigin(request)) return failure("origin", 403);
  let input;
  try {
    input = scoreCommandSchema.safeParse(await boundedJson(request));
  } catch {
    return failure("invalid", 400);
  }
  if (!input.success) return failure("invalid", 400);
  const account = await scoringAccount("write");
  if (account.response) return account.response;
  const rpcStarted = performance.now();
  const { data, error } = await account.client.rpc("score_command", {
    ...input.data,
    // The generated function argument type omits SQL nullability. Zod and SQL
    // require null for commands without a side; keep the runtime value intact.
    side: input.data.side!,
  });
  if (error) {
    const status =
      error.code === "42501"
        ? 404
        : error.code === "40001" || error.code === "55000"
          ? 409
          : error.code === "22023"
            ? 422
            : 503;
    return failure(
      status === 404
        ? "unavailable"
        : status === 409
          ? "conflict"
          : status === 422
            ? "invalid_transition"
            : "uncertain",
      status,
    );
  }
  return Response.json(data, {
    headers: {
      ...privateHeaders,
      "Server-Timing": `rpc;dur=${Math.round((performance.now() - rpcStarted) * 100) / 100}`,
    },
  });
}

export async function POST(request: Request) {
  return observedResponse("scoring.command", () => command(request));
}
