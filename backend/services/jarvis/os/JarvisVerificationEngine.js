const RoutineModel = require('../../../models/routineModel');
const pool = require('../../../config/db');

const VERIFICATION_STATES = Object.freeze({
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
  UNVERIFIABLE: 'UNVERIFIABLE',
  PENDING_DEVICE: 'PENDING_DEVICE'
});

/**
 * JarvisVerificationEngine
 * Authoritative verification engine unifying database state verification,
 * exact alarm verification, and native Android foreground verification.
 */
class JarvisVerificationEngine {
  /**
   * Authoritatively verify an executed capability result
   */
  static async verify(toolName, userId, executionResult = {}, inputArgs = {}) {
    const name = (toolName || '').toLowerCase();

    if (name === 'calendar_create_event' || name === 'create_schedule' || name === 'create_reminder' || name.includes('calendar') || name.includes('reminder')) {
      const eventId = executionResult.eventId || executionResult.reminderId || executionResult.id ||
                      executionResult.data?.eventId || executionResult.data?.event?.id || executionResult.data?.id ||
                      executionResult.verification?.entityId;
      if (!eventId) {
        return {
          status: VERIFICATION_STATES.FAILED,
          verified: false,
          reason: 'Creation result did not return an authoritative entity ID.'
        };
      }

      const routine = await RoutineModel.getById(eventId, userId);
      if (!routine) {
        return {
          status: VERIFICATION_STATES.FAILED,
          verified: false,
          reason: `Entity ${eventId} could not be confirmed in schedule database.`
        };
      }

      return {
        status: VERIFICATION_STATES.VERIFIED,
        verified: true,
        entityId: routine.id,
        title: routine.title,
        time: routine.time,
        date: routine.date
      };
    }

    // 2. Calendar / Reminder Update Verification
    if (name === 'calendar_update_event' || name === 'update_reminder' || name === 'reschedule_event') {
      const eventId = inputArgs.eventId || inputArgs.reminderId || inputArgs.id || executionResult.eventId;
      if (!eventId) {
        return { status: VERIFICATION_STATES.FAILED, verified: false, reason: 'Target eventId missing for update verification.' };
      }

      const routine = await RoutineModel.getById(eventId, userId);
      if (!routine) {
        return { status: VERIFICATION_STATES.FAILED, verified: false, reason: 'Updated entity not found.' };
      }

      return {
        status: VERIFICATION_STATES.VERIFIED,
        verified: true,
        entityId: routine.id,
        newTime: routine.time,
        newDate: routine.date
      };
    }

    // 3. Calendar / Reminder Deletion / Cancellation Verification
    if (name === 'calendar_delete_event' || name === 'cancel_reminder' || name === 'delete_schedule') {
      const eventId = inputArgs.eventId || inputArgs.reminderId || inputArgs.id || executionResult.eventId || executionResult.reminderId;
      if (!eventId) {
        return { status: VERIFICATION_STATES.VERIFIED, verified: true, reason: 'No active entity to delete.' };
      }

      const routine = await RoutineModel.getById(eventId, userId);
      // If deleted or marked cancelled, verification succeeds
      const isGone = !routine || routine.status === 'cancelled' || routine.deleted_at !== null;
      return {
        status: isGone ? VERIFICATION_STATES.VERIFIED : VERIFICATION_STATES.FAILED,
        verified: isGone,
        entityId: eventId,
        reason: isGone ? null : 'Entity still present and active in database.'
      };
    }

    // 4. Android Native Application Launch Verification
    if (name === 'open_application') {
      const nativeResult = executionResult.nativeResult || executionResult;
      if (nativeResult.requiresNativeExecution || nativeResult.status === 'ACTION_PLANNED' || nativeResult.status === 'DISPATCHED_TO_NATIVE_BRIDGE') {
        return {
          status: VERIFICATION_STATES.PENDING_DEVICE,
          verified: false,
          requiresDeviceExecution: true,
          packageName: executionResult.packageName || inputArgs.packageName
        };
      }

      const verified = Boolean(nativeResult.verified === true || nativeResult.status === 'ACTION_SUCCEEDED');
      return {
        status: verified ? VERIFICATION_STATES.VERIFIED : VERIFICATION_STATES.FAILED,
        verified,
        packageName: nativeResult.packageName,
        appName: nativeResult.appName
      };
    }

    // 5. System Settings Verification
    if (name === 'open_settings' || name === 'open_system_settings') {
      const nativeResult = executionResult.nativeResult || executionResult;
      if (nativeResult.requiresNativeExecution) {
        return {
          status: VERIFICATION_STATES.PENDING_DEVICE,
          verified: false,
          requiresDeviceExecution: true,
          settingType: inputArgs.settingType
        };
      }
      const verified = Boolean(nativeResult.verified === true || nativeResult.status === 'ACTION_SUCCEEDED');
      return {
        status: verified ? VERIFICATION_STATES.VERIFIED : VERIFICATION_STATES.FAILED,
        verified,
        settingType: nativeResult.settingType
      };
    }

    // 6. Navigation Verification
    if (name === 'navigate_to_location' || name === 'navigation_directions') {
      const nativeResult = executionResult.nativeResult || executionResult;
      if (nativeResult.requiresNativeExecution) {
        return {
          status: VERIFICATION_STATES.PENDING_DEVICE,
          verified: false,
          requiresDeviceExecution: true,
          destination: inputArgs.destination
        };
      }
      const verified = Boolean(nativeResult.verified === true || nativeResult.status === 'ACTION_SUCCEEDED');
      return {
        status: verified ? VERIFICATION_STATES.VERIFIED : VERIFICATION_STATES.FAILED,
        verified,
        destination: nativeResult.destination
      };
    }

    // 7. Telephony & SMS Intent Verification
    if (name === 'make_phone_call' || name === 'send_sms' || name === 'send_whatsapp_message') {
      const nativeResult = executionResult.nativeResult || executionResult;
      if (nativeResult.requiresNativeExecution) {
        return {
          status: VERIFICATION_STATES.PENDING_DEVICE,
          verified: false,
          requiresDeviceExecution: true
        };
      }
      const verified = Boolean(nativeResult.verified === true || nativeResult.status === 'INTENT_DISPATCHED');
      return {
        status: verified ? VERIFICATION_STATES.VERIFIED : VERIFICATION_STATES.FAILED,
        verified
      };
    }

    // 8. Health Connect Reading Verification
    if (name.startsWith('health_') || name === 'get_vitals') {
      const data = executionResult.data || executionResult;
      const isMissing = data.value === null || data.available === false || data.reading === null;
      return {
        status: VERIFICATION_STATES.VERIFIED,
        verified: true,
        isZeroFabrication: true,
        dataAvailable: !isMissing
      };
    }

    // Default: Check result.success flag
    const isSuccess = executionResult.success !== false && !executionResult.error;
    return {
      status: isSuccess ? VERIFICATION_STATES.VERIFIED : VERIFICATION_STATES.FAILED,
      verified: isSuccess
    };
  }
}

module.exports = {
  JarvisVerificationEngine,
  VERIFICATION_STATES
};
