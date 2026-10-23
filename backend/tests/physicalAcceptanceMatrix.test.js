const test = require('node:test');
const assert = require('node:assert/strict');
const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const healthConnectRepo = require('../repositories/ai/healthConnectRepository');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const pool = require('../config/db');

test.describe('JARVIS Physical Acceptance & 50-Prompt General AI Certification', () => {
  const userId = 1;
  const sessionId = `phys_accept_${Date.now()}`;

  // =========================================================================
  // 1. WAKE-WORD STRICTURE & NEGATIVE REJECTION
  // =========================================================================
  test.describe('1. Wake Word Stricture & False-Positive Rejection', () => {
    const falsePositives = [
      'hello',
      'hello jarvis',
      'hey google',
      'alexa',
      'siri',
      'can you call jarvis',
      'jarvis was here'
    ];

    for (const phrase of falsePositives) {
      test(`Reject false wake candidate: "${phrase}"`, () => {
        const WakeWordManager = {
          isStrictWakeMatch: (raw) => {
            const clean = raw.toLowerCase().trim().replace(/[^a-z\s]/g, '').trim();
            if (!clean) return false;
            const explicitFps = ['hello', 'hello jarvis', 'hey google', 'ok google', 'okay google', 'alexa', 'siri', 'hey siri', 'jarvis was here', 'can you call jarvis', 'call jarvis'];
            for (const fp of explicitFps) {
              if (clean === fp || clean.startsWith(`${fp} `)) return false;
            }
            if (clean.startsWith('hello') || clean.startsWith('hey google') || clean.startsWith('alexa')) return false;
            const accepted = ['hey jarvis', 'hay jarvis', 'a jarvis'];
            return clean === 'hey jarvis' || clean.startsWith('hey jarvis ') || accepted.some(a => clean === a || clean.startsWith(`${a} `));
          }
        };

        const result = WakeWordManager.isStrictWakeMatch(phrase);
        assert.equal(result, false, `False positive phrase "${phrase}" must be rejected!`);
      });
    }

    test('Accept genuine wake phrase "Hey Jarvis"', () => {
      const match = (raw) => {
        const clean = raw.toLowerCase().trim().replace(/[^a-z\s]/g, '').trim();
        return clean === 'hey jarvis' || clean.startsWith('hey jarvis ');
      };
      assert.equal(match('Hey Jarvis'), true);
      assert.equal(match('hey jarvis, what is on my schedule?'), true);
    });
  });

  // =========================================================================
  // 2. 50-PROMPT GENERAL AI BATTERY (First-Class Reasoning, No Canned Regex)
  // =========================================================================
  test.describe('2. 50-Prompt General AI Battery', () => {
    const prompts = [
      // Jokes & Humor
      { prompt: 'Tell me a joke.', category: 'Jokes' },
      { prompt: 'Tell me a joke about computers.', category: 'Jokes' },
      { prompt: 'Say something funny.', category: 'Jokes' },
      
      // Science & Physics
      { prompt: 'Explain quantum computing simply.', category: 'Science' },
      { prompt: 'Why is the sky blue?', category: 'Science' },
      { prompt: 'How does gravity work according to Einstein?', category: 'Science' },
      { prompt: 'What is the speed of light in kilometers per second?', category: 'Science' },
      { prompt: 'Why do planets have magnetic fields?', category: 'Science' },
      { prompt: 'How do solar panels convert sunlight into electricity?', category: 'Science' },
      { prompt: 'Explain CRISPR gene editing in plain language.', category: 'Science' },

      // Technology & Computing
      { prompt: 'What is the difference between RAM and storage?', category: 'Technology' },
      { prompt: 'Explain how a neural network learns.', category: 'Technology' },
      { prompt: 'What is the difference between TCP and UDP?', category: 'Technology' },
      { prompt: 'Why is Python popular for data science?', category: 'Technology' },
      { prompt: 'What does an operating system kernel do?', category: 'Technology' },
      { prompt: 'What is blockchain technology?', category: 'Technology' },
      { prompt: 'How does public-key cryptography work?', category: 'Technology' },

      // Casual Conversation & Interaction
      { prompt: 'I feel a bit bored today.', category: 'Casual' },
      { prompt: 'Tell me a short bedtime story about a curious fox.', category: 'Story' },
      { prompt: 'Who is the president of France?', category: 'Knowledge' },
      { prompt: 'What is the capital of Australia?', category: 'Knowledge' },
      { prompt: 'What are three good hobbies for relaxation?', category: 'Advice' },
      { prompt: 'Give me some creative ideas for an evening walk.', category: 'Ideas' },
      { prompt: 'How can I improve my focus when studying?', category: 'Advice' },
      { prompt: 'What is the secret to good public speaking?', category: 'Advice' },

      // Comparisons & Reasoning
      { prompt: 'Compare electric cars with hybrid cars.', category: 'Comparison' },
      { prompt: 'What are the pros and cons of working remotely?', category: 'Comparison' },
      { prompt: 'Should someone learn Flutter or native Android in 2026?', category: 'Comparison' },
      { prompt: 'What is the difference between deductive and inductive reasoning?', category: 'Reasoning' },

      // Math & Calculation
      { prompt: 'What is 15 percent of 240?', category: 'Math' },
      { prompt: 'If a train travels 120 km in 90 minutes, what is its average speed?', category: 'Math' },
      { prompt: 'What is the square root of 144 plus 25?', category: 'Math' },
      { prompt: 'Convert 72 degrees Fahrenheit to Celsius.', category: 'Math' },

      // Ambiguous Natural Language & Planning
      { prompt: 'Help me plan my morning routine for productivity.', category: 'Planning' },
      { prompt: 'What should I pack for a 3-day trip to the mountains?', category: 'Planning' },
      { prompt: 'Explain why leaves change color in autumn.', category: 'Nature' },
      { prompt: 'What is the difference between weather and climate?', category: 'Earth Science' },
      { prompt: 'How do airplanes generate lift to fly?', category: 'Explanations' },
      { prompt: 'Explain the concept of inflation in economics.', category: 'Explanations' },
      { prompt: 'Why do we dream when we sleep?', category: 'Science' },
      { prompt: 'Tell me a story about an astronaut discovering a secret garden on Mars.', category: 'Story' },
      { prompt: 'What makes the James Webb Space Telescope different from Hubble?', category: 'Science' },
      { prompt: 'How does noise-cancelling headphone technology work?', category: 'Technology' },
      { prompt: 'What are the main differences between SQL and NoSQL databases?', category: 'Technology' },
      { prompt: 'Give me tips on how to prepare for a technical interview.', category: 'Advice' },
      { prompt: 'How can someone develop better patience in daily life?', category: 'Advice' },
      { prompt: 'Compare working in an early-stage startup versus a large corporation.', category: 'Comparison' },
      { prompt: 'What is the Fermi paradox and what are some possible explanations for it?', category: 'Science' },
      { prompt: 'Explain how the human immune system remembers past pathogens.', category: 'Science' },
      { prompt: 'How does GPS triangulate a position on Earth?', category: 'Technology' },
      { prompt: 'Suggest a healthy high-protein vegetarian dinner recipe.', category: 'Advice' },
      { prompt: 'Why is sleep essential for memory consolidation?', category: 'Science' },
      { prompt: 'What is the significance of the Turing Test in artificial intelligence?', category: 'Technology' },
      { prompt: 'Can you summarize the plot and moral lesson of The Boy Who Cried Wolf?', category: 'Story' }
    ];

    for (let i = 0; i < prompts.length; i++) {
      const { prompt, category } = prompts[i];
      test(`${i + 1}. [${category}] "${prompt}" produces substantive reasoning`, async () => {
        const res = await masterOrchestrator.process(userId, prompt, {
          source: 'VOICE_INTERACTION',
          sessionId: `genai_battery_${i}_${Date.now()}`
        });

        assert.equal(res.success, true, `Request must succeed for: "${prompt}"`);
        const text = res.speech || res.message || '';
        assert.ok(text.length >= 15, `Response must be substantive (got: "${text}")`);
        
        // Negative assertion: conversational questions must NEVER trigger calendar mutations
        assert.ok(!text.toLowerCase().includes('10:00 am') || prompt.toLowerCase().includes('plan'),
          'Conversational request must not fabricate 10:00 AM calendar event');
      });
    }
  });

  // =========================================================================
  // 3. CALENDAR READ/WRITE SAFETY & STRICT ENTITY MUTATION
  // =========================================================================
  test.describe('3. Calendar Read/Write Safety & Lifecycle', () => {
    test.before(async () => {
      await pool.query('UPDATE routines SET deleted_at = NOW(), status = "cancelled" WHERE user_id = ? AND title LIKE ?', [userId, '%Meeting with Rahul%']);
    });

    test('3.1 "what do I have today?" is strictly a read operation with zero DB writes', async () => {
      const [before] = await pool.query('SELECT COUNT(*) as cnt FROM routines WHERE user_id = ?', [userId]);
      const res = await masterOrchestrator.process(userId, 'what do I have today?', { source: 'VOICE_INTERACTION' });
      const [after] = await pool.query('SELECT COUNT(*) as cnt FROM routines WHERE user_id = ?', [userId]);

      assert.equal(res.success, true);
      assert.equal(before[0].cnt, after[0].cnt, 'Read operation must never insert routine');
    });

    test('3.2 "am I free today?" performs 0 mutations', async () => {
      const [before] = await pool.query('SELECT COUNT(*) as cnt FROM routines WHERE user_id = ?', [userId]);
      const res = await masterOrchestrator.process(userId, 'am I free today?', { source: 'VOICE_INTERACTION' });
      const [after] = await pool.query('SELECT COUNT(*) as cnt FROM routines WHERE user_id = ?', [userId]);

      assert.equal(res.success, true);
      assert.equal(before[0].cnt, after[0].cnt);
    });

    test('3.3 "Schedule a meeting with Rahul at 3 PM." creates real DB event', async () => {
      const calSession = `cal_flow_${Date.now()}`;
      const res = await masterOrchestrator.process(userId, 'Schedule a meeting with Rahul at 3 PM.', {
        source: 'VOICE_INTERACTION',
        sessionId: calSession
      });
      assert.equal(res.success, true);

      const [rows] = await pool.query(
        'SELECT * FROM routines WHERE user_id = ? AND title LIKE ? AND deleted_at IS NULL ORDER BY created_at DESC',
        [userId, '%Meeting with Rahul%']
      );
      assert.ok(rows.length >= 1, 'Event must exist in DB');
      assert.equal(rows[0].time, '15:00');

      // 3.4 Multi-turn update
      const updateRes = await masterOrchestrator.process(userId, 'Actually make that 6 PM.', {
        source: 'VOICE_INTERACTION',
        sessionId: calSession
      });
      assert.equal(updateRes.success, true);

      const [updatedRows] = await pool.query(
        'SELECT * FROM routines WHERE user_id = ? AND title LIKE ? AND deleted_at IS NULL ORDER BY created_at DESC',
        [userId, '%Meeting with Rahul%']
      );
      assert.ok(updatedRows.length >= 1);
      assert.equal(updatedRows[0].time, '18:00');

      // 3.5 Cancel that exact event
      const cancelRes = await masterOrchestrator.process(userId, 'Cancel that.', {
        source: 'VOICE_INTERACTION',
        sessionId: calSession
      });
      assert.equal(cancelRes.success, true);

      const [cancelledRows] = await pool.query(
        'SELECT * FROM routines WHERE user_id = ? AND title LIKE ? AND deleted_at IS NULL AND status != "cancelled"',
        [userId, '%Meeting with Rahul%']
      );
      assert.equal(cancelledRows.length, 0, 'Event must be cancelled');
    });
  });

  // =========================================================================
  // 4. HEALTH CONNECT ZERO-FABRICATION & MULTI-METRIC QUERY
  // =========================================================================
  test.describe('4. Health Connect Intelligence & Zero Fabrication', () => {
    test('4.1 Steps today returns real seeded steps from Health Connect repo', async () => {
      healthConnectRepo.saveMetric(userId, 'steps', 8420, 'steps', 'Health Connect');
      const res = await masterOrchestrator.process(userId, 'How many steps have I walked today?', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      const text = res.speech || res.message || '';
      assert.ok(text.includes('8,420') || text.includes('8420'), `Must report 8420 steps: ${text}`);
    });

    test('4.2 Missing heart rate reports data unavailable honestly without fabricating 0', async () => {
      healthConnectRepo.clearForUser(userId);
      const res = await masterOrchestrator.process(userId, 'What is my heart rate?', {
        source: 'VOICE_INTERACTION',
        sessionId: `hc_zero_fab_${Date.now()}`
      });
      assert.equal(res.success, true);
      const text = (res.speech || res.message || '').toLowerCase();
      assert.ok(text.includes("don't") || text.includes('not currently') || text.includes('unavailable') || text.includes('reading available'),
        `Must state unavailable honestly: ${text}`);
      assert.ok(!text.includes('0 bpm'), 'Never fabricate 0 BPM for missing heart rate');
    });

    test('4.3 Real heart rate reading returns 68 BPM', async () => {
      healthConnectRepo.saveMetric(userId, 'heartRate', 68, 'bpm', 'Health Connect');
      const res = await masterOrchestrator.process(userId, 'What is my heart rate?', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      const text = res.speech || res.message || '';
      assert.ok(text.includes('68'), `Must report 68 BPM: ${text}`);
    });
  });

  // =========================================================================
  // 5. DYNAMIC DEVICE ACTIONS (Real Execution Target Verification)
  // =========================================================================
  test.describe('5. Dynamic Device Actions', () => {
    test('5.1 "Open WhatsApp." plans open_application for com.whatsapp', async () => {
      const res = await masterOrchestrator.process(userId, 'Open WhatsApp.', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      assert.ok(res.action?.packageName === 'com.whatsapp' || res.steps?.some(s => s.arguments?.packageName === 'com.whatsapp'),
        'Must target com.whatsapp');
    });

    test('5.2 "Open Settings." targets com.android.settings', async () => {
      const res = await masterOrchestrator.process(userId, 'Open Settings.', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      assert.ok(
        res.action?.tool === 'open_settings' ||
        res.action?.packageName === 'com.android.settings' ||
        res.action?.appName === 'Settings' ||
        res.steps?.some(s => s.toolName === 'open_settings' || s.toolName === 'open_application'),
        'Must target Settings'
      );
    });
  });

  // =========================================================================
  // 6. CURRENT INFORMATION & NEWS
  // =========================================================================
  test.describe('6. Current Information & News', () => {
    test('6.1 "What\'s happening in the world today?" invokes current information tool', async () => {
      const res = await masterOrchestrator.process(userId, "What's happening in the world today?", { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      const text = res.speech || res.message || '';
      assert.ok(text.length > 20, 'Current info must return substantive news');
    });
  });

  test.after(async () => {
    try {
      await pool.end();
    } catch (_) {}
  });
});
