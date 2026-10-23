const pool = require('../../../config/db');
const { STANDARD_CAPABILITY_CATALOG, CAPABILITY_STATUS } = require('./JarvisAppCapabilityContract');

/**
 * JarvisAndroidAppRegistry
 * Authoritative registry of installed Android applications and their capabilities.
 * Resolves natural language references, tracks capability availability,
 * and maintains persistent metadata in MySQL.
 */
class JarvisAndroidAppRegistry {
  constructor() {
    this._appCache = new Map(); // key: packageName -> appInfo
    this._aliasIndex = new Map(); // key: normalized alias -> packageName
    this._capabilitiesByPkg = new Map(); // key: packageName -> List<Contract>
    this._seedStandardCatalog();
  }

  _seedStandardCatalog() {
    // Seed standard known Android applications and contracts
    const standardApps = [
      {
        packageName: 'com.whatsapp',
        applicationLabel: 'WhatsApp',
        aliases: ['whatsapp', 'whats app', 'wa', 'watsapp', 'my chat', 'chat app'],
        systemApp: false,
        launchable: true,
        confidence: 0.98
      },
      {
        packageName: 'com.google.android.apps.maps',
        applicationLabel: 'Google Maps',
        aliases: ['maps', 'google maps', 'google map', 'navigation', 'directions', 'gps'],
        systemApp: true,
        launchable: true,
        confidence: 0.98
      },
      {
        packageName: 'com.android.chrome',
        applicationLabel: 'Chrome',
        aliases: ['chrome', 'google chrome', 'browser', 'internet', 'web', 'web browser'],
        systemApp: true,
        launchable: true,
        confidence: 0.98
      },
      {
        packageName: 'com.google.android.youtube',
        applicationLabel: 'YouTube',
        aliases: ['youtube', 'you tube', 'yt', 'videos'],
        systemApp: true,
        launchable: true,
        confidence: 0.98
      },
      {
        packageName: 'com.android.settings',
        applicationLabel: 'Settings',
        aliases: ['settings', 'system settings', 'phone settings', 'device settings', 'options'],
        systemApp: true,
        launchable: true,
        confidence: 0.98
      },
      {
        packageName: 'com.android.camera',
        applicationLabel: 'Camera',
        aliases: ['camera', 'cam', 'take photo', 'take picture', 'viewfinder'],
        systemApp: true,
        launchable: true,
        confidence: 0.98
      },
      {
        packageName: 'com.android.dialer',
        applicationLabel: 'Phone',
        aliases: ['phone', 'dialer', 'telephone', 'phone dialer', 'call app'],
        systemApp: true,
        launchable: true,
        confidence: 0.98
      },
      {
        packageName: 'com.google.android.apps.messaging',
        applicationLabel: 'Messages',
        aliases: ['messages', 'message', 'messaging', 'sms', 'texts', 'texting', 'my messages'],
        systemApp: true,
        launchable: true,
        confidence: 0.98
      },
      {
        packageName: 'com.spotify.music',
        applicationLabel: 'Spotify',
        aliases: ['spotify', 'music app', 'music player', 'spotify music'],
        systemApp: false,
        launchable: true,
        confidence: 0.95
      },
      {
        packageName: 'com.google.android.apps.photos',
        applicationLabel: 'Google Photos',
        aliases: ['photos', 'google photos', 'gallery', 'photo gallery', 'pictures'],
        systemApp: true,
        launchable: true,
        confidence: 0.95
      },
      {
        packageName: 'com.google.android.deskclock',
        applicationLabel: 'Clock',
        aliases: ['clock', 'alarms', 'alarm app', 'stopwatch', 'timer'],
        systemApp: true,
        launchable: true,
        confidence: 0.95
      },
      {
        packageName: 'com.google.android.calculator',
        applicationLabel: 'Calculator',
        aliases: ['calculator', 'calc'],
        systemApp: true,
        launchable: true,
        confidence: 0.95
      },
      {
        packageName: 'com.google.android.gm',
        applicationLabel: 'Gmail',
        aliases: ['gmail', 'google mail', 'email', 'mail'],
        systemApp: true,
        launchable: true,
        confidence: 0.95
      },
      {
        packageName: 'com.google.android.calendar',
        applicationLabel: 'Calendar',
        aliases: ['calendar', 'my calendar', 'google calendar', 'agenda'],
        systemApp: true,
        launchable: true,
        confidence: 0.98
      },
      {
        packageName: 'com.google.android.documentsui',
        applicationLabel: 'Files',
        aliases: ['files', 'my files', 'file manager', 'documents', 'docs'],
        systemApp: true,
        launchable: true,
        confidence: 0.95
      },
      {
        packageName: 'com.instagram.android',
        applicationLabel: 'Instagram',
        aliases: ['instagram', 'insta', 'ig'],
        systemApp: false,
        launchable: true,
        confidence: 0.95
      },
      {
        packageName: 'org.telegram.messenger',
        applicationLabel: 'Telegram',
        aliases: ['telegram', 'tg'],
        systemApp: false,
        launchable: true,
        confidence: 0.95
      },
      {
        packageName: 'com.example.wellwisher',
        applicationLabel: 'WellWisher JARVIS',
        aliases: ['wellwisher', 'well wisher', 'jarvis', 'assistant'],
        systemApp: false,
        launchable: true,
        confidence: 1.0
      }
    ];

    for (const app of standardApps) {
      this._registerAppInternal(app);
    }

    // Attach capability contracts
    for (const contract of STANDARD_CAPABILITY_CATALOG) {
      if (contract.appPackage) {
        if (!this._capabilitiesByPkg.has(contract.appPackage)) {
          this._capabilitiesByPkg.set(contract.appPackage, []);
        }
        this._capabilitiesByPkg.get(contract.appPackage).push(contract);
      }
    }
  }

  _registerAppInternal(appData) {
    const pkg = appData.packageName;
    this._appCache.set(pkg, {
      ...appData,
      installed: appData.installed ?? true,
      lastScanned: Date.now()
    });

    // Index canonical label
    const labelKey = this._normalize(appData.applicationLabel);
    if (labelKey) this._aliasIndex.set(labelKey, pkg);

    // Index package name
    this._aliasIndex.set(this._normalize(pkg), pkg);

    // Index aliases
    if (Array.isArray(appData.aliases)) {
      for (const alias of appData.aliases) {
        const norm = this._normalize(alias);
        if (norm) this._aliasIndex.set(norm, pkg);
      }
    }
  }

  _normalize(text = '') {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  }

  /**
   * Register or update an installed application dynamically
   */
  async registerApplication(userId, appInfo) {
    if (!appInfo || !appInfo.packageName) {
      throw new Error('registerApplication requires packageName');
    }

    this._registerAppInternal(appInfo);

    if (userId) {
      const id = `app_${userId}_${appInfo.packageName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      try {
        await pool.query(
          `INSERT INTO jarvis_applications (
            id, user_id, package_name, application_label, version_name, version_code,
            launchable, system_app, permissions, supported_capabilities, aliases,
            confidence, provenance, last_scanned_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            application_label = VALUES(application_label),
            version_name = VALUES(version_name),
            version_code = VALUES(version_code),
            launchable = VALUES(launchable),
            system_app = VALUES(system_app),
            permissions = VALUES(permissions),
            supported_capabilities = VALUES(supported_capabilities),
            aliases = VALUES(aliases),
            last_scanned_at = CURRENT_TIMESTAMP`,
          [
            id,
            userId,
            appInfo.packageName,
            appInfo.applicationLabel || appInfo.packageName,
            appInfo.versionName || null,
            appInfo.versionCode || null,
            appInfo.launchable !== false ? 1 : 0,
            appInfo.systemApp ? 1 : 0,
            JSON.stringify(appInfo.permissions || []),
            JSON.stringify(appInfo.supportedCapabilities || []),
            JSON.stringify(appInfo.aliases || []),
            appInfo.confidence || 1.0,
            appInfo.provenance || 'DYNAMIC_REGISTRATION'
          ]
        );
      } catch (err) {
        // Log and continue without crashing in-memory registry
        console.warn(`[JarvisAndroidAppRegistry] DB persistence warning: ${err.message}`);
      }
    }

    return this.getApplication(appInfo.packageName);
  }

  /**
   * Resolve natural language text into a concrete application
   */
  resolveApp(rawUtterance, context = {}) {
    if (!rawUtterance || typeof rawUtterance !== 'string') {
      return { resolved: false, confidence: 0 };
    }

    // Security guard: Reject command chaining and shell injection characters
    if (/[;&|`$\n\r\t]/.test(rawUtterance)) {
      return {
        resolved: false,
        isInstalled: false,
        confidence: 0,
        error: 'MALICIOUS_INPUT_DETECTED',
        reason: 'Input contains prohibited command execution characters'
      };
    }

    const trimmed = rawUtterance.trim();
    const lower = trimmed.toLowerCase();

    // Contextual references ("the app I was using", "previous app")
    if (/(?:the\s+app\s+i\s+was\s+using|previous\s+app|last\s+app|recent\s+app)/i.test(lower)) {
      const prev = context.previousApp || (context.recentApps && context.recentApps[0]);
      if (prev) {
        const pkg = typeof prev === 'string' ? prev : prev.packageName;
        const app = this._appCache.get(pkg);
        return {
          resolved: true,
          isInstalled: app ? app.installed !== false : true,
          appName: app ? app.applicationLabel : (prev.applicationLabel || pkg),
          packageName: pkg,
          confidence: 0.95,
          matchType: 'CONTEXT_PREVIOUS_APP',
          app
        };
      }
    }

    // Remove common action prefixes
    const appActionPrefixes = [
      /^(?:please\s+)?(?:can\s+you\s+)?(?:go\s+to|take\s+me\s+to|open|launch|start|bring\s+up|switch\s+to|show\s+me|i\s+want\s+to\s+use)\s+(?:my\s+|the\s+)?/i,
      /^(?:run|access)\s+(?:my\s+|the\s+)?/i
    ];

    let candidateName = '';
    let hasActionPrefix = false;

    for (const prefix of appActionPrefixes) {
      if (prefix.test(lower)) {
        hasActionPrefix = true;
        candidateName = lower.replace(prefix, '').replace(/\s+(?:app|application)$/i, '').trim();
        break;
      }
    }

    if (!hasActionPrefix) {
      candidateName = lower.replace(/\s+(?:app|application)$/i, '').trim();
    }

    const norm = this._normalize(candidateName);

    // 1. Direct Alias Index Match
    if (this._aliasIndex.has(norm)) {
      const pkg = this._aliasIndex.get(norm);
      const app = this._appCache.get(pkg);
      return {
        resolved: true,
        isInstalled: app.installed !== false,
        appName: app.applicationLabel,
        packageName: app.packageName,
        confidence: hasActionPrefix ? 0.98 : 0.88,
        matchType: 'ALIAS_EXACT',
        app
      };
    }

    // 2. Fuzzy / Substring Check
    for (const [alias, pkg] of this._aliasIndex.entries()) {
      if (norm.length >= 3 && alias.length >= 3 && (alias.includes(norm) || norm.includes(alias))) {
        const app = this._appCache.get(pkg);
        return {
          resolved: true,
          isInstalled: app.installed !== false,
          appName: app.applicationLabel,
          packageName: app.packageName,
          confidence: hasActionPrefix ? 0.90 : 0.75,
          matchType: 'ALIAS_FUZZY',
          app
        };
      }
    }

    // 3. Fallback for Explicit Non-Cataloged Package or App Name
    if (hasActionPrefix && candidateName.length > 2) {
      const sanitized = candidateName.replace(/[^a-z0-9._]/g, '');
      const guessedPkg = sanitized.includes('.') ? sanitized : `com.${sanitized}`;
      return {
        resolved: true,
        isInstalled: false, // Explicitly false for uncataloged apps (avoids false success)
        appName: candidateName,
        packageName: guessedPkg,
        confidence: 0.60,
        matchType: 'UNCATALOGED_FALLBACK'
      };
    }

    return { resolved: false, confidence: 0 };
  }

  /**
   * Get application by package name
   */
  getApplication(packageName) {
    return this._appCache.get(packageName) || null;
  }

  /**
   * List all registered applications
   */
  listApplications(filter = {}) {
    let list = Array.from(this._appCache.values());
    if (filter.installedOnly) {
      list = list.filter(a => a.installed !== false);
    }
    if (filter.launchableOnly) {
      list = list.filter(a => a.launchable !== false);
    }
    return list;
  }

  /**
   * Get capability contracts provided by an application
   */
  getCapabilitiesForPackage(packageName) {
    return this._capabilitiesByPkg.get(packageName) || [];
  }

  /**
   * Find applications providing a specific capability action (e.g. 'COMMUNICATION.MESSAGE')
   */
  findAppsProvidingAction(action) {
    const results = [];
    for (const [pkg, contracts] of this._capabilitiesByPkg.entries()) {
      const matching = contracts.filter(c => c.action === action);
      if (matching.length > 0) {
        const app = this.getApplication(pkg);
        results.push({ app, capabilities: matching });
      }
    }
    return results;
  }

  /**
   * Invalidate or mark application as uninstalled
   */
  markUninstalled(packageName) {
    if (this._appCache.has(packageName)) {
      const app = this._appCache.get(packageName);
      app.installed = false;
      return true;
    }
    return false;
  }

  /**
   * Bulk sync discovered applications from Android device scan
   */
  async syncDiscoveredApplications(userId, appList = []) {
    const results = [];
    for (const app of appList) {
      if (!app || !app.packageName) continue;
      const registered = await this.registerApplication(userId, {
        packageName: app.packageName,
        applicationLabel: app.appName || app.applicationLabel || app.packageName,
        versionName: app.versionName || null,
        versionCode: app.versionCode || null,
        launchable: app.isLaunchable ?? app.launchable ?? true,
        systemApp: Boolean(app.systemApp),
        permissions: app.permissions || [],
        confidence: 1.0,
        provenance: 'ANDROID_PACKAGE_SCAN'
      });
      results.push(registered);
    }
    return results;
  }
}

const defaultAppRegistry = new JarvisAndroidAppRegistry();

module.exports = {
  JarvisAndroidAppRegistry,
  defaultAppRegistry
};
