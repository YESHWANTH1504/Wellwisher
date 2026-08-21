const pool = require('../../../config/db');
const { RISK_LEVELS } = require('./toolRegistry');

const familyTools = [
  {
    name: 'get_family_members',
    description: 'Retrieve the list of linked family members, caregivers, and connection statuses.',
    category: 'family',
    permissionKey: 'get_family',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context) => {
      const [rows] = await pool.query(
        'SELECT id, member_name, relation, status, created_at FROM family_members WHERE user_id = ?',
        [context.userId]
      );
      return {
        count: rows.length,
        familyMembers: rows
      };
    }
  },
  {
    name: 'send_family_notification',
    description: 'Send a care nudge or message to a designated family member/caregiver (Requires explicit confirmation).',
    category: 'family',
    permissionKey: 'send_family_notification',
    riskLevel: RISK_LEVELS.HIGH,
    requiresConfirmation: true,
    inputSchema: {
      type: 'object',
      required: ['toUserName', 'message'],
      properties: {
        toUserName: { type: 'string', description: 'Name of the recipient family member' },
        message: { type: 'string', description: 'Message content' },
        nudgeType: { type: 'string', description: 'Type: reminder, cheer, health_alert, check_in' }
      }
    },
    execute: async (context, input) => {
      const toName = (input.toUserName || '').trim();
      const message = (input.message || '').trim();
      if (!toName || !message) {
        throw new Error('toUserName and message are required to send a family notification.');
      }

      const nudgeType = input.nudgeType || 'check_in';
      const fromName = context.userEmail || `User #${context.userId}`;

      const [result] = await pool.query(
        'INSERT INTO family_nudges (from_user_name, to_user_name, nudge_type, message) VALUES (?, ?, ?, ?)',
        [fromName, toName, nudgeType, message]
      );

      return {
        nudgeId: result.insertId,
        toUserName: toName,
        nudgeType,
        message: `Care notification dispatched to ${toName}.`
      };
    }
  }
];

module.exports = familyTools;
