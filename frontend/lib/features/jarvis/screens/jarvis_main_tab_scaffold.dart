import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/widgets/jarvis/jarvis_bottom_navigation.dart';
import '../../../services/app_service_locator.dart';
import '../controller/jarvis_home_controller.dart';
import 'jarvis_home_screen.dart';
import 'jarvis_calendar_schedule_screen.dart';
import 'jarvis_health_dashboard_screen.dart';
import 'jarvis_settings_screen.dart';
import '../../../core/theme/jarvis_theme_manager.dart';

/// Master Tab Scaffold for JARVIS Personal AI Operating System.
///
/// Features:
/// - TAB 0: JARVIS (Primary voice-first AI command center, reactive orb)
/// - TAB 1: SCHEDULE (Authoritative calendar & 24h timeline control surface)
/// - TAB 2: HEALTH (Production-grade Health Intelligence & Health Connect dashboard)
/// - TAB 3: MORE (Neural core configuration, voice tuning, and memory matrix)
/// - Preserves full state via [IndexedStack] so voice sessions, wake state, transcripts,
///   calendar scroll position, and health metrics are never destroyed when switching tabs.
/// - Integrated with [JarvisBottomNavigation] with glowing active pills and haptic feedback.
class JarvisMainTabScaffold extends StatefulWidget {
  final int initialIndex;

  const JarvisMainTabScaffold({
    super.key,
    this.initialIndex = 0,
  });

  @override
  State<JarvisMainTabScaffold> createState() => _JarvisMainTabScaffoldState();
}

class _JarvisMainTabScaffoldState extends State<JarvisMainTabScaffold> {
  late int _currentIndex;
  late final JarvisHomeController _sharedJarvisController;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _sharedJarvisController = JarvisHomeController(
      onStateInvalidationRequired: () {
        AppServiceLocator().scheduleController.loadRoutines();
      },
    );
  }

  @override
  void dispose() {
    _sharedJarvisController.dispose();
    super.dispose();
  }

  void _onTabSelected(int index) {
    if (_currentIndex == index) return;
    HapticFeedback.selectionClick();
    setState(() {
      _currentIndex = index;
    });
    if (index == 1) {
      AppServiceLocator().scheduleController.loadRoutines(forceRefresh: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: JarvisThemeManager(),
      builder: (context, _) {
        final theme = JarvisThemeManager();
        return Scaffold(
          backgroundColor: theme.background,
          body: IndexedStack(
            index: _currentIndex,
            children: [
              // TAB 0: JARVIS Voice-First AI Command Center
              JarvisHomeScreen(
                controller: _sharedJarvisController,
                onSwitchTab: _onTabSelected,
                onStateInvalidationRequired: () {
                  AppServiceLocator().scheduleController.loadRoutines();
                },
              ),

              // TAB 1: SCHEDULE Authoritative Calendar & Timeline Control Surface
              JarvisCalendarScheduleScreen(
                scheduleController: AppServiceLocator().scheduleController,
                jarvisController: _sharedJarvisController,
              ),

              // TAB 2: HEALTH Live Health Intelligence Dashboard
              JarvisHealthDashboardScreen(
                controller: AppServiceLocator().healthController,
              ),

              // TAB 3: MORE / Neural Core Settings & Subsystems
              const JarvisSettingsScreen(),
            ],
          ),
          bottomNavigationBar: JarvisBottomNavigation(
            currentIndex: _currentIndex,
            onTabSelected: _onTabSelected,
          ),
        );
      },
    );
  }
}
