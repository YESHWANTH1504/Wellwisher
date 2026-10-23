const test = require('node:test');
const assert = require('node:assert/strict');
const VoiceResponseFormatter = require('../services/jarvis/agent/VoiceResponseFormatter');

test.describe('JARVIS TTS Markdown & Asterisk Vocalization Elimination', () => {

  test('1. Bold markdown asterisks are completely removed and not spoken as "astric" or "asterisk"', () => {
    const raw = '**Scheduled!** 🤝 **Meeting with Arun** at **4:00 PM** on **2026-09-08**. ⚠️ *Conflict note:* You already have "Evening Snacks" scheduled.';
    const speech = VoiceResponseFormatter.sanitizeForSpeech(raw);

    assert.equal(speech.includes('*'), false, 'Spoken output must NEVER contain asterisks');
    assert.equal(speech.includes('**'), false, 'Spoken output must NEVER contain double asterisks');
    assert.ok(speech.includes('Scheduled!'), 'Readable text must be preserved');
    assert.ok(speech.includes('Meeting with Arun at 4:00 PM on 2026-09-08.'), 'Readable details must be preserved');
    assert.ok(speech.includes('Conflict note:'), 'Labels must be preserved without asterisk');
  });

  test('2. Markdown bullet lists are converted into natural spoken pauses instead of raw asterisks or dashes', () => {
    const raw = `Here is your schedule for today:
* Meeting with Arun
* Call Mom
* Workout`;
    const speech = VoiceResponseFormatter.sanitizeForSpeech(raw);

    assert.equal(speech.includes('*'), false, 'Bullet asterisks must not reach TTS');
    assert.equal(speech.includes('-'), false, 'Bullet dashes must not reach TTS');
    assert.ok(speech.includes('Meeting with Arun'), 'First item preserved');
    assert.ok(speech.includes('Call Mom'), 'Second item preserved');
    assert.ok(speech.includes('Workout'), 'Third item preserved');
  });

  test('3. Underscores in markdown emphasis are removed, but legitimate snake_case identifiers are preserved', () => {
    const raw = '### Summary: _Priority_ task is ~~cancelled~~ completed. Check the file_name and snake_case variable.';
    const speech = VoiceResponseFormatter.sanitizeForSpeech(raw);

    assert.equal(speech.includes('#'), false, 'Header hashes must not reach TTS');
    assert.equal(speech.includes('~'), false, 'Strikethroughs must not reach TTS');
    assert.ok(speech.includes('file_name'), 'Legitimate snake_case identifier file_name must be preserved');
    assert.ok(speech.includes('snake_case'), 'Legitimate snake_case identifier snake_case must be preserved');
    assert.ok(speech.includes('Summary: Priority task is cancelled completed.'), `Got: "${speech}"`);
  });

  test('4. Inline backticks and fenced code blocks are removed', () => {
    const raw = 'The status is `scheduled`.\n```json\n{"id": "ev_123"}\n```\nAll done.';
    const speech = VoiceResponseFormatter.sanitizeForSpeech(raw);

    assert.equal(speech.includes('`'), false, 'Backticks must not reach TTS');
    assert.equal(speech.includes('{'), false, 'Code blocks must not reach TTS');
    assert.ok(speech.includes('The status is scheduled.'), `Got: "${speech}"`);
    assert.ok(speech.includes('All done.'), `Got: "${speech}"`);
  });

  test('5. Markdown links [Text](URL) extract only the label text', () => {
    const raw = 'View your appointment at [Hospital Portal](https://wellwisher.com/portal) for details.';
    const speech = VoiceResponseFormatter.sanitizeForSpeech(raw);

    assert.equal(speech.includes('['), false, 'Brackets must not reach TTS');
    assert.equal(speech.includes(']'), false, 'Brackets must not reach TTS');
    assert.equal(speech.includes('https://'), false, 'Raw URLs must not reach TTS');
    assert.ok(speech.includes('View your appointment at Hospital Portal for details.'), `Got: "${speech}"`);
  });

  test('6. Exact User Specification Example 1: Scheduled! Meeting with Arun at 4:00 PM', () => {
    const input = 'Scheduled! Meeting with Arun at 4:00 PM';
    const output = VoiceResponseFormatter.sanitizeForSpeech(input);
    assert.equal(output, 'Scheduled! Meeting with Arun at 4:00 PM');
  });

  test('7. Exact User Specification Example 2: Multiline bullet list to natural speech', () => {
    const input = `* Meeting with Arun

Call Mom
Workout`;
    const output = VoiceResponseFormatter.sanitizeForSpeech(input);
    assert.equal(output, 'Meeting with Arun. Call Mom. Workout.');
  });

  test('8. Exact User Specification Example 3: Markdown link [Open Settings](https://example.com)', () => {
    const input = '[Open Settings](https://example.com)';
    const output = VoiceResponseFormatter.sanitizeForSpeech(input);
    assert.equal(output, 'Open Settings');
  });

  test('9. Exact User Specification Example 4: Multiline schedule headers and items', () => {
    const input = `Today's Schedule
Meeting at 4:00 PM
Workout at 6:30 PM`;
    const output = VoiceResponseFormatter.sanitizeForSpeech(input);
    assert.equal(output, "Today's Schedule. Meeting at 4:00 PM. Workout at 6:30 PM.");
  });

  test('10. Normal conversational text, numbers, times, hyphens, and decimals are preserved', () => {
    const raw = 'Your meeting is at 6:30 PM. You have walked 8,420 steps, pi is 3.14, and your well-being score is 9.5. Are you feeling okay?';
    const speech = VoiceResponseFormatter.sanitizeForSpeech(raw);

    assert.equal(speech, 'Your meeting is at 6:30 PM. You have walked 8,420 steps, pi is 3.14, and your well-being score is 9.5. Are you feeling okay?');
  });

  test('11. Edge cases: empty string, whitespace only, null or undefined input', () => {
    assert.equal(VoiceResponseFormatter.sanitizeForSpeech(''), 'Done.');
    assert.equal(VoiceResponseFormatter.sanitizeForSpeech('   '), 'Done.');
    assert.equal(VoiceResponseFormatter.sanitizeForSpeech(null), 'Done.');
    assert.equal(VoiceResponseFormatter.sanitizeForSpeech(undefined), 'Done.');
    assert.equal(VoiceResponseFormatter.formatForSpeech('Test'), 'Test');
  });
});
