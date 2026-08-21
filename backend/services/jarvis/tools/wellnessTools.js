const pool = require('../../../config/db');
const { RISK_LEVELS } = require('./toolRegistry');

const wellnessTools = [
  {
    name: 'get_vitals',
    description: 'Retrieve the most recent health vitals (blood pressure, heart rate, blood glucose, SpO2, weight).',
    category: 'wellness',
    permissionKey: 'get_vitals',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of recent logs to retrieve (default: 5)' }
      }
    },
    execute: async (context, input) => {
      const limit = Math.min(20, Math.max(1, parseInt(input.limit, 10) || 5));
      const [rows] = await pool.query(
        'SELECT * FROM vitals_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [context.userId, limit]
      );
      return {
        count: rows.length,
        vitals: rows
      };
    }
  },
  {
    name: 'get_hydration',
    description: 'Retrieve total water intake logged for a specific date and target progress.',
    category: 'wellness',
    permissionKey: 'get_hydration',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)' }
      }
    },
    execute: async (context, input) => {
      const dateStr = (input.date || '').trim() || new Date().toISOString().split('T')[0];
      const [rows] = await pool.query(
        'SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM hydration_logs WHERE user_id = ? AND date = ?',
        [context.userId, dateStr]
      );
      const total = Number(rows[0]?.total_ml || 0);
      const goal = 2500;
      return {
        date: dateStr,
        totalMl: total,
        goalMl: goal,
        percentage: Math.min(100, Math.round((total / goal) * 100))
      };
    }
  },
  {
    name: 'log_hydration',
    description: 'Log water intake volume in milliliters for the user.',
    category: 'wellness',
    permissionKey: 'log_hydration',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['amountMl'],
      properties: {
        amountMl: { type: 'number', description: 'Amount of water in ml e.g. 250, 500' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)' }
      }
    },
    execute: async (context, input) => {
      const amount = parseInt(input.amountMl, 10);
      if (!amount || amount <= 0 || amount > 5000) {
        throw new Error('Water amount must be between 1ml and 5000ml.');
      }
      const dateStr = (input.date || '').trim() || new Date().toISOString().split('T')[0];

      await pool.query(
        'INSERT INTO hydration_logs (user_id, amount_ml, date) VALUES (?, ?, ?)',
        [context.userId, amount, dateStr]
      );

      const [rows] = await pool.query(
        'SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM hydration_logs WHERE user_id = ? AND date = ?',
        [context.userId, dateStr]
      );

      return {
        date: dateStr,
        loggedAmountMl: amount,
        newTotalMl: Number(rows[0]?.total_ml || amount),
        message: `Logged ${amount}ml water intake.`
      };
    }
  },
  {
    name: 'get_sleep_mood',
    description: 'Retrieve sleep duration, bedtime, wake time, and recorded mood rating for a date.',
    category: 'wellness',
    permissionKey: 'get_sleep_mood',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)' }
      }
    },
    execute: async (context, input) => {
      const dateStr = (input.date || '').trim() || new Date().toISOString().split('T')[0];
      const [rows] = await pool.query(
        'SELECT * FROM sleep_mood_logs WHERE user_id = ? AND date = ? ORDER BY id DESC LIMIT 1',
        [context.userId, dateStr]
      );
      return rows[0] || {
        date: dateStr,
        sleep_hours: 7.5,
        bedtime: '11:00 PM',
        wake_time: '06:30 AM',
        mood_rating: 'Energetic'
      };
    }
  },
  {
    name: 'get_wellness_summary',
    description: 'Get an aggregated overview of today’s hydration, recent vitals, sleep, and completed routines.',
    category: 'wellness',
    permissionKey: 'get_wellness_summary',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context) => {
      const today = new Date().toISOString().split('T')[0];

      // 1. Hydration
      const [hydRows] = await pool.query(
        'SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM hydration_logs WHERE user_id = ? AND date = ?',
        [context.userId, today]
      );

      // 2. Recent Vitals
      const [vitRows] = await pool.query(
        'SELECT * FROM vitals_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [context.userId]
      );

      // 3. Sleep & Mood
      const [sleepRows] = await pool.query(
        'SELECT * FROM sleep_mood_logs WHERE user_id = ? AND date = ? LIMIT 1',
        [context.userId, today]
      );

      // 4. Routines Summary
      const [routineRows] = await pool.query(
        'SELECT status, COUNT(*) AS count FROM routines WHERE user_id = ? AND date = ? AND deleted_at IS NULL GROUP BY status',
        [context.userId, today]
      );

      return {
        date: today,
        hydration: {
          totalMl: Number(hydRows[0]?.total_ml || 0),
          goalMl: 2500
        },
        latestVitals: vitRows[0] || null,
        sleepMood: sleepRows[0] || null,
        routineStats: routineRows
      };
    }
  }
];

module.exports = wellnessTools;
