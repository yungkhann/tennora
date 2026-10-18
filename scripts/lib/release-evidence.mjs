import { z } from "zod";
const proof = z
  .object({
    artifact: z.string().min(8),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    reviewer: z.string().min(3),
    measured_at: z.iso.datetime(),
  })
  .strict();
const https = z.url().refine((v) => {
  const u = new URL(v);
  return (
    u.protocol === "https:" &&
    !["localhost", "127.0.0.1", "::1"].includes(u.hostname)
  );
}, "Hosted HTTPS URL required");
const latency = (p95, p99) =>
  z
    .object({
      samples: z.number().int().min(100),
      p95_ms: z.number().nonnegative().max(p95),
      p99_ms: z.number().nonnegative().max(p99),
    })
    .refine((v) => v.p99_ms >= v.p95_ms, "Invalid quantile order");
export const releaseEvidence = z
  .object({
    commit: z.string().regex(/^[a-f0-9]{40}$/),
    staging: https,
    production: https,
    region: z.string().min(3),
    provider: proof.extend({
      budget_approved: z.literal(true),
      separate_projects: z.literal(true),
    }),
    privacy: proof.extend({
      consent_reviewed: z.literal(true),
      retention_approved: z.literal(true),
    }),
    recovery: proof.extend({
      pitr_verified: z.literal(true),
      rpo_seconds: z.number().nonnegative().max(300),
      rto_seconds: z.number().nonnegative().max(1800),
      encrypted_offsite: z.literal(true),
      daily_copies: z.number().int().min(14),
      weekly_copies: z.number().int().min(8),
      auth_rls_grants_verified: z.literal(true),
      storage_reconciled: z.literal(true),
    }),
    load: proof.extend({
      environment: z.literal("hosted"),
      viewers: z.number().int().min(2000),
      active_matches: z.number().int().min(30),
      seconds: z.number().int().min(1800),
      errors: z.literal(0),
      geography: z.string().min(3),
      commit: latency(100, 250),
      ack: latency(300, 600),
      viewer: latency(1000, 2000),
      connect: latency(1000, 3000),
      reconnect: latency(3000, 8000),
      public_rest: latency(150, 400),
    }),
    venue: proof.extend({
      tablets: z.number().int().min(30),
      backup_uplink_tested: z.literal(true),
      forced_loss_recovery: z.literal(true),
      device_replacement_tested: z.literal(true),
    }),
    monitoring: proof.extend({
      event_day_target: z.literal(0.999),
      alert_delivery_tested: z.literal(true),
      incident_authority: z.string().min(3),
    }),
    cutover: proof.extend({
      staging_rehearsed: z.literal(true),
      rollback_tested: z.literal(true),
      organizer_acceptance: z.literal(true),
    }),
  })
  .strict()
  .refine(
    (v) => new URL(v.staging).hostname !== new URL(v.production).hostname,
    "Staging and production must differ",
  );
