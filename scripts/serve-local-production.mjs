import { execFileSync, spawn } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  openSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import https from "node:https";
import http from "node:http";
const origin = "https://127.0.0.1:3443",
  directory = mkdtempSync(join(tmpdir(), "tennora-production-")),
  certificate = join(directory, "certificate.pem"),
  key = join(directory, "key.pem"),
  metadata = join(tmpdir(), "tennora-production-readiness.json"),
  config = join(directory, "openssl.cnf"),
  env = {
    ...process.env,
    TENNORA_BUILD_DIR: ".next-readiness",
    NEXT_PUBLIC_SITE_URL: origin,
  };
writeFileSync(
  config,
  "[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=extensions\n[dn]\nCN=localhost\n[extensions]\nsubjectAltName=IP:127.0.0.1,DNS:localhost\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,digitalSignature,keyEncipherment,keyCertSign\nextendedKeyUsage=serverAuth\n",
  { mode: 0o600 },
);
let child,
  server,
  stopped = false;
const cleanup = () => {
  if (stopped) return;
  stopped = true;
  server?.close();
  child?.kill("SIGTERM");
  rmSync(metadata, { force: true });
  rmSync(directory, { recursive: true, force: true });
};
process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});
try {
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "1",
      "-config",
      config,
      "-keyout",
      key,
      "-out",
      certificate,
    ],
    { stdio: "ignore" },
  );
  execFileSync("npm", ["run", "build"], { env, stdio: "inherit" });
  const log = openSync(join(directory, "server.log"), "a", 0o600);
  child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3444",
    ],
    { env, stdio: ["ignore", log, log] },
  );
  child.on("exit", (code) => {
    if (!stopped) {
      cleanup();
      process.exitCode = code ?? 1;
    }
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch("http://127.0.0.1:3444/api/health");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready)
    throw new Error("Isolated production runtime failed health readiness");
  server = https.createServer(
    { key: readFileSync(key), cert: readFileSync(certificate) },
    (request, response) => {
      const upstream = http.request(
        {
          hostname: "127.0.0.1",
          port: 3444,
          path: request.url,
          method: request.method,
          headers: {
            ...request.headers,
            "x-forwarded-proto": "https",
            "x-forwarded-host": request.headers.host,
          },
        },
        (result) => {
          response.writeHead(result.statusCode ?? 502, result.headers);
          result.pipe(response);
        },
      );
      upstream.on("error", () => {
        if (!response.headersSent) response.writeHead(502);
        response.end();
      });
      request.pipe(upstream);
    },
  );
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(3443, "127.0.0.1", resolve);
  });
  writeFileSync(
    metadata,
    JSON.stringify({
      origin,
      certificate,
      directory,
      runtime: process.version,
      scope:
        "isolated local TLS production runtime; no hosted/venue acceptance",
    }),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      ready: true,
      origin,
      metadata,
      scope: "local TLS production runtime",
    }),
  );
} catch (error) {
  cleanup();
  throw error;
}
