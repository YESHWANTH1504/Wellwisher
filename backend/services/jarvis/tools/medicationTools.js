const pool = require('../../../config/db');
const { RISK_LEVELS } = require('./toolRegistry');

const medicationTools = [
  {
    name: 'get_medications',
    description: 'Retrieve user prescribed medications, schedule times, and remaining pill counts.',
    category: 'medication',
    permissionKey: 'get_medications',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context) => {
      const [rows] = await pool.query(
        'SELECT * FROM medications WHERE user_id = ? ORDER BY schedule_time ASC',
        [context.userId]
      );
      return {
        count: rows.length,
        medications: rows
      };
    }
  },
  {
    name: 'mark_medication_taken',
    description: 'Record that a prescribed medication pill has been taken (decrements remaining pill counter).',
    category: 'medication',
    permissionKey: 'mark_medication_taken',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['medicationId'],
      properties: {
        medicationId: { type: 'number', description: 'ID of the medication taken' }
      }
    },
    execute: async (context, input) => {
      const id = parseInt(input.medicationId, 10);
      if (!id) throw new Error('Valid numeric medicationId is required.');

      const [result] = await pool.query(
        'UPDATE medications SET remaining_pills = GREATEST(remaining_pills - 1, 0) WHERE id = ? AND user_id = ?',
        [id, context.userId]
      );

      if (result.affectedRows === 0) {
        throw new Error(`Medication record #${id} not found or not owned by user.`);
      }

      return {
        medicationId: id,
        message: `Successfully recorded pill intake for medication #${id}.`
      };
    }
  }
];

module.exports = medicationTools;
