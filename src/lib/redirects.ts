// A destination is a route we own, never an arbitrary URL or protocol-relative path.
export function safeNext(value: string | null | undefined): string {
  if (
    value === "/dashboard" ||
    value === "/settings/profile" ||
    value === "/reset-password"
  )
    return value;
  if (
    value &&
    /^\/dashboard\/organizations\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    return value;
  return "/dashboard";
}
