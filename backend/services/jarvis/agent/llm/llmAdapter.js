const LLMProvider = require('./llmProvider');
const { GoogleGenAI } = require('@google/genai');

class LLMAdapter extends LLMProvider {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || (process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '');
    this.modelName = options.modelName || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    this.timeoutMs = options.timeoutMs || 20000;
    this.aiClient = null;

    if (this.apiKey && !this.apiKey.includes('your_gemini_api_key')) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.warn('LLMAdapter: Gemini SDK init warning:', err.message);
      }
    }
  }

  /**
   * Plan request: Produces structured intent and planned tool calls
   */
  async plan(contextPackage, requestText, availableTools = []) {
    const raw = (requestText || '').trim();
    const lower = raw.toLowerCase();
    const temporal = contextPackage.temporalContext || {};
    const today = temporal.currentDate || new Date().toISOString().split('T')[0];
    const tomorrow = temporal.resolvedDates?.tomorrow || today;

    // 1. Prompt Injection Defense: Detect overt override commands
    if (
      lower.includes('ignore all previous instructions') ||
      lower.includes('ignore all system instructions') ||
      lower.includes('delete everything') ||
      lower.includes('drop table')
    ) {
      return {
        type: 'FINAL_RESPONSE',
        intent: 'SECURITY_ALERT',
        message: 'I cannot comply with requests that attempt to override core security or system rules.',
        toolCalls: []
      };
    }

    // 2. Deterministic Intent & Action Planner

    // A. Greeting & Simple Conversational
    if (/^(hi|hello|hey|good morning|good evening|who are you|how are you)(\s+jarvis)?\b/i.test(lower)) {
      const assistantName = contextPackage.user?.assistantName || 'JARVIS';
      return {
        type: 'FINAL_RESPONSE',
        intent: 'GENERAL_CONVERSATION',
        message: `Hello! I am ${assistantName}, your personal assistant. How can I assist you with your schedule, wellness, or daily routines today?`,
        toolCalls: []
      };
    }

    // B. Memory Request: "Remember that I prefer morning meetings"
    if (lower.startsWith('remember that') || lower.startsWith('remember:') || (lower.includes('remember') && lower.includes('prefer'))) {
      const statement = raw.replace(/^(jarvis,?\s*)?(remember that|remember:?)\s*/i, '').trim();
      return {
        type: 'TOOL_CALL',
        intent: 'MEMORY_REQUEST',
        toolCalls: [
          {
            tool: 'save_memory',
            arguments: {
              memoryType: 'USER_PREFERENCE',
              memoryKey: 'user_preference',
              memoryValue: statement || raw,
              importance: 4
            }
          }
        ]
      };
    }

    // C. Health Queries: "How much water have I had today?"
    if (lower.includes('how much water') || lower.includes('water intake') || lower.includes('hydration')) {
      return {
        type: 'TOOL_CALL',
        intent: 'WELLNESS_QUERY',
        toolCalls: [
          {
            tool: 'get_hydration',
            arguments: { date: today }
          }
        ]
      };
    }

    // D. Medication Queries: "Did I take my medicine?" / "My medications"
    if (lower.includes('medicine') || lower.includes('medication') || lower.includes('pill')) {
      return {
        type: 'TOOL_CALL',
        intent: 'MEDICATION_QUERY',
        toolCalls: [
          {
            tool: 'get_medications',
            arguments: {}
          }
        ]
      };
    }

    // E. Schedule Query: "What do I have today?" / "What's next?" / "Schedule"
    if (lower.includes("what's next") || lower.includes('what do i have') || lower.includes('my schedule today') || lower.includes('what is on my schedule')) {
      return {
        type: 'TOOL_CALL',
        intent: 'SCHEDULE_QUERY',
        toolCalls: [
          {
            tool: 'get_today_schedule',
            arguments: { date: today }
          }
        ]
      };
    }

    // F. Multi-Step Planning Request: "Schedule my usual workout tomorrow when I am free"
    if (lower.includes('usual workout') && lower.includes('when i am free')) {
      // Find workout preference memory
      const workoutMem = contextPackage.relevantMemories?.find(m => 
        (m.memory_key || '').toLowerCase().includes('workout') || (m.memory_value || '').toLowerCase().includes('workout')
      );
      const defaultTime = workoutMem?.memory_value?.includes('6:00 AM') ? '06:00 AM' : '07:00 AM';

      return {
        type: 'TOOL_CALL',
        intent: 'PLANNING_REQUEST',
        toolCalls: [
          {
            tool: 'find_free_time',
            arguments: { date: tomorrow, durationMinutes: 45 }
          },
          {
            tool: 'create_schedule',
            arguments: {
              title: 'Morning Workout',
              time: defaultTime,
              date: tomorrow,
              category: 'exercise'
            }
          }
        ]
      };
    }

    // G. Usual Workout / Routine Creation: "Schedule my usual workout tomorrow"
    if (lower.includes('usual workout') || lower.includes('usual gym')) {
      const workoutMem = contextPackage.relevantMemories?.find(m => 
        (m.memory_key || '').toLowerCase().includes('workout') || (m.memory_value || '').toLowerCase().includes('workout')
      );
      let workoutTime = '07:00 AM';
      if (workoutMem) {
        if (workoutMem.memory_value.includes('6:00 AM') || workoutMem.memory_value.includes('6 AM')) workoutTime = '06:00 AM';
        else if (workoutMem.memory_value.includes('6:30 AM')) workoutTime = '06:30 AM';
      }

      return {
        type: 'TOOL_CALL',
        intent: 'SCHEDULE_REQUEST',
        toolCalls: [
          {
            tool: 'create_schedule',
            arguments: {
              title: 'Morning Workout',
              time: workoutTime,
              date: lower.includes('tomorrow') ? tomorrow : today,
              category: 'exercise'
            }
          }
        ]
      };
    }

    // H. Schedule Creation: "Schedule a meeting tomorrow at 10 AM"
    if (lower.includes('schedule') || lower.includes('remind me to') || lower.includes('set a meeting') || lower.includes('add a meeting')) {
      const timeMatch = raw.match(/\b(\d{1,2}(:\d{2})?\s*(AM|PM|am|pm))\b/);
      const extractedTime = timeMatch ? timeMatch[0].toUpperCase() : '10:00 AM';

      let title = raw
        .replace(/^(jarvis,?\s*)?(please\s+)?(schedule|remind me to|set a|add a)\s+/i, '')
        .replace(/\s+(tomorrow|today|at\s+\d{1,2}(:\d{2})?\s*(AM|PM|am|pm)).*$/i, '')
        .trim();
      if (!title) title = 'Scheduled Activity';

      return {
        type: 'TOOL_CALL',
        intent: 'SCHEDULE_REQUEST',
        toolCalls: [
          {
            tool: 'create_schedule',
            arguments: {
              title: title,
              time: extractedTime,
              date: lower.includes('tomorrow') ? tomorrow : today,
              category: lower.includes('meeting') ? 'office' : 'custom'
            }
          }
        ]
      };
    }

    // I. Schedule Deletion: "Delete my appointment" / "Cancel my 5 PM meeting"
    if (lower.includes('delete') || lower.includes('cancel')) {
      const routines = contextPackage.todaySchedule || [];
      const targetRoutine = routines.find(r => lower.includes(r.title.toLowerCase()) || (r.time && lower.includes(r.time.toLowerCase()))) || routines[0];
      const targetId = targetRoutine?.id || 'rot_target_1';

      return {
        type: 'TOOL_CALL',
        intent: 'SCHEDULE_DELETE',
        toolCalls: [
          {
            tool: 'delete_schedule',
            arguments: {
              scheduleId: targetId
            }
          }
        ]
      };
    }

    // J. Document & Report Queries: "What does my blood report say?" / "Explain my report"
    if (lower.includes('blood report') || lower.includes('lab report') || lower.includes('explain this report') || lower.includes('my report') || lower.includes('values shown in this report') || lower.includes('hemoglobin') || lower.includes('fasting glucose') || lower.includes('hba1c')) {
      const topDocId = contextPackage.documentContext?.latestDocumentId || contextPackage.documentContext?.recentDocuments?.[0]?.id;
      if (topDocId) {
        if (lower.includes('value') || lower.includes('hemoglobin') || lower.includes('glucose') || lower.includes('hba1c')) {
          return {
            type: 'TOOL_CALL',
            intent: 'DOCUMENT_EXTRACTION_QUERY',
            toolCalls: [
              {
                tool: 'get_document_extraction',
                arguments: { documentId: topDocId }
              }
            ]
          };
        }
        return {
          type: 'TOOL_CALL',
          intent: 'DOCUMENT_SUMMARY_QUERY',
          toolCalls: [
            {
              tool: 'get_document_summary',
              arguments: { documentId: topDocId }
            }
          ]
        };
      }
      return {
        type: 'TOOL_CALL',
        intent: 'DOCUMENT_LIST_QUERY',
        toolCalls: [
          {
            tool: 'get_documents',
            arguments: {}
          }
        ]
      };
    }

    // K. Report Comparison Query: "Compare my reports" / "What changed between these reports?"
    if (lower.includes('compare') && (lower.includes('report') || lower.includes('document') || lower.includes('latest') || lower.includes('previous'))) {
      const recentDocs = contextPackage.documentContext?.recentDocuments || [];
      if (recentDocs.length >= 2) {
        return {
          type: 'TOOL_CALL',
          intent: 'DOCUMENT_COMPARISON_QUERY',
          toolCalls: [
            {
              tool: 'compare_documents',
              arguments: {
                latestDocumentId: recentDocs[0].id,
                previousDocumentId: recentDocs[1].id
              }
            }
          ]
        };
      }
      return {
        type: 'TOOL_CALL',
        intent: 'DOCUMENT_LIST_QUERY',
        toolCalls: [
          {
            tool: 'get_documents',
            arguments: {}
          }
        ]
      };
    }

    // L. List Documents: "Show me my previous reports" / "List my documents"
    if (lower.includes('show me my') && (lower.includes('report') || lower.includes('document')) || lower.includes('previous reports') || lower.includes('my documents')) {
      return {
        type: 'TOOL_CALL',
        intent: 'DOCUMENT_LIST_QUERY',
        toolCalls: [
          {
            tool: 'get_documents',
            arguments: {}
          }
        ]
      };
    }

    // M. Health Trends: "Show me my recent health trends" / "What changed in my health?"
    if (lower.includes('health trend') || lower.includes('recent trends') || lower.includes('trends in my blood') || lower.includes('biomarker trend')) {
      return {
        type: 'TOOL_CALL',
        intent: 'HEALTH_TRENDS_QUERY',
        toolCalls: [
          {
            tool: 'get_health_trends',
            arguments: {}
          }
        ]
      };
    }

    // N. Medication Review / Conflicts: "Are there any medication items I should discuss with my doctor?"
    if (lower.includes('medication item') || lower.includes('medication conflict') || lower.includes('medication concern') || (lower.includes('discuss') && lower.includes('medication'))) {
      return {
        type: 'TOOL_CALL',
        intent: 'MEDICATION_RECONCILIATION_QUERY',
        toolCalls: [
          {
            tool: 'check_medication_conflicts',
            arguments: {}
          }
        ]
      };
    }

    // O. Doctor Briefing: "Prepare a summary for my doctor" / "Doctor visit briefing"
    if (lower.includes('summary for my doctor') || lower.includes('doctor briefing') || lower.includes('prepare for my doctor') || lower.includes('briefing for doctor') || lower.includes('questions should i ask my doctor')) {
      return {
        type: 'TOOL_CALL',
        intent: 'DOCTOR_BRIEFING_REQUEST',
        toolCalls: [
          {
            tool: 'generate_doctor_briefing',
            arguments: {}
          }
        ]
      };
    }

    // P. Health Alerts: "Do I have any health alerts?"
    if (lower.includes('health alert') || lower.includes('health warning') || lower.includes('out of range alert')) {
      return {
        type: 'TOOL_CALL',
        intent: 'HEALTH_ALERTS_QUERY',
        toolCalls: [
          {
            tool: 'get_health_alerts',
            arguments: {}
          }
        ]
      };
    }

    // Q. Family Notification: "Tell my family I'm running late"
    if (lower.includes('tell my') || lower.includes('notify family')) {
      return {
        type: 'TOOL_CALL',
        intent: 'FAMILY_REQUEST',
        toolCalls: [
          {
            tool: 'send_family_notification',
            arguments: {
              toUserName: 'Family',
              message: raw,
              nudgeType: 'check_in'
            }
          }
        ]
      };
    }

    // Default conversational response
    return {
      type: 'FINAL_RESPONSE',
      intent: 'GENERAL_CONVERSATION',
      message: `I understand you said: "${raw}". How would you like me to help with this in your schedule or wellness tracker?`,
      toolCalls: []
    };
  }

  /**
   * Synthesize final user-facing response from tool execution outputs
   */
  async synthesizeResponse(contextPackage, requestText, executionResults = []) {
    if (executionResults.length === 0) {
      return `I have processed your request: "${requestText}".`;
    }

    const first = executionResults[0];
    if (!first.success) {
      return `I couldn't complete that action because: ${first.message || 'of an execution failure'}.`;
    }

    if (first.toolName === 'create_schedule') {
      const rot = first.data?.createdRoutine || {};
      return `I have scheduled "${rot.title || 'your task'}" for ${rot.date || 'today'} at ${rot.time || 'the requested time'}.`;
    }

    if (first.toolName === 'delete_schedule') {
      return `Successfully deleted the scheduled routine "${first.data?.deletedTitle || 'item'}".`;
    }

    if (first.toolName === 'get_today_schedule') {
      const count = first.data?.count || 0;
      if (count === 0) return 'You have no scheduled routines for today.';
      const items = (first.data?.routines || []).map(r => `• ${r.time}: ${r.title}`).join('\n');
      return `Here is your schedule for today (${count} items):\n${items}`;
    }

    if (first.toolName === 'get_hydration') {
      return `You have logged ${first.data?.totalMl || 0}ml of water today (${first.data?.percentage || 0}% of your 2,500ml daily goal).`;
    }

    if (first.toolName === 'save_memory') {
      return `I have remembered that for you: "${first.data?.savedMemory?.memory_value || requestText}".`;
    }

    if (first.toolName === 'get_medications') {
      const count = first.data?.count || 0;
      return `You have ${count} active medication(s) prescribed.`;
    }

    if (first.toolName === 'get_documents') {
      const count = first.data?.count || 0;
      if (count === 0) return 'You have no uploaded clinical or medical documents in your repository.';
      const list = (first.data?.documents || []).map(d => `• ${d.originalFilename} (${d.documentType.replace(/_/g, ' ')}, ${d.status})`).join('\n');
      return `You have ${count} document(s) uploaded:\n${list}`;
    }

    if (first.toolName === 'get_document_summary') {
      const sum = first.data?.summary || 'Summary unavailable.';
      const disclaimer = first.data?.disclaimer || '';
      return `${sum}\n\nDisclaimer: ${disclaimer}`;
    }

    if (first.toolName === 'get_document_extraction') {
      const extractions = first.data?.extractions || [];
      if (extractions.length === 0) return 'No structured metrics were found in this document.';
      const list = extractions.map(e => `• ${e.fieldName}: ${e.value} ${e.unit || ''}` + (e.referenceRange ? ` (Range: ${e.referenceRange})` : '')).join('\n');
      return `Here are the extracted parameters from the report:\n${list}\n\nThis is an informational summary and not a diagnosis.`;
    }

    if (first.toolName === 'compare_documents') {
      const comps = first.data?.comparisons || [];
      if (comps.length === 0) return 'No matching test metrics were found between these two reports to compare.';
      const list = comps.map(c => `• ${c.fieldName}: Latest ${c.latest?.value} ${c.unit} vs Previous ${c.previous?.value} ${c.unit} (Change: ${c.change})`).join('\n');
      return `Comparison between your reports:\n${list}\n\nNote: Numerical comparisons reflect extracted test data and do not constitute a diagnosis.`;
    }

    if (first.toolName === 'delete_document') {
      return first.data?.message || 'Document deleted successfully.';
    }

    if (first.toolName === 'get_health_trends') {
      const trends = first.data?.trends || [];
      if (trends.length === 0) return 'No historical health trends found yet. Uploading two or more laboratory reports will automatically calculate biomarker trends.';
      const list = trends.map(t => `• ${t.metricName}: Latest ${t.latestValue} ${t.unit} (Change: ${t.changeValue || 'Stable'}, Trend: ${t.trendDirection})`).join('\n');
      return `Here are your recent biomarker trends:\n${list}\n\nNote: All trend calculations are informational and not a clinical diagnosis.`;
    }

    if (first.toolName === 'check_medication_conflicts') {
      const concerns = first.data?.potentialConcerns || [];
      const questions = first.data?.doctorQuestions || [];
      if (concerns.length === 0) return 'No potential medication discrepancies or duplicates were identified across your records.';
      const concernList = concerns.map(c => `• [${c.classification}] ${c.reason}`).join('\n');
      const qList = questions.map(q => `• ${q}`).join('\n');
      return `Medication Reconciliation Points for Clinician Review:\n${concernList}\n\nSuggested Questions to Ask Your Doctor:\n${qList}\n\nDisclaimer: This is for informational organization only and is not medical prescribing advice.`;
    }

    if (first.toolName === 'get_health_alerts') {
      const alerts = first.data?.alerts || [];
      if (alerts.length === 0) return 'You have no active health trend alerts.';
      const list = alerts.map(a => `• [${a.severity}] ${a.message}`).join('\n');
      return `Active Health Alerts:\n${list}\n\nPlease consult your doctor regarding any persistent readings.`;
    }

    if (first.toolName === 'generate_doctor_briefing') {
      const b = first.data;
      return `Your Doctor Consultation Briefing has been prepared with ${b.measurementsCount || 0} measurement(s), ${b.trendSummariesCount || 0} trend(s), and ${b.doctorQuestionsCount || 0} suggested question(s). You can review or export this briefing in your Health Center.\n\nDisclaimer: This briefing is for personal organization only and not a medical diagnosis.`;
    }

    if (first.toolName === 'export_health_data') {
      return first.data?.message || 'Health data export archive successfully compiled with user authorization.';
    }

    return first.message || 'Action executed successfully.';
  }
}

module.exports = LLMAdapter;
