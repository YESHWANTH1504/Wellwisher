/**
 * JARVIS Voice Telemetry Service (Phase 3 & Phase 51).
 * Tracks sanitized voice-latency metrics, percentile distributions (P50, P95, P99),
 * and enforces strict privacy sanitization (zero audio persistence, zero credential logging).
 */

class VoiceTelemetryService {
    constructor() {
        this.samples = [];
        this.realtimeTurnMetrics = [];
        this.maxSamples = 500;
    }

    /**
     * Record a sanitized voice latency observation
     */
    recordSample(sample = {}) {
        const sanitized = {
            sampleId: sample.sampleId || `sample_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            timestamp: sample.timestamp || new Date().toISOString(),
            isGenuinePhysicalSample: !!sample.isGenuinePhysicalSample,
            wakeWordLatencyMs: Math.max(0, parseInt(sample.wakeWordLatencyMs, 10) || 0),
            speechCaptureLatencyMs: Math.max(0, parseInt(sample.speechCaptureLatencyMs, 10) || 0),
            sttLatencyMs: Math.max(0, parseInt(sample.sttLatencyMs, 10) || 0),
            networkLatencyMs: Math.max(0, parseInt(sample.networkLatencyMs, 10) || 0),
            geminiLatencyMs: Math.max(0, parseInt(sample.geminiLatencyMs, 10) || 0),
            planningLatencyMs: Math.max(0, parseInt(sample.planningLatencyMs, 10) || 0),
            toolExecutionLatencyMs: Math.max(0, parseInt(sample.toolExecutionLatencyMs, 10) || 0),
            verificationLatencyMs: Math.max(0, parseInt(sample.verificationLatencyMs, 10) || 0),
            ttsLatencyMs: Math.max(0, parseInt(sample.ttsLatencyMs, 10) || 0),
            totalResponseLatencyMs: Math.max(0, parseInt(sample.totalResponseLatencyMs, 10) || 0)
        };

        // Enforce total latency calculation if not provided
        if (!sanitized.totalResponseLatencyMs) {
            sanitized.totalResponseLatencyMs =
                sanitized.wakeWordLatencyMs +
                sanitized.sttLatencyMs +
                sanitized.networkLatencyMs +
                sanitized.geminiLatencyMs +
                sanitized.planningLatencyMs +
                sanitized.toolExecutionLatencyMs +
                sanitized.verificationLatencyMs +
                sanitized.ttsLatencyMs;
        }

        this.samples.push(sanitized);
        if (this.samples.length > this.maxSamples) {
            this.samples.shift();
        }

        return sanitized;
    }

    /**
     * Record Phase 3 Realtime Streaming Turn Latency Telemetry
     */
    recordRealtimeTurn(metrics = {}) {
        const sanitized = {
            turnId: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            sessionId: metrics.sessionId || 'anonymous_session',
            provider: metrics.provider || 'gemini',
            timestamp: new Date().toISOString(),
            wakeToListenMs: Math.max(0, parseInt(metrics.wakeToListenMs, 10) || 0),
            speechToFirstResponseMs: Math.max(0, parseInt(metrics.speechToFirstResponseMs, 10) || 0),
            firstTokenLatencyMs: Math.max(0, parseInt(metrics.firstTokenLatencyMs, 10) || 0),
            firstAudioToPlaybackMs: Math.max(0, parseInt(metrics.firstAudioToPlaybackMs, 10) || 0),
            interruptionMs: Math.max(0, parseInt(metrics.interruptionMs, 10) || 0),
            totalTurnDurationMs: Math.max(0, parseInt(metrics.totalTurnDurationMs, 10) || 0)
        };

        this.realtimeTurnMetrics.push(sanitized);
        if (this.realtimeTurnMetrics.length > this.maxSamples) {
            this.realtimeTurnMetrics.shift();
        }

        return sanitized;
    }

    getRealtimeMetrics(limit = 20) {
        return this.realtimeTurnMetrics.slice(-limit);
    }

    /**
     * Compute percentile (P50, P95, P99) for a given metric array
     */
    static calculatePercentiles(values = []) {
        if (!values || values.length === 0) {
            return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, count: 0 };
        }

        const sorted = [...values].sort((a, b) => a - b);
        const count = sorted.length;

        const getP = (p) => {
            const index = Math.ceil((p / 100) * count) - 1;
            return sorted[Math.max(0, Math.min(count - 1, index))];
        };

        return {
            p50: getP(50),
            p95: getP(95),
            p99: getP(99),
            min: sorted[0],
            max: sorted[count - 1],
            count
        };
    }

    /**
     * Compute comprehensive telemetry metrics report
     */
    getMetricsReport(onlyGenuinePhysical = false) {
        const pool = onlyGenuinePhysical
            ? this.samples.filter(s => s.isGenuinePhysicalSample)
            : this.samples;

        if (pool.length < 5) {
            return {
                status: 'INSUFFICIENT_DATA',
                sampleCount: pool.length,
                requiredMinimum: 5,
                message: 'Fewer than 5 genuine physical voice samples recorded. Percentiles withheld in accordance with zero simulation governance.',
                metrics: null,
                realtimeTurns: this.realtimeTurnMetrics.length
            };
        }

        const totals = pool.map(s => s.totalResponseLatencyMs);
        const stt = pool.map(s => s.sttLatencyMs);
        const gemini = pool.map(s => s.geminiLatencyMs);
        const tools = pool.map(s => s.toolExecutionLatencyMs);
        const tts = pool.map(s => s.ttsLatencyMs);

        return {
            status: 'DATA_AVAILABLE',
            sampleCount: pool.length,
            totalResponseLatency: VoiceTelemetryService.calculatePercentiles(totals),
            sttLatency: VoiceTelemetryService.calculatePercentiles(stt),
            geminiLatency: VoiceTelemetryService.calculatePercentiles(gemini),
            toolExecutionLatency: VoiceTelemetryService.calculatePercentiles(tools),
            ttsLatency: VoiceTelemetryService.calculatePercentiles(tts),
            realtimeTurns: this.realtimeTurnMetrics.length,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Reset sample cache
     */
    clearSamples() {
        this.samples = [];
        this.realtimeTurnMetrics = [];
    }
}

const defaultVoiceTelemetry = new VoiceTelemetryService();

module.exports = {
    VoiceTelemetryService,
    defaultVoiceTelemetry
};
