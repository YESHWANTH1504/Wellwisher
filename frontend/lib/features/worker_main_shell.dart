import 'package:flutter/material.dart';
import '../services/app_service_locator.dart';
import '../services/notification_service.dart';
import '../services/voice_notification_service.dart';
import 'home/screens/worker_dashboard_screen.dart';
import 'planning/screens/planning_screen.dart';
import 'profile/screens/profile_screen.dart';
import 'schedule/controller/schedule_controller.dart';
import 'schedule/screens/schedule_screen.dart';
import 'screen_care/controller/screen_care_controller.dart';
import 'main_shell.dart';

class WorkerMainShellScreen extends StatefulWidget {
  const WorkerMainShellScreen({super.key});

  static late ScheduleController scheduleController;
  static late ScreenCareController screenCareController;

  @override
  State<WorkerMainShellScreen> createState() => _WorkerMainShellScreenState();
}

class _WorkerMainShellScreenState extends State<WorkerMainShellScreen> {
  int _currentIndex = 0;
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

  void _initServices() {
    final locator = AppServiceLocator();
    locator.localStorage.userRole = 'worker';

    WorkerMainShellScreen.screenCareController = locator.screenCareController;
    WorkerMainShellScreen.scheduleController = locator.scheduleController;

    // Also populate MainShellScreen static fields so any child screen works reliably
    MainShellScreen.screenCareController = locator.screenCareController;
    MainShellScreen.scheduleController = locator.scheduleController;

    _initialized = true;

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (mounted) {
        await NotificationService().requestPermissions();
        if (mounted) {
          VoiceNotificationService().init(locator.scheduleController, context);
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Colors.teal),
        ),
      );
    }

    final screens = [
      const WorkerDashboardScreen(),
      ScheduleScreen(controller: WorkerMainShellScreen.scheduleController),
      PlanningScreen(controller: WorkerMainShellScreen.scheduleController),
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
        selectedItemColor: isDark ? Colors.tealAccent : Colors.teal.shade700,
        unselectedItemColor: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
        showUnselectedLabels: true,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard_rounded),
            label: 'Work Home',
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
