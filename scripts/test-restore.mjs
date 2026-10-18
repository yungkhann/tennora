import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  randomBytes,
  randomUUID,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
if (existsSync(".env.test.local")) process.loadEnvFile(".env.test.local");
const backend = process.env.NEXT_PUBLIC_SUPABASE_URL,
  secret = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
if (!backend || new URL(backend).hostname !== "127.0.0.1" || !secret)
  throw new Error(
    "Disposable restore fixtures require local loopback Supabase test credentials.",
  );
const admin = createClient(backend, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const database = "supabase_db_tennora",
  storage = "supabase_storage_tennora",
  token = randomUUID().replaceAll("-", ""),
  target = `tennora_restore_${token}`,
  storageTarget = `/tmp/tennora_restore_${token}`,
  directory = mkdtempSync(join(tmpdir(), "tennora-encrypted-restore-"));
const run = (container, args, input) =>
  execFileSync(
    "docker",
    ["exec", ...(input ? ["-i"] : []), container, ...args],
    {
      input,
      maxBuffer: 512 * 1024 * 1024,
      stdio: [input ? "pipe" : "ignore", "pipe", "pipe"],
    },
  );
const sql = (query, db = "postgres") =>
  run(database, [
    "psql",
    "-X",
    "-U",
    "postgres",
    "-d",
    db,
    "-v",
    "ON_ERROR_STOP=1",
    "-Atc",
    query,
  ])
    .toString()
    .trim();
const critical = [
  "auth.users",
  "public.staff_accounts",
  "public.staff_roles",
  "public.seasons",
  "public.tours",
  "public.players",
  "public.roster_memberships",
  "public.team_matches",
  "public.singles_games",
  "public.singles_results",
  "public.rating_history",
  "public.rating_calculations",
  "public.audit_logs",
  "public.public_match_snapshots",
  "storage.objects",
  "public.player_photo_assets",
  "public.public_player_photos",
];
const fingerprint = (db) =>
  Object.fromEntries(
    critical.map((table) => [
      table,
      sql(
        `select count(*)||':'||md5(coalesce(string_agg(md5(to_jsonb(record)::text),'' order by md5(to_jsonb(record)::text)),'')) from ${table} record`,
        db,
      ),
    ]),
  );
const securityInventory = (db) =>
  sql(
    `select coalesce(json_agg(item order by item),'[]') from (
 select to_jsonb(p)::text item from pg_policies p where schemaname in('public','private','storage','auth')
 union all select jsonb_build_array(n.nspname,c.relname,c.relkind,c.relowner::regrole::text,(select array_agg(a::text order by a::text) from unnest(coalesce(c.relacl,acldefault((case when c.relkind='S' then 's' else 'r' end)::\"char\",c.relowner))) a),c.relrowsecurity,c.relforcerowsecurity)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','private','storage','auth') and not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
 union all select jsonb_build_array(n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),p.proowner::regrole::text,(select array_agg(a::text order by a::text) from unnest(coalesce(p.proacl,acldefault('f',p.proowner))) a),pg_get_functiondef(p.oid))::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private','storage','auth') and p.prokind in('f','p') and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
) inventory`,
    db,
  );
const storageRoot = run(storage, [
  "sh",
  "-c",
  'printf "%s" "$FILE_STORAGE_BACKEND_PATH"',
])
  .toString()
  .trim();
if (!/^\/[A-Za-z0-9_/.-]+$/.test(storageRoot) || storageRoot.includes(".."))
  throw new Error("Known local file Storage backend required");
const manifest = (path) =>
  run(storage, ["find", path, "-type", "f", "-exec", "sha256sum", "{}", ";"])
    .toString()
    .replaceAll(`${path}/`, "")
    .split("\n")
    .filter(Boolean)
    .sort()
    .join("\n");
const probes = [
  `restore-proof/${token}/photo.png`,
  `restore-proof/${token}/evidence.pdf`,
];
let created = false,
  restoredStorage = false;
try {
  const image = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "#164d39" },
  })
    .png()
    .toBuffer();
  for (const [i, path] of probes.entries()) {
    const result = await admin.storage
      .from("player-private")
      .upload(
        path,
        i === 0
          ? image
          : Buffer.from("%PDF-1.4\nSynthetic restore evidence\n%%EOF"),
        { contentType: i === 0 ? "image/png" : "application/pdf" },
      );
    if (result.error)
      throw new Error("Could not create a private local restore probe");
  }
  const sourceSecurity = securityInventory("postgres");
  const before = fingerprint("postgres"),
    sourceManifest = manifest(storageRoot);
  const dump = run(database, [
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "--format=custom",
    ]),
    objects = run(storage, ["tar", "-C", storageRoot, "-cf", "-", "."]);
  if (
    JSON.stringify(before) !== JSON.stringify(fingerprint("postgres")) ||
    sourceManifest !== manifest(storageRoot)
  )
    throw new Error(
      "Source changed during snapshot; quiesce writes and retry the restore rehearsal.",
    );
  const key = randomBytes(32),
    iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv),
    plaintext = Buffer.from(
      JSON.stringify({
        database: dump.toString("base64"),
        storage: objects.toString("base64"),
      }),
    ),
    encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]),
    tag = cipher.getAuthTag(),
    file = join(directory, "league-backup.aes256gcm");
  writeFileSync(file, Buffer.concat([iv, tag, encrypted]), { mode: 0o600 });
  const decrypt = (buffer) => {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      buffer.subarray(0, 12),
    );
    decipher.setAuthTag(buffer.subarray(12, 28));
    return Buffer.concat([
      decipher.update(buffer.subarray(28)),
      decipher.final(),
    ]);
  };
  const saved = readFileSync(file),
    tampered = Buffer.from(saved);
  tampered[tampered.length - 1] ^= 1;
  let rejected = false;
  try {
    decrypt(tampered);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("Tampered archive was accepted");
  const started = performance.now(),
    restored = JSON.parse(decrypt(saved).toString());
  sql(`create database ${target} template template0;`);
  created = true;
  run(
    database,
    ["pg_restore", "-U", "supabase_admin", "-d", target, "--exit-on-error"],
    Buffer.from(restored.database, "base64"),
  );
  if (JSON.stringify(before) !== JSON.stringify(fingerprint(target)))
    throw new Error("Restored application/Auth/Storage metadata differs");
  const restoredSecurity = securityInventory(target);
  if (sourceSecurity !== restoredSecurity) {
    const source = new Set(JSON.parse(sourceSecurity)),
      restored = new Set(JSON.parse(restoredSecurity));
    for (const [side, items, other] of [
      ["source", source, restored],
      ["restored", restored, source],
    ]) {
      const differences = [...items].filter((item) => !other.has(item));
      console.error(
        JSON.stringify({
          side,
          security_differences: differences.length,
          objects: differences.slice(0, 15).map((item) => {
            const value = JSON.parse(item);
            return Array.isArray(value)
              ? value.slice(0, 3)
              : [value.schemaname, value.tablename, value.policyname];
          }),
        }),
      );
    }
    throw new Error(
      "Restored policies, function definitions, owners or grants differ",
    );
  }
  const boundaries = sql(
      "select json_build_object('policies',(select count(*) from pg_policies where schemaname in('public','storage')),'private_denied',not has_table_privilege('anon','public.players','select'),'public_allowed',has_table_privilege('anon','public.public_match_snapshots','select'),'replay_denied',not has_function_privilege('authenticated','private.replay_effective_ratings()','execute'),'private_rls',(select relrowsecurity from pg_class where oid='public.players'::regclass))",
      target,
    ),
    controls = JSON.parse(boundaries);
  if (
    !controls.private_denied ||
    !controls.public_allowed ||
    !controls.replay_denied ||
    !controls.private_rls
  )
    throw new Error("Restored RLS/grants boundary differs");
  const originalPolicies = Number(
    sql(
      "select count(*) from pg_policies where schemaname in('public','storage')",
    ),
  );
  if (controls.policies !== originalPolicies)
    throw new Error("Restored policy inventory differs");
  sql(
    "begin;set local role anon;select public.get_public_health();select count(*) from public.public_match_snapshots;rollback;",
    target,
  );
  run(storage, ["mkdir", "-p", storageTarget]);
  restoredStorage = true;
  run(
    storage,
    ["tar", "-C", storageTarget, "-xf", "-"],
    Buffer.from(restored.storage, "base64"),
  );
  if (sourceManifest !== manifest(storageTarget))
    throw new Error("Restored Storage bytes differ");
  const report = {
    scope: "local isolated restore; not hosted PITR/off-site/venue acceptance",
    verified: true,
    encrypted_bytes: saved.length,
    database_bytes: dump.length,
    storage_bytes: objects.length,
    restore_ms: Math.round(performance.now() - started),
    critical_tables: critical.length,
    policies: controls.policies,
    auth_rows: Number(before["auth.users"].split(":")[0]),
    storage_objects: Number(before["storage.objects"].split(":")[0]),
    tamper_rejected: true,
    rls_and_grants_verified: true,
    security_schema_verified: true,
    storage_bytes_verified: true,
    encrypted_sha256: createHash("sha256").update(saved).digest("hex"),
  };
  mkdirSync("output/readiness", { recursive: true });
  writeFileSync(
    "output/readiness/local-restore.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
} finally {
  const cleanup = await Promise.allSettled([
    Promise.resolve().then(() => {
      if (created) sql(`drop database ${target} with(force);`);
    }),
    Promise.resolve().then(() => {
      if (restoredStorage) run(storage, ["rm", "-rf", storageTarget]);
    }),
    admin.storage
      .from("player-private")
      .remove(probes)
      .then((result) => {
        if (result.error) throw new Error("Probe removal failed");
      }),
    Promise.resolve().then(() =>
      rmSync(directory, { recursive: true, force: true }),
    ),
  ]);
  if (cleanup.some((result) => result.status === "rejected"))
    throw new Error(
      "Recovery rehearsal cleanup incomplete; inspect only generated temporary targets.",
    );
}
