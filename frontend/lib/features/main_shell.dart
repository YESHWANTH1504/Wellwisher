import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../services/local_storage_service.dart';
import '../services/schedule_service.dart';
import '../services/voice_notification_service.dart';
import 'home/screens/home_screen.dart';
import 'planning/screens/planning_screen.dart';
import 'profile/screens/profile_screen.dart';
import 'schedule/controller/schedule_controller.dart';
import 'schedule/repositories/schedule_repository.dart';
import 'schedule/screens/schedule_screen.dart';
import 'screen_care/controller/screen_care_controller.dart';
import 'screen_care/services/screen_care_service.dart';

class MainShellScreen extends StatefulWidget {
  const MainShellScreen({super.key});

  // Static references for deep screen navigation
  static late ScheduleController scheduleController;
  static late ScreenCareController screenCareController;

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  int _currentIndex = 1; // Highlight 'Schedule' tab by default

  late LocalStorageService _localStorageService;
  late ApiClient _apiClient;
  late ScheduleService _scheduleService;
  late ScheduleRepository _scheduleRepository;
  late ScreenCareService _screenCareService;

  bool _initialized = false;

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

  Future<void> _initServices() async {
    _localStorageService = LocalStorageService();
    await _localStorageService.init();

    _apiClient = ApiClient();
    _scheduleService = ScheduleService(apiClient: _apiClient);
    _scheduleRepository = ScheduleRepository(scheduleService: _scheduleService);

    _screenCareService = ScreenCareService(localStorageService: _localStorageService);
    
    MainShellScreen.screenCareController = ScreenCareController(service: _screenCareService);
    MainShellScreen.scheduleController = ScheduleController(
      repository: _scheduleRepository,
      screenCareController: MainShellScreen.screenCareController,
    );

    setState(() {
      _initialized = true;
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        VoiceNotificationService().init(MainShellScreen.scheduleController, context);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    final screens = [
      const HomeScreen(),
      ScheduleScreen(controller: MainShellScreen.scheduleController),
      PlanningScreen(controller: MainShellScreen.scheduleController),
      const ProfileScreen(),
    ];

    final isDark = Theme.of(context).brightness == Brightness.dark;

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
        backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        selectedItemColor: Theme.of(context).colorScheme.primary,
        unselectedItemColor: isDark ? Colors.grey.shade400 : Colors.grey,
        showUnselectedLabels: true,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today_outlined),
            activeIcon: Icon(Icons.calendar_today_rounded),
            label: 'Schedule',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.bar_chart_outlined),
            activeIcon: Icon(Icons.bar_chart_rounded),
            label: 'Plan',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
