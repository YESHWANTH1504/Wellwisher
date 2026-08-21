import 'package:flutter/material.dart';
import '../../features/schedule/screens/schedule_screen.dart';
import '../../features/schedule/screens/add_routine_screen.dart';
import '../../features/schedule/screens/routine_details_screen.dart';
import '../../features/schedule/screens/edit_routine_screen.dart';
import '../../features/schedule/models/schedule_model.dart';
import '../../features/main_shell.dart';
import '../../features/worker_main_shell.dart';
import '../../features/senior_main_shell.dart';
import '../../services/app_service_locator.dart';
import '../../features/home/screens/portal_screen.dart';
import '../../features/authentication/screens/login_screen.dart';
import '../../features/authentication/screens/worker_login_screen.dart';
import '../../features/authentication/screens/senior_login_screen.dart';
import '../../features/screen_care/screens/screen_care_settings_screen.dart';
import '../../features/family/screens/family_screen.dart';
import '../../features/statistics/screens/statistics_screen.dart';
import '../../features/health/screens/sleep_mood_screen.dart';
import '../../features/health/screens/medication_screen.dart';
import '../../features/ai_assistant/screens/wellwisher_ai_screen.dart';
import '../../features/voice_companion/screens/senior_voice_companion_screen.dart';
import '../../features/health/screens/vitals_screen.dart';
import '../../features/health/screens/ocr_scanner_screen.dart';
import '../../features/family/screens/caregiver_hub_screen.dart';
import '../../features/health/screens/cognitive_game_screen.dart';
import '../../features/health/screens/ai_journal_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/jarvis/screens/jarvis_screen.dart';
import '../../features/jarvis/screens/document_list_screen.dart';
import '../../features/jarvis/screens/document_upload_screen.dart';
import '../../features/jarvis/screens/document_comparison_screen.dart';
import '../../features/jarvis/screens/health_intelligence_screen.dart';
import '../../features/jarvis/screens/jarvis_action_center_screen.dart';

class AppRoutes {
  static const String portal = '/';
  static const String jarvis = '/jarvis';
  static const String jarvisHealth = '/jarvis/health';
  static const String jarvisActionCenter = '/jarvis/action-center';
  static const String jarvisDocuments = '/jarvis/documents';
  static const String jarvisDocumentUpload = '/jarvis/documents/upload';
  static const String jarvisDocumentCompare = '/jarvis/documents/compare';
  static const String mainShell = '/main';
  static const String workerDashboard = '/worker-dashboard';
  static const String seniorDashboard = '/senior-dashboard';
  static const String schedule = '/schedule';
  static const String workerLogin = '/worker-login';
  static const String seniorLogin = '/senior-login';
  static const String login = '/login';
  static const String addRoutine = '/add-routine';
  static const String routineDetails = '/routine-details';
  static const String editRoutine = '/edit-routine';
  static const String screenCareSettings = '/screen-care-settings';
  static const String familySharing = '/family-sharing';
  static const String statistics = '/statistics';
  static const String profile = '/profile';
  static const String sleepMood = '/sleep-mood';
  static const String medications = '/medications';
  static const String aiCoach = '/ai-coach';
  static const String voiceCompanion = '/voice-companion';
  static const String vitals = '/vitals';
  static const String ocrScanner = '/ocr-scanner';
  static const String caregiverHub = '/caregiver-hub';
  static const String cognitiveGame = '/cognitive-game';
  static const String aiJournal = '/ai-journal';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case portal:
        return MaterialPageRoute(builder: (_) => const PortalScreen());
      case jarvis:
        return MaterialPageRoute(
          builder: (_) => JarvisScreen(
            onStateInvalidationRequired: () {
              AppServiceLocator().scheduleController.loadRoutines();
            },
          ),
        );
      case jarvisHealth:
        return MaterialPageRoute(builder: (_) => const HealthIntelligenceScreen());
      case jarvisActionCenter:
        return MaterialPageRoute(builder: (_) => const JarvisActionCenterScreen());
      case jarvisDocuments:
        return MaterialPageRoute(builder: (_) => const DocumentListScreen());
      case jarvisDocumentUpload:
        return MaterialPageRoute(builder: (_) => const DocumentUploadScreen());
      case jarvisDocumentCompare:
        return MaterialPageRoute(builder: (_) => const DocumentComparisonScreen());
      case workerDashboard:
        return MaterialPageRoute(builder: (_) => const WorkerMainShellScreen());
      case seniorDashboard:
        return MaterialPageRoute(builder: (_) => const SeniorMainShellScreen());
      case schedule:
        return MaterialPageRoute(
          builder: (_) => ScheduleScreen(
            controller: AppServiceLocator().scheduleController,
          ),
        );
      case workerLogin:
        final args = settings.arguments as Map<String, dynamic>?;
        final isSignUp = args != null && args['isSignUp'] == true;
        return MaterialPageRoute(
          builder: (_) => WorkerLoginScreen(isSignUp: isSignUp),
        );
      case seniorLogin:
        final args = settings.arguments as Map<String, dynamic>?;
        final isSignUp = args != null && args['isSignUp'] == true;
        return MaterialPageRoute(
          builder: (_) => SeniorLoginScreen(isSignUp: isSignUp),
        );
      case mainShell:
        return MaterialPageRoute(builder: (_) => const MainShellScreen());
      case addRoutine:
        return MaterialPageRoute(builder: (_) => const AddRoutineScreen());
      case routineDetails:
        final item = settings.arguments as ScheduleItem;
        return MaterialPageRoute(
          builder: (_) => RoutineDetailsScreen(item: item),
        );
      case editRoutine:
        final item = settings.arguments as ScheduleItem;
        return MaterialPageRoute(builder: (_) => EditRoutineScreen(item: item));
      case login:
        return MaterialPageRoute(builder: (_) => const PortalScreen());
      case screenCareSettings:
        return MaterialPageRoute(
          builder: (_) => const ScreenCareSettingsScreen(),
        );
      case familySharing:
        return MaterialPageRoute(builder: (_) => const FamilyScreen());
      case statistics:
        return MaterialPageRoute(builder: (_) => const StatisticsScreen());
      case profile:
        return MaterialPageRoute(builder: (_) => const ProfileScreen());
      case sleepMood:
        return MaterialPageRoute(builder: (_) => const SleepMoodScreen());
      case medications:
        return MaterialPageRoute(builder: (_) => const MedicationScreen());
      case aiCoach:
        return MaterialPageRoute(builder: (_) => const WellWisherAiScreen());
      case voiceCompanion:
        return MaterialPageRoute(
          builder: (_) => const SeniorVoiceCompanionScreen(),
        );
      case vitals:
        return MaterialPageRoute(builder: (_) => const VitalsScreen());
      case ocrScanner:
        return MaterialPageRoute(builder: (_) => const OcrScannerScreen());
      case caregiverHub:
        return MaterialPageRoute(builder: (_) => const CaregiverHubScreen());
      case cognitiveGame:
        return MaterialPageRoute(builder: (_) => const CognitiveGameScreen());
      case aiJournal:
        return MaterialPageRoute(builder: (_) => const AiJournalScreen());
      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(child: Text('No route defined for ${settings.name}')),
          ),
        );
    }
  }
}
