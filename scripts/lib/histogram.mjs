export class Histogram {
  constructor() {
    this.buckets = new Uint32Array(60001);
    this.count = 0;
    this.max = 0;
  }
  add(value) {
    if (!Number.isFinite(value) || value < 0)
      throw new Error("Finite nonnegative timing required");
    this.buckets[Math.min(60000, Math.ceil(value))]++;
    this.count++;
    this.max = Math.max(this.max, value);
  }
  percentile(fraction) {
    if (!this.count) return null;
    let total = 0;
    const target = Math.ceil(this.count * fraction);
    for (let i = 0; i < this.buckets.length; i++) {
      total += this.buckets[i];
      if (total >= target) return i === 60000 ? Math.ceil(this.max) : i;
    }
    return null;
  }
  summary() {
    return {
      samples: this.count,
      p50_ms: this.percentile(0.5),
      p95_ms: this.percentile(0.95),
      p99_ms: this.percentile(0.99),
      max_ms: Math.ceil(this.max),
    };
  }
}
