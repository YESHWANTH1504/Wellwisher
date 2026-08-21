const { RISK_LEVELS } = require('./toolRegistry');
const aiWorkflowRepository = require('../../../repositories/ai/aiWorkflowRepository');
const appointmentWorkflowEngine = require('../workflow/appointmentWorkflowEngine');
const doctorVisitWorkflowEngine = require('../workflow/doctorVisitWorkflowEngine');
const medicationWorkflowEngine = require('../workflow/medicationWorkflowEngine');
const { defaultMockCalendarProvider } = require('../integrations/calendarProvider');
const RoutineModel = require('../../../models/routineModel');

const workflowTools = [
  // 1. Read Calendar Events (AUTO_APPROVE)
  {
    name: 'get_calendar_events',
    description: 'Retrieve events from the user connected calendar (Google, Outlook, or Device) for a specific date or date range.',
    category: 'workflow',
    permissionKey: 'get_calendar_events',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Target date (YYYY-MM-DD)' },
        startDate: { type: 'string', description: 'Start date range (YYYY-MM-DD)' },
        endDate: { type: 'string', description: 'End date range (YYYY-MM-DD)' }
      }
    },
    execute: async (context, input) => {
      const events = await defaultMockCalendarProvider.listEvents(context.userId, input);
      return {
        count: events.length,
        events: events.map(e => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          date: e.date,
          location: e.location,
          provider: e.provider
        }))
      };
    }
  },

  // 2. Find Calendar Availability (AUTO_APPROVE)
  {
    name: 'find_calendar_availability',
    description: 'Find free time windows on the calendar for doctor appointments or wellness activities.',
    category: 'workflow',
    permissionKey: 'find_calendar_availability',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Target date (YYYY-MM-DD)' },
        durationMinutes: { type: 'number', description: 'Desired duration in minutes (default: 30)' }
      }
    },
    execute: async (context, input) => {
      const slots = await defaultMockCalendarProvider.findAvailability(context.userId, {
        date: input.date,
        durationMinutes: input.durationMinutes || 30
      });
      return {
        date: input.date || '2026-08-21',
        availableSlotsCount: slots.length,
        slots: slots.map(s => ({
          startTime: s.startTime,
          endTime: s.endTime,
          durationMinutes: s.durationMinutes
        }))
      };
    }
  },

  // 3. Get Upcoming Appointments (AUTO_APPROVE)
  {
    name: 'get_upcoming_appointments',
    description: 'List planned, upcoming, and confirmed doctor and clinical appointments.',
    category: 'workflow',
    permissionKey: 'get_upcoming_appointments',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Optional status filter (e.g. UPCOMING, PLANNED, CONFIRMED)' }
      }
    },
    execute: async (context, input) => {
      const appointments = await aiWorkflowRepository.getAppointments(context.userId, input);
      return {
        count: appointments.length,
        appointments: appointments.map(a => ({
          id: a.id,
          title: a.title,
          provider: a.provider,
          doctorName: a.doctor_name,
          appointmentType: a.appointment_type,
          scheduledAt: a.scheduled_at,
          location: a.location,
          status: a.status,
          hasBriefing: !!a.briefing_id,
          followUpDate: a.follow_up_date
        }))
      };
    }
  },

  // 4. Get Doctor Follow-ups (AUTO_APPROVE)
  {
    name: 'get_doctor_followups',
    description: 'Retrieve pending post-appointment follow-up tasks, requested laboratory tests, and clinician instructions.',
    category: 'workflow',
    permissionKey: 'get_doctor_followups',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'Optional appointment ID filter' }
      }
    },
    execute: async (context, input) => {
      if (input.appointmentId) {
        const suggestions = await appointmentWorkflowEngine.generatePostAppointmentSuggestions(context.userId, input.appointmentId);
        return { count: suggestions.length, followups: suggestions };
      }
      const actions = await aiWorkflowRepository.getWorkflowActions(context.userId, { status: 'PENDING' });
      return {
        count: actions.length,
        followups: actions.map(a => ({
          id: a.id,
          actionType: a.action_type,
          entityType: a.entity_type,
          status: a.status,
          payload: typeof a.payload === 'string' ? JSON.parse(a.payload) : a.payload,
          createdAt: a.created_at
        }))
      };
    }
  },

  // 5. Get Pending Workflow Actions (AUTO_APPROVE)
  {
    name: 'get_pending_workflow_actions',
    description: 'Get all pending life and health workflow items, confirmations, and reminders requiring user attention.',
    category: 'workflow',
    permissionKey: 'get_pending_workflow_actions',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      const pending = await aiWorkflowRepository.getPendingActions(context.userId);
      return {
        count: pending.length,
        pendingActions: pending.map(p => ({
          id: p.id,
          actionType: p.action_type,
          entityType: p.entity_type,
          payload: typeof p.payload === 'string' ? JSON.parse(p.payload) : p.payload,
          requiresConfirmation: !!p.requires_confirmation
        }))
      };
    }
  },

  // 6. Create Calendar Event (ASK_ALWAYS)
  {
    name: 'create_calendar_event',
    description: 'Create a new event on the user calendar (Requires User Confirmation).',
    category: 'workflow',
    permissionKey: 'create_calendar_event',
    riskLevel: RISK_LEVELS.HIGH,
    requiresConfirmation: true,
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        date: { type: 'string', description: 'Date (YYYY-MM-DD)' },
        startTime: { type: 'string', description: 'Start time (e.g. 10:00 AM)' },
        endTime: { type: 'string', description: 'End time (e.g. 11:00 AM)' },
        location: { type: 'string', description: 'Location or meeting link' },
        description: { type: 'string', description: 'Description or notes' }
      },
      required: ['title', 'date', 'startTime', 'endTime']
    },
    execute: async (context, input) => {
      const result = await defaultMockCalendarProvider.createEvent(context.userId, input);
      return {
        success: true,
        eventId: result.event.id,
        event: result.event,
        message: `Calendar event "${input.title}" created for ${input.date} at ${input.startTime}.`
      };
    }
  },

  // 7. Update Calendar Event (ASK_ALWAYS)
  {
    name: 'update_calendar_event',
    description: 'Modify an existing calendar event (Requires User Confirmation).',
    category: 'workflow',
    permissionKey: 'update_calendar_event',
    riskLevel: RISK_LEVELS.HIGH,
    requiresConfirmation: true,
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'ID of the calendar event' },
        title: { type: 'string', description: 'Updated title' },
        startTime: { type: 'string', description: 'Updated start time' },
        endTime: { type: 'string', description: 'Updated end time' },
        date: { type: 'string', description: 'Updated date' }
      },
      required: ['eventId']
    },
    execute: async (context, input) => {
      const result = await defaultMockCalendarProvider.updateEvent(context.userId, input.eventId, input);
      if (!result.success) throw new Error(result.error || 'Failed to update calendar event');
      return {
        success: true,
        event: result.event,
        message: `Calendar event "${result.event.title}" updated successfully.`
      };
    }
  },

  // 8. Delete Calendar Event (ASK_ALWAYS)
  {
    name: 'delete_calendar_event',
    description: 'Remove an event from the user calendar (Requires User Confirmation).',
    category: 'workflow',
    permissionKey: 'delete_calendar_event',
    riskLevel: RISK_LEVELS.HIGH,
    requiresConfirmation: true,
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'ID of the calendar event to delete' }
      },
      required: ['eventId']
    },
    execute: async (context, input) => {
      const result = await defaultMockCalendarProvider.deleteEvent(context.userId, input.eventId);
      if (!result.success) throw new Error('Calendar event not found or delete failed');
      return {
        success: true,
        eventId: input.eventId,
        message: 'Calendar event removed successfully.'
      };
    }
  },

  // 9. Create Appointment Reminder (ASK_ALWAYS)
  {
    name: 'create_appointment_reminder',
    description: 'Add a pre-appointment reminder routine in the schedule (Requires User Confirmation).',
    category: 'workflow',
    permissionKey: 'create_appointment_reminder',
    riskLevel: RISK_LEVELS.HIGH,
    requiresConfirmation: true,
    inputSchema: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'Associated appointment ID' },
        title: { type: 'string', description: 'Reminder title' },
        date: { type: 'string', description: 'Reminder date (YYYY-MM-DD)' },
        time: { type: 'string', description: 'Reminder time (HH:MM)' }
      },
      required: ['title', 'date', 'time']
    },
    execute: async (context, input) => {
      const routineId = `rot_apt_${Date.now()}`;
      await RoutineModel.create({
        id: routineId,
        userId: context.userId,
        title: input.title,
        description: `Reminder for upcoming doctor appointment`,
        time: input.time,
        category: 'other',
        status: 'upcoming',
        date: input.date,
        reminderEnabled: true
      });
      return {
        success: true,
        routineId,
        message: `Appointment reminder created for ${input.date} at ${input.time}.`
      };
    }
  },

  // 10. Update Appointment Reminder (ASK_ALWAYS)
  {
    name: 'update_appointment_reminder',
    description: 'Modify an existing appointment reminder time or date (Requires User Confirmation).',
    category: 'workflow',
    permissionKey: 'update_appointment_reminder',
    riskLevel: RISK_LEVELS.HIGH,
    requiresConfirmation: true,
    inputSchema: {
      type: 'object',
      properties: {
        routineId: { type: 'string', description: 'Routine ID of the reminder' },
        time: { type: 'string', description: 'New time' },
        date: { type: 'string', description: 'New date' }
      },
      required: ['routineId']
    },
    execute: async (context, input) => {
      const existing = await RoutineModel.getById(input.routineId, context.userId);
      if (!existing) throw new Error('Reminder routine not found');

      await RoutineModel.update(input.routineId, context.userId, {
        title: existing.title,
        description: existing.description,
        time: input.time || existing.time,
        category: existing.category,
        status: existing.status,
        date: input.date || existing.date,
        reminderEnabled: true
      });
      return {
        success: true,
        routineId: input.routineId,
        message: 'Appointment reminder updated.'
      };
    }
  },

  // 11. Create Follow-up Routine (ASK_ALWAYS)
  {
    name: 'create_followup_routine',
    description: 'Create a post-appointment follow-up task or lab visit in the daily schedule (Requires User Confirmation).',
    category: 'workflow',
    permissionKey: 'create_followup_routine',
    riskLevel: RISK_LEVELS.HIGH,
    requiresConfirmation: true,
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Routine title' },
        description: { type: 'string', description: 'Task description' },
        date: { type: 'string', description: 'Date (YYYY-MM-DD)' },
        time: { type: 'string', description: 'Time (HH:MM)' },
        category: { type: 'string', description: 'Category (medication, hydration, sleep, exercise, other)' }
      },
      required: ['title', 'date', 'time']
    },
    execute: async (context, input) => {
      const routineId = `rot_fol_${Date.now()}`;
      await RoutineModel.create({
        id: routineId,
        userId: context.userId,
        title: input.title,
        description: input.description || 'Post-appointment follow-up action',
        time: input.time,
        category: input.category || 'other',
        status: 'upcoming',
        date: input.date,
        reminderEnabled: true
      });
      return {
        success: true,
        routineId,
        message: `Follow-up task "${input.title}" added to your schedule.`
      };
    }
  },

  // 12. Record Appointment Completion (ASK_ALWAYS)
  {
    name: 'record_appointment_completion',
    description: 'Record that a doctor appointment took place and record user-entered clinician instructions (Requires User Confirmation).',
    category: 'workflow',
    permissionKey: 'record_appointment_completion',
    riskLevel: RISK_LEVELS.HIGH,
    requiresConfirmation: true,
    inputSchema: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'Appointment ID' },
        doctorInstructions: { type: 'string', description: 'User-provided notes on clinician instructions' },
        followUpDate: { type: 'string', description: 'Requested follow-up date (YYYY-MM-DD)' },
        testsRequested: { type: 'array', items: { type: 'string' }, description: 'Tests or diagnostic panels requested' }
      },
      required: ['appointmentId']
    },
    execute: async (context, input) => {
      const result = await doctorVisitWorkflowEngine.recordAppointmentCompletion(context.userId, input.appointmentId, {
        doctorInstructions: input.doctorInstructions || '',
        followUpDate: input.followUpDate || null,
        testsRequested: input.testsRequested || []
      });
      return {
        success: true,
        appointment: result.appointment,
        followUpActionsCount: result.followUpActions.length,
        message: 'Appointment recorded as completed. Follow-up tasks have been staged.'
      };
    }
  },

  // 13. Export Appointment Briefing (ASK_ALWAYS)
  {
    name: 'export_appointment_briefing',
    description: 'Export structured doctor appointment briefing package as printable PDF summary (Requires User Confirmation).',
    category: 'workflow',
    permissionKey: 'export_appointment_briefing',
    riskLevel: RISK_LEVELS.HIGH,
    requiresConfirmation: true,
    inputSchema: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'Appointment ID' }
      },
      required: ['appointmentId']
    },
    execute: async (context, input) => {
      const pkg = await doctorVisitWorkflowEngine.prepareDoctorVisitPackage(context.userId, input.appointmentId);
      return {
        success: true,
        appointmentId: input.appointmentId,
        briefingId: pkg.briefingId,
        briefing: pkg.briefing,
        disclaimer: pkg.disclaimer,
        message: 'Doctor briefing prepared and ready for PDF export or printing.'
      };
    }
  }
];

module.exports = {
  workflowTools
};
