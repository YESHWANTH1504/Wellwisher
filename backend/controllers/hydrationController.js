const pool = require('../config/db');

class HydrationController {
  static async getDailyHydration(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const dateStr = (req.query.date || '').trim() || new Date().toISOString().split('T')[0];
      const [rows] = await pool.query(
        'SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM hydration_logs WHERE user_id = ? AND date = ?',
        [req.userId, dateStr]
      );
      const totalMl = rows[0].total_ml || 0;
      return res.json({
        success: true,
        data: {
          date: dateStr,
          totalMl: Number(totalMl),
          goalMl: 2500
        }
      });
    } catch (err) {
      console.error('Get hydration error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch hydration log'
      });
    }
  }

  static async logWater(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { amountMl } = req.body || {};
      const amount = parseInt(amountMl, 10) || 250;

      if (amount <= 0 || amount > 5000) {
        return res.status(400).json({
          success: false,
          message: 'Water amount must be between 1ml and 5000ml.'
        });
      }

      const dateStr = (req.body.date || '').trim() || new Date().toISOString().split('T')[0];

      await pool.query(
        'INSERT INTO hydration_logs (user_id, amount_ml, date) VALUES (?, ?, ?)',
        [req.userId, amount, dateStr]
      );

      const [rows] = await pool.query(
        'SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM hydration_logs WHERE user_id = ? AND date = ?',
        [req.userId, dateStr]
      );

      return res.status(201).json({
        success: true,
        message: `Logged ${amount}ml water intake`,
        data: {
          date: dateStr,
          totalMl: Number(rows[0].total_ml || amount),
          goalMl: 2500
        }
      });
    } catch (err) {
      console.error('Log water error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to log water intake'
      });
    }
  }
}

module.exports = HydrationController;
