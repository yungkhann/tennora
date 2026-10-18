import type { Instrumentation } from "next";
export const onRequestError: Instrumentation.onRequestError = (
  error,
  _request,
  context,
) => {
  const digest =
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    /^[a-zA-Z0-9_-]{1,80}$/.test(error.digest)
      ? error.digest
      : undefined;
  console.error(
    JSON.stringify({
      event: "request.unhandled",
      route_type: context.routeType,
      digest,
    }),
  );
};
