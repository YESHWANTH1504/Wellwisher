const RoutineModel = require('../../../models/routineModel');
const { AiMemoryRepository } = require('../../../repositories/ai/aiMemoryRepository');

class AgentVerifier {
  /**
   * Verify that a mutation was correctly persisted in the database
   */
  static async verify(toolName, userId, toolResult = {}, inputArgs = {}) {
    if (!toolResult || !toolResult.success) {
      return { verified: false, reason: 'Tool execution did not report success.' };
    }

    const data = toolResult.data || {};

    switch (toolName) {
      case 'create_schedule': {
        const routineId = data.createdRoutine?.id || inputArgs.id;
        if (!routineId) return { verified: true };
        const found = await RoutineModel.getById(routineId, userId);
        if (!found) {
          return { verified: false, reason: `Verification failed: routine #${routineId} not found in database.` };
        }
        return { verified: true, entity: found };
      }

      case 'update_schedule': {
        const routineId = data.id || inputArgs.scheduleId;
        if (!routineId) return { verified: true };
        const found = await RoutineModel.getById(routineId, userId);
        if (!found) {
          return { verified: false, reason: `Verification failed: updated routine #${routineId} not found.` };
        }
        return { verified: true, entity: found };
      }

      case 'delete_schedule': {
        const routineId = data.deletedId || inputArgs.scheduleId;
        if (!routineId) return { verified: true };
        const found = await RoutineModel.getById(routineId, userId);
        if (found) {
          return { verified: false, reason: `Verification failed: routine #${routineId} still exists.` };
        }
        return { verified: true };
      }

      case 'save_memory': {
        const memId = data.savedMemory?.id;
        if (!memId) return { verified: true };
        const mem = await AiMemoryRepository.getMemoryById(memId, userId);
        if (!mem) {
          return { verified: false, reason: `Verification failed: memory #${memId} not found.` };
        }
        return { verified: true, entity: mem };
      }

      default:
        return { verified: true };
    }
  }
}

module.exports = AgentVerifier;
