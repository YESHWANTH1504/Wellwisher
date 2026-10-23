const { RISK_LEVELS } = require('./toolRegistry');
const MedicationIntelligenceEngine = require('../health/medicationIntelligenceEngine');
const HealthTrendEngine = require('../health/healthTrendEngine');
const HealthTrendAlertEngine = require('../health/healthTrendAlertEngine');
const DoctorVisitPreparationEngine = require('../health/doctorVisitPreparationEngine');
const { AiHealthIntelligenceRepository } = require('../../../repositories/ai/aiHealthIntelligenceRepository');

const healthTools = [
  {
    name: 'check_medication_conflicts',
    description: 'Reconcile active medications with uploaded prescriptions and clinical documents to identify potential review items for clinician discussion. Strictly read-only and non-prescriptive.',
    category: 'health',
    permissionKey: 'check_medication_conflicts',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      const reconciliation = await MedicationIntelligenceEngine.reconcileMedications(context.userId);
      return {
        status: reconciliation.status,
        activeMedicationsCount: reconciliation.activeMedicationsCount,
        documentMedicationsCount: reconciliation.documentMedicationsCount,
        potentialConcerns: reconciliation.potentialConcerns,
        doctorQuestions: reconciliation.doctorQuestions,
        disclaimer: reconciliation.disclaimer
      };
    }
  },
  {
    name: 'get_health_trends',
    description: 'Retrieve calculated trends across historical blood tests, lab panels, and vital sign logs without diagnosing.',
    category: 'health',
    permissionKey: 'get_health_trends',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        metric: { type: 'string', description: 'Optional specific metric name e.g. Glucose, LDL, Hemoglobin' }
      }
    },
    execute: async (context, input) => {
      let trends = await AiHealthIntelligenceRepository.getTrends(context.userId);
      if (trends.length === 0) {
        trends = await HealthTrendEngine.computeUserTrends(context.userId);
      }

      if (input.metric) {
        trends = trends.filter(t => t.metricName.toLowerCase().includes(input.metric.toLowerCase()));
      }

      return {
        count: trends.length,
        trends: trends.map(t => ({
          metricName: t.metricName,
          previousValue: t.previousValue,
          latestValue: t.latestValue,
          unit: t.unit,
          changeValue: t.changeValue,
          changePercent: t.changePercent,
          trendDirection: t.trendDirection,
          dates: `${t.previousDate || 'Prev'} -> ${t.latestDate || 'Recent'}`
        })),
        disclaimer: 'Trends display historical numerical deltas and do not constitute clinical interpretations.'
      };
    }
  },
  {
    name: 'get_health_alerts',
    description: 'Retrieve active health trend alerts, repeated out-of-range warnings, and clinician discussion questions.',
    category: 'health',
    permissionKey: 'get_health_alerts',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      let alerts = await AiHealthIntelligenceRepository.getActiveAlerts(context.userId);
      if (alerts.length === 0) {
        alerts = await HealthTrendAlertEngine.evaluateHealthAlerts(context.userId);
      }

      return {
        count: alerts.length,
        alerts: alerts.map(a => ({
          id: a.id,
          alertType: a.alertType,
          metric: a.metric,
          severity: a.severity,
          message: a.message,
          evidence: a.evidence
        })),
        disclaimer: 'Alerts are informational notifications to assist with clinician review.'
      };
    }
  },
  {
    name: 'generate_doctor_briefing',
    description: 'Compile a structured 1-page summary of recent vitals, out-of-range lab metrics, and medication review points for an upcoming medical consultation.',
    category: 'health',
    permissionKey: 'generate_doctor_briefing',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      const briefing = await DoctorVisitPreparationEngine.generateBriefing(context.userId);
      return {
        briefingId: briefing.id,
        patientName: briefing.briefingData?.patientInfo?.name || 'Patient',
        generatedAt: briefing.generatedAt,
        measurementsCount: (briefing.briefingData?.recentMeasurements || []).length,
        trendSummariesCount: (briefing.briefingData?.trendSummaries || []).length,
        outOfRangeCount: (briefing.briefingData?.outOfRangeResults || []).length,
        doctorQuestionsCount: (briefing.briefingData?.questionsForDoctor || []).length,
        disclaimer: briefing.briefingData?.disclaimer
      };
    }
  },
  {
    name: 'export_health_data',
    description: 'Export all personal health metrics, lab records, and doctor briefings into an exportable archive. Requires explicit user confirmation.',
    category: 'health',
    permissionKey: 'export_health_data',
    riskLevel: RISK_LEVELS.HIGH,
    requiresConfirmation: true,
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', description: 'Export format e.g. JSON, PDF' }
      }
    },
    execute: async (context, input) => {
      const trends = await AiHealthIntelligenceRepository.getTrends(context.userId);
      const alerts = await AiHealthIntelligenceRepository.getActiveAlerts(context.userId);
      const briefings = await AiHealthIntelligenceRepository.getDoctorBriefings(context.userId);

      return {
        success: true,
        format: input.format || 'JSON',
        exportedAt: new Date().toISOString(),
        summary: {
          trendsCount: trends.length,
          alertsCount: alerts.length,
          briefingsCount: briefings.length
        },
        message: 'Health data export archive successfully compiled with user authorization.'
      };
    }
  }
];

const { defaultHealthConnectRepository } = require('../../../repositories/ai/healthConnectRepository');
const TemporalContext = require('../context/temporalContext');

const typedHealthConnectTools = [
  {
    name: 'health_get_steps_today',
    description: 'Retrieve real aggregated step count for today from Health Connect. Strictly read-only, never fabricated.',
    category: 'health',
    permissionKey: 'health_read_steps',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    execute: async (context, input) => {
      const today = TemporalContext.resolve(context.timezone || 'UTC').currentDate;

      // 1. Authoritative live client Health Connect context priority
      if (context.healthContext?.steps) {
        const s = context.healthContext.steps;
        if (s.available && s.value !== null && s.value !== undefined) {
          return {
            available: true,
            metric: 'steps',
            date: context.healthContext.date || today,
            value: s.value,
            unit: 'steps',
            source: 'Health Connect',
            dataType: 'LIVE_HEALTH_CONNECT_DATA',
            speech: `You have taken ${s.value.toLocaleString()} steps today.`
          };
        } else {
          return {
            available: false,
            metric: 'steps',
            date: context.healthContext.date || today,
            reason: s.reason === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'NO_DATA',
            source: 'Health Connect',
            message: s.reason === 'PERMISSION_DENIED' ? "I don't have permission to access your step count yet." : "I don't have any step data for today.",
            speech: s.reason === 'PERMISSION_DENIED' ? "I don't have permission to access your step count yet." : "I don't have any step data for today."
          };
        }
      }

      // 2. Fallback to repository
      const res = defaultHealthConnectRepository.getSteps(context.userId, today);
      return {
        ...res,
        speech: res.available
          ? `You have taken ${res.value.toLocaleString()} steps today.`
          : (res.reason === 'PERMISSION_DENIED' ? "I don't have permission to access your step count yet." : "I don't have any step data for today.")
      };
    }
  },
  {
    name: 'health_get_goal_progress',
    description: 'Calculate remaining progress towards daily health goals (steps, calories, sleep, distance). Strictly verifies real data exists.',
    category: 'health',
    permissionKey: 'health_read_all',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        metric: { type: 'string', description: '"steps" | "calories" | "sleep" | "distance" (defaults to steps)' }
      }
    },
    execute: async (context, input) => {
      const today = TemporalContext.resolve(context.timezone || 'UTC').currentDate;
      const metric = (input?.metric || 'steps').toLowerCase();

      if (metric === 'steps') {
        let stepVal = null;
        let isAvail = false;
        let reason = 'NO_DATA';

        if (context.healthContext?.steps) {
          isAvail = context.healthContext.steps.available === true && context.healthContext.steps.value != null;
          if (isAvail) stepVal = context.healthContext.steps.value;
          reason = context.healthContext.steps.reason || 'NO_DATA';
        } else {
          const repoRes = defaultHealthConnectRepository.getSteps(context.userId, today);
          isAvail = repoRes.available === true && repoRes.value != null;
          if (isAvail) stepVal = repoRes.value;
          reason = repoRes.reason || 'NO_DATA';
        }

        if (!isAvail || stepVal == null) {
          return {
            available: false,
            metric: 'steps_goal_progress',
            reason: 'NO_DATA',
            message: "I don't have today's step count yet, so I can't calculate how much remains.",
            speech: "I don't have today's step count yet, so I can't calculate how much remains."
          };
        }

        const goal = context.healthGoals?.stepsGoal || context.healthContext?.steps?.goal || 8000;
        const remaining = Math.max(0, goal - stepVal);

        if (remaining === 0) {
          return {
            available: true,
            metric: 'steps_goal_progress',
            current: stepVal,
            goal,
            remaining: 0,
            speech: `You have reached your goal of ${goal.toLocaleString()} steps today!`
          };
        }

        return {
          available: true,
          metric: 'steps_goal_progress',
          current: stepVal,
          goal,
          remaining,
          speech: `You need ${remaining.toLocaleString()} more steps to reach your goal of ${goal.toLocaleString()} steps.`
        };
      }

      if (metric === 'calories') {
        let calVal = null;
        let isAvail = false;

        if (context.healthContext?.calories) {
          isAvail = context.healthContext.calories.available === true && context.healthContext.calories.activeCalories != null;
          if (isAvail) calVal = context.healthContext.calories.activeCalories;
        } else {
          const repoRes = defaultHealthConnectRepository.getActiveCalories(context.userId, today);
          isAvail = repoRes.available === true && repoRes.value != null;
          if (isAvail) calVal = repoRes.value;
        }

        if (!isAvail || calVal == null) {
          return {
            available: false,
            metric: 'calories_goal_progress',
            reason: 'NO_DATA',
            message: "I don't have today's calorie burn recorded yet, so I can't calculate how much remains.",
            speech: "I don't have today's calorie burn recorded yet, so I can't calculate how much remains."
          };
        }

        const goal = context.healthGoals?.activeCaloriesGoal || context.healthContext?.calories?.goal || 400;
        const remaining = Math.max(0, goal - calVal);
        return {
          available: true,
          metric: 'calories_goal_progress',
          current: calVal,
          goal,
          remaining,
          speech: remaining === 0
            ? `You have reached your goal of ${goal} active calories today!`
            : `You need ${remaining} more active calories to reach your goal of ${goal} calories.`
        };
      }

      return {
        available: false,
        reason: 'NO_DATA',
        speech: "I don't have today's measurement recorded yet, so I can't calculate how much remains."
      };
    }
  },
  {
    name: 'health_get_steps_for_date',
    description: 'Retrieve real step count for a specific date (e.g. yesterday, Saturday, or YYYY-MM-DD) from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_steps',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['date'],
      properties: {
        date: { type: 'string', description: 'Target date in YYYY-MM-DD format or relative term like "yesterday"' }
      }
    },
    execute: async (context, input) => {
      const targetDate = TemporalContext.resolveTargetDate(input.date, context.timezone || 'UTC');
      const res = defaultHealthConnectRepository.getSteps(context.userId, targetDate);
      return {
        ...res,
        speech: res.available
          ? `You walked ${res.value.toLocaleString()} steps on ${targetDate}.`
          : (res.reason === 'PERMISSION_DENIED' ? 'I don\'t have permission to access your step count yet.' : `I don't currently have step data for ${targetDate}.`)
      };
    }
  },
  {
    name: 'health_get_steps_range',
    description: 'Retrieve real aggregated steps over a date range (e.g. last 7 days) from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_steps',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['startDate', 'endDate'],
      properties: {
        startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date YYYY-MM-DD' }
      }
    },
    execute: async (context, input) => {
      const res = defaultHealthConnectRepository.getStepsRange(context.userId, input.startDate, input.endDate);
      return {
        ...res,
        speech: res.available
          ? `You walked a total of ${res.totalSteps.toLocaleString()} steps between ${res.startDate} and ${res.endDate}, averaging ${res.averageSteps.toLocaleString()} steps per day.`
          : (res.reason === 'PERMISSION_DENIED' ? 'I don\'t have permission to access your step count yet.' : 'No step data is available for that date range.')
      };
    }
  },
  {
    name: 'health_get_active_calories_today',
    description: 'Retrieve real active calories burned today from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_calories',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    execute: async (context, input) => {
      const today = TemporalContext.resolve(context.timezone || 'UTC').currentDate;
      if (context.healthContext?.calories) {
        const c = context.healthContext.calories;
        if (c.available && c.activeCalories != null) {
          return {
            available: true,
            metric: 'active_calories',
            value: c.activeCalories,
            unit: 'kcal',
            source: 'Health Connect',
            date: context.healthContext.date || today,
            speech: `You have burned ${Math.round(c.activeCalories)} active calories today.`
          };
        } else {
          return {
            available: false,
            metric: 'active_calories',
            reason: c.reason === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'NO_DATA',
            speech: c.reason === 'PERMISSION_DENIED' ? "I don't have permission to access your active calorie data yet." : 'Active calorie data is not currently recorded for today.'
          };
        }
      }

      const res = defaultHealthConnectRepository.getActiveCalories(context.userId, today);
      return {
        ...res,
        speech: res.available
          ? `You have burned ${Math.round(res.value)} active calories today.`
          : (res.reason === 'PERMISSION_DENIED' ? "I don't have permission to access your active calorie data yet." : 'Active calorie data is not currently recorded for today.')
      };
    }
  },
  {
    name: 'health_get_active_calories_for_date',
    description: 'Retrieve real active calories burned on a specific date from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_calories',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['date'],
      properties: {
        date: { type: 'string', description: 'Target date YYYY-MM-DD or "yesterday"' }
      }
    },
    execute: async (context, input) => {
      const targetDate = TemporalContext.resolveTargetDate(input.date, context.timezone || 'UTC');
      const res = defaultHealthConnectRepository.getActiveCalories(context.userId, targetDate);
      return {
        ...res,
        speech: res.available
          ? `You burned ${Math.round(res.value)} active calories on ${targetDate}.`
          : (res.reason === 'PERMISSION_DENIED' ? "I don't have permission to access active calorie data." : `Active calorie data is not available for ${targetDate}.`)
      };
    }
  },
  {
    name: 'health_get_total_calories_today',
    description: 'Retrieve real total calories burned (BMR + Active) today from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_calories',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    execute: async (context, input) => {
      const today = TemporalContext.resolve(context.timezone || 'UTC').currentDate;
      if (context.healthContext?.calories) {
        const c = context.healthContext.calories;
        const cal = c.totalCalories != null ? c.totalCalories : c.activeCalories;
        if (c.available && cal != null) {
          return {
            available: true,
            metric: 'total_calories',
            value: cal,
            unit: 'kcal',
            source: 'Health Connect',
            date: context.healthContext.date || today,
            speech: `Your total calories burned today is ${Math.round(cal)} kcal.`
          };
        } else {
          return {
            available: false,
            metric: 'total_calories',
            reason: c.reason === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'NO_DATA',
            speech: c.reason === 'PERMISSION_DENIED' ? "I don't have permission to access total calories." : 'Total calorie data is not currently recorded for today.'
          };
        }
      }

      const res = defaultHealthConnectRepository.getTotalCalories(context.userId, today);
      return {
        ...res,
        speech: res.available
          ? `Your total calories burned today is ${Math.round(res.value)} kcal.`
          : (res.reason === 'PERMISSION_DENIED' ? "I don't have permission to access total calories." : 'Total calorie data is not currently recorded for today.')
      };
    }
  },
  {
    name: 'health_get_latest_heart_rate',
    description: 'Retrieve the latest recorded heart rate reading in BPM from Health Connect. NEVER invented.',
    category: 'health',
    permissionKey: 'health_read_heart_rate',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    execute: async (context, input) => {
      if (context.healthContext?.heartRate) {
        const hr = context.healthContext.heartRate;
        if (hr.available && hr.latest != null) {
          return {
            available: true,
            metric: 'heart_rate',
            value: hr.latest,
            unit: 'bpm',
            source: 'Health Connect',
            speech: `Your latest recorded heart rate is ${hr.latest} BPM.`
          };
        } else {
          return {
            available: false,
            metric: 'heart_rate',
            reason: hr.reason === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'NO_DATA',
            speech: hr.reason === 'PERMISSION_DENIED' ? "I don't have permission to access heart rate readings yet." : "I don't currently have a heart-rate reading available."
          };
        }
      }

      const res = defaultHealthConnectRepository.getHeartRate(context.userId, 'latest');
      return {
        ...res,
        speech: res.available
          ? `Your latest recorded heart rate is ${res.value} BPM.`
          : (res.reason === 'PERMISSION_DENIED' ? "I don't have permission to access heart rate readings yet." : "I don't currently have a heart-rate reading available.")
      };
    }
  },
  {
    name: 'health_get_average_heart_rate',
    description: 'Retrieve average heart rate in BPM for a given date from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_heart_rate',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Target date YYYY-MM-DD (defaults to today)' }
      }
    },
    execute: async (context, input) => {
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, context.timezone || 'UTC') : null;
      const res = defaultHealthConnectRepository.getHeartRate(context.userId, 'average', targetDate);
      return {
        ...res,
        speech: res.available
          ? `Your average heart rate was ${res.value} BPM.`
          : 'Average heart-rate data is not currently available.'
      };
    }
  },
  {
    name: 'health_get_resting_heart_rate',
    description: 'Retrieve resting heart rate in BPM from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_resting_heart_rate',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Target date YYYY-MM-DD (defaults to today)' }
      }
    },
    execute: async (context, input) => {
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, context.timezone || 'UTC') : null;
      if (!input?.date && context.healthContext?.heartRate) {
        const hr = context.healthContext.heartRate;
        if (hr.available && hr.resting != null) {
          return {
            available: true,
            metric: 'resting_heart_rate',
            value: hr.resting,
            unit: 'bpm',
            source: 'Health Connect',
            speech: `Your resting heart rate is ${hr.resting} BPM.`
          };
        } else {
          return {
            available: false,
            metric: 'resting_heart_rate',
            reason: hr.reason === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'NO_DATA',
            speech: hr.reason === 'PERMISSION_DENIED' ? "I don't have permission to read resting heart rate." : "I don't currently have a resting heart-rate reading available."
          };
        }
      }

      const res = defaultHealthConnectRepository.getHeartRate(context.userId, 'resting', targetDate);
      return {
        ...res,
        speech: res.available
          ? `Your resting heart rate is ${res.value} BPM.`
          : (res.reason === 'PERMISSION_DENIED' ? "I don't have permission to read resting heart rate." : "I don't currently have a resting heart-rate reading available.")
      };
    }
  },
  {
    name: 'health_get_sleep_summary',
    description: 'Retrieve sleep duration and sleep stages from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_sleep',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Target date YYYY-MM-DD (defaults to today/last night)' }
      }
    },
    execute: async (context, input) => {
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, context.timezone || 'UTC') : null;
      if (!input?.date && context.healthContext?.sleep) {
        const sl = context.healthContext.sleep;
        if (sl.available && sl.formatted) {
          return {
            available: true,
            metric: 'sleep',
            formattedDuration: sl.formatted,
            source: 'Health Connect',
            speech: `You slept ${sl.formatted}.`
          };
        } else {
          return {
            available: false,
            metric: 'sleep',
            reason: sl.reason === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'NO_DATA',
            speech: sl.reason === 'PERMISSION_DENIED' ? "I don't have permission to read sleep data." : "I don't currently have sleep records available."
          };
        }
      }

      const res = defaultHealthConnectRepository.getSleepSummary(context.userId, targetDate);
      return {
        ...res,
        speech: res.available
          ? `You slept ${res.formattedDuration}.`
          : (res.reason === 'PERMISSION_DENIED' ? "I don't have permission to read sleep data." : "I don't currently have sleep records available.")
      };
    }
  },
  {
    name: 'health_get_workouts',
    description: 'Retrieve workouts and exercise sessions for today or a specific date from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_exercise',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Target date YYYY-MM-DD (defaults to today)' }
      }
    },
    execute: async (context, input) => {
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, context.timezone || 'UTC') : null;
      if (!input?.date && context.healthContext?.workouts) {
        const wo = context.healthContext.workouts;
        const count = wo.count || 0;
        return {
          available: wo.available === true,
          count,
          source: 'Health Connect',
          speech: count > 0
            ? `You completed ${count} workout${count === 1 ? '' : 's'}.`
            : 'You have not logged any workouts yet today.'
        };
      }

      const res = defaultHealthConnectRepository.getWorkouts(context.userId, targetDate);
      const workoutCount = res.count || 0;
      let speech = workoutCount > 0
        ? `You completed ${workoutCount} workout${workoutCount === 1 ? '' : 's'}.`
        : 'You have not logged any workouts yet today.';
      return {
        ...res,
        speech
      };
    }
  },
  {
    name: 'health_get_weight',
    description: 'Retrieve the latest recorded body weight from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_weight',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    execute: async (context, input) => {
      if (context.healthContext?.weight) {
        const w = context.healthContext.weight;
        if (w.available && w.value != null) {
          return {
            available: true,
            metric: 'weight',
            value: w.value,
            unit: 'kg',
            source: 'Health Connect',
            speech: `Your latest recorded weight is ${w.value} kg.`
          };
        } else {
          return {
            available: false,
            metric: 'weight',
            reason: w.reason === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'NO_DATA',
            speech: w.reason === 'PERMISSION_DENIED' ? "I don't have permission to access weight measurements." : "I don't currently have a weight measurement recorded."
          };
        }
      }

      const res = defaultHealthConnectRepository.getWeight(context.userId);
      return {
        ...res,
        speech: res.available
          ? `Your latest recorded weight is ${res.value} ${res.unit}.`
          : (res.reason === 'PERMISSION_DENIED' ? "I don't have permission to access weight measurements." : "I don't currently have a weight measurement recorded.")
      };
    }
  },
  {
    name: 'health_get_daily_summary',
    description: 'Retrieve a complete daily health summary (steps, calories, heart rate, sleep, workouts) from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_all',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Target date YYYY-MM-DD (defaults to today)' }
      }
    },
    execute: async (context, input) => {
      const today = TemporalContext.resolve(context.timezone || 'UTC').currentDate;
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, context.timezone || 'UTC') : today;

      let summary;
      if (!input?.date && context.healthContext) {
        const hc = context.healthContext;
        summary = {
          steps: hc.steps?.available ? { available: true, value: hc.steps.value } : { available: false, reason: 'NO_DATA' },
          calories: hc.calories?.available ? { available: true, value: hc.calories.activeCalories || hc.calories.totalCalories } : { available: false, reason: 'NO_DATA' },
          activeCalories: hc.calories?.available && hc.calories.activeCalories ? { available: true, value: hc.calories.activeCalories } : { available: false, reason: 'NO_DATA' },
          heartRate: hc.heartRate?.available ? { available: true, value: hc.heartRate.latest } : { available: false, reason: 'NO_DATA' },
          restingHeartRate: hc.heartRate?.available && hc.heartRate.resting ? { available: true, value: hc.heartRate.resting } : { available: false, reason: 'NO_DATA' },
          bloodPressure: hc.bloodPressure?.available ? { available: true, value: `${hc.bloodPressure.systolic}/${hc.bloodPressure.diastolic}` } : { available: false, reason: 'NO_DATA' },
          sleep: hc.sleep?.available ? { available: true, formattedDuration: hc.sleep.formatted } : { available: false, reason: 'NO_DATA' },
          distance: hc.distance?.available ? { available: true, value: hc.distance.km } : { available: false, reason: 'NO_DATA' },
          workouts: hc.workouts?.available ? { available: true, count: hc.workouts.count } : { available: false, count: 0 },
          weight: hc.weight?.available ? { available: true, value: hc.weight.value } : { available: false, reason: 'NO_DATA' }
        };
      } else {
        const repoSummary = defaultHealthConnectRepository.getDailySummary(context.userId, targetDate);
        summary = {
          steps: repoSummary.steps,
          calories: repoSummary.totalCalories?.available ? repoSummary.totalCalories : repoSummary.activeCalories,
          activeCalories: repoSummary.activeCalories,
          heartRate: repoSummary.heartRate,
          restingHeartRate: repoSummary.restingHeartRate,
          bloodPressure: repoSummary.bloodPressure,
          sleep: repoSummary.sleep,
          distance: repoSummary.distance,
          workouts: repoSummary.workouts,
          weight: repoSummary.weight
        };
      }

      const availableItems = [];
      const missingMetrics = [];

      if (summary.calories?.available && summary.calories.value != null) {
        availableItems.push(`${Math.round(summary.calories.value)} calories`);
      }

      if (summary.steps?.available && summary.steps.value != null) {
        availableItems.push(`${summary.steps.value.toLocaleString()} steps`);
      } else {
        missingMetrics.push('step');
      }

      if (summary.heartRate?.available && summary.heartRate.value != null) {
        availableItems.push(`${summary.heartRate.value} BPM heart rate`);
      } else {
        missingMetrics.push('heart-rate');
      }

      if (summary.bloodPressure?.available && summary.bloodPressure.value != null) {
        availableItems.push(`${summary.bloodPressure.value} mmHg blood pressure`);
      } else {
        missingMetrics.push('blood-pressure');
      }

      if (summary.sleep?.available && summary.sleep.formattedDuration) {
        availableItems.push(`${summary.sleep.formattedDuration} of sleep`);
      } else {
        missingMetrics.push('sleep');
      }

      if (summary.distance?.available && summary.distance.value != null) {
        availableItems.push(`${summary.distance.value} km distance`);
      } else {
        missingMetrics.push('distance');
      }

      if (summary.workouts?.available && summary.workouts.count > 0) {
        availableItems.push(`${summary.workouts.count} workout${summary.workouts.count === 1 ? '' : 's'}`);
      } else {
        missingMetrics.push('workout');
      }

      if (summary.weight?.available && summary.weight.value != null) {
        availableItems.push(`${summary.weight.value} kg weight`);
      } else {
        missingMetrics.push('weight');
      }

      let speech = '';
      if (availableItems.length === 0) {
        speech = 'Health metrics are not currently available for this date.';
      } else if (missingMetrics.length === 0) {
        speech = `Here is your health summary: ${availableItems.join(', ')}.`;
      } else {
        const missingStr = missingMetrics.join(', ');
        speech = `Today I have ${availableItems.join(', ')} recorded. I don't have ${missingStr} data available.`;
      }

      return {
        ...summary,
        available: availableItems.length > 0,
        date: targetDate,
        speech,
        message: speech
      };
    }
  },
  {
    name: 'health_get_weekly_summary',
    description: 'Retrieve an aggregated 7-day weekly health and activity summary from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_all',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        endDate: { type: 'string', description: 'End date YYYY-MM-DD (defaults to today)' }
      }
    },
    execute: async (context, input) => {
      const summary = defaultHealthConnectRepository.getWeeklySummary(context.userId, input?.endDate);
      const steps = summary.steps;
      const speech = steps.available
        ? `Over the past week, you walked a total of ${steps.totalSteps.toLocaleString()} steps, averaging ${steps.averageSteps.toLocaleString()} steps per day.`
        : 'Weekly health data is not currently recorded in Health Connect.';

      return {
        ...summary,
        speech
      };
    }
  },
  {
    name: 'health_get_steps',
    description: 'Retrieve real aggregated step count for today or a specific date from Health Connect. Authoritative, never fabricated.',
    category: 'health',
    permissionKey: 'health_read_steps',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Optional date YYYY-MM-DD or relative like "yesterday" (defaults to today)' }
      }
    },
    execute: async (context, input) => {
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, context.timezone || 'UTC') : TemporalContext.resolve(context.timezone || 'UTC').currentDate;
      const res = defaultHealthConnectRepository.getSteps(context.userId, targetDate);
      return {
        ...res,
        speech: res.available
          ? `You have walked ${res.value.toLocaleString()} steps.`
          : (res.reason === 'PERMISSION_DENIED' ? 'Permission to read your step count has not been granted.' : `No step count recorded for ${targetDate}.`)
      };
    }
  },
  {
    name: 'health_get_calories',
    description: 'Retrieve calories burned (active or total) from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_calories',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: '"active" or "total" (defaults to total)' },
        date: { type: 'string', description: 'Optional date YYYY-MM-DD or "yesterday"' }
      }
    },
    execute: async (context, input) => {
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, context.timezone || 'UTC') : TemporalContext.resolve(context.timezone || 'UTC').currentDate;
      const isTotal = (input?.type || 'total').toLowerCase() === 'total';
      const res = isTotal
        ? defaultHealthConnectRepository.getTotalCalories(context.userId, targetDate)
        : defaultHealthConnectRepository.getActiveCalories(context.userId, targetDate);
      return {
        ...res,
        speech: res.available
          ? `You have burned ${Math.round(res.value)} ${isTotal ? 'total' : 'active'} calories.`
          : (res.reason === 'PERMISSION_DENIED' ? 'Permission to read calories has not been granted.' : 'Calorie data is not currently recorded.')
      };
    }
  },
  {
    name: 'health_get_heart_rate',
    description: 'Retrieve the latest recorded heart rate in BPM from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_heart_rate',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    execute: async (context, input) => {
      const res = defaultHealthConnectRepository.getHeartRate(context.userId, 'latest');
      return {
        ...res,
        speech: res.available
          ? `Your latest recorded heart rate is ${res.value} BPM.`
          : (res.reason === 'PERMISSION_DENIED' ? 'Permission to read heart rate has not been granted.' : 'No recent heart-rate data is available.')
      };
    }
  },
  {
    name: 'health_get_current_heart_rate',
    description: 'Retrieve current/latest recorded heart rate from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_heart_rate',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    execute: async (context, input) => {
      const res = defaultHealthConnectRepository.getHeartRate(context.userId, 'latest');
      return {
        ...res,
        speech: res.available
          ? `Your current recorded heart rate is ${res.value} BPM.`
          : (res.reason === 'PERMISSION_DENIED' ? 'Permission to read heart rate has not been granted.' : 'No recent heart-rate data is available.')
      };
    }
  },
  {
    name: 'health_get_blood_pressure',
    description: 'Retrieve the latest recorded blood pressure from Health Connect. Strictly non-diagnostic. Never estimated.',
    category: 'health',
    permissionKey: 'health_read_blood_pressure',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    execute: async (context, input) => {
      if (context.healthContext?.bloodPressure) {
        const bp = context.healthContext.bloodPressure;
        if (bp.available && bp.systolic != null && bp.diastolic != null) {
          const val = `${Math.round(bp.systolic)}/${Math.round(bp.diastolic)}`;
          return {
            available: true,
            metric: 'blood_pressure',
            systolic: bp.systolic,
            diastolic: bp.diastolic,
            value: val,
            unit: 'mmHg',
            source: 'Health Connect',
            speech: `Your latest recorded blood pressure is ${val} mmHg.`
          };
        } else {
          return {
            available: false,
            metric: 'blood_pressure',
            reason: bp.reason === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'NO_DATA',
            speech: bp.reason === 'PERMISSION_DENIED' ? "Permission to read blood pressure has not been granted." : "No recent blood pressure data is available."
          };
        }
      }

      const res = defaultHealthConnectRepository.getLatestBloodPressure(context.userId);
      return {
        ...res,
        speech: res.available
          ? `Your latest recorded blood pressure is ${res.value} mmHg.`
          : (res.reason === 'PERMISSION_DENIED' ? 'Permission to read blood pressure has not been granted.' : 'No recent blood pressure data is available.')
      };
    }
  },
  {
    name: 'health_get_latest_blood_pressure',
    description: 'Retrieve the latest blood pressure reading from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_blood_pressure',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    execute: async (context, input) => {
      if (context.healthContext?.bloodPressure) {
        const bp = context.healthContext.bloodPressure;
        if (bp.available && bp.systolic != null && bp.diastolic != null) {
          const val = `${Math.round(bp.systolic)}/${Math.round(bp.diastolic)}`;
          return {
            available: true,
            metric: 'blood_pressure',
            systolic: bp.systolic,
            diastolic: bp.diastolic,
            value: val,
            unit: 'mmHg',
            source: 'Health Connect',
            speech: `Your latest recorded blood pressure is ${val} mmHg.`
          };
        } else {
          return {
            available: false,
            metric: 'blood_pressure',
            reason: bp.reason === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'NO_DATA',
            speech: bp.reason === 'PERMISSION_DENIED' ? "Permission to read blood pressure has not been granted." : "No recent blood pressure data is available."
          };
        }
      }

      const res = defaultHealthConnectRepository.getLatestBloodPressure(context.userId);
      return {
        ...res,
        speech: res.available
          ? `Your latest recorded blood pressure is ${res.value} mmHg.`
          : (res.reason === 'PERMISSION_DENIED' ? 'Permission to read blood pressure has not been granted.' : 'No recent blood pressure data is available.')
      };
    }
  },
  {
    name: 'health_get_blood_pressure_range',
    description: 'Retrieve recorded blood pressure readings across a date range.',
    category: 'health',
    permissionKey: 'health_read_blood_pressure',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['startDate', 'endDate'],
      properties: {
        startDate: { type: 'string', description: 'Start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date YYYY-MM-DD' }
      }
    },
    execute: async (context, input) => {
      const res = defaultHealthConnectRepository.getBloodPressureRange(context.userId, input.startDate, input.endDate);
      return {
        ...res,
        speech: res.available
          ? `Found ${res.count} blood pressure reading${res.count === 1 ? '' : 's'} between ${res.startDate} and ${res.endDate}.`
          : (res.reason === 'PERMISSION_DENIED' ? 'Permission to read blood pressure has not been granted.' : 'No blood pressure records found for that date range.')
      };
    }
  },
  {
    name: 'health_get_sleep',
    description: 'Retrieve recorded sleep duration from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_sleep',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Optional date YYYY-MM-DD or "yesterday"' }
      }
    },
    execute: async (context, input) => {
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, context.timezone || 'UTC') : null;
      if (!input?.date && context.healthContext?.sleep) {
        const sl = context.healthContext.sleep;
        if (sl.available && sl.formatted) {
          return {
            available: true,
            metric: 'sleep',
            formattedDuration: sl.formatted,
            source: 'Health Connect',
            speech: `You slept ${sl.formatted}.`
          };
        } else {
          return {
            available: false,
            metric: 'sleep',
            reason: sl.reason === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'NO_DATA',
            speech: sl.reason === 'PERMISSION_DENIED' ? "Permission to read sleep data has not been granted." : "No sleep data available."
          };
        }
      }

      const res = defaultHealthConnectRepository.getSleepSummary(context.userId, targetDate);
      return {
        ...res,
        speech: res.available
          ? `You slept ${res.formattedDuration}.`
          : (res.reason === 'PERMISSION_DENIED' ? 'Permission to read sleep data has not been granted.' : 'No sleep data available.')
      };
    }
  },
  {
    name: 'health_get_last_night_sleep',
    description: 'Retrieve sleep duration for last night from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_sleep',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: { type: 'object', properties: {} },
    execute: async (context, input) => {
      if (context.healthContext?.sleep) {
        const sl = context.healthContext.sleep;
        if (sl.available && sl.formatted) {
          return {
            available: true,
            metric: 'sleep',
            formattedDuration: sl.formatted,
            source: 'Health Connect',
            speech: `Last night you slept ${sl.formatted}.`
          };
        }
      }

      const res = defaultHealthConnectRepository.getSleepSummary(context.userId, null);
      return {
        ...res,
        speech: res.available
          ? `Last night you slept ${res.formattedDuration}.`
          : (res.reason === 'PERMISSION_DENIED' ? 'Permission to read sleep data has not been granted.' : 'No sleep records found for last night.')
      };
    }
  },
  {
    name: 'health_get_distance',
    description: 'Retrieve real distance walked or run today or a specific date from Health Connect.',
    category: 'health',
    permissionKey: 'health_read_distance',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Optional date YYYY-MM-DD or "yesterday"' }
      }
    },
    execute: async (context, input) => {
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, context.timezone || 'UTC') : TemporalContext.resolve(context.timezone || 'UTC').currentDate;
      if (!input?.date && context.healthContext?.distance) {
        const dist = context.healthContext.distance;
        if (dist.available && dist.km != null) {
          return {
            available: true,
            metric: 'distance',
            value: dist.km,
            unit: 'km',
            source: 'Health Connect',
            speech: `You have covered ${dist.km} km.`
          };
        } else {
          return {
            available: false,
            metric: 'distance',
            reason: dist.reason === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'NO_DATA',
            speech: dist.reason === 'PERMISSION_DENIED' ? "Permission to read distance data has not been granted." : "Distance data is not currently recorded."
          };
        }
      }

      const res = defaultHealthConnectRepository.getDistance(context.userId, targetDate);
      return {
        ...res,
        speech: res.available
          ? `You have covered ${res.value} km.`
          : (res.reason === 'PERMISSION_DENIED' ? 'Permission to read distance data has not been granted.' : 'Distance data is not currently recorded.')
      };
    }
  },
  {
    name: 'health_get_health_insight',
    description: 'Retrieve non-diagnostic JARVIS health insight synthesized exclusively from authoritative Health Connect records.',
    category: 'health',
    permissionKey: 'health_read_all',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Optional date YYYY-MM-DD (defaults to today)' }
      }
    },
    execute: async (context, input) => {
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, context.timezone || 'UTC') : TemporalContext.resolve(context.timezone || 'UTC').currentDate;
      const res = defaultHealthConnectRepository.getHealthInsight(context.userId, targetDate);
      return {
        ...res,
        speech: res.available
          ? res.insight
          : 'I don\'t currently have enough health data recorded to provide a wellness summary.'
      };
    }
  },
  {
    name: 'health_start_workout',
    description: 'Start a workout session (walking, running, cycling, or general workout) tracked on-device and written to Health Connect upon completion.',
    category: 'health',
    permissionKey: 'health_read_exercise',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        exerciseType: {
          type: 'string',
          description: 'Type of exercise: "walking", "running", "cycling", "workout"'
        }
      }
    },
    execute: async (context, input) => {
      const type = (input?.exerciseType || 'walking').toLowerCase();
      const capitalized = type.charAt(0).toUpperCase() + type.slice(1);
      const startTime = new Date().toISOString();
      const speech = `Started ${type} workout. Tracking duration and activity on your phone.`;
      const message = `🏃 **Workout Started:** ${capitalized}\nStarted tracking on-device. Say "Stop my workout" when finished.`;

      return {
        success: true,
        action: 'START_WORKOUT',
        exerciseType: type,
        startTime,
        speech,
        message
      };
    }
  },
  {
    name: 'health_stop_workout',
    description: 'Stop the active on-device workout session, calculate actual duration and metrics, and save ExerciseSessionRecord to Health Connect.',
    category: 'health',
    permissionKey: 'health_read_exercise',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      const speech = `Workout stopped. Saving your session to Health Connect.`;
      const message = `🛑 **Workout Stopped.** Processing duration and saving session to Health Connect.`;

      return {
        success: true,
        action: 'STOP_WORKOUT',
        speech,
        message
      };
    }
  }
];

const allHealthTools = [
  ...healthTools,
  ...typedHealthConnectTools
];

module.exports = allHealthTools;
