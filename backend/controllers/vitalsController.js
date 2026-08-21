const pool = require('../config/db');

class VitalsController {
  static async getVitals(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const [rows] = await pool.query(
        'SELECT * FROM vitals_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
        [req.userId]
      );

      return res.json({
        success: true,
        data: rows
      });
    } catch (err) {
      console.error('Get vitals error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch vitals logs'
      });
    }
  }

  static async logVitals(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { systolic, diastolic, heartRate, bloodGlucose, spo2, weightKg, notes } = req.body || {};
      const dateStr = (req.body.date || '').trim() || new Date().toISOString().split('T')[0];

      const s = systolic ? parseInt(systolic, 10) : null;
      const d = diastolic ? parseInt(diastolic, 10) : null;
      const hr = heartRate ? parseInt(heartRate, 10) : null;
      const bg = bloodGlucose ? parseInt(bloodGlucose, 10) : null;
      const o2 = spo2 ? parseInt(spo2, 10) : null;
      const wt = weightKg ? parseFloat(weightKg) : null;

      // Range validations
      if (s && (s < 50 || s > 300)) {
        return res.status(400).json({ success: false, message: 'Systolic BP must be between 50 and 300 mmHg.' });
      }
      if (d && (d < 30 || d > 200)) {
        return res.status(400).json({ success: false, message: 'Diastolic BP must be between 30 and 200 mmHg.' });
      }
      if (hr && (hr < 30 || hr > 250)) {
        return res.status(400).json({ success: false, message: 'Heart rate must be between 30 and 250 bpm.' });
      }
      if (o2 && (o2 < 50 || o2 > 100)) {
        return res.status(400).json({ success: false, message: 'SpO2 must be between 50% and 100%.' });
      }

      await pool.query(
        `INSERT INTO vitals_logs (user_id, systolic, diastolic, heart_rate, blood_glucose, spo2, weight_kg, notes, date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.userId,
          s || 120,
          d || 80,
          hr || 72,
          bg || 95,
          o2 || 98,
          wt || 70.0,
          (notes || '').trim(),
          dateStr
        ]
      );

      return res.status(201).json({
        success: true,
        message: 'Health vitals logged successfully'
      });
    } catch (err) {
      console.error('Log vitals error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to log health vitals'
      });
    }
  }
}

module.exports = VitalsController;
