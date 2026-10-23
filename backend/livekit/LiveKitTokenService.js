const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

/**
 * LiveKitTokenService
 * Generates authenticated, short-lived, permission-scoped LiveKit access tokens.
 * Uses standard LiveKit video grant claims signed with LIVEKIT_API_SECRET.
 * Never exposes server secrets to Android or Flutter clients.
 */
class LiveKitTokenService {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.LIVEKIT_API_KEY || 'wellwisher_dev_key';
    this.apiSecret = options.apiSecret || process.env.LIVEKIT_API_SECRET || 'wellwisher_dev_secret_32_character_key_min';
    this.defaultTtlSeconds = options.defaultTtlSeconds || 600; // 10 minutes short-lived
    this.seenNonces = new Map();
  }

  /**
   * Check if LiveKit configuration is provided
   */
  isConfigured() {
    const hasKey = Boolean(process.env.LIVEKIT_API_KEY && !process.env.LIVEKIT_API_KEY.includes('your_livekit'));
    const hasSecret = Boolean(process.env.LIVEKIT_API_SECRET && !process.env.LIVEKIT_API_SECRET.includes('your_livekit'));
    return hasKey && hasSecret;
  }

  /**
   * Generate an authenticated LiveKit room access token
   */
  generateToken({ userId, deviceId, roomName, ttlSeconds, metadata = {}, nonce }) {
    if (!userId) {
      throw new Error('LiveKitTokenService: userId is required for authenticated token creation.');
    }

    // Replay Protection Check
    if (nonce) {
      if (this.seenNonces.has(nonce)) {
        throw new Error('LiveKitTokenService: Replay attack detected. Nonce has already been consumed.');
      }
      this.seenNonces.set(nonce, Date.now() + 300000); // 5 min TTL
    }

    const room = roomName || `jarvis_voice_${userId}_${deviceId || 'default'}`;
    const identity = `user_${userId}`;
    const now = Math.floor(Date.now() / 1000);
    const ttl = ttlSeconds || this.defaultTtlSeconds;

    // Standard LiveKit Video Grant structure
    const videoGrants = {
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canPublishSources: ['microphone']
    };

    const payload = {
      sub: identity,
      iss: this.apiKey,
      nbf: now - 5, // 5 seconds allowable clock skew
      exp: now + ttl,
      video: videoGrants,
      metadata: typeof metadata === 'string' ? metadata : JSON.stringify({
        userId,
        deviceId: deviceId || 'unknown_device',
        role: 'participant',
        sessionType: 'REALTIME_VOICE_ASSISTANT',
        ...metadata
      })
    };

    const token = jwt.sign(payload, this.apiSecret, {
      algorithm: 'HS256',
      header: {
        typ: 'JWT',
        alg: 'HS256'
      }
    });

    return {
      token,
      room,
      identity,
      expiresAt: (now + ttl) * 1000,
      ttlSeconds: ttl,
      serverUrl: process.env.LIVEKIT_URL || 'ws://127.0.0.1:7880'
    };
  }

  /**
   * Validate and decode an incoming LiveKit access token
   */
  validateToken(token) {
    if (!token) {
      return { valid: false, errorCode: 'MISSING_TOKEN', message: 'LiveKit token is required.' };
    }

    try {
      const decoded = jwt.verify(token, this.apiSecret, { algorithms: ['HS256'] });
      
      let parsedMetadata = {};
      if (decoded.metadata) {
        try {
          parsedMetadata = typeof decoded.metadata === 'string' ? JSON.parse(decoded.metadata) : decoded.metadata;
        } catch {
          parsedMetadata = {};
        }
      }

      return {
        valid: true,
        identity: decoded.sub,
        room: decoded.video?.room || null,
        videoGrants: decoded.video || {},
        metadata: parsedMetadata,
        expiresAt: decoded.exp * 1000
      };
    } catch (err) {
      return {
        valid: false,
        errorCode: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN_SIGNATURE',
        message: err.message
      };
    }
  }

  /**
   * Cleanup expired nonces
   */
  cleanupNonces() {
    const now = Date.now();
    for (const [nonce, expiresAt] of this.seenNonces.entries()) {
      if (now > expiresAt) {
        this.seenNonces.delete(nonce);
      }
    }
  }
}

const defaultLiveKitTokenService = new LiveKitTokenService();

module.exports = {
  LiveKitTokenService,
  defaultLiveKitTokenService
};
