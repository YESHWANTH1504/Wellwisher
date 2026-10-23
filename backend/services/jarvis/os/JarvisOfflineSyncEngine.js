/**
 * JarvisOfflineSyncEngine
 * Coordinates safe, idempotent background synchronization when network connectivity restores.
 */

const { defaultOfflineOperationQueue, QUEUE_STATUS } = require('./JarvisOfflineOperationQueue');
const { defaultNetworkState } = require('./JarvisNetworkState');

class JarvisOfflineSyncEngine {
  constructor(options = {}) {
    this.queue = options.queue || defaultOfflineOperationQueue;
    this.networkState = options.networkState || defaultNetworkState;
    this._isSyncing = false;
    this._syncListeners = new Set();
  }

  /**
   * Run synchronization pass for a user
   * @param {number|string} userId
   * @param {Object} options
   */
  async synchronize(userId, options = {}) {
    if (!userId) throw new Error('JarvisOfflineSyncEngine requires userId');

    // 1. Check network connectivity
    if (this.networkState.isOffline()) {
      return {
        synced: false,
        reason: 'Cannot synchronize while offline.',
        processedCount: 0
      };
    }

    if (this._isSyncing) {
      return {
        synced: false,
        reason: 'Sync already in progress.',
        processedCount: 0
      };
    }

    this._isSyncing = true;
    this._emitSyncEvent('SYNC_STARTED', { userId });

    const maxRetries = options.maxRetries || 3;
    let successCount = 0;
    let failureCount = 0;

    try {
      const pending = await this.queue.getPendingOperations(userId, options.batchSize || 20);

      for (const item of pending) {
        if (item.retry_count >= maxRetries) {
          await this.queue.markFailed(item.id, `Exceeded max retry attempts (${maxRetries}).`);
          failureCount++;
          continue;
        }

        try {
          // Process safe sync operation (dispatch metadata / telemetry)
          await this._dispatchSyncItem(item);
          await this.queue.markSynced(item.id);
          successCount++;
        } catch (err) {
          await this.queue.markFailed(item.id, err.message);
          failureCount++;
        }
      }

      this._emitSyncEvent('SYNC_COMPLETED', {
        userId,
        successCount,
        failureCount
      });

      return {
        synced: true,
        processedCount: pending.length,
        successCount,
        failureCount
      };
    } catch (err) {
      this._emitSyncEvent('SYNC_FAILED', { userId, error: err.message });
      throw err;
    } finally {
      this._isSyncing = false;
    }
  }

  async _dispatchSyncItem(item) {
    // Simulated remote sync dispatch based on operation
    // Idempotency ensured by unique item.id and idempotency_key
    if (item.operation === 'SYNC_TELEMETRY' || item.operation === 'SYNC_FEEDBACK') {
      // In a live system, this dispatches telemetry or proactive feedback updates
      return { status: 'DISPATCHED', key: item.idempotency_key };
    }
    return { status: 'ACKNOWLEDGED', key: item.idempotency_key };
  }

  addSyncListener(listener) {
    if (typeof listener === 'function') {
      this._syncListeners.add(listener);
    }
  }

  removeSyncListener(listener) {
    this._syncListeners.delete(listener);
  }

  _emitSyncEvent(eventName, payload = {}) {
    const event = { event: eventName, timestamp: Date.now(), payload };
    for (const listener of this._syncListeners) {
      try {
        listener(event);
      } catch (_) {}
    }
  }
}

const defaultOfflineSyncEngine = new JarvisOfflineSyncEngine();

module.exports = {
  JarvisOfflineSyncEngine,
  defaultOfflineSyncEngine
};
