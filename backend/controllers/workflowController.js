const aiWorkflowRepository = require('../repositories/ai/aiWorkflowRepository');
const appointmentWorkflowEngine = require('../services/jarvis/workflow/appointmentWorkflowEngine');
const doctorVisitWorkflowEngine = require('../services/jarvis/workflow/doctorVisitWorkflowEngine');
const medicationWorkflowEngine = require('../services/jarvis/workflow/medicationWorkflowEngine');
const { defaultMockCalendarProvider } = require('../services/jarvis/integrations/calendarProvider');
const { confirmationManager } = require('../services/jarvis/agent/confirmationManager');
const workflowVerifier = require('../services/jarvis/workflow/workflowVerifier');

class WorkflowController {
  /**
   * 1. GET /api/ai/workflows
   * Aggregated Action Center overview including appointments, pending actions, calendar events, and med concerns.
   */
  static async getWorkflowOverview(req, res) {
    try {
      const userId = req.userId;
      const today = new Date().toISOString().split('T')[0];

      const [appointments, pendingActions, calendarEvents, medOverview] = await Promise.all([
        aiWorkflowRepository.getAppointments(userId),
        aiWorkflowRepository.getPendingActions(userId),
        defaultMockCalendarProvider.listEvents(userId, { date: today }),
        medicationWorkflowEngine.getMedicationWorkflowOverview(userId)
      ]);

      const upcomingApts = appointments.filter(a => a.status === 'PLANNED' || a.status === 'CONFIRMED' || a.status === 'UPCOMING');

      res.status(200).json({
        success: true,
        data: {
          upcomingAppointmentsCount: upcomingApts.length,
          pendingActionsCount: pendingActions.length,
          todayCalendarEventsCount: calendarEvents.length,
          medicationConcernsCount: medOverview.missingRoutines.length + medOverview.reconciliationConcerns.length,
          upcomingAppointments: upcomingApts.slice(0, 5),
          pendingActions: pendingActions.slice(0, 5),
          todayCalendarEvents: calendarEvents,
          medicationWorkflow: medOverview,
          disclaimer: 'Informational workflow coordinator. Clinical appointments and calendar modifications require explicit user confirmation.'
        }
      });
    } catch (err) {
      console.error('WorkflowController: getWorkflowOverview error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 2. GET /api/ai/appointments
   */
  static async getAppointments(req, res) {
    try {
      const userId = req.userId;
      const { status, minDate } = req.query;
      const appointments = await aiWorkflowRepository.getAppointments(userId, { status, minDate });
      res.status(200).json({ success: true, count: appointments.length, data: appointments });
    } catch (err) {
      console.error('WorkflowController: getAppointments error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 3. POST /api/ai/appointments
   */
  static async createAppointment(req, res) {
    try {
      const userId = req.userId;
      const { title, provider, appointmentType, scheduledAt, location, status, doctorName, notes } = req.body;

      if (!title || !scheduledAt) {
        return res.status(400).json({ success: false, error: 'title and scheduledAt are required' });
      }

      const created = await aiWorkflowRepository.createAppointment(userId, {
        title,
        provider,
        appointmentType,
        scheduledAt,
        location,
        status: status || 'PLANNED',
        doctorName,
        notes
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      console.error('WorkflowController: createAppointment error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 4. GET /api/ai/appointments/:id
   */
  static async getAppointmentById(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const apt = await aiWorkflowRepository.getAppointmentById(userId, id);
      if (!apt) {
        return res.status(404).json({ success: false, error: 'Appointment not found' });
      }
      res.status(200).json({ success: true, data: apt });
    } catch (err) {
      console.error('WorkflowController: getAppointmentById error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 5. PUT /api/ai/appointments/:id
   */
  static async updateAppointment(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const updated = await aiWorkflowRepository.updateAppointment(userId, id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Appointment not found' });
      }
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      console.error('WorkflowController: updateAppointment error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 6. DELETE /api/ai/appointments/:id
   */
  static async deleteAppointment(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const success = await aiWorkflowRepository.deleteAppointment(userId, id);
      if (!success) {
        return res.status(404).json({ success: false, error: 'Appointment not found or delete failed' });
      }
      res.status(200).json({ success: true, message: 'Appointment deleted successfully' });
    } catch (err) {
      console.error('WorkflowController: deleteAppointment error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 7. POST /api/ai/appointments/:id/complete
   */
  static async completeAppointment(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { doctorInstructions, followUpDate, testsRequested } = req.body;

      const result = await doctorVisitWorkflowEngine.recordAppointmentCompletion(userId, id, {
        doctorInstructions,
        followUpDate,
        testsRequested
      });

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error('WorkflowController: completeAppointment error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 8. GET /api/ai/calendar/events
   */
  static async getCalendarEvents(req, res) {
    try {
      const userId = req.userId;
      const { date, startDate, endDate } = req.query;
      const events = await defaultMockCalendarProvider.listEvents(userId, { date, startDate, endDate });
      res.status(200).json({ success: true, count: events.length, data: events });
    } catch (err) {
      console.error('WorkflowController: getCalendarEvents error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 9. GET /api/ai/calendar/availability
   */
  static async getCalendarAvailability(req, res) {
    try {
      const userId = req.userId;
      const { date, durationMinutes } = req.query;
      const slots = await defaultMockCalendarProvider.findAvailability(userId, {
        date,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 30
      });
      res.status(200).json({ success: true, count: slots.length, data: slots });
    } catch (err) {
      console.error('WorkflowController: getCalendarAvailability error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 10. GET /api/ai/workflow-actions
   */
  static async getWorkflowActions(req, res) {
    try {
      const userId = req.userId;
      const { status } = req.query;
      const actions = await aiWorkflowRepository.getWorkflowActions(userId, { status });
      res.status(200).json({ success: true, count: actions.length, data: actions });
    } catch (err) {
      console.error('WorkflowController: getWorkflowActions error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 11. POST /api/ai/workflow-actions/:id/confirm
   */
  static async confirmWorkflowAction(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { confirmationId, argsHash } = req.body;

      const action = await aiWorkflowRepository.getWorkflowActionById(userId, id);
      if (!action) {
        return res.status(404).json({ success: false, error: 'Workflow action not found' });
      }

      // If confirmation required, validate cryptographic token
      if (action.requires_confirmation && confirmationId) {
        confirmationManager.validateAndConsumeToken(userId, confirmationId, 'confirm_workflow_action', argsHash || {});
      }

      const updated = await aiWorkflowRepository.updateWorkflowActionStatus(userId, id, 'CONFIRMED', {
        confirmedAt: new Date().toISOString()
      });

      res.status(200).json({ success: true, data: updated, message: 'Workflow action confirmed successfully' });
    } catch (err) {
      console.error('WorkflowController: confirmWorkflowAction error:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * 12. POST /api/ai/workflow-actions/:id/dismiss
   */
  static async dismissWorkflowAction(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const updated = await aiWorkflowRepository.updateWorkflowActionStatus(userId, id, 'DISMISSED');
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Workflow action not found' });
      }
      res.status(200).json({ success: true, data: updated, message: 'Workflow action dismissed' });
    } catch (err) {
      console.error('WorkflowController: dismissWorkflowAction error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * 13. POST /api/ai/doctor-visit/:appointmentId/prepare
   */
  static async prepareDoctorVisit(req, res) {
    try {
      const userId = req.userId;
      const { appointmentId } = req.params;
      const pkg = await doctorVisitWorkflowEngine.prepareDoctorVisitPackage(userId, appointmentId);
      res.status(200).json({ success: true, data: pkg });
    } catch (err) {
      console.error('WorkflowController: prepareDoctorVisit error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = WorkflowController;
