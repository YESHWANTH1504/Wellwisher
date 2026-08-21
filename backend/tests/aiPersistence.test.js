process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');

const AiConversationRepository = require('../repositories/ai/aiConversationRepository');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const { AiPreferenceRepository } = require('../repositories/ai/aiPreferenceRepository');
const { AiPermissionRepository } = require('../repositories/ai/aiPermissionRepository');
const { AiAgentRunRepository } = require('../repositories/ai/aiAgentRunRepository');

test('Phase 1 - AI Conversation & Message Persistence', async (t) => {
  const user1Id = 5001;
  const user2Id = 5002;

  let convId = null;

  await t.test('1. User 1 creates a new conversation session', async () => {
    const conv = await AiConversationRepository.createConversation(user1Id, {
      title: 'Morning Routine & Health Discussion',
      metadata: { source: 'flutter_voice_screen' }
    });

    assert.ok(conv.id);
    assert.equal(conv.userId, user1Id);
    assert.equal(conv.title, 'Morning Routine & Health Discussion');
    convId = conv.id;
  });

  await t.test('2. User 1 retrieves own conversations, User 2 sees empty list', async () => {
    const user1List = await AiConversationRepository.getConversationsByUser(user1Id);
    assert.ok(user1List.length >= 1);
    assert.equal(user1List[0].id, convId);

    const user2List = await AiConversationRepository.getConversationsByUser(user2Id);
    assert.equal(user2List.length, 0, 'User 2 must not see User 1 conversations');
  });

  await t.test('3. User 2 cannot access or update User 1 conversation', async () => {
    const user2Access = await AiConversationRepository.getConversationById(convId, user2Id);
    assert.equal(user2Access, null, 'User 2 should receive null for User 1 conversation');

    const updated = await AiConversationRepository.updateTitle(convId, user2Id, 'Hacked Title');
    assert.equal(updated, false, 'User 2 should not be able to update User 1 conversation title');
  });

  await t.test('4. User 1 adds messages (user, assistant, tool) to conversation', async () => {
    const userMsg = await AiConversationRepository.addMessage(user1Id, {
      conversationId: convId,
      role: 'user',
      content: 'Can you organize my morning routine?'
    });
    assert.equal(userMsg.role, 'user');

    const assistantMsg = await AiConversationRepository.addMessage(user1Id, {
      conversationId: convId,
      role: 'assistant',
      content: 'I have checked your schedule and drafted a plan.',
      toolCalls: [{ name: 'get_schedule', status: 'success' }]
    });
    assert.equal(assistantMsg.role, 'assistant');

    const msgs = await AiConversationRepository.getMessagesByConversation(convId, user1Id);
    assert.equal(msgs.length, 2);
    assert.equal(msgs[0].content, 'Can you organize my morning routine?');
  });

  await t.test('5. User 2 cannot add messages to User 1 conversation', async () => {
    await assert.rejects(
      async () => {
        await AiConversationRepository.addMessage(user2Id, {
          conversationId: convId,
          role: 'user',
          content: 'Malicious injection'
        });
      },
      /Conversation not found or not owned by user/
    );
  });

  await t.test('6. User 1 soft-deletes conversation', async () => {
    const deleted = await AiConversationRepository.softDeleteConversation(convId, user1Id);
    assert.equal(deleted, true);

    const check = await AiConversationRepository.getConversationById(convId, user1Id);
    assert.equal(check, null);
  });
});

test('Phase 1 - AI Structured Memory Persistence', async (t) => {
  const user1Id = 6001;
  const user2Id = 6002;
  let memoryId = null;

  await t.test('1. Create structured memory with classification and validation', async () => {
    const mem = await AiMemoryRepository.createMemory(user1Id, {
      memoryType: 'ROUTINE_PREFERENCE',
      memoryKey: 'workout_time',
      memoryValue: 'User prefers early morning cardio at 6:30 AM',
      source: 'USER_EXPLICIT',
      importance: 4
    });

    assert.ok(mem.id);
    assert.equal(mem.userId, user1Id);
    assert.equal(mem.memoryType, 'ROUTINE_PREFERENCE');
    memoryId = mem.id;
  });

  await t.test('2. Rejects invalid memory type', async () => {
    await assert.rejects(
      async () => {
        await AiMemoryRepository.createMemory(user1Id, {
          memoryType: 'INVALID_ARBITRARY_TYPE',
          memoryKey: 'test',
          memoryValue: 'test'
        });
      },
      /Invalid memoryType/
    );
  });

  await t.test('3. User 1 retrieves own memory, User 2 sees zero memories', async () => {
    const u1Mems = await AiMemoryRepository.getMemoriesByUser(user1Id);
    assert.equal(u1Mems.length, 1);
    assert.equal(u1Mems[0].memory_key, 'workout_time');

    const u2Mems = await AiMemoryRepository.getMemoriesByUser(user2Id);
    assert.equal(u2Mems.length, 0);
  });

  await t.test('4. Search memories by keyword with user scoping', async () => {
    const results = await AiMemoryRepository.searchMemories(user1Id, 'cardio');
    assert.equal(results.length, 1);
    assert.equal(results[0].id, memoryId);

    const u2Search = await AiMemoryRepository.searchMemories(user2Id, 'cardio');
    assert.equal(u2Search.length, 0);
  });

  await t.test('5. User 2 cannot update or delete User 1 memory', async () => {
    const u2Update = await AiMemoryRepository.updateMemory(memoryId, user2Id, { memoryValue: 'Hacked value' });
    assert.equal(u2Update, false);

    const u2Delete = await AiMemoryRepository.deleteMemory(memoryId, user2Id);
    assert.equal(u2Delete, false);
  });

  await t.test('6. User 1 updates and then deletes memory', async () => {
    const u1Update = await AiMemoryRepository.updateMemory(memoryId, user1Id, {
      memoryValue: 'User prefers HIIT workout at 7:00 AM',
      importance: 5
    });
    assert.equal(u1Update, true);

    const u1Delete = await AiMemoryRepository.deleteMemory(memoryId, user1Id);
    assert.equal(u1Delete, true);

    const check = await AiMemoryRepository.getMemoryById(memoryId, user1Id);
    assert.equal(check, null);
  });
});

test('Phase 1 - AI Preferences & Persona Configuration', async (t) => {
  const user1Id = 7001;
  const user2Id = 7002;

  await t.test('1. Returns default preferences for new user', async () => {
    const prefs = await AiPreferenceRepository.getPreferences(user1Id);
    assert.equal(prefs.assistantName, 'JARVIS');
    assert.equal(prefs.voiceEnabled, true);
    assert.equal(prefs.proactiveAssistanceEnabled, true);
    assert.equal(prefs.preferredResponseStyle, 'CONCISE');
    assert.equal(prefs.wakeWordEnabled, false); // Future setting only
  });

  await t.test('2. Updates AI preferences', async () => {
    const updated = await AiPreferenceRepository.updatePreferences(user1Id, {
      assistantName: 'JARVIS Senior Companion',
      preferredResponseStyle: 'ELDERLY_AFFECTIONATE',
      languagePreference: 'ta-IN'
    });

    assert.equal(updated.assistantName, 'JARVIS Senior Companion');
    assert.equal(updated.preferredResponseStyle, 'ELDERLY_AFFECTIONATE');
    assert.equal(updated.languagePreference, 'ta-IN');

    // User 2 remains isolated with default settings
    const u2Prefs = await AiPreferenceRepository.getPreferences(user2Id);
    assert.equal(u2Prefs.assistantName, 'JARVIS');
    assert.equal(u2Prefs.languagePreference, 'en-US');
  });
});

test('Phase 1 - AI Autonomy Action Permissions', async (t) => {
  const user1Id = 8001;
  const user2Id = 8002;

  await t.test('1. Returns safe default permissions for critical actions', async () => {
    const permissions = await AiPermissionRepository.getPermissions(user1Id);
    assert.equal(permissions.create_schedule, 'AUTO_APPROVE');
    assert.equal(permissions.delete_schedule, 'ASK_ALWAYS');
    assert.equal(permissions.save_health_data, 'ASK_ALWAYS');
    assert.equal(permissions.send_family_notification, 'ASK_ALWAYS');
  });

  await t.test('2. User customizes permission state', async () => {
    await AiPermissionRepository.setPermission(user1Id, 'delete_schedule', 'DISABLED');
    const perm = await AiPermissionRepository.checkPermission(user1Id, 'delete_schedule');
    assert.equal(perm, 'DISABLED');

    // User 2 is unchanged
    const u2Perm = await AiPermissionRepository.checkPermission(user2Id, 'delete_schedule');
    assert.equal(u2Perm, 'ASK_ALWAYS');
  });

  await t.test('3. Rejects invalid permission state', async () => {
    await assert.rejects(
      async () => {
        await AiPermissionRepository.setPermission(user1Id, 'delete_schedule', 'INVALID_STATE');
      },
      /Invalid permission state/
    );
  });
});

test('Phase 1 - AI Agent Multi-Step Execution Persistence', async (t) => {
  const user1Id = 9001;
  const user2Id = 9002;
  let runId = null;
  let step1Id = null;

  await t.test('1. Create multi-step agent run in PLANNED status', async () => {
    const run = await AiAgentRunRepository.createRun(user1Id, {
      request: 'Organize my entire evening and schedule post-dinner walk',
      metadata: { priority: 'high' }
    });

    assert.ok(run.id);
    assert.equal(run.userId, user1Id);
    assert.equal(run.status, 'PLANNED');
    runId = run.id;
  });

  await t.test('2. Add execution steps to agent run', async () => {
    const step1 = await AiAgentRunRepository.addStep(user1Id, {
      agentRunId: runId,
      stepNumber: 1,
      toolName: 'get_schedule',
      status: 'RUNNING',
      inputJson: { date: '2026-08-20' }
    });

    assert.ok(step1.id);
    assert.equal(step1.stepNumber, 1);
    assert.equal(step1.status, 'RUNNING');
    step1Id = step1.id;

    const step2 = await AiAgentRunRepository.addStep(user1Id, {
      agentRunId: runId,
      stepNumber: 2,
      toolName: 'create_schedule',
      status: 'PLANNED',
      inputJson: { title: 'Post-Dinner Walk', time: '08:30 PM' }
    });
    assert.equal(step2.stepNumber, 2);
  });

  await t.test('3. User 2 cannot access or mutate User 1 agent run or steps', async () => {
    const u2Run = await AiAgentRunRepository.getRunById(runId, user2Id);
    assert.equal(u2Run, null);

    const u2Steps = await AiAgentRunRepository.getStepsByRunId(runId, user2Id);
    assert.equal(u2Steps.length, 0);

    const u2StepUpdate = await AiAgentRunRepository.updateStep(step1Id, user2Id, { status: 'COMPLETED' });
    assert.equal(u2StepUpdate, false);
  });

  await t.test('4. Update step and complete agent run', async () => {
    const updatedStep = await AiAgentRunRepository.updateStep(step1Id, user1Id, {
      status: 'COMPLETED',
      outputJson: { routinesFound: 3 }
    });
    assert.equal(updatedStep, true);

    const updatedRun = await AiAgentRunRepository.updateRunStatus(runId, user1Id, {
      status: 'COMPLETED',
      metadata: { completedTasks: 2 }
    });
    assert.equal(updatedRun, true);

    const finalRun = await AiAgentRunRepository.getRunById(runId, user1Id);
    assert.equal(finalRun.status, 'COMPLETED');
    assert.ok(finalRun.completed_at);
  });
});
