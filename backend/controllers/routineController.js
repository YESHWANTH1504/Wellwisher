const RoutineModel = require('../models/routineModel');

class RoutineController {
  static async getSchedule(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const dateStr = (req.query.date || '').trim() || new Date().toISOString().split('T')[0];
      const items = await RoutineModel.getByDate(req.userId, dateStr);

      const formatted = items.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        time: item.time,
        category: item.category,
        status: item.status,
        date: item.date,
        reminderEnabled: Boolean(item.reminder_enabled),
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      return res.json({
        success: true,
        data: formatted
      });
    } catch (err) {
      console.error('Error getting schedule:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch schedule routines'
      });
    }
  }

  static async createItem(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const body = req.body || {};
      const title = (body.title || '').trim();

      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Schedule item title is required.'
        });
      }

      const itemId = body.id || `rot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const dateStr = body.date ? body.date.split('T')[0] : new Date().toISOString().split('T')[0];

      const newItemData = {
        id: itemId,
        userId: req.userId,
        title: title,
        description: (body.description || '').trim(),
        time: (body.time || '09:00 AM').trim(),
        category: body.category || 'other',
        status: body.status || 'upcoming',
        date: dateStr,
        reminderEnabled: body.reminderEnabled !== undefined ? Boolean(body.reminderEnabled) : true
      };

      await RoutineModel.create(newItemData);

      return res.status(201).json({
        success: true,
        message: 'Routine created successfully',
        data: newItemData
      });
    } catch (err) {
      console.error('Error creating routine:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to create schedule item'
      });
    }
  }

  static async updateItem(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { id } = req.params;
      const body = req.body || {};
      const title = (body.title || '').trim();

      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Routine title cannot be empty.'
        });
      }

      const dateStr = body.date ? body.date.split('T')[0] : new Date().toISOString().split('T')[0];

      const updateData = {
        title: title,
        description: (body.description || '').trim(),
        time: (body.time || '09:00 AM').trim(),
        category: body.category || 'other',
        status: body.status || 'upcoming',
        date: dateStr,
        reminderEnabled: body.reminderEnabled !== undefined ? Boolean(body.reminderEnabled) : true
      };

      const updated = await RoutineModel.update(id, req.userId, updateData);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Schedule item not found or you do not have permission to update it.'
        });
      }

      return res.json({
        success: true,
        message: 'Routine updated successfully',
        data: { id, ...updateData }
      });
    } catch (err) {
      console.error('Error updating routine:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to update schedule item'
      });
    }
  }

  static async deleteItem(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { id } = req.params;
      const deleted = await RoutineModel.softDelete(id, req.userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Schedule item not found or you do not have permission to delete it.'
        });
      }

      return res.json({
        success: true,
        message: 'Schedule item deleted successfully'
      });
    } catch (err) {
      console.error('Error deleting routine:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete schedule item'
      });
    }
  }
}

module.exports = RoutineController;
