import { format } from "prettier";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const output = execFileSync(
  "npx",
  ["supabase", "gen", "types", "typescript", "--local"],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  },
);
if (!output.includes("export type Database"))
  throw new Error("Type generation returned no database definition.");
// Preserve the prior types if generation fails instead of truncating the file.
writeFileSync(
  "src/lib/supabase/database.types.ts",
  await format(output, { parser: "typescript" }),
);
