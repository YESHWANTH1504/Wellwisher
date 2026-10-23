const { AiMemoryRepository, VALID_MEMORY_TYPES } = require('../../../repositories/ai/aiMemoryRepository');
const { RISK_LEVELS } = require('./toolRegistry');

const memoryTools = [
  {
    name: 'save_memory',
    description: 'Save a structured habit, constraint, or preference into the user’s long-term memory.',
    category: 'memory',
    permissionKey: 'save_memory',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['memoryKey', 'memoryValue'],
      properties: {
        memoryType: {
          type: 'string',
          enum: VALID_MEMORY_TYPES,
          description: 'Classification: USER_PREFERENCE, ROUTINE_PREFERENCE, COMMUNICATION_PREFERENCE, SCHEDULE_PREFERENCE, ASSISTANT_PREFERENCE, TEMPORARY_CONTEXT, IMPORTANT_CONTEXT'
        },
        memoryKey: { type: 'string', description: 'Concise unique descriptor e.g. "preferred_workout_time"' },
        memoryValue: { type: 'string', description: 'Stored knowledge statement e.g. "Prefers exercising at 6:30 AM before breakfast"' },
        importance: { type: 'number', description: 'Scale 1-5' }
      }
    },
    execute: async (context, input) => {
      const memoryType = input.memoryType || 'USER_PREFERENCE';
      const mem = await AiMemoryRepository.createMemory(context.userId, {
        memoryType,
        memoryKey: input.memoryKey,
        memoryValue: input.memoryValue,
        source: 'USER_EXPLICIT',
        importance: input.importance || 3
      });

      return {
        savedMemory: mem,
        message: `Saved memory: "${input.memoryKey}" -> "${input.memoryValue}".`
      };
    }
  },
  {
    name: 'search_memory',
    description: 'Search long-term user memories by keyword or query term.',
    category: 'memory',
    permissionKey: 'save_memory',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Keyword to search for in memories' }
      }
    },
    execute: async (context, input) => {
      const results = await AiMemoryRepository.searchMemories(context.userId, input.query);
      return {
        query: input.query,
        count: results.length,
        memories: results
      };
    }
  },
  {
    name: 'update_memory',
    description: 'Update the text content or importance score of an existing memory item.',
    category: 'memory',
    permissionKey: 'save_memory',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['memoryId', 'memoryValue'],
      properties: {
        memoryId: { type: 'number', description: 'ID of the memory to update' },
        memoryValue: { type: 'string', description: 'Updated memory statement' },
        importance: { type: 'number', description: 'Scale 1-5' }
      }
    },
    execute: async (context, input) => {
      const id = parseInt(input.memoryId, 10);
      const updated = await AiMemoryRepository.updateMemory(id, context.userId, {
        memoryValue: input.memoryValue,
        importance: input.importance
      });

      if (!updated) {
        throw new Error(`Memory #${id} not found or not owned by user.`);
      }

      return {
        memoryId: id,
        message: `Memory #${id} updated successfully.`
      };
    }
  },
  {
    name: 'delete_memory',
    description: 'Permanently remove a memory item from user long-term storage.',
    category: 'memory',
    permissionKey: 'save_memory',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        memoryId: { type: 'number', description: 'ID of the memory to delete' },
        memoryKey: { type: 'string', description: 'Key of the memory to delete' },
        query: { type: 'string', description: 'Search term to find and delete matching memories' }
      }
    },
    execute: async (context, input) => {
      let id = input.memoryId ? parseInt(input.memoryId, 10) : null;
      if (!id && (input.query || input.memoryKey)) {
        const term = input.query || input.memoryKey;
        const matches = await AiMemoryRepository.searchMemories(context.userId, term);
        if (matches && matches.length > 0) {
          id = matches[0].id;
        }
      }

      if (id) {
        await AiMemoryRepository.deleteMemory(id, context.userId);
        return {
          memoryId: id,
          message: 'I have removed that preference from my memory as requested.'
        };
      }

      return {
        memoryId: null,
        message: 'No matching memory found to remove.'
      };
    }
  },
  {
    name: 'retrieve_memory',
    description: 'Retrieve stored user memories, preferences, habits, or routines by query.',
    category: 'memory',
    permissionKey: 'save_memory',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword or topic to search in memory' }
      }
    },
    execute: async (context, input) => {
      const q = input?.query || '';
      const results = await AiMemoryRepository.searchMemories(context.userId, q);
      return {
        query: q,
        count: results.length,
        memories: results,
        message: results.length > 0 ? `Found ${results.length} memories.` : 'No stored memory found.'
      };
    }
  },
  {
    name: 'store_memory',
    description: 'Store a user habit, routine, or preference into memory.',
    category: 'memory',
    permissionKey: 'save_memory',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['memoryValue'],
      properties: {
        memoryKey: { type: 'string' },
        memoryValue: { type: 'string' }
      }
    },
    execute: async (context, input) => {
      const mem = await AiMemoryRepository.createMemory(context.userId, {
        memoryType: 'USER_PREFERENCE',
        memoryKey: input.memoryKey || 'preference',
        memoryValue: input.memoryValue,
        source: 'USER_EXPLICIT',
        importance: 3
      });
      return {
        savedMemory: mem,
        message: `Saved to memory.`
      };
    }
  }
];

module.exports = memoryTools;
