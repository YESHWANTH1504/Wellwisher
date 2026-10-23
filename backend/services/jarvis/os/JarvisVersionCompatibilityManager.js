/**
 * JarvisVersionCompatibilityManager.js
 * Validates cross-system version compatibility across Mobile App, Backend API,
 * Database Schema, Capability Registry, and Workflow Engine versions.
 * Prevents incompatible clients from communicating with outdated or mismatched backend instances.
 */

const { config } = require('../../../config/productionConfig');

class JarvisVersionCompatibilityManager {
  checkCompatibility(clientAppVersion) {
    const validation = JarvisVersionCompatibilityManager.validateClientCompatibility(clientAppVersion);
    if (!validation.compatible) {
      return {
        compatible: false,
        status: 'UPGRADE_REQUIRED',
        backendVersion: config.version.backendVersion,
        message: validation.reason || 'App upgrade required.'
      };
    }
    return {
      compatible: true,
      status: 'COMPATIBLE',
      backendVersion: config.version.backendVersion,
      clientVersion: clientAppVersion
    };
  }

  isSchemaCompatible(expectedSchema) {
    return expectedSchema <= config.version.databaseSchemaVersion;
  }

  getCapabilityVersion() {
    return config.version.capabilityVersion || '2.0.0';
  }

  static getSystemVersions() {
    return {
      backendVersion: config.version.backendVersion,
      databaseSchemaVersion: config.version.databaseSchemaVersion,
      capabilityVersion: config.version.capabilityVersion,
      workflowVersion: config.version.workflowVersion,
      minSupportedAppVersion: '1.2.0',
      currentAppVersion: config.version.appVersion
    };
  }

  /**
   * Compare semver strings (returns -1, 0, 1)
   */
  static compareVersions(v1, v2) {
    const parts1 = String(v1).split('.').map(n => parseInt(n, 10) || 0);
    const parts2 = String(v2).split('.').map(n => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  /**
   * Validate whether a client app version is compatible with this backend
   */
  static validateClientCompatibility(clientAppVersion) {
    if (!clientAppVersion) {
      return {
        compatible: false,
        reason: 'Client did not provide app version header.'
      };
    }

    const sys = JarvisVersionCompatibilityManager.getSystemVersions();
    const isSupported = JarvisVersionCompatibilityManager.compareVersions(clientAppVersion, sys.minSupportedAppVersion) >= 0;

    if (!isSupported) {
      return {
        compatible: false,
        reason: `Client app version (${clientAppVersion}) is outdated. Minimum required version is ${sys.minSupportedAppVersion}. Please update WellWisher.`,
        minSupportedVersion: sys.minSupportedAppVersion,
        currentAppVersion: clientAppVersion
      };
    }

    return {
      compatible: true,
      backendVersion: sys.backendVersion,
      clientAppVersion
    };
  }
}

const defaultVersionCompatibilityManager = new JarvisVersionCompatibilityManager();

module.exports = {
  JarvisVersionCompatibilityManager,
  defaultVersionCompatibilityManager
};
