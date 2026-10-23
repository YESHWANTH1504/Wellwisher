/**
 * JarvisDeviceIdentity.js
 * Manages privacy-preserving, application-level device identification.
 * Generates and verifies persistent installation-scoped device IDs without ever
 * querying hardware serial numbers, IMEI, or non-resettable identifiers.
 */

const crypto = require('crypto');
const pool = require('../../../config/db');

class JarvisDeviceIdentity {
  constructor() {
    this._sessions = new Map(); // Key: `${userId}:${deviceId}` -> session info
  }

  generateInstallationId() {
    return JarvisDeviceIdentity.generateInstallationId();
  }

  validateDeviceId(deviceId) {
    return JarvisDeviceIdentity.isValidDeviceId(deviceId);
  }

  validateSessionToken(token) {
    if (!token || typeof token !== 'string') return false;
    return token.startsWith('sess_') && token.length > 20;
  }

  bindDeviceSession(userId, deviceId, meta = {}) {
    const key = `${userId}:${deviceId}`;
    const session = {
      userId,
      deviceId,
      sessionToken: `sess_${crypto.randomUUID()}`,
      appVersion: meta.appVersion || '1.4.0',
      platform: meta.platform || 'android',
      lastSeen: new Date().toISOString()
    };
    this._sessions.set(key, session);
    return session;
  }

  getDeviceSession(userId, deviceId) {
    return this._sessions.get(`${userId}:${deviceId}`) || null;
  }

  /**
   * Generate an installation-scoped device ID
   * Formatted as: dev_<uuid>
   */
  static generateInstallationId() {
    return `dev_${crypto.randomUUID()}`;
  }

  /**
   * Validate device ID format
   */
  static isValidDeviceId(deviceId) {
    if (!deviceId || typeof deviceId !== 'string') return false;
    // Disallow hardware serial number format or unauthorized patterns
    if (deviceId.startsWith('SERIAL_') || deviceId.startsWith('IMEI_')) return false;
    return /^dev_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId);
  }

  /**
   * Register or update an active device installation in MySQL
   */
  static async registerOrUpdate(userId, deviceData = {}) {
    if (!userId) throw new Error('registerOrUpdate requires userId');

    let deviceId = deviceData.deviceId;
    if (!deviceId || !JarvisDeviceIdentity.isValidDeviceId(deviceId)) {
      deviceId = JarvisDeviceIdentity.generateInstallationId();
    }

    const deviceName = (deviceData.deviceName || 'Android Device').substring(0, 100);
    const osVersion = (deviceData.osVersion || 'Android 16').substring(0, 50);
    const appVersion = (deviceData.appVersion || '1.4.0').substring(0, 20);
    const capabilities = JSON.stringify(deviceData.capabilities || {});

    await pool.query(
      `INSERT INTO jarvis_devices (
        device_id, user_id, device_name, os_version, app_version, capabilities, last_active, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)
      ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id),
        device_name = VALUES(device_name),
        os_version = VALUES(os_version),
        app_version = VALUES(app_version),
        capabilities = VALUES(capabilities),
        last_active = NOW(),
        is_active = 1`,
      [deviceId, userId, deviceName, osVersion, appVersion, capabilities]
    );

    return {
      deviceId,
      userId,
      deviceName,
      osVersion,
      appVersion,
      lastActive: new Date().toISOString()
    };
  }

  /**
   * Get device profile by device ID and verify ownership
   */
  static async getDeviceProfile(userId, deviceId) {
    if (!userId || !deviceId) return null;
    const [rows] = await pool.query(
      'SELECT * FROM jarvis_devices WHERE user_id = ? AND device_id = ?',
      [userId, deviceId]
    );
    if (!rows || rows.length === 0) return null;
    return rows[0];
  }

  /**
   * Deactivate device upon logout or uninstall notification
   */
  static async deactivateDevice(userId, deviceId) {
    if (!userId || !deviceId) return false;
    const [res] = await pool.query(
      'UPDATE jarvis_devices SET is_active = 0 WHERE user_id = ? AND device_id = ?',
      [userId, deviceId]
    );
    return res.affectedRows > 0;
  }
}

const defaultDeviceIdentity = new JarvisDeviceIdentity();

module.exports = {
  JarvisDeviceIdentity,
  defaultDeviceIdentity
};
