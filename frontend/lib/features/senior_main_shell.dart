import 'package:flutter/material.dart';
import '../services/app_service_locator.dart';
import '../services/local_storage_service.dart';
import '../services/voice_notification_service.dart';
import 'home/screens/senior_dashboard_screen.dart';
import 'family/screens/caregiver_hub_screen.dart';
import 'profile/screens/profile_screen.dart';
import 'schedule/controller/schedule_controller.dart';
import 'schedule/screens/schedule_screen.dart';
import 'screen_care/controller/screen_care_controller.dart';
import 'main_shell.dart';

class SeniorMainShellScreen extends StatefulWidget {
  const SeniorMainShellScreen({super.key});

  static late ScheduleController scheduleController;
  static late ScreenCareController screenCareController;

  @override
  State<SeniorMainShellScreen> createState() => _SeniorMainShellScreenState();
}

class _SeniorMainShellScreenState extends State<SeniorMainShellScreen> {
  int _currentIndex = 0;
  bool _initialized = false;
  late LocalStorageService _localStorageService;

  @override
  void initState() {
    super.initState();
    _initServices();
  }

  @override
  void dispose() {
    VoiceNotificationService().stop();
    super.dispose();
  }

  void _initServices() {
    final locator = AppServiceLocator();
    locator.localStorage.userRole = 'senior';
    _localStorageService = locator.localStorage;

    SeniorMainShellScreen.screenCareController = locator.screenCareController;
    SeniorMainShellScreen.scheduleController = locator.scheduleController;

    // Also populate MainShellScreen static fields
    MainShellScreen.screenCareController = locator.screenCareController;
    MainShellScreen.scheduleController = locator.scheduleController;

    _initialized = true;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        VoiceNotificationService().init(locator.scheduleController, context);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Colors.purple.shade700),
        ),
      );
    }

    final screens = [
      const SeniorDashboardScreen(),
      ScheduleScreen(controller: SeniorMainShellScreen.scheduleController),
      const CaregiverHubScreen(),
      const ProfileScreen(),
    ];

    String getNavLabel(String key) {
      final lang = _localStorageService.selectedLanguage;
      switch (lang) {
        case 'ta-IN':
          switch (key) {
            case 'home': return 'முகப்பு';
            case 'schedule': return 'அட்டவணை';
            case 'caregiver': return 'பராமரிப்பு';
            case 'profile': return 'சுயவிவரம்';
          }
          break;
        case 'hi-IN':
          switch (key) {
            case 'home': return 'होम';
            case 'schedule': return 'दिनचर्या';
            case 'caregiver': return 'केयरगिवर';
            case 'profile': return 'प्रोफ़ाइल';
          }
          break;
        case 'te-IN':
          switch (key) {
            case 'home': return 'హోమ్';
            case 'schedule': return 'షెడ్యూల్';
            case 'caregiver': return 'కేర్‌గివర్';
            case 'profile': return 'ప్రొఫైల్';
          }
          break;
        case 'kn-IN':
          switch (key) {
            case 'home': return 'ಮುಖಪುಟ';
            case 'schedule': return 'ವೇಳಾಪಟ್ಟಿ';
            case 'caregiver': return 'ಕೇರ್‌ಗಿವರ್';
            case 'profile': return 'ಪ್ರೊಫೈಲ್';
          }
          break;
        case 'ml-IN':
          switch (key) {
            case 'home': return 'ഹോം';
            case 'schedule': return 'ദിനചര്യ';
            case 'caregiver': return 'കെയർഗിവർ';
            case 'profile': return 'പ്രൊഫൈൽ';
          }
          break;
        default:
          switch (key) {
            case 'home': return 'Home';
            case 'schedule': return 'Schedule';
            case 'caregiver': return 'Caregiver';
            case 'profile': return 'Profile';
          }
      }
      return key;
    }

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Colors.purple.shade800,
        unselectedItemColor: Colors.grey.shade600,
        showUnselectedLabels: true,
        iconSize: 24,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        items: [
          BottomNavigationBarItem(
            icon: const Icon(Icons.home_rounded),
            activeIcon: const Icon(Icons.home_filled),
            label: getNavLabel('home'),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.calendar_month_outlined),
            activeIcon: const Icon(Icons.calendar_month_rounded),
            label: getNavLabel('schedule'),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.family_restroom_outlined),
            activeIcon: const Icon(Icons.family_restroom_rounded),
            label: getNavLabel('caregiver'),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.person_outline),
            activeIcon: const Icon(Icons.person_rounded),
            label: getNavLabel('profile'),
          ),
        ],
      ),
    );
  }
}
