/**
 * JarvisObservabilityEngine
 * Structured metrics, latencies, error recovery rates, and verification diagnostics.
 */
class JarvisObservabilityEngine {
  constructor() {
    this.metrics = [];
  }

  recordMetric(metricName, durationMs, metadata = {}) {
    const entry = {
      metricName,
      durationMs,
      metadata,
      timestamp: new Date().toISOString()
    };
    this.metrics.push(entry);
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
    return entry;
  }

  getAggregateStats(metricName) {
    const filtered = this.metrics.filter(m => m.metricName === metricName);
    if (filtered.length === 0) return { count: 0, p50: 0, p95: 0 };

    const values = filtered.map(m => m.durationMs).sort((a, b) => a - b);
    return {
      count: values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)]
    };
  }
}

module.exports = new JarvisObservabilityEngine();
