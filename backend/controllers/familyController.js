const pool = require('../config/db');

class FamilyController {
  static async getFamilyFeed(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const feedItems = [
        {
          id: 1,
          memberName: 'Mom (Sarah)',
          relation: 'Mother',
          activity: 'Completed Morning Hydration Goal 💧',
          timeAgo: '15 mins ago',
          avatarColor: 'purple'
        },
        {
          id: 2,
          memberName: 'Dad (Robert)',
          relation: 'Father',
          activity: 'Completed 20-Min Screen Care Break 👀',
          timeAgo: '1 hour ago',
          avatarColor: 'blue'
        },
        {
          id: 3,
          memberName: 'Sister (Emily)',
          relation: 'Sister',
          activity: 'Finished 30-Min Evening Workout 🏃',
          timeAgo: '3 hours ago',
          avatarColor: 'orange'
        }
      ];

      const [nudges] = await pool.query(
        'SELECT * FROM family_nudges ORDER BY created_at DESC LIMIT 10'
      );

      return res.json({
        success: true,
        data: {
          feed: feedItems,
          nudges: nudges
        }
      });
    } catch (err) {
      console.error('Get family feed error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch family feed'
      });
    }
  }

  static async getComplianceFeed(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const complianceEvents = [
        {
          id: 101,
          type: 'missed',
          title: 'Morning Blood Pressure Medication',
          memberName: 'Mom (Sarah)',
          time: '08:30 AM',
          status: 'Missed Pill Alert ⚠️',
          isUrgent: true
        },
        {
          id: 102,
          type: 'completed',
          title: 'Hydration Goal (1,500ml)',
          memberName: 'Mom (Sarah)',
          time: '12:00 PM',
          status: 'Completed 💧',
          isUrgent: false
        },
        {
          id: 103,
          type: 'completed',
          title: 'Afternoon Eye Care Break',
          memberName: 'Mom (Sarah)',
          time: '02:00 PM',
          status: 'Completed 👀',
          isUrgent: false
        }
      ];

      return res.json({
        success: true,
        data: complianceEvents
      });
    } catch (err) {
      console.error('Get compliance feed error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch caregiver compliance feed'
      });
    }
  }

  static async addRemoteRoutine(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { title, description, time, category, targetMemberName } = req.body || {};
      const trimmedTitle = (title || '').trim();

      if (!trimmedTitle) {
        return res.status(400).json({
          success: false,
          message: 'Routine title is required'
        });
      }

      const routineId = `rem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const dateStr = new Date().toISOString().split('T')[0];

      await pool.query(
        'INSERT INTO routines (id, user_id, title, description, time, category, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          routineId,
          req.userId,
          trimmedTitle,
          (description || 'Added by family member').trim(),
          (time || '10:00 AM').trim(),
          category || 'medication',
          'upcoming',
          dateStr
        ]
      );

      return res.status(201).json({
        success: true,
        message: `Remote routine added for ${targetMemberName || 'Senior'}`
      });
    } catch (err) {
      console.error('Add remote routine error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to add remote routine'
      });
    }
  }

  static async getQuickDialContacts(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const contacts = [
        { id: 1, name: 'Sarah (Daughter)', relation: 'Daughter', phone: '+1 (555) 234-5678', avatar: 'S', color: 0xFF9C27B0 },
        { id: 2, name: 'Robert (Son)', relation: 'Son', phone: '+1 (555) 876-5432', avatar: 'R', color: 0xFF2196F3 },
        { id: 3, name: 'Dr. Michael (Doctor)', relation: 'Primary Physician', phone: '+1 (555) 999-0000', avatar: 'D', color: 0xFF4CAF50 }
      ];

      return res.json({
        success: true,
        data: contacts
      });
    } catch (err) {
      console.error('Get quick dial contacts error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch quick dial contacts'
      });
    }
  }

  static async sendNudge(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { toUserName, nudgeType, message } = req.body || {};
      const trimmedMessage = (message || '').trim();

      if (!trimmedMessage) {
        return res.status(400).json({
          success: false,
          message: 'Nudge message cannot be empty'
        });
      }

      const fromUser = req.userEmail || 'Family Member';

      await pool.query(
        'INSERT INTO family_nudges (from_user_name, to_user_name, nudge_type, message) VALUES (?, ?, ?, ?)',
        [fromUser, (toUserName || 'Family Member').trim(), nudgeType || 'reminder', trimmedMessage]
      );

      return res.status(201).json({
        success: true,
        message: `Nudge "${trimmedMessage}" sent to ${toUserName || 'Family Member'}`
      });
    } catch (err) {
      console.error('Send nudge error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send family nudge'
      });
    }
  }
}

module.exports = FamilyController;
