import { anonymousClient } from "@/lib/supabase/anonymous-server";
import { observedResponse } from "@/lib/observability";
export const dynamic = "force-dynamic";
export async function GET() {
  return observedResponse("health", async () => {
    const headers = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    try {
      const result = await anonymousClient()
        .rpc("get_public_health")
        .abortSignal(AbortSignal.timeout(5000));
      if (result.error) throw new Error();
      return Response.json(
        {
          status: "ok",
          database: "ok",
          database_now: result.data,
          server_now: new Date().toISOString(),
        },
        { headers },
      );
    } catch {
      return Response.json({ status: "unavailable" }, { status: 503, headers });
    }
  });
}
