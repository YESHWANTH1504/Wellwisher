const pool = require('../../config/db');

class AiWorkflowRepository {
  /**
   * Fetch all appointments for a user, optionally filtered by status or minimum date.
   */
  async getAppointments(userId, { status, minDate } = {}) {
    if (status) {
      const [rows] = await pool.query(
        'SELECT * FROM ai_appointments WHERE user_id = ? AND status = ?',
        [userId, status]
      );
      return rows;
    }
    if (minDate) {
      const [rows] = await pool.query(
        'SELECT * FROM ai_appointments WHERE user_id = ? AND scheduled_at >= ?',
        [userId, minDate]
      );
      return rows;
    }
    const [rows] = await pool.query(
      'SELECT * FROM ai_appointments WHERE user_id = ?',
      [userId]
    );
    return rows;
  }

  /**
   * Fetch a single appointment by ID with strict user isolation.
   */
  async getAppointmentById(userId, appointmentId) {
    const [rows] = await pool.query(
      'SELECT * FROM ai_appointments WHERE id = ? AND user_id = ?',
      [appointmentId, userId]
    );
    return rows.length ? rows[0] : null;
  }

  /**
   * Create a new appointment.
   */
  async createAppointment(userId, {
    id,
    title,
    provider = 'WellWisher Health',
    appointmentType = 'General Consultation',
    scheduledAt,
    location = '',
    status = 'PLANNED',
    doctorName = '',
    notes = '',
    briefingId = null,
    followUpDate = null,
    doctorInstructions = null,
    testsRequested = []
  }) {
    const aptId = id || `apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await pool.query(
      `INSERT INTO ai_appointments 
      (id, user_id, title, provider, appointment_type, scheduled_at, location, status, doctor_name, notes, briefing_id, follow_up_date, doctor_instructions, tests_requested) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        aptId,
        userId,
        title,
        provider,
        appointmentType,
        scheduledAt,
        location,
        status,
        doctorName,
        notes,
        briefingId,
        followUpDate,
        doctorInstructions,
        JSON.stringify(testsRequested)
      ]
    );
    return this.getAppointmentById(userId, aptId);
  }

  /**
   * Update appointment details.
   */
  async updateAppointment(userId, appointmentId, updates = {}) {
    const existing = await this.getAppointmentById(userId, appointmentId);
    if (!existing) return null;

    if (updates.status && updates.briefingId !== undefined) {
      await pool.query(
        'UPDATE ai_appointments SET status = ?, briefing_id = ? WHERE id = ? AND user_id = ?',
        [updates.status, updates.briefingId, appointmentId, userId]
      );
    } else if (updates.status && updates.doctorInstructions !== undefined) {
      await pool.query(
        'UPDATE ai_appointments SET status = ?, doctor_instructions = ?, follow_up_date = ?, tests_requested = ? WHERE id = ? AND user_id = ?',
        [
          updates.status,
          updates.doctorInstructions,
          updates.followUpDate || null,
          JSON.stringify(updates.testsRequested || []),
          appointmentId,
          userId
        ]
      );
    } else if (updates.status) {
      await pool.query(
        'UPDATE ai_appointments SET status = ? WHERE id = ? AND user_id = ?',
        [updates.status, appointmentId, userId]
      );
    } else {
      await pool.query(
        `UPDATE ai_appointments SET 
        title = ?, provider = ?, appointment_type = ?, scheduled_at = ?, location = ?, status = ?, doctor_name = ?, notes = ? 
        WHERE id = ? AND user_id = ?`,
        [
          updates.title || existing.title,
          updates.provider || existing.provider,
          updates.appointmentType || existing.appointment_type,
          updates.scheduledAt || existing.scheduled_at,
          updates.location || existing.location,
          updates.status || existing.status,
          updates.doctorName || existing.doctor_name,
          updates.notes || existing.notes,
          appointmentId,
          userId
        ]
      );
    }
    return this.getAppointmentById(userId, appointmentId);
  }

  /**
   * Delete an appointment.
   */
  async deleteAppointment(userId, appointmentId) {
    const [result] = await pool.query(
      'DELETE FROM ai_appointments WHERE id = ? AND user_id = ?',
      [appointmentId, userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Complete appointment recording user-entered doctor instructions.
   */
  async completeAppointment(userId, appointmentId, {
    doctorInstructions = '',
    followUpDate = null,
    testsRequested = []
  } = {}) {
    await pool.query(
      'UPDATE ai_appointments SET status = ?, doctor_instructions = ?, follow_up_date = ?, tests_requested = ? WHERE id = ? AND user_id = ?',
      [
        'COMPLETED',
        doctorInstructions,
        followUpDate,
        JSON.stringify(testsRequested),
        appointmentId,
        userId
      ]
    );
    return this.getAppointmentById(userId, appointmentId);
  }

  /**
   * Fetch workflow actions for a user.
   */
  async getWorkflowActions(userId, { status } = {}) {
    if (status) {
      const [rows] = await pool.query(
        'SELECT * FROM ai_workflow_actions WHERE user_id = ? AND status = ?',
        [userId, status]
      );
      return rows;
    }
    const [rows] = await pool.query(
      'SELECT * FROM ai_workflow_actions WHERE user_id = ?',
      [userId]
    );
    return rows;
  }

  /**
   * Fetch single workflow action by ID.
   */
  async getWorkflowActionById(userId, actionId) {
    const [rows] = await pool.query(
      'SELECT * FROM ai_workflow_actions WHERE id = ? AND user_id = ?',
      [actionId, userId]
    );
    return rows.length ? rows[0] : null;
  }

  /**
   * Create a new workflow action record.
   */
  async createWorkflowAction(userId, {
    id,
    actionType,
    entityType,
    entityId = null,
    status = 'PENDING',
    requiresConfirmation = true,
    confirmationId = null,
    payload = {},
    result = null
  }) {
    const actionId = id || `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await pool.query(
      `INSERT INTO ai_workflow_actions 
      (id, user_id, action_type, entity_type, entity_id, status, requires_confirmation, confirmation_id, payload, result) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actionId,
        userId,
        actionType,
        entityType,
        entityId,
        status,
        requiresConfirmation ? 1 : 0,
        confirmationId,
        JSON.stringify(payload),
        JSON.stringify(result)
      ]
    );
    return this.getWorkflowActionById(userId, actionId);
  }

  /**
   * Update workflow action status.
   */
  async updateWorkflowActionStatus(userId, actionId, status, result = null) {
    if (result) {
      await pool.query(
        'UPDATE ai_workflow_actions SET status = ?, result = ?, completed_at = NOW() WHERE id = ? AND user_id = ?',
        [status, JSON.stringify(result), actionId, userId]
      );
    } else {
      await pool.query(
        'UPDATE ai_workflow_actions SET status = ? WHERE id = ? AND user_id = ?',
        [status, actionId, userId]
      );
    }
    return this.getWorkflowActionById(userId, actionId);
  }

  /**
   * Fetch pending workflow actions requiring user attention or confirmation.
   */
  async getPendingActions(userId) {
    return this.getWorkflowActions(userId, { status: 'PENDING' });
  }

  /**
   * Clear all workflow records for a user.
   */
  async clearAll(userId) {
    await pool.query('DELETE FROM ai_appointments WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM ai_workflow_actions WHERE user_id = ?', [userId]);
  }
}

module.exports = new AiWorkflowRepository();
