import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../../services/app_service_locator.dart';
import '../models/jarvis_models.dart';
import '../models/proactive_models.dart';
import '../models/health_intelligence_models.dart';
import '../models/workflow_models.dart';
import '../services/jarvis_api_service.dart';
import '../services/proactive_api_service.dart';
import '../services/health_intelligence_api_service.dart';
import '../services/workflow_api_service.dart';
import '../services/voice_input_service.dart';
import '../services/jarvis_tts_service.dart';
import '../services/jarvis_native_bridge.dart';
import '../../../services/local_storage_service.dart';
import '../widgets/jarvis_timeline.dart';
import '../../schedule/events/schedule_event_bus.dart';
import '../../schedule/models/schedule_model.dart';
import '../../../core/utils/time_format_helper.dart';

/// Central controller orchestrating all JARVIS operating system state,
/// real-time telemetry, conversational intelligence, execution pipelines,
/// and life timeline synthesis.
class JarvisHomeController extends ChangeNotifier {
  final JarvisApiService _apiService;
  final ProactiveApiService _proactiveService;
  final HealthIntelligenceApiService _healthService;
  final WorkflowApiService _workflowService;
  final IVoiceInputService _voiceService;
  final IJarvisTtsService _ttsService;

  JarvisVoiceGender get currentVoiceGender => (_ttsService is JarvisTtsService)
      ? _ttsService.gender
      : (LocalStorageService().selectedVoiceGender == 'male' ? JarvisVoiceGender.male : JarvisVoiceGender.female);

  void switchVoice(JarvisVoiceGender gender) {
    _ttsService.setGender(gender);
    notifyListeners();
  }

  // Central State
  JarvisState _state = JarvisState.idle;
  JarvisState get state => _state;
  JarvisState get currentState => _state;

  bool get isListening => _state == JarvisState.listening;
  bool get isSpeaking => _ttsService.isSpeaking || _state == JarvisState.speaking;
  bool get isThinking => _state == JarvisState.thinking || _state == JarvisState.retrieving;
  bool get isAlwaysOnVoiceRunning => true;

  Future<void> interruptSpeech() async {
    await _ttsService.stop();
    setStateEnum(JarvisState.idle, 'Ready');
  }

  Future<void> submitMessage(String text) => submitCommand(text);

  String _statusMessage = 'JARVIS Neural Core Online';
  String get statusMessage => _statusMessage;

  // Briefing & Proactive Feed
  DailyBriefingModel? _dailyBriefing;
  DailyBriefingModel? get dailyBriefing => _dailyBriefing;

  List<ProactiveEventModel> _proactiveEvents = [];
  List<ProactiveEventModel> get proactiveEvents => List.unmodifiable(_proactiveEvents);

  // Health Intelligence
  List<HealthTrendModel> _healthTrends = [];
  List<HealthTrendModel> get healthTrends => List.unmodifiable(_healthTrends);

  List<HealthAlertModel> _healthAlerts = [];
  List<HealthAlertModel> get healthAlerts => List.unmodifiable(_healthAlerts);

  // Workflows & Appointments
  List<AppointmentItem> _appointments = [];
  List<AppointmentItem> get appointments => List.unmodifiable(_appointments);

  List<WorkflowActionItem> _workflowActions = [];
  List<WorkflowActionItem> get workflowActions => List.unmodifiable(_workflowActions);

  // Unified Life Timeline
  List<JarvisTimelineItem> _timelineItems = [];
  List<JarvisTimelineItem> get timelineItems => List.unmodifiable(_timelineItems);

  // Conversational Turns
  final List<JarvisMessage> _messages = [];
  List<JarvisMessage> get messages => List.unmodifiable(_messages);

  String? _conversationId;
  String? get conversationId => _conversationId;

  String? _currentTranscript;
  String? get currentTranscript => _currentTranscript;

  bool _isVoiceEnabled = true;
  bool get isVoiceEnabled => _isVoiceEnabled;

  bool _isLoadingData = false;
  bool get isLoadingData => _isLoadingData;

  JarvisConfirmation? _pendingConfirmation;
  JarvisConfirmation? get pendingConfirmation => _pendingConfirmation;

  final VoidCallback? onStateInvalidationRequired;

  JarvisHomeController({
    JarvisApiService? apiService,
    ProactiveApiService? proactiveService,
    HealthIntelligenceApiService? healthService,
    WorkflowApiService? workflowService,
    IVoiceInputService? voiceService,
    IJarvisTtsService? ttsService,
    this.onStateInvalidationRequired,
  })  : _apiService = apiService ?? JarvisApiService(),
        _proactiveService = proactiveService ?? ProactiveApiService(),
        _healthService = healthService ?? HealthIntelligenceApiService(),
        _workflowService = workflowService ?? WorkflowApiService(),
        _voiceService = voiceService ?? VoiceInputService(),
        _ttsService = ttsService ?? JarvisTtsService() {
    final userName = LocalStorageService().userName ?? 'there';
    _state = JarvisState.sleeping;
    _statusMessage = "Ready for $userName";
    _messages.add(
      JarvisMessage(
        id: 'msg_initial',
        sender: 'jarvis',
        text: "Hello $userName, I am your personal assistant. Say 'Hey Jarvis' or tap the microphone to command.",
        timestamp: DateTime.now(),
      ),
    );
    loadAllJarvisData();
    JarvisNativeBridge.startAssistantService();
  }

  bool _isDisposed = false;

  @override
  void notifyListeners() {
    if (!_isDisposed) {
      super.notifyListeners();
    }
  }

  void setStateEnum(JarvisState newState, [String? message]) {
    _state = newState;
    if (message != null) _statusMessage = message;
    notifyListeners();
  }

  void toggleVoice(bool enabled) {
    _isVoiceEnabled = enabled;
    notifyListeners();
  }

  /// Comprehensive real-time fetch of all backend JARVIS intelligence
  Future<void> loadAllJarvisData() async {
    _isLoadingData = true;
    notifyListeners();

    try {
      final briefingFuture = _proactiveService.getDailyBriefing();
      final feedFuture = _proactiveService.getFeed();
      final trendsFuture = _healthService.getTrends();
      final alertsFuture = _healthService.getAlerts();
      final apptsFuture = _workflowService.getAppointments();
      final actionsFuture = _workflowService.getWorkflowActions();

      final results = await Future.wait([
        briefingFuture,
        feedFuture,
        trendsFuture,
        alertsFuture,
        apptsFuture,
        actionsFuture,
      ]);

      _dailyBriefing = results[0] as DailyBriefingModel?;
      _proactiveEvents = results[1] as List<ProactiveEventModel>;
      _healthTrends = results[2] as List<HealthTrendModel>;
      _healthAlerts = results[3] as List<HealthAlertModel>;
      _appointments = results[4] as List<AppointmentItem>;
      _workflowActions = results[5] as List<WorkflowActionItem>;

      _synthesizeTimeline();
    } catch (_) {
      // Graceful fallback with offline capability
      _synthesizeTimeline();
    } finally {
      _isLoadingData = false;
      notifyListeners();
    }
  }

  /// Synthesize unified life timeline by merging appointments, routines,
  /// workflow actions, and health alerts
  void _synthesizeTimeline() {
    final List<JarvisTimelineItem> list = [];

    // 1. Appointments
    for (final appt in _appointments) {
      list.add(
        JarvisTimelineItem(
          id: appt.id,
          time: appt.scheduledAt.isNotEmpty ? appt.scheduledAt : '10:00 AM',
          title: '${appt.title} (${appt.doctorName ?? appt.provider ?? 'Clinician'})',
          subtitle: '${appt.appointmentType ?? 'Consultation'} • ${appt.location ?? 'Medical Facility'}',
          category: JarvisTimelineCategory.appointment,
          isPendingAttention: appt.status == 'SCHEDULED' || appt.status == 'PLANNED',
        ),
      );
    }

    // 2. Health Alerts
    for (final alert in _healthAlerts) {
      list.add(
        JarvisTimelineItem(
          id: alert.id,
          time: 'Active',
          title: '${alert.metric} Alert (${alert.severity})',
          subtitle: alert.message,
          category: JarvisTimelineCategory.healthAlert,
          isPendingAttention: true,
        ),
      );
    }

    // 3. Workflow Actions
    for (final action in _workflowActions) {
      list.add(
        JarvisTimelineItem(
          id: action.id,
          time: 'Pending',
          title: action.title,
          subtitle: action.description,
          category: JarvisTimelineCategory.workflowAction,
          isPendingAttention: action.status == 'PENDING_CONFIRMATION',
        ),
      );
    }

    // 4. Routines from ScheduleController (if available)
    final scheduleController = AppServiceLocator().scheduleController;
    for (final item in scheduleController.currentRoutines) {
      list.add(
        JarvisTimelineItem(
          id: item.id,
          time: item.time,
          title: item.title,
          subtitle: item.description,
          category: item.category.name.toLowerCase().contains('med')
              ? JarvisTimelineCategory.medication
              : JarvisTimelineCategory.routine,
          isCompleted: item.status.name == 'completed',
        ),
      );
    }

    _timelineItems = list;
  }

  /// Submit a command to the backend JARVIS Agent with real execution pipeline
  Future<void> submitCommand(String text, {bool isVoice = false}) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    if (_ttsService.isSpeaking) {
      await _ttsService.stop();
    }

    // Retain stable session across consecutive turns
    _conversationId ??= 'session_user_${DateTime.now().millisecondsSinceEpoch}';

    // 1. Add user turn
    final userMsg = JarvisMessage(
      id: 'usr_${DateTime.now().millisecondsSinceEpoch}',
      sender: 'user',
      text: trimmed,
      timestamp: DateTime.now(),
      isVoice: isVoice,
    );
    _messages.add(userMsg);
    _currentTranscript = null;

    final lower = trimmed.toLowerCase();
    final isSwitchToMale = lower.contains('switch to male') ||
        lower.contains('change to male') ||
        lower.contains('use a male voice') ||
        lower.contains('use male voice');
    final isSwitchToFemale = lower.contains('switch to female') ||
        lower.contains('change to female') ||
        lower.contains('use a female voice') ||
        lower.contains('use female voice');

    if (isSwitchToMale || isSwitchToFemale) {
      final targetGender = isSwitchToMale ? JarvisVoiceGender.male : JarvisVoiceGender.female;
      _ttsService.setGender(targetGender);
      final confirmation = targetGender == JarvisVoiceGender.male
          ? "Sure. I've switched to my male voice."
          : "Sure. I've switched to my female voice.";
      _messages.add(
        JarvisMessage(
          id: 'jrv_${DateTime.now().millisecondsSinceEpoch}',
          sender: 'jarvis',
          text: confirmation,
          responseType: JarvisResponseType.voiceSwitch,
          timestamp: DateTime.now(),
        ),
      );
      if (_isVoiceEnabled) {
        setStateEnum(JarvisState.speaking, 'JARVIS Speaking...');
        _ttsService.speak(confirmation, onComplete: () {
          setStateEnum(JarvisState.idle, 'JARVIS Ready.');
        });
      } else {
        setStateEnum(JarvisState.idle, 'JARVIS Ready.');
      }
      notifyListeners();
      return;
    }

    // 2. State transition: Thinking & Understanding
    setStateEnum(JarvisState.thinking, 'Reasoning & checking context...');

    try {
      Map<String, dynamic>? liveHealthContext;
      Map<String, dynamic>? liveHealthGoals;
      try {
        final healthCtrl = AppServiceLocator().healthController;
        liveHealthContext = healthCtrl.summary.toMap();
        liveHealthGoals = healthCtrl.goals.toJson();
      } catch (_) {}

      final response = await _apiService.sendMessage(
        trimmed,
        conversationId: _conversationId,
        timezone: DateTime.now().timeZoneName,
        healthContext: liveHealthContext,
        healthGoals: liveHealthGoals,
      );

      if (response.conversationId != null) {
        _conversationId = response.conversationId;
      }

      // 2.5 Execute Native Android Action with Real Device Verification
      final intentStr = response.intent.toUpperCase();
      final rawLower = trimmed.toLowerCase();

      final isAppLaunch = intentStr == 'OPEN_APPLICATION' ||
          (response.action != null && (response.action!.type.toLowerCase() == 'open_application' || response.action!.type.toUpperCase() == 'OPEN_APPLICATION')) ||
          rawLower.startsWith('open ') || rawLower.startsWith('launch ') || rawLower.startsWith('go to ') || rawLower == 'whatsapp' || rawLower == 'open whatsapp';

      if (isAppLaunch) {
        String pkg = '';
        String appName = 'Application';

        // 1. Extract from action plan
        if (response.action != null) {
          pkg = response.action!.data['packageName']?.toString() ?? '';
          appName = response.action!.data['appName']?.toString() ?? response.action!.data['application']?.toString() ?? '';
        }

        // 2. Extract from execution steps
        if (pkg.isEmpty) {
          for (final step in response.executionSteps) {
            if (step.toolName == 'open_application') {
              pkg = step.data['packageName']?.toString() ?? '';
              appName = step.data['appName']?.toString() ?? '';
            }
          }
        }

        // 3. Fallback resolution if not specified by backend
        if (pkg.isEmpty) {
          if (rawLower.contains('whatsapp')) {
            pkg = 'com.whatsapp';
            appName = 'WhatsApp';
          } else if (rawLower.contains('youtube')) {
            pkg = 'com.google.android.youtube';
            appName = 'YouTube';
          } else if (rawLower.contains('maps')) {
            pkg = 'com.google.android.apps.maps';
            appName = 'Google Maps';
          } else if (rawLower.contains('chrome')) {
            pkg = 'com.android.chrome';
            appName = 'Chrome';
          } else if (rawLower.contains('gmail')) {
            pkg = 'com.google.android.gm';
            appName = 'Gmail';
          } else if (rawLower.contains('settings')) {
            pkg = 'com.android.settings';
            appName = 'Settings';
          }
        }

        if (pkg.isNotEmpty) {
          // ENTER EXECUTING STATE
          setStateEnum(JarvisState.executing, 'Opening $appName...');

          final nativeRes = await JarvisNativeBridge.openApplication(pkg, appName: appName);
          debugPrint('[JARVIS_NATIVE] Physical launch result: $nativeRes');

          // ENTER VERIFYING STATE
          setStateEnum(JarvisState.verifying, 'Checking that $appName opened...');

          // Report verification to backend
          final verifyRes = await _apiService.verifyNativeAction(
            sessionId: _conversationId!,
            action: 'OPEN_APPLICATION',
            packageName: pkg,
            appName: appName,
            nativeResult: nativeRes,
          );
          debugPrint('[JARVIS_NATIVE] Backend verification response: $verifyRes');

          final isVerifiedSuccess = nativeRes['success'] == true;
          String finalMessage;

          if (isVerifiedSuccess) {
            finalMessage = '$appName is open.';
            setStateEnum(JarvisState.completed, '$appName is open.');
          } else {
            final errCode = nativeRes['error']?.toString();
            if (errCode == 'APPLICATION_NOT_INSTALLED') {
              finalMessage = "I couldn't find $appName on this phone.";
            } else {
              finalMessage = "I couldn't open $appName. Android returned an error.";
            }
            setStateEnum(JarvisState.error, finalMessage);
          }

          _messages.add(
            JarvisMessage(
              id: 'jrv_${DateTime.now().millisecondsSinceEpoch}',
              sender: 'jarvis',
              text: finalMessage,
              responseType: isVerifiedSuccess ? JarvisResponseType.actionCompleted : JarvisResponseType.error,
              action: response.action,
              timestamp: DateTime.now(),
            ),
          );

          if (_isVoiceEnabled) {
            setStateEnum(JarvisState.speaking, 'JARVIS Speaking...');
            _ttsService.speak(finalMessage, onComplete: () {
              setStateEnum(isVerifiedSuccess ? JarvisState.completed : JarvisState.idle, finalMessage);
            });
          }

          notifyListeners();
          return; // Device action completed with real verified feedback
        }
      }

      // 3. Process Response & Render Real Execution Steps
      if (response.type == JarvisResponseType.confirmationRequired && response.confirmation != null) {
        _pendingConfirmation = response.confirmation;
        setStateEnum(JarvisState.awaitingConfirmation, 'User confirmation required.');

        _messages.add(
          JarvisMessage(
            id: 'jrv_${DateTime.now().millisecondsSinceEpoch}',
            sender: 'jarvis',
            text: response.message,
            responseType: response.type,
            confirmation: response.confirmation,
            executionSteps: response.executionSteps,
            timestamp: response.timestamp,
          ),
        );

        if (_isVoiceEnabled) {
          setStateEnum(JarvisState.speaking, 'JARVIS Speaking...');
          _ttsService.speak(response.spokenResponse, onComplete: () {
            setStateEnum(JarvisState.awaitingConfirmation, 'Awaiting your approval.');
          });
        }
      } else if (response.type == JarvisResponseType.actionCompleted) {
        _pendingConfirmation = null;
        setStateEnum(JarvisState.success, 'Action verified & completed.');

        _messages.add(
          JarvisMessage(
            id: 'jrv_${DateTime.now().millisecondsSinceEpoch}',
            sender: 'jarvis',
            text: response.message,
            responseType: response.type,
            action: response.action,
            executionSteps: response.executionSteps,
            timestamp: response.timestamp,
          ),
        );

        onStateInvalidationRequired?.call();
        await _handleScheduleReconciliation(response, fallbackQuery: trimmed);
        await loadAllJarvisData();

        if (_isVoiceEnabled) {
          setStateEnum(JarvisState.speaking, 'JARVIS Speaking...');
          _ttsService.speak(response.spokenResponse, onComplete: () {
            setStateEnum(JarvisState.idle, 'JARVIS Ready.');
          });
        } else {
          setStateEnum(JarvisState.idle, 'JARVIS Ready.');
        }
      } else if (response.type == JarvisResponseType.error) {
        setStateEnum(JarvisState.error, 'JARVIS encountered an error.');

        _messages.add(
          JarvisMessage(
            id: 'jrv_err_${DateTime.now().millisecondsSinceEpoch}',
            sender: 'jarvis',
            text: response.message,
            responseType: JarvisResponseType.error,
            executionSteps: response.executionSteps,
            timestamp: response.timestamp,
          ),
        );
      } else {
        // Conversational / Information Response
        _pendingConfirmation = null;

        _messages.add(
          JarvisMessage(
            id: 'jrv_${DateTime.now().millisecondsSinceEpoch}',
            sender: 'jarvis',
            text: response.message,
            responseType: response.type,
            structuredData: response.structuredData,
            executionSteps: response.executionSteps,
            timestamp: response.timestamp,
          ),
        );

        final userQueryLower = trimmed.toLowerCase();
        final isScheduleUserQuery = userQueryLower.startsWith('add ') ||
            userQueryLower.startsWith('schedule ') ||
            userQueryLower.startsWith('create ') ||
            userQueryLower.startsWith('change ') ||
            userQueryLower.startsWith('rename ') ||
            userQueryLower.startsWith('move ') ||
            userQueryLower.startsWith('reschedule ') ||
            userQueryLower.contains('meeting at') ||
            userQueryLower.contains('reminder for');

        final hasScheduleAction = isScheduleUserQuery ||
            response.executionSteps.any((s) =>
                s.toolName.toLowerCase().contains('calendar') ||
                s.toolName.toLowerCase().contains('schedule') ||
                s.toolName.toLowerCase().contains('reminder') ||
                s.toolName.toLowerCase().contains('routine')) ||
            (response.action != null && (
              response.action!.type.toLowerCase().contains('schedule') ||
              response.action!.type.toLowerCase().contains('reminder') ||
              response.action!.type.toLowerCase().contains('routine') ||
              response.action!.type.toLowerCase().contains('event') ||
              response.action!.tool.toLowerCase().contains('schedule') ||
              response.action!.tool.toLowerCase().contains('reminder')
            ));

        if (response.intent == 'VOICE_SWITCH' || response.type == JarvisResponseType.voiceSwitch) {
          if (response.structuredData?['gender'] == 'male') {
            _ttsService.setGender(JarvisVoiceGender.male);
          } else if (response.structuredData?['gender'] == 'female') {
            _ttsService.setGender(JarvisVoiceGender.female);
          }
        }

        if (hasScheduleAction) {
          onStateInvalidationRequired?.call();
          await _handleScheduleReconciliation(response, fallbackQuery: trimmed);
          await loadAllJarvisData();
        }

        if (_isVoiceEnabled) {
          setStateEnum(JarvisState.speaking, 'JARVIS Speaking...');
          _ttsService.speak(response.spokenResponse, onComplete: () {
            setStateEnum(JarvisState.idle, 'JARVIS Ready.');
          });
        } else {
          setStateEnum(JarvisState.idle, 'JARVIS Ready.');
        }
      }
    } catch (e) {
      setStateEnum(JarvisState.error, 'JARVIS encountered a communication error.');
      _messages.add(
        JarvisMessage(
          id: 'jrv_err_${DateTime.now().millisecondsSinceEpoch}',
          sender: 'jarvis',
          text: 'I was unable to complete that action. Subsystem telemetry: ${e.toString()}',
          responseType: JarvisResponseType.error,
          timestamp: DateTime.now(),
        ),
      );
    }
  }

  /// Ingest an authoritative schedule change event into JARVIS contextual memory
  /// without creating a secondary calendar store. The database remains authoritative.
  void recordScheduleChanged({
    required String action,
    required String scheduleId,
    required String title,
    String? previousDate,
    String? previousTime,
    String? newDate,
    String? newTime,
    String? date,
  }) {
    final effectiveDate = newDate ?? date;
    String summary;
    final act = action.toUpperCase();
    if (act == 'RESCHEDULED' || act == 'UPDATED') {
      summary = 'Schedule updated: "$title" was moved to ${newTime ?? ""}${effectiveDate != null ? " on $effectiveDate" : ""}.'.trim();
    } else if (act == 'CANCELLED' || act == 'DELETED') {
      summary = 'Schedule updated: "$title" was removed.';
    } else if (act == 'COMPLETED') {
      summary = 'Schedule updated: "$title" marked completed.';
    } else if (act == 'PENDING') {
      summary = 'Schedule updated: "$title" marked pending.';
    } else {
      summary = 'Schedule updated: "$title" scheduled for ${newTime ?? ""}${effectiveDate != null ? " on $effectiveDate" : ""}.'.trim();
    }

    _messages.add(
      JarvisMessage(
        id: 'jrv_ctx_${DateTime.now().millisecondsSinceEpoch}',
        sender: 'jarvis',
        text: summary,
        responseType: JarvisResponseType.calendar,
        timestamp: DateTime.now(),
      ),
    );

    // Context event sync with backend orchestrator (lightweight event notification, non-blocking)
    _apiService.syncScheduleContext(
      action: action,
      scheduleId: scheduleId,
      title: title,
      previousDate: previousDate,
      previousTime: previousTime,
      newDate: effectiveDate,
      newTime: newTime,
      sessionId: _conversationId,
    ).then((_) {}).catchError((_) {});

    loadAllJarvisData();
    notifyListeners();
  }

  // ==========================================
  // PHASE 6: MULTIMODAL INTELLIGENCE ACTIONS
  // ==========================================

  bool get isCapturing => _state == JarvisState.capturing;
  bool get isAnalyzing => _state == JarvisState.analyzing;

  /// Trigger real camera capture and multimodal analysis
  Future<void> captureAndAnalyzeCamera({String prompt = "What is this?"}) async {
    if (_ttsService.isSpeaking) {
      await _ttsService.stop();
    }

    setStateEnum(JarvisState.capturing, 'CAPTURING');

    final hasPerm = await JarvisNativeBridge.checkCameraPermission();
    if (!hasPerm) {
      final granted = await JarvisNativeBridge.requestCameraPermission();
      if (!granted) {
        setStateEnum(JarvisState.idle, 'Camera permission required.');
        _messages.add(
          JarvisMessage(
            id: 'jrv_cam_${DateTime.now().millisecondsSinceEpoch}',
            sender: 'jarvis',
            text: 'Camera permission is required to analyze visual scenes.',
            responseType: JarvisResponseType.error,
            timestamp: DateTime.now(),
          ),
        );
        return;
      }
    }

    final imageBase64 = await JarvisNativeBridge.captureCameraPhoto();
    if (imageBase64 == null || imageBase64.trim().isEmpty) {
      setStateEnum(JarvisState.idle, 'Camera capture cancelled.');
      return;
    }

    setStateEnum(JarvisState.analyzing, 'ANALYZING');

    _messages.add(
      JarvisMessage(
        id: 'user_cam_${DateTime.now().millisecondsSinceEpoch}',
        sender: 'user',
        text: '📸 [Camera Photo Captured] $prompt',
        responseType: JarvisResponseType.finalResponse,
        timestamp: DateTime.now(),
      ),
    );

    try {
      final response = await _apiService.sendMultimodalMessage(
        prompt,
        imageData: imageBase64,
        mimeType: 'image/jpeg',
        type: 'CAMERA_IMAGE',
        source: 'CAMERA',
        conversationId: _conversationId,
      );

      _messages.add(
        JarvisMessage(
          id: 'jrv_cam_res_${DateTime.now().millisecondsSinceEpoch}',
          sender: 'jarvis',
          text: response.message,
          responseType: response.type,
          timestamp: DateTime.now(),
        ),
      );

      if (_isVoiceEnabled && response.spokenResponse.isNotEmpty) {
        setStateEnum(JarvisState.speaking, 'RESPONDING');
        _ttsService.speak(response.spokenResponse, onComplete: () {
          setStateEnum(JarvisState.idle, 'JARVIS Ready.');
        });
      } else {
        setStateEnum(JarvisState.idle, 'JARVIS Ready.');
      }
    } catch (e) {
      setStateEnum(JarvisState.error, 'Visual analysis failed: $e');
    }
  }

  /// Trigger screenshot capture and analyze screen context
  Future<void> captureAndAnalyzeScreen({String prompt = "What's on my screen?"}) async {
    if (_ttsService.isSpeaking) {
      await _ttsService.stop();
    }

    setStateEnum(JarvisState.analyzing, 'ANALYZING');

    final screenBase64 = await JarvisNativeBridge.captureScreenContext();
    if (screenBase64 == null || screenBase64.trim().isEmpty) {
      setStateEnum(JarvisState.idle, 'Screen capture unavailable.');
      return;
    }

    _messages.add(
      JarvisMessage(
        id: 'user_scr_${DateTime.now().millisecondsSinceEpoch}',
        sender: 'user',
        text: '📱 [Screen Context] $prompt',
        responseType: JarvisResponseType.finalResponse,
        timestamp: DateTime.now(),
      ),
    );

    try {
      final response = await _apiService.sendMultimodalMessage(
        prompt,
        imageData: screenBase64,
        mimeType: 'image/png',
        type: 'SCREENSHOT',
        source: 'SCREEN',
        conversationId: _conversationId,
      );

      _messages.add(
        JarvisMessage(
          id: 'jrv_scr_res_${DateTime.now().millisecondsSinceEpoch}',
          sender: 'jarvis',
          text: response.message,
          responseType: response.type,
          timestamp: DateTime.now(),
        ),
      );

      if (_isVoiceEnabled && response.spokenResponse.isNotEmpty) {
        setStateEnum(JarvisState.speaking, 'RESPONDING');
        _ttsService.speak(response.spokenResponse, onComplete: () {
          setStateEnum(JarvisState.idle, 'JARVIS Ready.');
        });
      } else {
        setStateEnum(JarvisState.idle, 'JARVIS Ready.');
      }
    } catch (e) {
      setStateEnum(JarvisState.error, 'Screen analysis error: $e');
    }
  }

  /// Explicitly clear active visual context
  Future<void> clearVisualContext() async {
    await _apiService.clearVisualContext(_conversationId);
    setStateEnum(JarvisState.idle, 'Active visual context cleared.');
  }

  /// Cryptographic action confirmation execution
  Future<void> confirmAction(JarvisConfirmation confirmation) async {
    setStateEnum(JarvisState.executing, 'Validating cryptographic token & executing...');
    _pendingConfirmation = null;

    try {
      final response = await _apiService.confirmAction(
        confirmationId: confirmation.confirmationId,
        toolName: confirmation.tool,
        arguments: confirmation.arguments,
      );

      _messages.add(
        JarvisMessage(
          id: 'jrv_${DateTime.now().millisecondsSinceEpoch}',
          sender: 'jarvis',
          text: response.message,
          responseType: response.type,
          action: response.action,
          executionSteps: response.executionSteps,
          timestamp: response.timestamp,
        ),
      );

      onStateInvalidationRequired?.call();
      final hasScheduleAction = response.executionSteps.any((s) =>
          s.toolName.toLowerCase().contains('calendar') ||
          s.toolName.toLowerCase().contains('schedule') ||
          s.toolName.toLowerCase().contains('reminder')) ||
          (response.action != null && (
            response.action!.type.toLowerCase().contains('schedule') ||
            response.action!.type.toLowerCase().contains('reminder') ||
            response.action!.tool.toLowerCase().contains('schedule') ||
            response.action!.tool.toLowerCase().contains('reminder')
          ));

      if (hasScheduleAction) {
        await _handleScheduleReconciliation(response);
      }
      await loadAllJarvisData();

      if (response.success) {
        setStateEnum(JarvisState.success, 'Action verified & completed.');
      } else {
        setStateEnum(JarvisState.error, response.message);
      }

      if (_isVoiceEnabled) {
        setStateEnum(JarvisState.speaking, 'JARVIS Speaking...');
        _ttsService.speak(response.spokenResponse, onComplete: () {
          setStateEnum(JarvisState.idle, 'JARVIS Ready.');
        });
      } else {
        setStateEnum(JarvisState.idle, 'JARVIS Ready.');
      }
    } catch (e) {
      setStateEnum(JarvisState.error, 'Confirmation token validation failed.');
    }
  }

  void cancelConfirmation() {
    _pendingConfirmation = null;
    _messages.add(
      JarvisMessage(
        id: 'jrv_${DateTime.now().millisecondsSinceEpoch}',
        sender: 'jarvis',
        text: 'Action cancelled. Database state remains unchanged.',
        timestamp: DateTime.now(),
      ),
    );
    setStateEnum(JarvisState.idle, 'Action cancelled.');
  }

  /// Voice recognition
  Future<void> startListening() async {
    if (_ttsService.isSpeaking) {
      await _ttsService.stop();
    }

    setStateEnum(JarvisState.listening, 'Listening for command...');
    _currentTranscript = '';

    await _voiceService.startListening(
      onResult: (text, isFinal) {
        _currentTranscript = text;
        notifyListeners();
        if (isFinal && text.trim().isNotEmpty) {
          final rawTranscript = text.trim();
          _currentTranscript = null;
          _voiceService.stopListening();
          
          // Normalize wake word if command follows (e.g. "Hey Jarvis, open WhatsApp" -> "open WhatsApp")
          final cleanCommand = _normalizeWakePhrase(rawTranscript);
          debugPrint('[VOICE] STT_COMPLETED transcript="$rawTranscript" normalized="$cleanCommand"');
          submitCommand(cleanCommand, isVoice: true);
        }
      },
      onError: (_) {
        setStateEnum(JarvisState.idle, 'Voice input cancelled.');
      },
    );
  }

  static String _normalizeWakePhrase(String raw) {
    final trimmed = raw.trim();
    final lower = trimmed.toLowerCase();
    
    // If it is just the wake word or greeting by itself, preserve it as greeting
    if (lower == 'hey jarvis' || lower == 'hi jarvis' || lower == 'hello jarvis' || lower == 'jarvis') {
      return trimmed;
    }
    
    // If it starts with wake phrase followed by command, extract the command
    final stripped = trimmed.replaceFirst(RegExp(r'^(hey|hi|hello|ok)?\s*jarvis,?\s*', caseSensitive: false), '').trim();
    return stripped.isNotEmpty ? stripped : trimmed;
  }

  Future<void> stopListening() async {
    await _voiceService.stopListening();
    if (_state == JarvisState.listening) {
      if (_currentTranscript != null && _currentTranscript!.trim().isNotEmpty) {
        final captured = _currentTranscript!.trim();
        _currentTranscript = null;
        final cleanCommand = _normalizeWakePhrase(captured);
        submitCommand(cleanCommand, isVoice: true);
      } else {
        setStateEnum(JarvisState.idle, 'JARVIS Ready.');
      }
    }
  }

  Future<void> _handleScheduleReconciliation(JarvisResponse response, {String? fallbackQuery}) async {
    try {
      final actionData = response.action?.data ?? {};
      final steps = response.executionSteps;

      Map<String, dynamic>? schedulePayload;
      String? matchedTool;

      for (final step in steps) {
        final t = step.toolName.toLowerCase();
        if (t == 'calendar_create_event' ||
            t == 'create_calendar_event' ||
            t == 'create_reminder' ||
            t == 'create_schedule' ||
            t == 'calendar_create_routine' ||
            t == 'calendar_update_event' ||
            t == 'update_calendar_event' ||
            t == 'update_reminder' ||
            t == 'move_event' ||
            t == 'calendar_delete_event' ||
            t == 'cancel_reminder' ||
            t == 'cancel_event' ||
            t == 'calendar_complete_event' ||
            t == 'complete_event' ||
            t == 'complete_task' ||
            t == 'complete_routine' ||
            t == 'complete_reminder' ||
            t == 'mark_done' ||
            t == 'mark_completed' ||
            t.contains('calendar') ||
            t.contains('schedule') ||
            t.contains('reminder') ||
            t.contains('routine')) {
          matchedTool = t;
          schedulePayload = step.data;
          break;
        }
      }

      if (matchedTool == null && response.action != null) {
        final actType = response.action!.type.toUpperCase();
        if (actType == 'SCHEDULE_EVENT' ||
            actType == 'SCHEDULE_REMINDER' ||
            actType == 'RESCHEDULE_EVENT' ||
            actType == 'RESCHEDULE_REMINDER' ||
            actType == 'CANCEL_EVENT' ||
            actType == 'CANCEL_REMINDER' ||
            actType == 'COMPLETE_EVENT' ||
            actType == 'COMPLETE_ROUTINE' ||
            actType == 'COMPLETE_REMINDER' ||
            actType.contains('EVENT') ||
            actType.contains('REMINDER') ||
            actType.contains('SCHEDULE') ||
            actType.contains('ROUTINE')) {
          matchedTool = actType.toLowerCase();
          schedulePayload = actionData;
        }
      }

      // Robust fallback intent resolution from raw query if structured tool wasn't emitted by LLM
      if (matchedTool == null && fallbackQuery != null && fallbackQuery.trim().isNotEmpty) {
        final qLower = fallbackQuery.toLowerCase().trim();
        if ((qLower.startsWith('change ') || qLower.startsWith('rename ') || qLower.startsWith('move ') || qLower.startsWith('reschedule ') || qLower.startsWith('update ')) &&
            (qLower.contains(' to ') || qLower.contains(' at '))) {
          matchedTool = 'calendar_update_event';
          final m = RegExp(r'^(?:change|rename|move|reschedule|update)\s+(?:the\s+)?(.*?)\s+(?:to|at)\s+(.*)$', caseSensitive: false).firstMatch(qLower);
          if (m != null) {
            final qStr = m.group(1)!.trim();
            final targetStr = m.group(2)!.trim();
            final timeParsed = TimeFormatHelper.parseToHourMinute(targetStr);
            if (timeParsed != null && !targetStr.contains('work') && !targetStr.contains('walk') && !targetStr.contains('meeting')) {
              schedulePayload = {
                'query': qStr,
                'newTime': TimeFormatHelper.formatTo12H(targetStr),
                'date': DateTime.now().toIso8601String().split('T')[0],
              };
            } else {
              schedulePayload = {
                'query': qStr,
                'newTitle': targetStr.split(' ').map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '').join(' '),
                'date': DateTime.now().toIso8601String().split('T')[0],
              };
            }
          }
        } else if (qLower.startsWith('add ') || qLower.startsWith('schedule ') || qLower.startsWith('create ') || qLower.contains('meeting at')) {
          matchedTool = 'calendar_create_event';
          final timeMatch = RegExp(r'(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)', caseSensitive: false).firstMatch(qLower);
          final rawTime = timeMatch?.group(1)?.trim() ?? '4:00 PM';
          final rawTitle = qLower
              .replaceAll(RegExp(r'^(add|create|schedule|set reminder for)\s+'), '')
              .replaceAll(RegExp(r'\s+at\s+.*$'), '')
              .trim();
          final formattedTitle = rawTitle.isNotEmpty
              ? rawTitle.split(' ').map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '').join(' ')
              : 'Meeting';
          schedulePayload = {
            'title': formattedTitle,
            'time': TimeFormatHelper.formatTo12H(rawTime),
            'date': DateTime.now().toIso8601String().split('T')[0],
          };
        }
      }

      if (matchedTool == null) {
        final lowerText = response.message.toLowerCase();
        if (lowerText.contains('schedule') ||
            lowerText.contains('reminder') ||
            lowerText.contains('appointment') ||
            lowerText.contains('routine') ||
            lowerText.contains('task')) {
          matchedTool = 'general_schedule_sync';
          schedulePayload = actionData;
        }
      }

      if (matchedTool != null && schedulePayload != null) {
        final isCreate = matchedTool.contains('create') ||
            matchedTool.contains('schedule_event') ||
            matchedTool.contains('schedule_reminder');
        final isDelete = matchedTool.contains('delete') || matchedTool.contains('cancel');
        final isComplete = matchedTool.contains('complete') || matchedTool.contains('done');
        final isUpdate = matchedTool.contains('update') ||
            matchedTool.contains('reschedule') ||
            matchedTool.contains('move') ||
            matchedTool.contains('change') ||
            matchedTool.contains('rename') ||
            isComplete;

        final canonicalId = (schedulePayload['eventId'] ??
            schedulePayload['reminderId'] ??
            schedulePayload['entityId'] ??
            schedulePayload['scheduleId'] ??
            schedulePayload['id'])?.toString();

        final dateStr = schedulePayload['date']?.toString() ??
            DateTime.now().toIso8601String().split('T')[0];
        final title = schedulePayload['title']?.toString() ?? 'Meeting';
        final time = schedulePayload['time']?.toString() ??
            schedulePayload['formattedTime']?.toString() ??
            '';
        final triggerAt = schedulePayload['triggerAtMillis'];
        final triggerMillis = triggerAt is num ? triggerAt.toInt() : null;

        // 1. Android AlarmManager Execution Layer
        if (canonicalId != null && canonicalId.isNotEmpty) {
          if ((isCreate || isUpdate) &&
              !isDelete &&
              !isComplete &&
              triggerMillis != null &&
              triggerMillis > DateTime.now().millisecondsSinceEpoch) {
            await JarvisNativeBridge.scheduleReminder(
              reminderId: canonicalId,
              title: title,
              time: time,
              triggerAtMillis: triggerMillis,
            );
          } else if (isDelete || isComplete) {
            await JarvisNativeBridge.cancelReminder(canonicalId);
          }
        }

        // 2. Direct Repository Mutation (Instantly reflected on device)
        final repo = AppServiceLocator.instance.scheduleRepository;
        final targetDate = DateTime.tryParse(dateStr) ?? DateTime.now();

        if (isCreate) {
          final formattedTime = TimeFormatHelper.formatTo12H(time.isNotEmpty ? time : '04:00 PM');
          final paddedTime = _padTime(formattedTime);

          final newItem = ScheduleItem(
            id: canonicalId ?? 'jrv_${DateTime.now().millisecondsSinceEpoch}',
            title: title.toLowerCase().contains('meeting') && !title.contains('🤝') ? '🤝 $title' : title,
            description: schedulePayload['description']?.toString() ?? 'Added by JARVIS',
            time: paddedTime,
            category: _deriveCategoryFromTitle(title),
            status: ActivityStatus.upcoming,
            date: targetDate,
            reminderEnabled: true,
            createdAt: DateTime.now(),
            updatedAt: DateTime.now(),
            isSynced: canonicalId != null && !canonicalId.startsWith('local_') && !canonicalId.startsWith('jrv_'),
          );
          await repo.addRoutine(newItem);
        } else if (isUpdate) {
          final query = schedulePayload['query']?.toString() ??
              schedulePayload['titleQuery']?.toString() ??
              schedulePayload['oldTitle']?.toString() ??
              title;
          final newTitle = schedulePayload['newTitle']?.toString() ??
              schedulePayload['title']?.toString();
          final rawNewTime = schedulePayload['newTime']?.toString() ??
              (time.isNotEmpty ? time : null);
          final newTime = rawNewTime != null ? _padTime(TimeFormatHelper.formatTo12H(rawNewTime)) : null;

          if (canonicalId != null && canonicalId.isNotEmpty) {
            final existing = repo.getItemById(canonicalId);
            if (existing != null) {
              final updated = existing.copyWith(
                title: (newTitle != null && newTitle.trim().isNotEmpty) ? newTitle.trim() : existing.title,
                time: (newTime != null && newTime.trim().isNotEmpty) ? newTime.trim() : existing.time,
                status: isComplete ? ActivityStatus.completed : existing.status,
                updatedAt: DateTime.now(),
              );
              await repo.updateRoutine(updated);
            } else {
              await repo.updateRoutineByQuery(
                query: query,
                newTitle: newTitle,
                newTime: newTime,
                status: isComplete ? ActivityStatus.completed : null,
                targetDate: targetDate,
              );
            }
          } else {
            await repo.updateRoutineByQuery(
              query: query,
              newTitle: newTitle,
              newTime: newTime,
              status: isComplete ? ActivityStatus.completed : null,
              targetDate: targetDate,
            );
          }
        } else if (isDelete && canonicalId != null) {
          await repo.deleteRoutine(canonicalId);
        }

        // 3. Publish to ScheduleEventBus
        final actionType = isCreate
            ? ScheduleActionType.create
            : (isDelete
                ? ScheduleActionType.delete
                : (isUpdate ? ScheduleActionType.update : ScheduleActionType.refresh));

        ScheduleEventBus().publishMutation(
          action: actionType,
          source: ScheduleChangeSource.voice,
          entityId: canonicalId,
          date: targetDate,
          dateStr: dateStr,
          metadata: schedulePayload,
        );

        // 4. Non-blocking authoritative remote reconciliation (without wiping local items)
        repo.reconcileWithRemote(dateStr).catchError((_) => <ScheduleItem>[]);

        // 5. Force refresh ScheduleController UI
        final scheduleCtrl = AppServiceLocator.instance.scheduleController;
        scheduleCtrl.loadSchedule(
          selectedDate: targetDate,
          forceRefresh: true,
        );
        await scheduleCtrl.loadRoutines(forceRefresh: true);
      }
    } catch (e) {
      debugPrint('[JARVIS_SCHEDULE_RECONCILIATION] Error: $e');
    }
  }

  String _padTime(String formatted) {
    final parts = formatted.trim().split(' ');
    if (parts.isEmpty) return formatted;
    final hm = parts[0].split(':');
    if (hm.length != 2) return formatted;
    final h = hm[0].padLeft(2, '0');
    final m = hm[1].padLeft(2, '0');
    final period = parts.length > 1 ? ' ${parts[1]}' : '';
    return '$h:$m$period';
  }

  ActivityCategory _deriveCategoryFromTitle(String title) {
    final l = title.toLowerCase();
    if (l.contains('med') || l.contains('pill') || l.contains('doctor') || l.contains('health')) {
      return ActivityCategory.medicine;
    }
    if (l.contains('water') || l.contains('hydrat')) {
      return ActivityCategory.waterReminder;
    }
    if (l.contains('walk') || l.contains('exercise') || l.contains('gym') || l.contains('workout') || l.contains('run')) {
      return ActivityCategory.exercise;
    }
    if (l.contains('sleep') || l.contains('rest') || l.contains('nap')) {
      return ActivityCategory.sleep;
    }
    if (l.contains('food') || l.contains('lunch') || l.contains('dinner') || l.contains('breakfast') || l.contains('meal')) {
      return ActivityCategory.meal;
    }
    return ActivityCategory.office;
  }

  @override
  void dispose() {
    _isDisposed = true;
    _voiceService.cancelListening();
    _ttsService.stop();
    super.dispose();
  }
}
