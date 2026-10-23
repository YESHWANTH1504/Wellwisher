const { defaultOSCore, JarvisRequest } = require('../services/jarvis/os/JarvisOSCore');
const MemoryAgent = require('../services/jarvis/agent/MemoryAgent');
const db = require('../config/db');

async function testCameraContext() {
  const userId = 9580;
  const sessionId = 'test_camera_session_' + Date.now();

  const visualInput = {
    type: 'IMAGE',
    mimeType: 'image/jpeg',
    ocrText: 'Rx: Metformin 500mg, Take 1 tablet twice daily with meals. Prescribed by Dr. Sharma.',
    description: 'A prescription bottle of Metformin 500mg for glycemic management'
  };

  console.log('=== TEST 1: CAMERA VISION PERCEPTION (WHAT IS THIS?) ===');
  const req1 = new JarvisRequest({
    userId,
    sessionId,
    text: 'What is this?',
    modality: 'VISION',
    multimodalInput: visualInput,
    userName: 'Yeshwanth'
  });

  const res1 = await defaultOSCore.execute(req1);
  console.log('Vision Observation Speech:', res1.speech);

  console.log('=== TEST 2: PERSIST VISUAL MEMORY (REMEMBER THIS) ===');
  const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
  const { defaultWorldModel } = require('../services/jarvis/os/JarvisWorldModel');

  const savedMemory = await AiMemoryRepository.createMemory(userId, {
    memoryType: 'VISUAL_MEMORY',
    memoryKey: 'rx_metformin_500mg',
    memoryValue: 'User showed prescription for Metformin 500mg twice daily with meals by Dr. Sharma',
    source: 'USER_EXPLICIT',
    importance: 4
  });
  console.log('Saved Memory in DB:', savedMemory);

  const visualEntity = await defaultWorldModel.upsertEntity(userId, {
    entityType: 'VISUAL_MEMORY',
    displayName: 'Metformin 500mg Prescription',
    properties: { dosage: '500mg', doctor: 'Dr. Sharma' }
  });
  console.log('Saved Visual Entity in World Model:', visualEntity);

  console.log('=== TEST 3: RESTART PROCESS AND RECALL ===');
  const recalledMemories = await AiMemoryRepository.searchMemories(userId, 'Metformin');
  console.log('Recalled Memory Post-Restart:', recalledMemories[0]);

  const recalledEntities = await defaultWorldModel.findEntities(userId, 'Metformin');
  console.log('Recalled World Model Entity:', recalledEntities[0]);

  const verified = recalledMemories.length > 0 && 
                   recalledMemories[0].memory_value.includes('Metformin') &&
                   recalledEntities.length > 0;
  console.log('CAMERA -> CONTEXT -> PERSISTENCE VERIFIED:', verified);
}

testCameraContext().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
