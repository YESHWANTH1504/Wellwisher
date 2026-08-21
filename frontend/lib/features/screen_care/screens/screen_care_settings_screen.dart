import 'package:flutter/material.dart';
import '../controller/screen_care_controller.dart';
import '../../../services/app_service_locator.dart';

class ScreenCareSettingsScreen extends StatelessWidget {
  final ScreenCareController? controller;

  const ScreenCareSettingsScreen({super.key, this.controller});

  @override
  Widget build(BuildContext context) {
    final activeController = controller ?? AppServiceLocator().screenCareController;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Screen Care Settings',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: ListenableBuilder(
        listenable: activeController,
        builder: (context, _) {
          return Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Eye Wellness Routine',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Enable Screen Care to automatically inject eye-break reminders into your daily routine. We will suggest taking 20-second breaks using the 20-20-20 rule to prevent strain.',
                  style: TextStyle(color: Colors.grey, height: 1.4),
                ),
                const SizedBox(height: 30),
                Card(
                  elevation: 0,
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.05),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide(
                      color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                    ),
                  ),
                  child: SwitchListTile(
                    title: const Text(
                      'Screen Care Mode',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: const Text('Inject automatic eye breaks into schedule'),
                    value: activeController.isEnabled,
                    onChanged: activeController.toggleScreenCare,
                    secondary: Icon(
                      Icons.remove_red_eye_rounded,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
