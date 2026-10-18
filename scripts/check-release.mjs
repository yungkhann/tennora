import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { releaseEvidence } from "./lib/release-evidence.mjs";
const file = process.argv[2];
try {
  if (!file)
    throw new Error(
      "Supply a reviewed release evidence JSON; see docs/ACCEPTANCE.md.",
    );
  const value = releaseEvidence.parse(JSON.parse(readFileSync(file, "utf8")));
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (value.commit !== head)
    throw new Error("Evidence commit differs from checkout.");
  for (const name of [
    "provider",
    "privacy",
    "recovery",
    "load",
    "venue",
    "monitoring",
    "cutover",
  ]) {
    const entry = value[name],
      path = resolve(dirname(file), entry.artifact);
    if (
      !existsSync(path) ||
      createHash("sha256").update(readFileSync(path)).digest("hex") !==
        entry.sha256
    )
      throw new Error(`${name}: missing or mismatched artifact`);
    const age = Date.now() - Date.parse(entry.measured_at);
    if (age < 0 || age > 30 * 86400000)
      throw new Error(`${name}: evidence must be within 30 days`);
  }
  console.log(
    "PASS: release evidence structure, checkout, artifact hashes and freshness verified. Human evidence review remains mandatory.",
  );
} catch (error) {
  console.error(
    error.name === "ZodError"
      ? "BLOCKED: incomplete or failing release evidence."
      : `BLOCKED: ${error.message}`,
  );
  process.exitCode = 1;
}
