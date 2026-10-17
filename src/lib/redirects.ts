// Only fixed app destinations; never arbitrary paths, queries or URLs.
export function safeNext(value: string | null | undefined): string {
  if (
    value &&
    /^\/(ru|kk|en)\/(workspace|settings\/profile|reset-password)$/.test(value)
  )
    return value;
  if (value === "/reset-password") return "/ru/reset-password";
  if (value === "/settings/profile") return "/ru/settings/profile";
  return "/ru/workspace";
}
