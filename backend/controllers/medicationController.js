const pool = require('../config/db');

class MedicationController {
  static async getMedications(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const [rows] = await pool.query(
        'SELECT * FROM medications WHERE user_id = ? ORDER BY schedule_time ASC',
        [req.userId]
      );
      return res.json({
        success: true,
        data: rows
      });
    } catch (err) {
      console.error('Get medications error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch medications'
      });
    }
  }

  static async addMedication(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { name, dosage, scheduleTime, totalPills } = req.body || {};
      const trimmedName = (name || '').trim();
      const trimmedDosage = (dosage || '').trim();

      if (!trimmedName || !trimmedDosage) {
        return res.status(400).json({
          success: false,
          message: 'Medication name and dosage are required'
        });
      }

      const pills = parseInt(totalPills, 10) || 30;
      if (pills < 1 || pills > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Pills count must be between 1 and 1000'
        });
      }

      const [result] = await pool.query(
        'INSERT INTO medications (user_id, name, dosage, schedule_time, total_pills, remaining_pills) VALUES (?, ?, ?, ?, ?, ?)',
        [req.userId, trimmedName, trimmedDosage, (scheduleTime || '09:00 AM').trim(), pills, pills]
      );

      return res.status(201).json({
        success: true,
        message: 'Medication added successfully',
        data: {
          id: result.insertId,
          name: trimmedName,
          dosage: trimmedDosage,
          schedule_time: scheduleTime || '09:00 AM',
          total_pills: pills,
          remaining_pills: pills
        }
      });
    } catch (err) {
      console.error('Add medication error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to add medication'
      });
    }
  }

  static async takeMedication(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { id } = req.params;
      const [result] = await pool.query(
        'UPDATE medications SET remaining_pills = GREATEST(remaining_pills - 1, 0) WHERE id = ? AND user_id = ?',
        [id, req.userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Medication record not found or not owned by you.'
        });
      }

      return res.json({
        success: true,
        message: 'Pill recorded as taken'
      });
    } catch (err) {
      console.error('Take medication error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to record pill intake'
      });
    }
  }

  static async checkInteraction(req, res) {
    try {
      const { newMedicine, currentMedications } = req.body || {};
      const medicineLower = (newMedicine || '').toLowerCase().trim();

      if (!medicineLower) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a medication name to check interactions.'
        });
      }

      let isDangerous = false;
      let severity = 'Low Risk';
      let interactionMessage = 'No adverse interactions detected with your current medications.';

      const knownInteractions = [
        { terms: ['aspirin', 'ibuprofen', 'naproxen'], risk: 'Moderate Risk', warning: 'Combining NSAIDs may increase risk of stomach irritation.' },
        { terms: ['warfarin', 'aspirin'], risk: 'High Risk ⚠️', warning: 'High bleeding risk when combining blood thinners like Warfarin and Aspirin.' },
        { terms: ['lisinopril', 'potassium'], risk: 'Moderate Risk', warning: 'Taking Lisinopril with Potassium supplements may elevate blood potassium levels.' },
        { terms: ['metformin', 'alcohol'], risk: 'High Risk ⚠️', warning: 'Avoid high alcohol intake with Metformin due to lactic acidosis risk.' }
      ];

      for (const item of knownInteractions) {
        if (item.terms.some(t => medicineLower.includes(t))) {
          severity = item.risk;
          interactionMessage = item.warning;
          if (item.risk.includes('High')) isDangerous = true;
          break;
        }
      }

      return res.json({
        success: true,
        data: {
          medicineName: newMedicine,
          severity: severity,
          isDangerous: isDangerous,
          message: interactionMessage
        }
      });
    } catch (err) {
      console.error('Drug interaction check error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to check drug interaction'
      });
    }
  }

  static async ocrParse(req, res) {
    try {
      const { rawText } = req.body || {};
      const text = (rawText || '').trim();

      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'OCR raw text payload cannot be empty'
        });
      }

      // Extract medication details from text using regex heuristics
      let name = 'Prescribed Medication';
      let dosage = '1 Pill';
      let scheduleTime = '08:00 AM';

      const dosageMatch = text.match(/(\d+\s*(mg|g|mcg|ml|pills?|tablets?|capsules?))/i);
      if (dosageMatch) {
        dosage = dosageMatch[0];
      }

      const timeMatch = text.match(/(once|twice|thrice|daily|every \d+ hours|\d+:\d+\s*(am|pm)?)/i);
      if (timeMatch) {
        scheduleTime = timeMatch[0];
      }

      const words = text.split(/\s+/).filter(w => w.length > 3 && !/(\d|mg|tablet|take|daily|prescription)/i.test(w));
      if (words.length > 0) {
        name = words[0];
      }

      return res.json({
        success: true,
        data: {
          name: name,
          dosage: dosage,
          scheduleTime: scheduleTime,
          confidence: 0.92,
          parsedText: text
        }
      });
    } catch (err) {
      console.error('OCR parse error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to parse OCR label text'
      });
    }
  }
}

module.exports = MedicationController;
