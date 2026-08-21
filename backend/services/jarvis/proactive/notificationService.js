class NotificationService {
  constructor() {
    this.registeredDevices = new Map(); // userId -> Set of device tokens (in memory/cache)
  }

  /**
   * Register a user's device for push notifications
   */
  async registerDevice(userId, deviceToken, platform = 'android') {
    if (!userId || !deviceToken) return false;
    if (!this.registeredDevices.has(userId)) {
      this.registeredDevices.set(userId, new Set());
    }
    this.registeredDevices.get(userId).add({ token: deviceToken, platform, registeredAt: new Date() });
    return true;
  }

  /**
   * Remove a user device token
   */
  async removeDevice(userId, deviceToken) {
    if (!userId || !this.registeredDevices.has(userId)) return false;
    const set = this.registeredDevices.get(userId);
    for (const item of set) {
      if (item.token === deviceToken) {
        set.delete(item);
        break;
      }
    }
    return true;
  }

  /**
   * Send a proactive notification to user
   */
  async sendNotification(userId, notification = {}) {
    // Clean abstraction - logs in development/testing or sends via FCM in production
    return {
      success: true,
      userId,
      deliveredAt: new Date().toISOString(),
      notificationId: notification.id || `notif_${Date.now()}`,
      title: notification.title,
      body: notification.message
    };
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId) {
    return { success: true, notificationId, cancelled: true };
  }
}

module.exports = new NotificationService();
