import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const root = process.env.TENNORA_BUILD_DIR ?? ".next";
const forbiddenNames = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "E2E_SUPABASE_SERVICE_ROLE_KEY",
];
if (
  Object.keys(process.env).some(
    (k) =>
      k.startsWith("NEXT_PUBLIC_") &&
      /SECRET|SERVICE_ROLE|PASSWORD|PRIVATE_KEY/.test(k),
  )
)
  throw new Error("Forbidden public secret variable name");
const values = forbiddenNames
  .map((k) => process.env[k])
  .filter((v) => v && v.length >= 20);
function walk(path) {
  for (const name of readdirSync(path)) {
    const file = join(path, name);
    if (statSync(file).isDirectory()) walk(file);
    else if (/\.(js|map)$/.test(file)) {
      const contents = readFileSync(file, "utf8");
      if (
        values.some((v) => contents.includes(v)) ||
        forbiddenNames.some((v) => contents.includes(v))
      )
        throw new Error(
          "Private Auth administration reference found in browser artifact",
        );
    }
  }
}
walk(join(root, "static"));
console.log(
  "PASS: browser artifacts contain no configured server Auth secrets or private administration variable references.",
);
