import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

// A local-only convenience; never request hosted project credentials.
for (const path of [".env.local", ".env.test.local"]) {
  if (existsSync(path))
    throw new Error(
      `${path} already exists. Preserve it and configure values manually.`,
    );
}
const status = JSON.parse(
  execFileSync("npx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }),
);
if (new URL(status.API_URL).hostname !== "127.0.0.1")
  throw new Error("Only the local Supabase stack is supported.");
const publicEnv = `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000\nNEXT_PUBLIC_SUPABASE_URL=${status.API_URL}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY ?? status.ANON_KEY}\n`;
if (!(status.PUBLISHABLE_KEY ?? status.ANON_KEY) || !status.SERVICE_ROLE_KEY)
  throw new Error("Local Supabase keys are unavailable.");
writeFileSync(".env.local", publicEnv, { mode: 0o600 });
writeFileSync(
  ".env.test.local",
  `${publicEnv}E2E_SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}\n`,
  { mode: 0o600 },
);
console.log(
  "Configured local application and disposable test environment. No keys were printed.",
);
