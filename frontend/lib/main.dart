import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'core/routes/app_routes.dart';
import 'services/local_storage_service.dart';
import 'services/app_service_locator.dart';
import 'services/notification_service.dart';

import 'core/theme/jarvis_theme_manager.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppServiceLocator().init();
  await NotificationService().init();
  await JarvisThemeManager().init();
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  static void reloadTheme(BuildContext context) {
    context.findAncestorStateOfType<_MyAppState>()?.updateTheme();
  }

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final LocalStorageService _storage = LocalStorageService();
  final JarvisThemeManager _themeManager = JarvisThemeManager();

  void updateTheme() {
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _themeManager,
      builder: (context, _) {
        final isDark = _themeManager.isDarkMode;
        final lightTheme = AppTheme.buildTheme(
          isDark: false,
          isSeniorMode: _storage.isSeniorMode,
          colorTheme: _storage.colorTheme,
        );

        final darkTheme = AppTheme.buildTheme(
          isDark: true,
          isSeniorMode: _storage.isSeniorMode,
          colorTheme: _storage.colorTheme,
        );

        return MaterialApp(
          navigatorKey: AppRoutes.navigatorKey,
          title: 'WellWisher - Daily Routine & Wellness',
          theme: lightTheme,
          darkTheme: darkTheme,
          themeMode: isDark ? ThemeMode.dark : ThemeMode.light,
          initialRoute: AppRoutes.portal,
          onGenerateRoute: AppRoutes.generateRoute,
          debugShowCheckedModeBanner: false,
        );
      },
    );
  }
}
