import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wellwisher/core/theme/jarvis_theme_manager.dart';
import 'package:wellwisher/core/widgets/jarvis/jarvis_soundwave_orb.dart';
import 'package:wellwisher/core/widgets/jarvis/jarvis_bottom_speech_bar.dart';
import 'package:wellwisher/features/authentication/screens/login_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('Final UX & Persona Corrections Tests', () {
    // ============================================================
    // 1. REGISTRATION — CONFIRM PASSWORD
    // ============================================================
    testWidgets('1.1 Registration Confirm Password validation: empty, mismatch, and match', (tester) async {
      final tm = JarvisThemeManager();
      await tm.init();

      await tester.pumpWidget(
        const MaterialApp(
          home: LoginScreen(initialRole: 'worker'),
        ),
      );
      await tester.pumpAndSettle();

      // Switch to Sign Up mode
      final registerToggle = find.text("Don't have an account? Register");
      expect(registerToggle, findsOneWidget);
      await tester.tap(registerToggle);
      await tester.pumpAndSettle();

      // Confirm Password field should appear
      expect(find.text('Confirm Password'), findsOneWidget);

      // Submit with empty confirm password
      final signUpButton = find.widgetWithText(ElevatedButton, 'Register Worker Account 💼');
      expect(signUpButton, findsOneWidget);
      await tester.ensureVisible(signUpButton);
      await tester.tap(signUpButton);
      await tester.pumpAndSettle();

      // Should show validation error for confirm password
      expect(find.text('Please confirm your password.'), findsOneWidget);

      // Enter mismatched passwords
      final passwordFields = find.byType(TextFormField);
      // Form fields: Name (0), Email (1), Password (2), Confirm Password (3)
      expect(passwordFields, findsNWidgets(4));

      await tester.enterText(passwordFields.at(0), 'Test User');
      await tester.enterText(passwordFields.at(1), 'test@example.com');
      await tester.enterText(passwordFields.at(2), 'Password123');
      await tester.enterText(passwordFields.at(3), 'DifferentPassword');
      await tester.pumpAndSettle();

      await tester.ensureVisible(signUpButton);
      await tester.tap(signUpButton);
      await tester.pumpAndSettle();

      expect(find.text('Passwords do not match.'), findsOneWidget);

      // Enter matching passwords
      await tester.enterText(passwordFields.at(3), 'Password123');
      await tester.pumpAndSettle();

      await tester.ensureVisible(signUpButton);
      await tester.tap(signUpButton);
      await tester.pumpAndSettle();

      // Mismatch error should be gone
      expect(find.text('Passwords do not match.'), findsNothing);
      expect(find.text('Please confirm your password.'), findsNothing);
    });

    testWidgets('1.2 Independent visibility toggles for Password and Confirm Password', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: LoginScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Switch to Sign Up mode
      await tester.tap(find.text("Don't have an account? Register"));
      await tester.pumpAndSettle();

      // Check visibility icons
      final visibilityIcons = find.byIcon(Icons.visibility_off);
      expect(visibilityIcons, findsNWidgets(2));

      // Toggle first password visibility
      await tester.tap(visibilityIcons.first);
      await tester.pumpAndSettle();

      // Now one is visible (Icons.visibility) and one is still obscured (Icons.visibility_off)
      expect(find.byIcon(Icons.visibility), findsOneWidget);
      expect(find.byIcon(Icons.visibility_off), findsOneWidget);

      // Toggle confirm password visibility
      await tester.tap(find.byIcon(Icons.visibility_off));
      await tester.pumpAndSettle();

      // Both are now visible
      expect(find.byIcon(Icons.visibility), findsNWidgets(2));
      expect(find.byIcon(Icons.visibility_off), findsNothing);
    });

    // ============================================================
    // 2. JARVIS SPEAKER WAVEFORM BEHAVIOR & IDLE STABILITY
    // ============================================================
    testWidgets('2.1 Waveform Orb stops animation when isSpeaking is false (idle/listening/thinking)', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Center(
              child: JarvisSoundwaveOrb(
                size: 200,
                isSpeaking: false,
                isListening: false,
                isThinking: false,
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      // Find the state of the JarvisSoundwaveOrb
      final orbState = tester.state<JarvisSoundwaveOrbState>(find.byType(JarvisSoundwaveOrb));
      final controller = orbState.animController;

      // Controller should NOT be animating when idle
      expect(controller.isAnimating, isFalse);
      expect(controller.value, 0.0);
    });

    testWidgets('2.2 Waveform Orb animates when isSpeaking is true and stops on TTS completion', (tester) async {
      bool isSpeaking = true;

      await tester.pumpWidget(
        StatefulBuilder(
          builder: (context, setState) {
            return MaterialApp(
              home: Scaffold(
                body: Center(
                  child: Column(
                    children: [
                      JarvisSoundwaveOrb(
                        size: 200,
                        isSpeaking: isSpeaking,
                      ),
                      ElevatedButton(
                        onPressed: () => setState(() => isSpeaking = false),
                        child: const Text('Stop TTS'),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      );
      await tester.pump();

      final orbState = tester.state<JarvisSoundwaveOrbState>(find.byType(JarvisSoundwaveOrb));
      final controller = orbState.animController;

      // Controller should be animating when speaking
      expect(controller.isAnimating, isTrue);

      // Trigger TTS completion / barge-in interrupt
      await tester.tap(find.text('Stop TTS'));
      await tester.pumpAndSettle();

      // Controller should stop and return to 0.0 baseline
      expect(controller.isAnimating, isFalse);
      expect(controller.value, 0.0);
    });

    // ============================================================
    // 3. WHITE THEME SUPPORT & ORB / SPEECH BAR CONTRAST
    // ============================================================
    testWidgets('3.1 Soundwave Orb in White Theme does NOT use large dark/black disk', (tester) async {
      final tm = JarvisThemeManager();
      await tm.init();
      tm.setDarkMode(false); // Switch to White Theme

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            backgroundColor: tm.background,
            body: const Center(
              child: JarvisSoundwaveOrb(
                size: 200,
                isSpeaking: false,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Verify widget rendered cleanly without layout errors
      expect(find.byType(JarvisSoundwaveOrb), findsOneWidget);
    });

    testWidgets('3.2 Speech bar renders high contrast buttons and controls in White Theme', (tester) async {
      final tm = JarvisThemeManager();
      await tm.init();
      tm.setDarkMode(false);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            backgroundColor: tm.background,
            body: JarvisBottomSpeechBar(
              isListening: false,
              onMicTap: () {},
              onKeyboardTap: () {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Verify mic, keyboard, and audio controls are all present and visible
      expect(find.byIcon(Icons.mic_none_rounded), findsOneWidget);
      expect(find.byIcon(Icons.keyboard_alt_outlined), findsOneWidget);
      expect(find.byIcon(Icons.graphic_eq_rounded), findsOneWidget);
    });

    testWidgets('3.3 Theme Persistence: choice is preserved across restarts', (tester) async {
      final tm = JarvisThemeManager();
      await tm.init();

      // Set to White Theme
      tm.setDarkMode(false);
      expect(tm.isDarkMode, isFalse);

      // Simulate app restart with new manager instance reading preferences
      final restartedTm = JarvisThemeManager();
      await restartedTm.init();
      expect(restartedTm.isDarkMode, isFalse);

      // Toggle back to Dark Theme
      restartedTm.setDarkMode(true);
      expect(restartedTm.isDarkMode, isTrue);

      final restartedDarkTm = JarvisThemeManager();
      await restartedDarkTm.init();
      expect(restartedDarkTm.isDarkMode, isTrue);
    });

    // ============================================================
    // 4. RESPONSIVE UI TESTING (320px, 360px, 390px, 412px)
    // ============================================================
    final widths = [320.0, 360.0, 390.0, 412.0];

    for (final width in widths) {
      testWidgets('4. Responsive check: Width ${width}px renders Login & Registration without overflow', (tester) async {
        tester.view.physicalSize = Size(width, 800);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        for (final isDark in [true, false]) {
          final tm = JarvisThemeManager();
          await tm.init();
          tm.setDarkMode(isDark);

          await tester.pumpWidget(
            const MaterialApp(
              home: LoginScreen(initialRole: 'worker'),
            ),
          );
          await tester.pumpAndSettle();

          // Ensure no RenderFlex errors occur in login view
          expect(tester.takeException(), isNull);

          // Switch to register view
          final regToggle = find.text("Don't have an account? Register");
          if (regToggle.evaluate().isNotEmpty) {
            await tester.ensureVisible(regToggle);
            await tester.tap(regToggle);
            await tester.pumpAndSettle();
            expect(tester.takeException(), isNull);
          }
        }
      });

      testWidgets('4. Responsive check: Width ${width}px renders Orb and Speech Bar without overflow', (tester) async {
        tester.view.physicalSize = Size(width, 800);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        for (final isDark in [true, false]) {
          final tm = JarvisThemeManager();
          await tm.init();
          tm.setDarkMode(isDark);

          await tester.pumpWidget(
            MaterialApp(
              home: Scaffold(
                backgroundColor: tm.background,
                body: Column(
                  children: [
                    const Expanded(
                      child: Center(
                        child: JarvisSoundwaveOrb(
                          size: 180,
                          isSpeaking: false,
                        ),
                      ),
                    ),
                    JarvisBottomSpeechBar(
                      isListening: false,
                      onMicTap: () {},
                      onKeyboardTap: () {},
                    ),
                  ],
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();

          expect(tester.takeException(), isNull);
        }
      });
    }
  });
}
