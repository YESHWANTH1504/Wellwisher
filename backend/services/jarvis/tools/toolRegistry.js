const { AiPermissionRepository } = require('../../../repositories/ai/aiPermissionRepository');
const { AiAgentRunRepository } = require('../../../repositories/ai/aiAgentRunRepository');

const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

const EXECUTION_STATUS = {
  COMPLETED: 'COMPLETED',
  WAITING_FOR_CONFIRMATION: 'WAITING_FOR_CONFIRMATION',
  FAILED: 'FAILED',
  DISABLED: 'DISABLED'
};

class ToolRegistry {
  constructor() {
    this._tools = new Map();
  }

  /**
   * Register a trusted server-side tool definition
   */
  register(toolDef) {
    if (!toolDef || !toolDef.name) {
      throw new Error('Tool definition must contain a unique "name" property.');
    }
    if (this._tools.has(toolDef.name)) {
      throw new Error(`Tool "${toolDef.name}" is already registered. Duplicate registration rejected.`);
    }

    if (!toolDef.description || !toolDef.category || !toolDef.execute) {
      throw new Error(`Tool "${toolDef.name}" is missing required fields (description, category, execute).`);
    }

    const tool = {
      name: toolDef.name,
      description: toolDef.description,
      category: toolDef.category,
      permissionKey: toolDef.permissionKey || toolDef.name,
      riskLevel: toolDef.riskLevel || RISK_LEVELS.LOW,
      requiresConfirmation: Boolean(toolDef.requiresConfirmation),
      inputSchema: toolDef.inputSchema || {},
      execute: toolDef.execute
    };

    this._tools.set(toolDef.name, tool);
  }

  /**
   * Get tool definition by name
   */
  getTool(toolName) {
    return this.get(toolName);
  }

  get(toolName) {
    if (!toolName) return null;
    const direct = this._tools.get(toolName);
    if (direct) return direct;
    const norm = String(toolName).toLowerCase().replace(/[^a-z0-9]/g, '');

    const aliases = {
      'rescheduleevent': 'calendar_update_event',
      'cancelevent': 'calendar_delete_event',
      'settodayagenda': 'calendar_get_today',
      'settodayschedule': 'calendar_get_today',
      'todayschedule': 'calendar_get_today',
      'gettodayschedule': 'calendar_get_today',
      'createschedule': 'calendar_create_event',
      'updateschedule': 'calendar_update_event',
      'deleteschedule': 'calendar_delete_event',
      'getnews': 'get_current_information',
      'fetchnews': 'get_current_information',
      'getsteps': 'health_get_steps_today',
      'getstepstoday': 'health_get_steps_today',
      'getheartrate': 'health_get_latest_heart_rate',
      'getcalories': 'health_get_active_calories_today',
      'gethealthsummary': 'health_get_daily_summary',
      'getgoalprogress': 'health_get_goal_progress',
      'healthgetgoalprogress': 'health_get_goal_progress',
      'goalprogress': 'health_get_goal_progress',
      'getbloodpressure': 'health_get_blood_pressure',
      'getdistance': 'health_get_distance'
    };

    if (aliases[norm] && this._tools.has(aliases[norm])) {
      return this._tools.get(aliases[norm]);
    }

    for (const [name, tool] of this._tools.entries()) {
      if (name.toLowerCase().replace(/[^a-z0-9]/g, '') === norm) {
        return tool;
      }
    }
    return null;
  }

  /**
   * Check if a tool exists
   */
  has(toolName) {
    return this.get(toolName) !== null;
  }

  /**
   * List sanitized tool declarations for agent discovery
   */
  listAvailableTools() {
    const list = [];
    for (const tool of this._tools.values()) {
      list.push({
        name: tool.name,
        description: tool.description,
        category: tool.category,
        permissionKey: tool.permissionKey,
        riskLevel: tool.riskLevel,
        requiresConfirmation: tool.requiresConfirmation,
        inputSchema: tool.inputSchema
      });
    }
    return list;
  }

  /**
   * Validate input parameters against tool schema
   */
  validateInput(tool, input = {}) {
    const schema = tool.inputSchema || {};
    const required = schema.required || [];

    for (const field of required) {
      if (input[field] === undefined || input[field] === null || (typeof input[field] === 'string' && input[field].trim() === '')) {
        return {
          valid: false,
          error: `Missing required parameter "${field}" for tool "${tool.name}".`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Execute tool with validation, permission enforcement, and auditable error handling
   */
  async execute(toolName, context, input = {}) {
    if (!context || !context.userId) {
      return {
        success: false,
        status: EXECUTION_STATUS.FAILED,
        toolName,
        errorCode: 'UNAUTHORIZED',
        message: 'Trusted server-side context with authenticated userId is required.'
      };
    }

    const tool = this.get(toolName);
    if (!tool) {
      return {
        success: false,
        status: EXECUTION_STATUS.FAILED,
        toolName,
        errorCode: 'TOOL_NOT_FOUND',
        message: `Tool "${toolName}" is not registered in the Tool Registry.`
      };
    }

    // 1. Validate Input
    const validation = this.validateInput(tool, input);
    if (!validation.valid) {
      return {
        success: false,
        status: EXECUTION_STATUS.FAILED,
        toolName,
        errorCode: 'INVALID_INPUT',
        message: validation.error
      };
    }

    // 2. Check Autonomy Permissions
    const permissionState = await AiPermissionRepository.checkPermission(context.userId, tool.permissionKey);

    if (permissionState === 'DISABLED') {
      return {
        success: false,
        status: EXECUTION_STATUS.DISABLED,
        toolName,
        errorCode: 'PERMISSION_DISABLED',
        message: `Action "${tool.name}" has been disabled in your AI settings.`
      };
    }

    // 3. Evaluate Confirmation Flow
    const needsConfirmation = (permissionState === 'ASK_ALWAYS' || tool.requiresConfirmation || tool.riskLevel === RISK_LEVELS.HIGH);
    const isUserConfirmed = Boolean(context.isConfirmed === true || input.__userConfirmed === true);

    if (needsConfirmation && !isUserConfirmed) {
      return {
        success: true,
        status: EXECUTION_STATUS.WAITING_FOR_CONFIRMATION,
        toolName,
        requiresConfirmation: true,
        riskLevel: tool.riskLevel,
        confirmationDetails: {
          action: tool.name,
          description: tool.description,
          proposedInput: input
        },
        message: `Action "${tool.name}" requires explicit user approval before execution.`
      };
    }

    // 4. Execute Verified Tool Function
    try {
      const data = await tool.execute(context, input);
      
      return {
        success: true,
        status: EXECUTION_STATUS.COMPLETED,
        toolName,
        data: data || {},
        requiresConfirmation: false,
        message: `Tool "${tool.name}" executed successfully.`
      };
    } catch (err) {
      console.error(`Tool "${tool.name}" execution error:`, err.message);
      return {
        success: false,
        status: EXECUTION_STATUS.FAILED,
        toolName,
        errorCode: 'EXECUTION_ERROR',
        message: err.message || 'An error occurred during tool execution.'
      };
    }
  }
}

// Singleton Tool Registry Instance
const registry = new ToolRegistry();

module.exports = {
  ToolRegistry,
  registry,
  RISK_LEVELS,
  EXECUTION_STATUS
};
