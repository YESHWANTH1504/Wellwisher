import 'dart:async';
import 'package:flutter/material.dart';
import '../features/schedule/controller/schedule_controller.dart';
import '../features/schedule/models/schedule_model.dart';
import '../features/schedule/widgets/voice_notification_dialog.dart';
import '../features/schedule/widgets/worker_notification_dialog.dart';
import 'app_service_locator.dart';
import 'hydration_service.dart';
import 'local_storage_service.dart';
import 'notification_service.dart';
import 'sound_service.dart';
import 'voice_assistant_service.dart';
import 'voice_schedule_parser.dart';

class VoiceNotificationService {
  static final VoiceNotificationService _instance = VoiceNotificationService._internal();
  factory VoiceNotificationService() => _instance;
  VoiceNotificationService._internal();

  final LocalStorageService _storage = LocalStorageService();
  final Set<String> _alertedItemIds = {};
  Timer? _scheduleTicker;
  Timer? _workerHydrationTicker;
  bool _isShowingPopup = false;

  // Initialize background schedule checker
  void init(ScheduleController scheduleController, BuildContext globalContext) {
    _scheduleTicker?.cancel();
    _workerHydrationTicker?.cancel();

    // Initial check right after initialization to catch any due routines immediately
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAndTriggerRoutines(scheduleController, globalContext);
    });

    // Check routines every 10 seconds for accurate real-time triggering
    _scheduleTicker = Timer.periodic(const Duration(seconds: 10), (timer) {
      _checkAndTriggerRoutines(scheduleController, globalContext);
    });

    // 30-minute periodic Hydration Reminder for Workers
    _startWorkerHydrationReminderTimer();
  }

  void _startWorkerHydrationReminderTimer() {
    _workerHydrationTicker?.cancel();
    // 30-minute recurring reminder timer
    _workerHydrationTicker = Timer.periodic(const Duration(minutes: 30), (timer) {
      if (_storage.isNormalWorker) {
        triggerWorkerHydrationNotification();
      }
    });
  }

  /// Trigger a 30-minute Hydration notification for workers with chime, real-time intake progress, and status bar alert
  Future<void> triggerWorkerHydrationNotification() async {
    final hydration = HydrationService();
    final current = hydration.dailyHydrationTotalMl;
    final goal = hydration.goalMl;
    final portion = hydration.portionMl;
    final pct = hydration.percentage;

    SoundService.playChime();
    await NotificationService().showSystemNotification(
      id: 993000 + DateTime.now().minute,
      title: '💧 30-Min Hydration Break',
      body: 'Current intake: ${current}ml / ${goal}ml ($pct%). Drink a cup now to stay sharp and refreshed!',
      payload: 'hydration_30min_alert',
      isHydration: true,
      portionMl: portion,
    );
  }

  void stop() {
    _scheduleTicker?.cancel();
    _workerHydrationTicker?.cancel();
    _isShowingPopup = false;
  }

  // Check today's routines against current time with date synchronization
  void _checkAndTriggerRoutines(ScheduleController controller, BuildContext context) {
    if (!context.mounted || _isShowingPopup) return;

    final now = DateTime.now();
    final currentMinutesOfDay = now.hour * 60 + now.minute;

    for (final item in controller.currentRoutines) {
      if (item.status == ActivityStatus.completed || item.status == ActivityStatus.skipped) {
        continue;
      }
      if (!item.reminderEnabled) continue;
      if (_alertedItemIds.contains(item.id)) continue;

      // Ensure routine date matches today
      if (item.date.year != now.year || item.date.month != now.month || item.date.day != now.day) {
        continue;
      }

      // Parse schedule item time string ("10:00 AM" / "03:30 PM")
      final itemTime = _parseTimeString(item.time);
      if (itemTime != null) {
        final itemMinutesOfDay = itemTime.hour * 60 + itemTime.minute;
        
        // Trigger if current time has reached or passed the scheduled time for today
        if (currentMinutesOfDay >= itemMinutesOfDay) {
          _alertedItemIds.add(item.id);
          
          if (_storage.isSeniorCitizen) {
            showVoicePopup(context, item, controller: controller);
          } else {
            // Worker mode: show in-app popup dialog + sound chime + notification tray
            showWorkerPopup(context, item, controller: controller);
          }
          break; // Show one popup at a time
        }
      }
    }
  }

  TimeOfDay? _parseTimeString(String timeStr) {
    try {
      final clean = timeStr.replaceAll(RegExp(r'[^\d:APMapm\s]'), '').trim();
      final parts = clean.split(RegExp(r'\s+'));
      final hm = parts[0].split(':');
      int hour = int.parse(hm[0]);
      final int minute = int.parse(hm[1]);
      final isPm = parts.length > 1 && parts[1].toUpperCase() == 'PM';

      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour == 12) hour = 0;

      return TimeOfDay(hour: hour, minute: minute);
    } catch (_) {
      return null;
    }
  }

  // Display the Pop-Up Notification Dialog for Workers
  Future<void> showWorkerPopup(
    BuildContext context,
    ScheduleItem item, {
    ScheduleController? controller,
  }) async {
    if (!context.mounted || _isShowingPopup) return;
    _isShowingPopup = true;

    // 1. Play audio chime alert
    SoundService.playChime();

    // 2. Post visual alert to mobile system notification tray
    final numericId = item.id.hashCode & 0x7FFFFFFF;
    NotificationService().showSystemNotification(
      id: numericId,
      title: item.title,
      body: item.description.isNotEmpty ? item.description : 'Routine reminder for ${item.time}',
      payload: item.id,
      includeActions: true,
    );

    // 3. Display the interactive Worker Notification Pop-Up Dialog
    try {
      await WorkerNotificationDialog.show(
        context,
        item,
        controller: controller,
      );
    } finally {
      _isShowingPopup = false;
    }
  }

  // Instant Test Worker Pop-up for Worker Verification
  Future<void> testWorkerPopup(
    BuildContext context, {
    ScheduleItem? item,
    ScheduleController? controller,
  }) async {
    final activeController = controller ?? AppServiceLocator().scheduleController;
    ScheduleItem testItem;
    if (item != null) {
      testItem = item;
    } else {
      try {
        testItem = activeController.currentRoutines.firstWhere(
          (x) => x.requiresCompletionStatus && x.status != ActivityStatus.completed && x.status != ActivityStatus.skipped,
        );
      } catch (_) {
        testItem = activeController.currentRoutines.isNotEmpty
            ? activeController.currentRoutines.first
            : ScheduleItem(
                id: 'worker_routine_${DateTime.now().millisecondsSinceEpoch}',
                title: '🍳 Healthy Breakfast',
                description: 'High-protein breakfast to fuel your workday energy.',
                time: '08:00 AM',
                category: ActivityCategory.breakfast,
                status: ActivityStatus.upcoming,
                date: DateTime.now(),
                reminderEnabled: true,
                createdAt: DateTime.now(),
                updatedAt: DateTime.now(),
              );
      }
    }

    await showWorkerPopup(context, testItem, controller: activeController);
  }

  /// Live test bottom sheet allowing user to test status bar heads-up banners immediately
  /// and test lock-screen background wakeup alarms with a 10s delay.
  Future<void> showLiveTestSheet(BuildContext context) async {
    final controller = AppServiceLocator().scheduleController;
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.notifications_active_rounded, color: Color(0xFF16A34A), size: 24),
                    SizedBox(width: 8),
                    Text(
                      'Live Notification Tester',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Test the status bar heads-up banner with 🟢 Green Complete & 🔴 Red Snooze actions.',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 16),

            // Option 1: Instant Status Bar Heads-Up Pop-Up
            ListTile(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              tileColor: const Color(0xFFF0FDF4),
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: Color(0xFF16A34A),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.flash_on_rounded, color: Colors.white, size: 20),
              ),
              title: const Text(
                '⚡ Test Status Bar Pop-Up (Instant)',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
              ),
              subtitle: const Text(
                'Fires notification heads-up banner immediately to status bar with actions',
                style: TextStyle(fontSize: 11),
              ),
              onTap: () async {
                Navigator.pop(ctx);
                final enabled = await NotificationService().areNotificationsEnabled();
                if (!enabled) {
                  final granted = await NotificationService().requestPermissions();
                  if (!granted && context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('⚠️ Please enable notifications in your phone\'s Settings -> Apps -> WellWisher -> Notifications.'),
                        backgroundColor: Colors.red,
                        duration: Duration(seconds: 5),
                      ),
                    );
                    return;
                  }
                }
                SoundService.playChime();
                await NotificationService().showSystemNotification(
                  id: 999111,
                  title: '🍳 Morning Breakfast (Main Meal)',
                  body: 'Time for your high-protein breakfast! Mark complete or snooze directly from the notification bar.',
                  payload: 'test_breakfast_item',
                  includeActions: true,
                );
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('📲 Notification posted! Pull down your status bar to view it.'),
                      backgroundColor: Color(0xFF16A34A),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              },
            ),

            const SizedBox(height: 10),

            // Option 2: 10-Second Lock Screen / Closed App Alarm Test
            ListTile(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              tileColor: Colors.deepPurple.shade50,
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: Color(0xFF4F46E5),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.timer_rounded, color: Colors.white, size: 20),
              ),
              title: const Text(
                '⏰ Test Background Alarm (10s Delay)',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
              ),
              subtitle: const Text(
                'Schedules in 10s. Lock your phone or close app to test wake-up pop-up!',
                style: TextStyle(fontSize: 11),
              ),
              onTap: () async {
                Navigator.pop(ctx);
                final testTarget = DateTime.now().add(const Duration(seconds: 10));
                final timeStr = VoiceScheduleParser.parse('at ${testTarget.hour}:${testTarget.minute}').time;
                final testItem = ScheduleItem(
                  id: 'lock_screen_test_${DateTime.now().millisecondsSinceEpoch}',
                  title: '🍱 Afternoon Lunch (Main Meal)',
                  description: 'Background wake-up notification test with Green & Red action buttons.',
                  time: timeStr,
                  category: ActivityCategory.meal,
                  status: ActivityStatus.upcoming,
                  date: testTarget,
                  reminderEnabled: true,
                  createdAt: DateTime.now(),
                  updatedAt: DateTime.now(),
                );

                await NotificationService().scheduleRoutineAlarm(testItem);

                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('⏰ Alarm scheduled in 10 seconds! Lock your phone now to test wake-up.'),
                      backgroundColor: Color(0xFF4F46E5),
                      duration: Duration(seconds: 5),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              },
            ),

            const SizedBox(height: 10),

            // Option 3: In-App Pop-up Dialog
            ListTile(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              tileColor: Colors.grey.shade50,
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.grey.shade700,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.web_stories_rounded, color: Colors.white, size: 20),
              ),
              title: const Text(
                '🔔 Test In-App Pop-Up Dialog',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
              ),
              subtitle: const Text(
                'Shows full-screen in-app dialog on top of the app UI',
                style: TextStyle(fontSize: 11),
              ),
              onTap: () {
                Navigator.pop(ctx);
                testWorkerPopup(context, controller: controller);
              },
            ),
          ],
        ),
      ),
    );
  }

  // Display the Pop-Up Voice Notification Dialog & Mobile System Status Bar Alert for Seniors
  Future<void> showVoicePopup(
    BuildContext context,
    ScheduleItem item, {
    ScheduleController? controller,
  }) async {
    if (!context.mounted || _isShowingPopup) return;
    _isShowingPopup = true;

    final langCode = _storage.selectedLanguage;
    final spokenText = getLocalizedVoiceText(item, langCode);
    final numericId = item.id.hashCode & 0x7FFFFFFF;

    // 1. Post Visual Alert to Mobile System Status Bar Notification Tray
    NotificationService().showSystemNotification(
      id: numericId,
      title: item.title,
      body: spokenText,
      payload: item.id,
      includeActions: true,
    );

    // 2. Play Audio Chime & Speak Voice Alert out loud alongside status bar notification
    if (_storage.autoSpeakPopups) {
      SoundService.playChime();
      VoiceAssistantService.speak(spokenText, langCode: langCode);
    }

    // 3. Display the Senior Voice Dialog Card
    try {
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => VoiceNotificationDialog(
          item: item,
          controller: controller,
        ),
      );
    } finally {
      _isShowingPopup = false;
    }
  }

  // Instant Test Voice Pop-up for Senior Verification
  Future<void> testVoicePopup(
    BuildContext context, {
    ScheduleItem? item,
    ScheduleController? controller,
  }) async {
    final activeController = controller ?? AppServiceLocator().scheduleController;
    ScheduleItem testItem;
    if (item != null) {
      testItem = item;
    } else {
      try {
        testItem = activeController.currentRoutines.firstWhere(
          (x) => x.status != ActivityStatus.completed && x.status != ActivityStatus.skipped,
        );
      } catch (_) {
        testItem = activeController.currentRoutines.isNotEmpty
            ? activeController.currentRoutines.first
            : ScheduleItem(
                id: 'senior_routine_${DateTime.now().millisecondsSinceEpoch}',
                title: '💊 Morning Medication & Hydration',
                description: 'Take 1 Blood Pressure pill with a warm glass of water.',
                time: 'Now',
                category: ActivityCategory.medicine,
                status: ActivityStatus.upcoming,
                date: DateTime.now(),
                reminderEnabled: true,
                createdAt: DateTime.now(),
                updatedAt: DateTime.now(),
              );
      }
    }

    await showVoicePopup(context, testItem, controller: activeController);
  }

  // Clear alerted IDs for new day or snooze
  void resetAlertedItem(String id) {
    _alertedItemIds.remove(id);
  }

  static String _getLocalizedTitle(String rawTitle, String langCode) {
    final lower = rawTitle.toLowerCase();
    if (lower.contains('medication') || lower.contains('medicine') || lower.contains('pill')) {
      switch (langCode) {
        case 'ta-IN': return 'காலை மருந்து மாத்திரை மற்றும் தண்ணீர்';
        case 'hi-IN': return 'सुबह की दवाई और पानी';
        case 'te-IN': return 'ఉదయం మందులు మరియు నీళ్ళు';
        case 'kn-IN': return 'ಬೆಳಗಿನ ಮಾತ್ರೆ ಮತ್ತು ನೀರು';
        case 'ml-IN': return 'രാവിലത്തെ മരുന്നും വെള്ളവും';
        case 'es-ES': return 'Medicamentos y agua de la mañana';
        default: return 'Morning Medication & Hydration';
      }
    }
    if (lower.contains('breakfast')) {
      switch (langCode) {
        case 'ta-IN': return 'காலை உணவு';
        case 'hi-IN': return 'सुबह का नाश्ता';
        case 'te-IN': return 'ఉదయం టిఫిన్';
        case 'kn-IN': return 'ಬೆಳಗಿನ ಉಪಾಹಾರ';
        case 'ml-IN': return 'രാവിലത്തെ ഭക്ഷണം';
        case 'es-ES': return 'Desayuno';
        default: return 'Breakfast';
      }
    }
    if (lower.contains('water') || lower.contains('hydration')) {
      switch (langCode) {
        case 'ta-IN': return 'தண்ணீர் அருந்துதல்';
        case 'hi-IN': return 'पानी पीना';
        case 'te-IN': return 'మంచి నీళ్ళు తాగడం';
        case 'kn-IN': return 'ನೀರು ಕುಡಿಯುವುದು';
        case 'ml-IN': return 'വെള്ളം കുടിക്കൽ';
        case 'es-ES': return 'Hidratación';
        default: return 'Water Hydration';
      }
    }
    if (lower.contains('nap') || lower.contains('rest')) {
      switch (langCode) {
        case 'ta-IN': return 'மதிய ஓய்வு';
        case 'hi-IN': return 'दोपहर का आराम';
        case 'te-IN': return 'మధ్యాహ్నం విశ్రాంతి';
        case 'kn-IN': return 'ಮಧ್ಯಾಹ್ನದ ವಿಶ್ರಾಂತಿ';
        case 'ml-IN': return 'ഉച്ചയ്ക്കുള്ള വിശ്രമം';
        case 'es-ES': return 'Siesta';
        default: return 'Afternoon Rest';
      }
    }
    if (lower.contains('wake')) {
      switch (langCode) {
        case 'ta-IN': return 'காலை விழிப்பு';
        case 'hi-IN': return 'सुबह जागना';
        case 'te-IN': return 'మేల్కొలుపు';
        case 'kn-IN': return 'ಎಚ್ಚರಗೊಳ್ಳುವುದು';
        case 'ml-IN': return 'ഉണരൽ';
        case 'es-ES': return 'Despertar';
        default: return 'Wake Up';
      }
    }
    if (lower.contains('lunch') || lower.contains('meal')) {
      switch (langCode) {
        case 'ta-IN': return 'மதிய உணவு';
        case 'hi-IN': return 'दोपहर का खाना';
        case 'te-IN': return 'మధ్యాహ్నం భోజనం';
        case 'kn-IN': return 'ಮಧ್ಯಾಹ್ನದ ಊಟ';
        case 'ml-IN': return 'ഉച്ചഭക്ഷണം';
        case 'es-ES': return 'Almuerzo';
        default: return 'Lunch';
      }
    }
    return rawTitle;
  }

  static String _getLocalizedDesc(String rawDesc, String langCode) {
    final lower = rawDesc.toLowerCase();
    
    // Detect "Take 1 pill with a warm glass of water" pattern
    if ((lower.contains('pill') || lower.contains('medicine') || lower.contains('medication') || lower.contains('pressure')) &&
        (lower.contains('water') || lower.contains('warm') || lower.contains('glass') || lower.contains('hydration'))) {
      switch (langCode) {
        case 'ta-IN':
          return 'ஒரு டம்ளர் வெதுவெதுப்பான தண்ணீருடன் 1 மாத்திரை சாப்பிடுங்கம்மா';
        case 'hi-IN':
          return 'एक गिलास गुनगुने पानी के साथ 1 बीपी की गोली ले लीजिए माँ';
        case 'te-IN':
          return 'ఒక గ్లాసు గోరువెచ్చని నీళ్ళతో 1 బిపి మాత్ర తీసుకోండి అమ్మా';
        case 'kn-IN':
          return 'ಒಂದು ಗ್ಲಾಸ್ ಉಗುರುಬಿಸಿ ನೀರಿನೊಂದಿಗೆ 1 ಬಿಪಿ ಮಾತ್ರೆ ತಗೊಳ್ಳಿ ಅಮ್ಮಾ';
        case 'ml-IN':
          return 'ഒരു ഗ്ലാസ് ചെറുചൂടുള്ള വെള്ളത്തോടൊപ്പം 1 ബിപി ഗുളിക കഴിക്കൂ അമ്മാ';
        case 'es-ES':
          return 'Tome 1 pastilla con un vaso de agua tibia, Mamá';
        default:
          return 'Take 1 pill with a warm glass of water, Mom';
      }
    }

    if (lower.contains('stretching')) {
      switch (langCode) {
        case 'ta-IN':
          return 'கொஞ்சம் உடற்பயிற்சி செய்து தண்ணீர் குடியுங்கம்மா';
        case 'hi-IN':
          return 'हल्का व्यायाम करें और पानी पीजिए माँ';
        case 'te-IN':
          return 'కొద్దిగా కొలతలు చేసి మంచి నీళ్ళు తాగండి అమ్మా';
        case 'kn-IN':
          return 'ಸ್ವಲ್ಪ ಕಸರತ್ತು ಮಾಡಿ ನೀರು ಕುಡಿಯಿರಿ ಅಮ್ಮಾ';
        case 'ml-IN':
          return 'ചെറിയ വ്യായാമം ചെയ്ത് വെള്ളം കുടിക്കൂ അമ്മാ';
        case 'es-ES':
          return 'Estiramientos ligeros y agua, Mamá';
        default:
          return 'Light stretching and hydration, Mom';
      }
    }

    if (lower.contains('breakfast')) {
      switch (langCode) {
        case 'ta-IN':
          return 'ஆரோக்கியமான காலை உணவு மற்றும் மாத்திரை சாப்பிடுங்கம்மா';
        case 'hi-IN':
          return 'पौष्टिक नाश्ता करें और अपनी दवाई ले लीजिए माँ';
        case 'te-IN':
          return 'ఆరోగ్యకరమైన టిఫిన్ చేసి మందులు వేసుకోండి అమ్మా';
        case 'kn-IN':
          return 'ಆರೋಗ್ಯಕರ ಉಪಾಹಾರ ಮತ್ತು ಮಾತ್ರೆ ತಗೊಳ್ಳಿ ಅಮ್ಮಾ';
        case 'ml-IN':
          return 'ആരോഗ്യകരമായ ഭക്ഷണവും മരുന്നും കഴിക്കൂ അമ്മാ';
        case 'es-ES':
          return 'Desayuno saludable y pastillas, Mamá';
        default:
          return 'Healthy breakfast and pills, Mom';
      }
    }

    if (lower.contains('pill') || lower.contains('medicine') || lower.contains('medication')) {
      switch (langCode) {
        case 'ta-IN':
          return 'மருந்து மாத்திரையை மறக்காம சாப்பிடுங்கம்மா';
        case 'hi-IN':
          return 'समय पर अपनी दवाई ले लीजिए माँ';
        case 'te-IN':
          return 'సమయానికి మందులు వేసుకోండి అమ్మా';
        case 'kn-IN':
          return 'ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಮಾತ್ರೆ ತಗೊಳ್ಳಿ ಅಮ್ಮಾ';
        case 'ml-IN':
          return 'സമയത്ത് മരുന്ന് കഴിക്കൂ അമ്മാ';
        case 'es-ES':
          return 'Tome sus medicinas a tiempo, Mamá';
        default:
          return 'Please take your medicine on time, Mom';
      }
    }

    if (lower.contains('water') || lower.contains('hydration') || lower.contains('glass')) {
      switch (langCode) {
        case 'ta-IN':
          return 'ஒரு டம்ளர் புது தண்ணீர் குடியுங்கம்மா';
        case 'hi-IN':
          return 'एक गिलास ताजा पानी पी लीजिए माँ';
        case 'te-IN':
          return 'ఒక గ్లాసు మంచి నీళ్ళు తాగండి అమ్మా';
        case 'kn-IN':
          return 'ಒಂದು ಗ್ಲಾಸ್ ನೀರು ಕುಡಿಯಿರಿ ಅಮ್ಮಾ';
        case 'ml-IN':
          return 'ഒരു ഗ്ലാസ് വെള്ളം കുടിക്കൂ അമ്മാ';
        case 'es-ES':
          return 'Tome un vaso de agua fresca, Mamá';
        default:
          return 'Drink a fresh glass of water, Mom';
      }
    }

    return rawDesc;
  }

  // Generate warm, caring multi-lingual voice notification prompt for seniors
  static String getLocalizedVoiceText(ScheduleItem item, String langCode) {
    // Strip emojis from title and description before building the spoken text
    final emojiRegex = RegExp(
      r'[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]',
      unicode: true,
    );
    final rawTitle = item.title.replaceAll(emojiRegex, '').replaceAll(RegExp(r'\s+'), ' ').trim();
    final rawDescText = item.description.isNotEmpty ? item.description : 'Take care of your health today!';
    final rawDesc = rawDescText.replaceAll(emojiRegex, '').replaceAll(RegExp(r'\s+'), ' ').trim();

    final title = _getLocalizedTitle(rawTitle, langCode);
    final desc = _getLocalizedDesc(rawDesc, langCode);

    switch (langCode) {
      case 'ta-IN':
        return 'அம்மா! இப்போது $title நேரம் ஆச்சுமா. $desc. மறக்காம செய்யுங்கம்மா.';
      case 'hi-IN':
        return 'माँ! अभी $title का समय हो गया है माँ। $desc। समय पर कर लीजिए माँ।';
      case 'te-IN':
        return 'అమ్మా! ఇప్పుడు $title సమయం అయింది అమ్మా. $desc. జాగ్రత్తగా తీసుకోండి అమ్మా.';
      case 'kn-IN':
        return 'ಅಮ್ಮಾ! ಈಗ $title ಸಮಯವಾಗಿದೆ ಅಮ್ಮಾ. $desc. ಜಾಗ್ರತೆಯಾಗಿರಿ ಅಮ್ಮಾ.';
      case 'ml-IN':
        return 'അമ്മാ! ഇപ്പോൾ $title സമയമായി അമ്മാ. $desc. ശ്രദ്ധിക്കണേ അമ്മാ.';
      case 'es-ES':
        return 'Hola Mama! Es hora de $title, Mama. $desc. Cuidese mucho, Mama!';
      default:
        return 'Hi Mom! It\'s time for $title, Mom. $desc. Please take care of yourself, Mom!';
    }
  }
}
