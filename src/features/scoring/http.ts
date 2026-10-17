import "server-only";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  Pragma: "no-cache",
};
export const failure = (error: string, status: number) =>
  Response.json({ error }, { status, headers: privateHeaders });
export async function scoringAccount(operation: "read" | "write") {
  const client = await createClient(),
    {
      data: { user },
      error,
    } = await client.auth.getUser();
  if (error || !user) return { response: failure("unauthorized", 401) };
  const budget = await client.rpc("claim_score_http_request", { operation });
  if (budget.error)
    return {
      response: failure(
        "unavailable",
        budget.error.code === "42501" ? 403 : 503,
      ),
    };
  if (!budget.data)
    return {
      response: Response.json(
        { error: "rate_limited" },
        { status: 429, headers: { ...privateHeaders, "Retry-After": "60" } },
      ),
    };
  return { client };
}
export function trustedScoreOrigin(request: Request) {
  return (
    request.headers.get("origin") === siteUrl() &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}
export async function boundedJson(request: Request) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new Error("Invalid JSON");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) throw new Error("Body too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
