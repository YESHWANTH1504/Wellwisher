const RoutineModel = require('../../../models/routineModel');
const { RISK_LEVELS } = require('./toolRegistry');

// Helper to parse 12-hour AM/PM string into minutes from midnight
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const clean = timeStr.replaceAll(/[^\d:APMapm\s]/g, '').trim();
  const parts = clean.split(/\s+/);
  const hm = (parts[0] || '09:00').split(':');
  let hour = parseInt(hm[0], 10) || 9;
  const minute = parseInt(hm[1], 10) || 0;
  const isPm = parts.length > 1 && parts[1].toUpperCase() === 'PM';
  if (isPm && hour < 12) hour += 12;
  if (!isPm && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function formatMinutesToTime(minutes) {
  let hour = Math.floor(minutes / 60) % 24;
  const min = minutes % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  const hStr = hour.toString().padStart(2, '0');
  const mStr = min.toString().padStart(2, '0');
  return `${hStr}:${mStr} ${period}`;
}

const scheduleTools = [
  {
    name: 'get_today_schedule',
    description: 'Retrieve all scheduled routines and reminders for a specific date (defaults to today).',
    category: 'schedule',
    permissionKey: 'get_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Target date in YYYY-MM-DD format (optional, defaults to current date)' }
      }
    },
    execute: async (context, input) => {
      const dateStr = (input.date || '').trim() || new Date().toISOString().split('T')[0];
      const items = await RoutineModel.getByDate(context.userId, dateStr);
      return {
        date: dateStr,
        count: items.length,
        routines: items
      };
    }
  },
  {
    name: 'get_schedule',
    description: 'Get details of a single scheduled routine by its unique ID.',
    category: 'schedule',
    permissionKey: 'get_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['scheduleId'],
      properties: {
        scheduleId: { type: 'string', description: 'Unique routine ID' }
      }
    },
    execute: async (context, input) => {
      const item = await RoutineModel.getById(input.scheduleId, context.userId);
      if (!item) {
        throw new Error(`Schedule item with ID "${input.scheduleId}" was not found.`);
      }
      return item;
    }
  },
  {
    name: 'create_schedule',
    description: 'Create a new daily routine or reminder for the user.',
    category: 'schedule',
    permissionKey: 'create_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', description: 'Title of the routine' },
        time: { type: 'string', description: 'Start time e.g. "08:00 AM" (defaults to "09:00 AM")' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        category: { type: 'string', description: 'Category e.g. wakeUp, meal, exercise, office, eyeCare, medication, custom' },
        description: { type: 'string', description: 'Optional detailed description' },
        reminderEnabled: { type: 'boolean', description: 'Whether to trigger audio/banner notification' }
      }
    },
    execute: async (context, input) => {
      const title = (input.title || '').trim();
      if (!title) throw new Error('Routine title cannot be empty.');

      const dateStr = (input.date || '').trim() || new Date().toISOString().split('T')[0];
      const routineId = input.id || `rot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newItem = {
        id: routineId,
        userId: context.userId,
        title,
        description: (input.description || '').trim(),
        time: (input.time || '09:00 AM').trim(),
        category: input.category || 'custom',
        status: 'upcoming',
        date: dateStr,
        reminderEnabled: input.reminderEnabled !== undefined ? Boolean(input.reminderEnabled) : true
      };

      await RoutineModel.create(newItem);
      return {
        createdRoutine: newItem,
        message: `Successfully scheduled "${title}" at ${newItem.time} on ${dateStr}.`
      };
    }
  },
  {
    name: 'update_schedule',
    description: 'Update time, title, status, or description of an existing routine.',
    category: 'schedule',
    permissionKey: 'update_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['scheduleId'],
      properties: {
        scheduleId: { type: 'string', description: 'Unique routine ID' },
        title: { type: 'string', description: 'Updated title' },
        time: { type: 'string', description: 'Updated time e.g. "02:30 PM"' },
        date: { type: 'string', description: 'Updated date in YYYY-MM-DD format' },
        category: { type: 'string', description: 'Updated category' },
        status: { type: 'string', description: 'upcoming, completed, skipped, missed' },
        description: { type: 'string', description: 'Updated description' }
      }
    },
    execute: async (context, input) => {
      const existing = await RoutineModel.getById(input.scheduleId, context.userId);
      if (!existing) {
        throw new Error(`Schedule item "${input.scheduleId}" not found or not owned by user.`);
      }

      const updateData = {
        title: input.title !== undefined ? input.title.trim() : existing.title,
        description: input.description !== undefined ? input.description.trim() : existing.description,
        time: input.time !== undefined ? input.time.trim() : existing.time,
        category: input.category || existing.category,
        status: input.status || existing.status,
        date: input.date || existing.date,
        reminderEnabled: input.reminderEnabled !== undefined ? Boolean(input.reminderEnabled) : Boolean(existing.reminder_enabled)
      };

      const updated = await RoutineModel.update(input.scheduleId, context.userId, updateData);
      if (!updated) {
        throw new Error('Failed to update routine item.');
      }

      return {
        id: input.scheduleId,
        ...updateData,
        message: `Successfully updated routine "${updateData.title}".`
      };
    }
  },
  {
    name: 'delete_schedule',
    description: 'Delete/cancel an existing scheduled routine (Requires explicit user confirmation).',
    category: 'schedule',
    permissionKey: 'delete_schedule',
    riskLevel: RISK_LEVELS.HIGH,
    requiresConfirmation: true,
    inputSchema: {
      type: 'object',
      required: ['scheduleId'],
      properties: {
        scheduleId: { type: 'string', description: 'ID of the routine to delete' }
      }
    },
    execute: async (context, input) => {
      const existing = await RoutineModel.getById(input.scheduleId, context.userId);
      if (!existing) {
        throw new Error(`Schedule item "${input.scheduleId}" not found.`);
      }

      const deleted = await RoutineModel.softDelete(input.scheduleId, context.userId);
      if (!deleted) {
        throw new Error('Failed to delete routine item.');
      }

      return {
        deletedId: input.scheduleId,
        deletedTitle: existing.title,
        message: `Routine "${existing.title}" was successfully deleted.`
      };
    }
  },
  {
    name: 'find_free_time',
    description: 'Find available free time gaps in the schedule for a specific date.',
    category: 'schedule',
    permissionKey: 'get_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Target date in YYYY-MM-DD format' },
        durationMinutes: { type: 'number', description: 'Required duration in minutes (default: 30)' },
        preferredStart: { type: 'string', description: 'Search window start time e.g. "09:00 AM"' },
        preferredEnd: { type: 'string', description: 'Search window end time e.g. "06:00 PM"' }
      }
    },
    execute: async (context, input) => {
      const dateStr = (input.date || '').trim() || new Date().toISOString().split('T')[0];
      const items = await RoutineModel.getByDate(context.userId, dateStr);
      
      const windowStart = parseTimeToMinutes(input.preferredStart || '08:00 AM');
      const windowEnd = parseTimeToMinutes(input.preferredEnd || '09:00 PM');
      const requiredDuration = Math.max(10, parseInt(input.durationMinutes, 10) || 30);

      // Sort existing tasks by minute
      const busySlots = items.map(item => {
        const start = parseTimeToMinutes(item.time);
        return { start, end: start + 45, title: item.title }; // assume 45 min default duration
      }).sort((a, b) => a.start - b.start);

      const freeSlots = [];
      let cursor = windowStart;

      for (const busy of busySlots) {
        if (busy.start > cursor && (busy.start - cursor) >= requiredDuration) {
          freeSlots.push({
            start: formatMinutesToTime(cursor),
            end: formatMinutesToTime(busy.start),
            durationMinutes: busy.start - cursor
          });
        }
        if (busy.end > cursor) {
          cursor = busy.end;
        }
      }

      if (windowEnd > cursor && (windowEnd - cursor) >= requiredDuration) {
        freeSlots.push({
          start: formatMinutesToTime(cursor),
          end: formatMinutesToTime(windowEnd),
          durationMinutes: windowEnd - cursor
        });
      }

      return {
        date: dateStr,
        availableSlotsCount: freeSlots.length,
        freeSlots
      };
    }
  },
  {
    name: 'detect_schedule_conflicts',
    description: 'Check if a proposed routine time conflicts with existing scheduled tasks.',
    category: 'schedule',
    permissionKey: 'get_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['time'],
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        time: { type: 'string', description: 'Proposed start time e.g. "10:30 AM"' },
        durationMinutes: { type: 'number', description: 'Estimated duration in minutes (default: 30)' }
      }
    },
    execute: async (context, input) => {
      const dateStr = (input.date || '').trim() || new Date().toISOString().split('T')[0];
      const items = await RoutineModel.getByDate(context.userId, dateStr);

      const proposedStart = parseTimeToMinutes(input.time);
      const duration = parseInt(input.durationMinutes, 10) || 30;
      const proposedEnd = proposedStart + duration;

      const conflicts = [];
      for (const item of items) {
        const itemStart = parseTimeToMinutes(item.time);
        const itemEnd = itemStart + 45; // default 45m span
        if (Math.max(proposedStart, itemStart) < Math.min(proposedEnd, itemEnd)) {
          conflicts.push({
            id: item.id,
            title: item.title,
            time: item.time,
            category: item.category
          });
        }
      }

      return {
        hasConflict: conflicts.length > 0,
        conflictCount: conflicts.length,
        conflictingRoutines: conflicts
      };
    }
  }
];

module.exports = scheduleTools;
