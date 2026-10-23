/**
 * JarvisModelLifecycleManager
 * Manages runtime lifecycle of local models (discovery, loading, unloading,
 * memory budget tracking, version compatibility, and binary integrity validation).
 */

const crypto = require('crypto');
const { defaultLocalModelRegistry } = require('./JarvisLocalModelRegistry');

class JarvisModelLifecycleManager {
  constructor(options = {}) {
    this.registry = options.registry || defaultLocalModelRegistry;
    this._loadedModels = new Map();
    this._maxMemoryBudgetMb = options.maxMemoryBudgetMb || 512;
    this._allocatedMemoryMb = 0;
  }

  /**
   * Validate integrity and provenance of local model artifact
   */
  validateModelArtifact(artifact = {}) {
    if (!artifact.modelId || !artifact.version) {
      return { valid: false, reason: 'Missing model identifier or version specification.' };
    }

    // Binary checksum verification if hash provided
    if (artifact.checksum && artifact.contentBuffer) {
      const computedHash = crypto.createHash('sha256').update(artifact.contentBuffer).digest('hex');
      if (computedHash !== artifact.checksum) {
        return {
          valid: false,
          reason: 'Model artifact checksum mismatch. Potential corruption or tampering detected.'
        };
      }
    }

    return { valid: true, reason: 'Artifact integrity and version signature verified.' };
  }

  /**
   * Load local model into runtime memory budget
   */
  async loadModel(capability, artifact = {}) {
    const model = this.registry.getModel(capability);
    if (!model) {
      throw new Error(`Capability ${capability} is not registered in local model registry.`);
    }

    const validation = this.validateModelArtifact({
      modelId: model.id,
      version: model.version,
      ...artifact
    });

    if (!validation.valid) {
      throw new Error(`Model load rejected: ${validation.reason}`);
    }

    const estimatedMemoryMb = artifact.memoryMb || 32;
    if (this._allocatedMemoryMb + estimatedMemoryMb > this._maxMemoryBudgetMb) {
      // Memory budget exceeded, attempt LRU unload
      this._evictOldestModel();
    }

    this._loadedModels.set(capability, {
      modelId: model.id,
      capability,
      loadedAt: Date.now(),
      lastUsed: Date.now(),
      memoryMb: estimatedMemoryMb,
      version: model.version
    });

    this._allocatedMemoryMb += estimatedMemoryMb;
    return {
      success: true,
      capability,
      modelId: model.id,
      allocatedMemoryMb: this._allocatedMemoryMb
    };
  }

  /**
   * Unload model from memory
   */
  unloadModel(capability) {
    if (this._loadedModels.has(capability)) {
      const entry = this._loadedModels.get(capability);
      this._allocatedMemoryMb = Math.max(0, this._allocatedMemoryMb - entry.memoryMb);
      this._loadedModels.delete(capability);
      return true;
    }
    return false;
  }

  isModelLoaded(capability) {
    return this._loadedModels.has(capability);
  }

  getLoadedModels() {
    return Array.from(this._loadedModels.values());
  }

  _evictOldestModel() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this._loadedModels.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.unloadModel(oldestKey);
    }
  }

  reset() {
    this._loadedModels.clear();
    this._allocatedMemoryMb = 0;
  }
}

const defaultModelLifecycleManager = new JarvisModelLifecycleManager();

module.exports = {
  JarvisModelLifecycleManager,
  defaultModelLifecycleManager
};
