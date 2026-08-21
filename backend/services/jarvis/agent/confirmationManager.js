const crypto = require('node:crypto');

class ConfirmationManager {
  constructor() {
    this._tokens = new Map();
  }

  _hashArguments(args = {}) {
    const sorted = JSON.stringify(args, Object.keys(args).sort());
    return crypto.createHash('sha256').update(sorted).digest('hex');
  }

  /**
   * Issue a short-lived, single-use confirmation token for a pending high-risk action
   */
  createToken({ userId, agentRunId, tool, arguments: toolArgs, ttlMinutes = 5 }) {
    if (!userId || !tool) {
      throw new Error('userId and tool are required to create a confirmation token.');
    }

    const confirmationId = `conf_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
    const argsHash = this._hashArguments(toolArgs || {});

    const record = {
      confirmationId,
      userId,
      agentRunId: agentRunId || null,
      tool,
      arguments: toolArgs || {},
      argsHash,
      expiresAt,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    this._tokens.set(confirmationId, record);
    return record;
  }

  /**
   * Validate and consume a confirmation token
   */
  validateAndConsume(confirmationId, userId, expectedTool, expectedArgs = {}) {
    if (!confirmationId || !userId) {
      return { valid: false, errorCode: 'INVALID_CONFIRMATION', message: 'Confirmation token and userId are required.' };
    }

    const record = this._tokens.get(confirmationId);
    if (!record) {
      return { valid: false, errorCode: 'INVALID_CONFIRMATION', message: 'Confirmation token not found or already consumed.' };
    }

    // 1. User Scope Check
    if (record.userId !== userId) {
      return { valid: false, errorCode: 'UNAUTHORIZED_CONFIRMATION', message: 'Confirmation token belongs to another user.' };
    }

    // 2. Expiration Check
    if (Date.now() > record.expiresAt || record.status === 'EXPIRED') {
      record.status = 'EXPIRED';
      return { valid: false, errorCode: 'CONFIRMATION_EXPIRED', message: 'Confirmation token has expired. Please initiate the request again.' };
    }

    // 3. Status Check
    if (record.status !== 'PENDING') {
      return { valid: false, errorCode: 'CONFIRMATION_ALREADY_USED', message: 'Confirmation token has already been consumed.' };
    }

    // 4. Tool & Arguments Binding Check
    if (expectedTool && record.tool !== expectedTool) {
      return { valid: false, errorCode: 'CONFIRMATION_TOOL_MISMATCH', message: 'Confirmation token is not valid for this tool action.' };
    }

    const expectedHash = this._hashArguments(expectedArgs || {});
    if (expectedArgs && Object.keys(expectedArgs).length > 0 && record.argsHash !== expectedHash) {
      return { valid: false, errorCode: 'CONFIRMATION_ARGUMENTS_MISMATCH', message: 'Confirmation arguments do not match original request.' };
    }

    // Mark as USED immediately (single-use guarantee)
    record.status = 'USED';
    return {
      valid: true,
      tokenRecord: record
    };
  }

  getToken(confirmationId) {
    return this._tokens.get(confirmationId) || null;
  }
}

const confirmationManager = new ConfirmationManager();

module.exports = {
  ConfirmationManager,
  confirmationManager
};
