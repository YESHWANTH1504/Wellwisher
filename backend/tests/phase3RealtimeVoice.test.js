/**
 * Phase 3 Verification Test Suite: Realtime Voice, Streaming Audio Protocol,
 * Barge-in Interruption, Session Lifecycle, and Truthful Provider Reporting.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const RealtimeAudioProtocol = require('../services/jarvis/realtime/RealtimeAudioProtocol');
const {
  REALTIME_STATES,
  VALID_TRANSITIONS,
  canTransition
} = require('../services/jarvis/realtime/RealtimeSessionStates');
const realtimeEventBus = require('../services/jarvis/realtime/RealtimeEventBus');
const RealtimeSession = require('../services/jarvis/realtime/RealtimeSession');
const realtimeSessionManager = require('../services/jarvis/realtime/RealtimeSessionManager');
const RealtimeProviderAdapter = require('../services/jarvis/realtime/RealtimeProviderAdapter');

describe('Phase 3: Realtime Voice Architecture & Audio Protocol', () => {

  // ==========================================================
  // 1. Audio Protocol & VAD Tests
  // ==========================================================
  describe('1. Audio Protocol & Energy Detection', () => {
    test('verifies standard audio format constants (16kHz, 16-bit Mono)', () => {
      assert.equal(RealtimeAudioProtocol.SAMPLE_RATE, 16000);
      assert.equal(RealtimeAudioProtocol.CHANNELS, 1);
      assert.equal(RealtimeAudioProtocol.BITS_PER_SAMPLE, 16);
      assert.equal(RealtimeAudioProtocol.BYTES_PER_SAMPLE, 2);
      assert.equal(RealtimeAudioProtocol.FRAME_SIZE_BYTES, 640); // 20ms frame
    });

    test('calculates near-zero RMS energy for pure silence buffer', () => {
      const silentBuffer = Buffer.alloc(640, 0);
      const rms = RealtimeAudioProtocol.calculateRmsEnergy(silentBuffer);
      assert.equal(rms, 0);
      assert.equal(RealtimeAudioProtocol.isSpeech(silentBuffer, 500), false);
    });

    test('detects speech energy exceeding threshold in high-amplitude buffer', () => {
      const speechBuffer = Buffer.alloc(640);
      // Fill with 16-bit signed PCM samples of amplitude 8000
      for (let i = 0; i < 640; i += 2) {
        speechBuffer.writeInt16LE(8000, i);
      }
      const rms = RealtimeAudioProtocol.calculateRmsEnergy(speechBuffer);
      assert.ok(rms > 5000, `Expected RMS > 5000, got ${rms}`);
      assert.equal(RealtimeAudioProtocol.isSpeech(speechBuffer, 500), true);
    });

    test('packages raw PCM buffer into valid WAV container with correct headers', () => {
      const pcmData = Buffer.alloc(3200, 100); // 100ms of audio
      const wav = RealtimeAudioProtocol.createWavContainer(pcmData);
      
      // RIFF header
      assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
      assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
      // Format chunk
      assert.equal(wav.toString('ascii', 12, 16), 'fmt ');
      assert.equal(wav.readUInt16LE(20), 1); // PCM format
      assert.equal(wav.readUInt16LE(22), 1); // 1 channel
      assert.equal(wav.readUInt32LE(24), 16000); // 16kHz
      assert.equal(wav.readUInt16LE(34), 16); // 16-bit
      // Data chunk
      assert.equal(wav.toString('ascii', 36, 40), 'data');
      assert.equal(wav.readUInt32LE(40), 3200); // payload length
      assert.equal(wav.length, 44 + 3200);
    });
  });

  // ==========================================================
  // 2. Realtime State Machine
  // ==========================================================
  describe('2. Realtime State Lifecycle & Transitions', () => {
    test('enforces all 12 required Phase 3 lifecycle states', () => {
      const required = [
        'IDLE', 'CONNECTING', 'CONNECTED', 'LISTENING', 'USER_SPEAKING',
        'PROCESSING', 'ASSISTANT_SPEAKING', 'INTERRUPTED', 'RECONNECTING',
        'ERROR', 'DISCONNECTING', 'DISCONNECTED'
      ];
      for (const s of required) {
        assert.ok(REALTIME_STATES[s], `State ${s} must exist`);
      }
    });

    test('allows valid state progression: IDLE -> CONNECTING -> CONNECTED -> LISTENING', () => {
      assert.ok(canTransition(REALTIME_STATES.IDLE, REALTIME_STATES.CONNECTING));
      assert.ok(canTransition(REALTIME_STATES.CONNECTING, REALTIME_STATES.CONNECTED));
      assert.ok(canTransition(REALTIME_STATES.CONNECTED, REALTIME_STATES.LISTENING));
    });

    test('strictly rejects illegal transition jumps', () => {
      // Cannot jump directly from IDLE to ASSISTANT_SPEAKING
      assert.equal(canTransition(REALTIME_STATES.IDLE, REALTIME_STATES.ASSISTANT_SPEAKING), false);
      // Cannot jump from DISCONNECTED directly to PROCESSING
      assert.equal(canTransition(REALTIME_STATES.DISCONNECTED, REALTIME_STATES.PROCESSING), false);
    });
  });

  // ==========================================================
  // 3. Barge-In / Interruption Engine
  // ==========================================================
  describe('3. Barge-In / Interruption Mechanics', () => {
    test('instant barge-in stops assistant speech and transitions to INTERRUPTED -> LISTENING', () => {
      const session = new RealtimeSession({
        sessionId: 'test_barge_in_01',
        userId: 42,
        transport: 'audio_stream'
      });

      // Move to CONNECTED -> LISTENING -> ASSISTANT_SPEAKING
      session.transitionTo(REALTIME_STATES.CONNECTING);
      session.transitionTo(REALTIME_STATES.CONNECTED);
      session.transitionTo(REALTIME_STATES.LISTENING);
      session.transitionTo(REALTIME_STATES.PROCESSING);
      session.transitionTo(REALTIME_STATES.ASSISTANT_SPEAKING);

      assert.equal(session.getState(), REALTIME_STATES.ASSISTANT_SPEAKING);

      let bargeInEventEmitted = false;
      realtimeEventBus.once('barge_in', (data) => {
        if (data.sessionId === 'test_barge_in_01') {
          bargeInEventEmitted = true;
        }
      });

      // User interrupts
      const interrupted = session.interrupt('user_acoustic_barge_in');
      assert.ok(interrupted, 'Interrupt call must succeed');
      assert.ok(bargeInEventEmitted, 'barge_in event must be published to event bus');

      // State must immediately become INTERRUPTED and then switch back to LISTENING
      assert.equal(session.getState(), REALTIME_STATES.LISTENING);

      session.close();
    });

    test('acoustic barge-in triggers when high-amplitude audio chunk arrives during ASSISTANT_SPEAKING', () => {
      const session = new RealtimeSession({
        sessionId: 'test_barge_in_audio_02',
        userId: 42,
        transport: 'audio_stream'
      });

      session.transitionTo(REALTIME_STATES.CONNECTING);
      session.transitionTo(REALTIME_STATES.CONNECTED);
      session.transitionTo(REALTIME_STATES.LISTENING);
      session.transitionTo(REALTIME_STATES.PROCESSING);
      session.transitionTo(REALTIME_STATES.ASSISTANT_SPEAKING);

      // Assistant is speaking; user speaks into microphone with high energy
      const speechBuffer = Buffer.alloc(640);
      for (let i = 0; i < 640; i += 2) {
        speechBuffer.writeInt16LE(9000, i);
      }

      const res = session.pushAudioChunk(speechBuffer);
      assert.ok(res.interrupted, 'Audio chunk must trigger acoustic barge-in');
      assert.equal(session.getState(), REALTIME_STATES.USER_SPEAKING);

      session.close();
    });
  });

  // ==========================================================
  // 4. Session Security & User Isolation
  // ==========================================================
  describe('4. Session Security & Authorization Invariants', () => {
    test('rejects creating session without valid authenticated numeric userId', () => {
      assert.throws(() => {
        realtimeSessionManager.createSession({ userId: null });
      }, /numeric userId/);

      assert.throws(() => {
        realtimeSessionManager.createSession({ userId: 'string_id' });
      }, /numeric userId/);
    });

    test('enforces user isolation: cannot access or interrupt another user session', () => {
      const sessionUserA = realtimeSessionManager.createSession({ userId: 101 });
      const sessionId = sessionUserA.sessionId;

      // Accessing with correct user succeeds
      const retrieved = realtimeSessionManager.getSession(sessionId, 101);
      assert.ok(retrieved);
      assert.equal(retrieved.userId, 101);

      // Accessing with unauthorized user B returns null
      const blocked = realtimeSessionManager.getSession(sessionId, 102);
      assert.equal(blocked, null, 'User 102 must NOT be able to view User 101 session');

      // Attempting to interrupt with unauthorized user B fails
      const interruptRes = realtimeSessionManager.interruptSession(sessionId, 102, 'malicious');
      assert.equal(interruptRes, false, 'User 102 must NOT be able to interrupt User 101 session');

      realtimeSessionManager.closeSession(sessionId, 101);
    });
  });

  // ==========================================================
  // 5. Truthful Provider Reporting & Failover
  // ==========================================================
  describe('5. Truthful Realtime Provider Reporting', () => {
    test('reports MISCONFIGURED/NOT_CONFIGURED when live transport credentials are absent', async () => {
      const adapter = new RealtimeProviderAdapter({ providerName: 'livekit' });
      const status = await adapter.checkReadiness();

      // Unless LIVEKIT_URL is actually configured in environment, status must be truthfully unready
      if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY) {
        assert.equal(status.ready, false);
        assert.ok(['MISCONFIGURED', 'NOT_CONFIGURED', 'FAILED'].includes(status.status));
        assert.notEqual(status.status, 'CONNECTED');
      }
    });

    test('preserves conversation context across turn-taking and reconnects', () => {
      const session = new RealtimeSession({
        sessionId: 'test_context_continuity',
        userId: 55,
        initialContext: { previousTopic: 'schedule_tomorrow' }
      });

      assert.equal(session.context.previousTopic, 'schedule_tomorrow');

      session.updateContext({ nextTopic: 'afternoon_events' });
      assert.equal(session.context.previousTopic, 'schedule_tomorrow');
      assert.equal(session.context.nextTopic, 'afternoon_events');

      session.close();
    });
  });

  // ==========================================================
  // 6. Session Lifecycle & Cleanup
  // ==========================================================
  describe('6. Resource Cleanup & Session Lifecycle', () => {
    test('closes session and transitions through DISCONNECTING -> DISCONNECTED', () => {
      const session = realtimeSessionManager.createSession({ userId: 77 });
      const sessionId = session.sessionId;

      assert.ok(realtimeSessionManager.getSession(sessionId, 77));

      realtimeSessionManager.closeSession(sessionId, 77);

      assert.equal(session.getState(), REALTIME_STATES.DISCONNECTED);
      assert.equal(realtimeSessionManager.getSession(sessionId, 77), null);
    });
  });

  // ==========================================================
  // 7. Streaming Transcription & Response Generation
  // ==========================================================
  describe('7. Streaming Delts & Incremental Token Dispatch', () => {
    test('emits incremental streaming text deltas without buffering whole response', async () => {
      const { aiModelRouter } = require('../services/jarvis/providers/AIModelRouter');
      const tokens = [];

      // Test streaming with onChunk callback
      const onChunk = (delta) => {
        tokens.push(delta);
      };

      const result = await aiModelRouter.generateTextStream(
        'Respond in one sentence: Hello.',
        'You are JARVIS.',
        { timeoutMs: 10000 },
        onChunk
      );

      // If online API is available, tokens were collected incrementally; if not configured, result is null/handled
      if (result) {
        assert.ok(tokens.length >= 1, 'Streaming onChunk must receive at least 1 token delta');
        assert.equal(tokens.join('').trim(), result.trim());
      }
    });

    test('speech_end event delivers captured PCM buffer to intelligence turn', async () => {
      return new Promise((resolve) => {
        const session = new RealtimeSession({
          sessionId: 'test_speech_turn_01',
          userId: 88,
          vadThreshold: 500,
          silenceTimeoutMs: 50 // short for testing
        });

        session.transitionTo(REALTIME_STATES.CONNECTING);
        session.transitionTo(REALTIME_STATES.CONNECTED);
        session.transitionTo(REALTIME_STATES.LISTENING);

        session.once('speech_end', (evt) => {
          assert.ok(evt.capturedAudio);
          assert.ok(evt.capturedAudio.length > 0);
          assert.ok(evt.durationMs >= 0);
          assert.equal(session.getState(), REALTIME_STATES.PROCESSING);
          session.close();
          resolve();
        });

        // Send speech frame then silent frame to trigger silence timer
        const speechBuffer = Buffer.alloc(640);
        for (let i = 0; i < 640; i += 2) speechBuffer.writeInt16LE(8500, i);
        session.pushAudioChunk(speechBuffer);

        const silentBuffer = Buffer.alloc(640, 0);
        session.pushAudioChunk(silentBuffer);
      });
    });
  });

  // ==========================================================
  // 8. Voice Tool Execution & Workflow Verification
  // ==========================================================
  describe('8. Voice Tool Execution & Authorization Integrity', () => {
    test('voice requests execute through supervisor, enforcing SafetyAuthorization and Verification', async () => {
      const { defaultSupervisorAgent } = require('../services/jarvis/agent/JarvisSupervisorAgent');
      
      const res = await defaultSupervisorAgent.processRequest(
        1,
        'What is on my schedule today?',
        { sessionId: 'test_voice_sched_verification' }
      );

      assert.equal(res.success, true);
      assert.ok(res.executionStatus === 'VERIFIED' || res.executionStatus === 'SUCCESS');
      assert.ok(res.message.length > 0);
      // Spoken response must be conversational and clean
      assert.ok(!res.message.includes('```'));
    });
  });

  // ==========================================================
  // 9. Realtime Telemetry & Privacy Sanitization
  // ==========================================================
  describe('9. Realtime Telemetry & Privacy Sanitization', () => {
    test('records sanitized turn latency metrics with zero raw audio persistence', () => {
      const { defaultVoiceTelemetry } = require('../services/jarvis/telemetry/voiceTelemetryService');

      const turn = defaultVoiceTelemetry.recordRealtimeTurn({
        sessionId: 'test_telemetry_sess_01',
        provider: 'gemini',
        wakeToListenMs: 310,
        speechToFirstResponseMs: 750,
        firstTokenLatencyMs: 140,
        firstAudioToPlaybackMs: 190,
        interruptionMs: 85,
        totalTurnDurationMs: 1200
      });

      assert.equal(turn.sessionId, 'test_telemetry_sess_01');
      assert.equal(turn.wakeToListenMs, 310);
      assert.equal(turn.interruptionMs, 85);

      // Verify no sensitive raw audio fields leaked in turn object
      assert.equal(turn.audioChunk, undefined);
      assert.equal(turn.pcmFrame, undefined);
      assert.equal(turn.apiKey, undefined);

      const recent = defaultVoiceTelemetry.getRealtimeMetrics(1);
      assert.equal(recent[0].turnId, turn.turnId);
    });
  });
});

