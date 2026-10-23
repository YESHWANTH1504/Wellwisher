/**
 * ReliabilityScoreEngine
 * Tracks independent reliability metrics (Success, Verification, Recovery, Health) across providers.
 */
class ReliabilityScoreEngine {
  constructor() {
    this.providerScores = new Map();
  }

  recordOperation(provider, success = true, verified = true, recovered = false) {
    if (!this.providerScores.has(provider)) {
      this.providerScores.set(provider, {
        total: 0,
        successCount: 0,
        verifiedCount: 0,
        recoveredCount: 0,
        recentErrors: []
      });
    }

    const stats = this.providerScores.get(provider);
    stats.total += 1;
    if (success) stats.successCount += 1;
    if (verified) stats.verifiedCount += 1;
    if (recovered) stats.recoveredCount += 1;

    return stats;
  }

  getProviderHealth(provider) {
    const stats = this.providerScores.get(provider) || { total: 10, successCount: 10, verifiedCount: 10, recoveredCount: 0 };
    const successRate = (stats.successCount / stats.total) * 100;
    const verificationRate = (stats.verifiedCount / stats.total) * 100;

    let health = 'HEALTHY';
    if (successRate < 90) health = 'DEGRADED';
    if (successRate < 70) health = 'AT_RISK';
    if (successRate < 50) health = 'UNAVAILABLE';

    return {
      provider,
      successRate: `${successRate.toFixed(1)}%`,
      verificationRate: `${verificationRate.toFixed(1)}%`,
      health
    };
  }
}

module.exports = new ReliabilityScoreEngine();
