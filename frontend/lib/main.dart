import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'core/routes/app_routes.dart';
import 'services/local_storage_service.dart';
import 'services/app_service_locator.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppServiceLocator().init();
  await NotificationService().init();
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

  void updateTheme() {
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
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

    // If logged in, launch role dashboard, otherwise launch the Portal
    final initialRoute = _storage.isLoggedIn
        ? (_storage.isSeniorCitizen ? AppRoutes.seniorDashboard : AppRoutes.workerDashboard)
        : AppRoutes.portal;

    return MaterialApp(
      title: 'WellWisher - Daily Routine & Wellness',
      theme: lightTheme,
      darkTheme: darkTheme,
      themeMode: _storage.isDarkMode ? ThemeMode.dark : ThemeMode.light,
      initialRoute: initialRoute,
      onGenerateRoute: AppRoutes.generateRoute,
      debugShowCheckedModeBanner: false,
    );
  }
}
