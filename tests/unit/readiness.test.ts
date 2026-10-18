import { expect, it } from "vitest";
import { Histogram } from "../../scripts/lib/histogram.mjs";
import { releaseEvidence } from "../../scripts/lib/release-evidence.mjs";
it("calculates bounded nearest-rank latency percentiles including overflow", () => {
  const h = new Histogram();
  expect(h.summary().p95_ms).toBeNull();
  for (let i = 1; i <= 100; i++) h.add(i);
  expect(h.summary()).toMatchObject({ samples: 100, p95_ms: 95, p99_ms: 99 });
  expect(() => h.add(NaN)).toThrow();
  const slow = new Histogram();
  slow.add(70001);
  expect(slow.summary().p99_ms).toBe(70001);
});
it("rejects missing and locally fabricated production release evidence", () => {
  expect(releaseEvidence.safeParse({}).success).toBe(false);
  const p = {
    artifact: "proof.json",
    sha256: "a".repeat(64),
    reviewer: "Operator",
    measured_at: new Date().toISOString(),
  };
  const latency = { samples: 100, p95_ms: 1, p99_ms: 2 };
  const valid = {
    commit: "a".repeat(40),
    staging: "https://staging.example.com",
    production: "https://league.example.com",
    region: "approved region",
    provider: { ...p, budget_approved: true, separate_projects: true },
    privacy: { ...p, consent_reviewed: true, retention_approved: true },
    recovery: {
      ...p,
      pitr_verified: true,
      rpo_seconds: 300,
      rto_seconds: 1800,
      encrypted_offsite: true,
      daily_copies: 14,
      weekly_copies: 8,
      auth_rls_grants_verified: true,
      storage_reconciled: true,
    },
    load: {
      ...p,
      environment: "hosted",
      viewers: 2000,
      active_matches: 30,
      seconds: 1800,
      errors: 0,
      geography: "venue",
      commit: latency,
      ack: latency,
      viewer: latency,
      connect: latency,
      reconnect: latency,
      public_rest: latency,
    },
    venue: {
      ...p,
      tablets: 30,
      backup_uplink_tested: true,
      forced_loss_recovery: true,
      device_replacement_tested: true,
    },
    monitoring: {
      ...p,
      event_day_target: 0.999,
      alert_delivery_tested: true,
      incident_authority: "Organizer",
    },
    cutover: {
      ...p,
      staging_rehearsed: true,
      rollback_tested: true,
      organizer_acceptance: true,
    },
  };
  expect(releaseEvidence.safeParse(valid).success).toBe(true);
  for (const change of [
    { production: "https://127.0.0.1" },
    { production: valid.staging },
    { load: { ...valid.load, seconds: 60 } },
    { load: { ...valid.load, commit: { ...latency, p99_ms: 251 } } },
    { recovery: { ...valid.recovery, storage_reconciled: false } },
  ])
    expect(releaseEvidence.safeParse({ ...valid, ...change }).success).toBe(
      false,
    );
});
