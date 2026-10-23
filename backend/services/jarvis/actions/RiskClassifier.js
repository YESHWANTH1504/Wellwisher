/**
 * RiskClassifier
 * Formal 4-level risk matrix for Project JARVIS Autonomous Execution (Phase 7).
 */
const RISK_LEVELS = {
  LEVEL_0_READ_ONLY: 0,
  LEVEL_1_LOW_RISK_REVERSIBLE: 1,
  LEVEL_2_MODIFICATION: 2,
  LEVEL_3_DESTRUCTIVE_SENSITIVE: 3
};

const RISK_LEVEL_NAMES = {
  [RISK_LEVELS.LEVEL_0_READ_ONLY]: 'LEVEL_0_READ_ONLY',
  [RISK_LEVELS.LEVEL_1_LOW_RISK_REVERSIBLE]: 'LEVEL_1_LOW_RISK_REVERSIBLE',
  [RISK_LEVELS.LEVEL_2_MODIFICATION]: 'LEVEL_2_MODIFICATION',
  [RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE]: 'LEVEL_3_DESTRUCTIVE_SENSITIVE'
};

// Map tools to their default baseline risk levels
const TOOL_RISK_MAP = {
  // Level 0: Read Only
  get_schedule: RISK_LEVELS.LEVEL_0_READ_ONLY,
  get_calendar_events: RISK_LEVELS.LEVEL_0_READ_ONLY,
  calendar_get_today: RISK_LEVELS.LEVEL_0_READ_ONLY,
  calendar_get_date: RISK_LEVELS.LEVEL_0_READ_ONLY,
  get_upcoming_appointments: RISK_LEVELS.LEVEL_0_READ_ONLY,
  find_calendar_availability: RISK_LEVELS.LEVEL_0_READ_ONLY,
  get_device_status: RISK_LEVELS.LEVEL_0_READ_ONLY,
  check_installed_app: RISK_LEVELS.LEVEL_0_READ_ONLY,
  get_vitals: RISK_LEVELS.LEVEL_0_READ_ONLY,
  get_hydration: RISK_LEVELS.LEVEL_0_READ_ONLY,
  get_wellness_summary: RISK_LEVELS.LEVEL_0_READ_ONLY,
  get_medications: RISK_LEVELS.LEVEL_0_READ_ONLY,
  get_documents: RISK_LEVELS.LEVEL_0_READ_ONLY,
  get_document_summary: RISK_LEVELS.LEVEL_0_READ_ONLY,
  analyze_camera_view: RISK_LEVELS.LEVEL_0_READ_ONLY,
  analyze_screen_context: RISK_LEVELS.LEVEL_0_READ_ONLY,
  extract_text_ocr: RISK_LEVELS.LEVEL_0_READ_ONLY,

  // Level 1: Low-Risk Reversible
  open_application: RISK_LEVELS.LEVEL_1_LOW_RISK_REVERSIBLE,
  open_settings: RISK_LEVELS.LEVEL_1_LOW_RISK_REVERSIBLE,
  launch_intent: RISK_LEVELS.LEVEL_1_LOW_RISK_REVERSIBLE,
  create_reminder: RISK_LEVELS.LEVEL_1_LOW_RISK_REVERSIBLE,
  set_device_alarm: RISK_LEVELS.LEVEL_1_LOW_RISK_REVERSIBLE,
  create_calendar_event: RISK_LEVELS.LEVEL_1_LOW_RISK_REVERSIBLE,
  create_schedule: RISK_LEVELS.LEVEL_1_LOW_RISK_REVERSIBLE,
  save_memory: RISK_LEVELS.LEVEL_1_LOW_RISK_REVERSIBLE,
  save_visual_memory: RISK_LEVELS.LEVEL_1_LOW_RISK_REVERSIBLE,
  screen_scroll: RISK_LEVELS.LEVEL_1_LOW_RISK_REVERSIBLE,
  screen_back: RISK_LEVELS.LEVEL_1_LOW_RISK_REVERSIBLE,

  // Level 2: Modification
  update_reminder: RISK_LEVELS.LEVEL_2_MODIFICATION,
  reschedule_appointment: RISK_LEVELS.LEVEL_2_MODIFICATION,
  modify_routine: RISK_LEVELS.LEVEL_2_MODIFICATION,
  send_sms_message: RISK_LEVELS.LEVEL_2_MODIFICATION,
  make_phone_call: RISK_LEVELS.LEVEL_2_MODIFICATION,
  screen_tap: RISK_LEVELS.LEVEL_2_MODIFICATION,
  screen_type: RISK_LEVELS.LEVEL_2_MODIFICATION,

  // Level 3: Destructive / Sensitive
  cancel_reminder: RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE,
  delete_calendar_event: RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE,
  delete_all_reminders: RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE,
  cancel_all_appointments: RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE,
  forget_visual_memory: RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE,
  reset_memory: RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE,
  delete_document: RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE,
  modify_medication: RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE,
  send_money: RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE,
  pay_bill: RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE,
  transfer_funds: RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE
};

class RiskClassifier {
  /**
   * Classify risk level of a tool and its specific arguments.
   * Never permits LLM or untrusted input to downgrade a Level 3 action.
   */
  static classifyTool(toolName, args = {}) {
    const name = (toolName || '').toLowerCase().trim();
    let level = TOOL_RISK_MAP[name];

    if (level === undefined) {
      // Conservative default for unknown tools
      level = RISK_LEVELS.LEVEL_2_MODIFICATION;
    }

    // Dynamic escalation checks
    if (args.deleteAll === true || args.dropAll === true || args.purge === true) {
      level = RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE;
    }

    // Screen actions with destructive labels are Level 3
    if (name === 'screen_tap' && args.label) {
      const targetLabel = String(args.label).toLowerCase();
      if (
        targetLabel.includes('delete') ||
        targetLabel.includes('remove') ||
        targetLabel.includes('uninstall') ||
        targetLabel.includes('pay') ||
        targetLabel.includes('buy') ||
        targetLabel.includes('purchase') ||
        targetLabel.includes('confirm payment') ||
        targetLabel.includes('format')
      ) {
        level = RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE;
      }
    }

    return {
      level,
      name: RISK_LEVEL_NAMES[level],
      requiresConfirmation: level >= RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE,
      confirmationReason: level >= RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE
        ? `This action is classified as destructive or sensitive (${RISK_LEVEL_NAMES[level]}).`
        : null
    };
  }

  /**
   * Evaluate the overall risk of an entire ActionPlan (maximum risk of any step).
   */
  static classifyPlan(steps = []) {
    let maxLevel = RISK_LEVELS.LEVEL_0_READ_ONLY;
    let confirmationReasons = [];

    for (const step of steps) {
      const classification = this.classifyTool(step.tool, step.arguments);
      if (classification.level > maxLevel) {
        maxLevel = classification.level;
      }
      if (classification.requiresConfirmation && classification.confirmationReason) {
        confirmationReasons.push(`${step.tool}: ${classification.confirmationReason}`);
      }
    }

    return {
      riskLevel: maxLevel,
      riskLevelName: RISK_LEVEL_NAMES[maxLevel],
      confirmationRequired: maxLevel >= RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE,
      confirmationReason: confirmationReasons.join('; ') || null
    };
  }
}

module.exports = {
  RiskClassifier,
  RISK_LEVELS,
  RISK_LEVEL_NAMES,
  TOOL_RISK_MAP
};
