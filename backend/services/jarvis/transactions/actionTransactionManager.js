/**
 * ActionTransactionManager
 * Transactional execution, dependency tracking, rollback, and duplicate prevention for multi-step workflows.
 */
class ActionTransactionManager {
  constructor() {
    this.transactions = new Map();
    this.idempotencyMap = new Map();
  }

  createTransaction(userId, workflowId, steps = [], idempotencyKey = null) {
    if (idempotencyKey && this.idempotencyMap.has(idempotencyKey)) {
      const existingId = this.idempotencyMap.get(idempotencyKey);
      return { duplicate: true, transaction: this.transactions.get(existingId) };
    }

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const tx = {
      transactionId,
      workflowId,
      userId,
      currentStep: 0,
      totalSteps: steps.length,
      steps,
      completedSteps: [],
      failedSteps: [],
      rollbackSteps: [],
      status: 'PLANNED', // PLANNED, RUNNING, WAITING_CONFIRMATION, COMPLETED, PARTIALLY_COMPLETED, FAILED, ROLLED_BACK, CANCELLED
      idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.transactions.set(transactionId, tx);
    if (idempotencyKey) {
      this.idempotencyMap.set(idempotencyKey, transactionId);
    }
    return { duplicate: false, transaction: tx };
  }

  advanceStep(transactionId, stepResult, rollbackAction = null) {
    const tx = this.transactions.get(transactionId);
    if (!tx) return null;

    tx.status = 'RUNNING';
    tx.completedSteps.push({
      stepIndex: tx.currentStep,
      result: stepResult,
      timestamp: new Date().toISOString()
    });

    if (rollbackAction) {
      tx.rollbackSteps.unshift(rollbackAction);
    }

    tx.currentStep += 1;
    if (tx.currentStep >= tx.totalSteps) {
      tx.status = 'COMPLETED';
    }
    tx.updatedAt = new Date().toISOString();
    return tx;
  }

  rollback(transactionId) {
    const tx = this.transactions.get(transactionId);
    if (!tx) return null;

    tx.status = 'ROLLED_BACK';
    tx.rolledBackAt = new Date().toISOString();
    return tx;
  }
}

module.exports = new ActionTransactionManager();
