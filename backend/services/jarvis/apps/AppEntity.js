/**
 * AppEntity
 * Represents an installed Android application or application-level entity.
 */
class AppEntity {
  constructor({
    packageName,
    canonicalName,
    aliases = [],
    isLaunchable = true,
    supportedActions = ['OPEN'],
    permissions = []
  }) {
    this.packageName = packageName;
    this.canonicalName = canonicalName;
    this.aliases = aliases;
    this.isLaunchable = isLaunchable;
    this.supportedActions = supportedActions;
    this.permissions = permissions;
  }
}

module.exports = AppEntity;
