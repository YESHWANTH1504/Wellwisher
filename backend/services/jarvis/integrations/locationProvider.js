class LocationProvider {
  /**
   * Privacy-first location abstraction (no continuous tracking by default)
   */
  async getCurrentLocation(userId) {
    return { available: false, reason: 'LOCATION_TRACKING_DISABLED_BY_DEFAULT' };
  }

  async getPermissionStatus(userId) {
    return { granted: false, status: 'DENIED' };
  }

  async isLocationAvailable() {
    return false;
  }
}

module.exports = {
  LocationProvider,
  defaultLocationProvider: new LocationProvider()
};
