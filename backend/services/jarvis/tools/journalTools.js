const pool = require('../../../config/db');
const { RISK_LEVELS } = require('./toolRegistry');

const journalTools = [
  {
    name: 'get_recent_journal',
    description: 'Retrieve recent user mood and symptom journal logs.',
    category: 'journal',
    permissionKey: 'get_journal',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of entries to retrieve (default: 5)' }
      }
    },
    execute: async (context, input) => {
      const limit = Math.min(20, Math.max(1, parseInt(input.limit, 10) || 5));
      const [rows] = await pool.query(
        'SELECT * FROM journal_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [context.userId, limit]
      );
      return {
        count: rows.length,
        journals: rows
      };
    }
  },
  {
    name: 'create_journal_entry',
    description: 'Create a new emotional or symptom reflection journal entry for the user.',
    category: 'journal',
    permissionKey: 'create_journal',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['text'],
      properties: {
        text: { type: 'string', description: 'Journal entry text content' },
        sentiment: { type: 'string', description: 'Optional sentiment description e.g. "Calm & Reflective"' },
        moodScore: { type: 'number', description: 'Scale 1-10' }
      }
    },
    execute: async (context, input) => {
      const text = (input.text || '').trim();
      if (!text) throw new Error('Journal entry text cannot be empty.');

      const sentiment = (input.sentiment || 'Calm & Reflective').trim();
      const moodScore = Math.min(10, Math.max(1, parseInt(input.moodScore, 10) || 7));
      const dateStr = new Date().toISOString().split('T')[0];

      const [result] = await pool.query(
        'INSERT INTO journal_logs (user_id, journal_text, sentiment, mood_score, caregiver_flag, ai_feedback, date) VALUES (?, ?, ?, ?, 0, ?, ?)',
        [context.userId, text, sentiment, moodScore, 'Journal entry recorded.', dateStr]
      );

      return {
        journalId: result.insertId,
        date: dateStr,
        sentiment,
        moodScore,
        message: 'Journal reflection saved successfully.'
      };
    }
  }
];

module.exports = journalTools;
