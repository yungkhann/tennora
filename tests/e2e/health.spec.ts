import { test, expect } from "@playwright/test";
test("health exposes only operational clocks and redacted request timing", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(response.headers()["x-request-id"]).toMatch(/^[a-f0-9-]{36}$/);
  expect(response.headers()["server-timing"]).toMatch(/transport;dur=\d/);
  const body = await response.json();
  expect(Object.keys(body).sort()).toEqual([
    "database",
    "database_now",
    "server_now",
    "status",
  ]);
  expect(body.status).toBe("ok");
  expect(Number.isFinite(Date.parse(body.database_now))).toBe(true);
});
