import "server-only";
export async function observedResponse(
  operation: "scoring.command" | "health",
  run: () => Promise<Response>,
) {
  const started = performance.now(),
    requestId = crypto.randomUUID();
  try {
    const response = await run(),
      duration = Math.round((performance.now() - started) * 100) / 100;
    response.headers.set("X-Request-Id", requestId);
    response.headers.append("Server-Timing", `transport;dur=${duration}`);
    console.info(
      JSON.stringify({
        event: operation,
        request_id: requestId,
        status: response.status,
        duration_ms: duration,
      }),
    );
    return response;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: operation,
        request_id: requestId,
        status: 500,
        duration_ms: Math.round(performance.now() - started),
        failure: "unhandled",
      }),
    );
    throw error;
  }
}
