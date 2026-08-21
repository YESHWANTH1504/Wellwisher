const pool = require('../../config/db');

const VALID_RUN_STATUSES = [
  'PLANNED',
  'RUNNING',
  'WAITING_FOR_CONFIRMATION',
  'COMPLETED',
  'FAILED',
  'PARTIALLY_COMPLETED',
  'CANCELLED'
];

const VALID_STEP_STATUSES = [
  'PLANNED',
  'RUNNING',
  'WAITING_FOR_CONFIRMATION',
  'COMPLETED',
  'FAILED',
  'SKIPPED'
];

class AiAgentRunRepository {
  /**
   * Create a new agent execution run
   */
  static async createRun(userId, { id, conversationId, request, metadata } = {}) {
    if (!userId) throw new Error('userId is required');
    if (!request) throw new Error('request description is required');

    const runId = id || `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    await pool.query(
      `INSERT INTO ai_agent_runs (id, user_id, conversation_id, request, status, metadata)
       VALUES (?, ?, ?, ?, 'PLANNED', ?)`,
      [runId, userId, conversationId || null, request.trim(), metadataJson]
    );

    return {
      id: runId,
      userId,
      conversationId: conversationId || null,
      request: request.trim(),
      status: 'PLANNED',
      startedAt: new Date().toISOString()
    };
  }

  /**
   * Get agent run by ID with user isolation check
   */
  static async getRunById(id, userId) {
    if (!id || !userId) throw new Error('id and userId are required');

    const [rows] = await pool.query(
      `SELECT * FROM ai_agent_runs WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, userId]
    );
    return rows[0] || null;
  }

  /**
   * Get all runs for a user
   */
  static async getRunsByUser(userId, { limit = 20 } = {}) {
    if (!userId) throw new Error('userId is required');

    const [rows] = await pool.query(
      `SELECT * FROM ai_agent_runs WHERE user_id = ? ORDER BY started_at DESC LIMIT ?`,
      [userId, parseInt(limit, 10) || 20]
    );
    return rows;
  }

  /**
   * Update agent run status and completion timestamp
   */
  static async updateRunStatus(id, userId, { status, errorMessage, metadata } = {}) {
    if (!id || !userId) throw new Error('id and userId are required');

    if (status && !VALID_RUN_STATUSES.includes(status)) {
      throw new Error(`Invalid run status: ${status}. Must be one of: ${VALID_RUN_STATUSES.join(', ')}`);
    }

    const isTerminal = ['COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED', 'CANCELLED'].includes(status);
    const completedAtSql = isTerminal ? 'NOW()' : 'NULL';
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    const [result] = await pool.query(
      `UPDATE ai_agent_runs 
       SET status = COALESCE(?, status), 
           error_message = ?, 
           metadata = COALESCE(?, metadata),
           completed_at = ${isTerminal ? 'COALESCE(completed_at, NOW())' : 'completed_at'}
       WHERE id = ? AND user_id = ?`,
      [status || null, errorMessage || null, metadataJson, id, userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * Add a planned step to an agent run
   */
  static async addStep(userId, { id, agentRunId, stepNumber, toolName, status = 'PLANNED', inputJson } = {}) {
    if (!userId || !agentRunId || !toolName) throw new Error('userId, agentRunId, and toolName are required');

    // Verify run ownership
    const run = await this.getRunById(agentRunId, userId);
    if (!run) throw new Error('Agent run not found or not owned by user');

    const stepId = id || `step_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const inputStr = inputJson ? JSON.stringify(inputJson) : null;

    await pool.query(
      `INSERT INTO ai_agent_steps (id, agent_run_id, user_id, step_number, tool_name, status, input_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [stepId, agentRunId, userId, parseInt(stepNumber, 10) || 1, toolName.trim(), status, inputStr]
    );

    return {
      id: stepId,
      agentRunId,
      userId,
      stepNumber: parseInt(stepNumber, 10) || 1,
      toolName: toolName.trim(),
      status,
      startedAt: new Date().toISOString()
    };
  }

  /**
   * Update step status and record output/error
   */
  static async updateStep(id, userId, { status, outputJson, errorMessage } = {}) {
    if (!id || !userId) throw new Error('id and userId are required');

    if (status && !VALID_STEP_STATUSES.includes(status)) {
      throw new Error(`Invalid step status: ${status}. Must be one of: ${VALID_STEP_STATUSES.join(', ')}`);
    }

    const isTerminal = ['COMPLETED', 'FAILED', 'SKIPPED'].includes(status);
    const outputStr = outputJson ? JSON.stringify(outputJson) : null;

    const [result] = await pool.query(
      `UPDATE ai_agent_steps 
       SET status = COALESCE(?, status),
           output_json = COALESCE(?, output_json),
           error_message = ?,
           completed_at = ${isTerminal ? 'COALESCE(completed_at, NOW())' : 'completed_at'}
       WHERE id = ? AND user_id = ?`,
      [status || null, outputStr, errorMessage || null, id, userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * Get all execution steps for an agent run
   */
  static async getStepsByRunId(agentRunId, userId) {
    if (!agentRunId || !userId) throw new Error('agentRunId and userId are required');

    // Check parent run ownership
    const run = await this.getRunById(agentRunId, userId);
    if (!run) return [];

    const [rows] = await pool.query(
      `SELECT * FROM ai_agent_steps WHERE agent_run_id = ? AND user_id = ? ORDER BY step_number ASC`,
      [agentRunId, userId]
    );
    return rows;
  }
}

module.exports = {
  AiAgentRunRepository,
  VALID_RUN_STATUSES,
  VALID_STEP_STATUSES
};
