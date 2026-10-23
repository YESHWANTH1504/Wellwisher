import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/core/theme/jarvis_theme_manager.dart';
import 'package:wellwisher/features/jarvis/controller/jarvis_home_controller.dart';
import 'package:wellwisher/features/jarvis/core/jarvis_colors.dart';
import 'package:wellwisher/features/jarvis/models/jarvis_models.dart';
import 'package:wellwisher/features/jarvis/models/proactive_models.dart';
import 'package:wellwisher/features/jarvis/models/health_intelligence_models.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_home_screen.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_api_service.dart';
import 'package:wellwisher/features/jarvis/services/proactive_api_service.dart';
import 'package:wellwisher/features/jarvis/services/health_intelligence_api_service.dart';
import 'package:wellwisher/features/jarvis/services/voice_input_service.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_tts_service.dart';

class MockJarvisApiService extends JarvisApiService {
  String nextResponseText = 'JARVIS is ready.';

  @override
  Future<JarvisResponse> sendMessage(
    String message, {
    String? conversationId,
    String? timezone,
    String? langCode,
    Map<String, dynamic>? healthContext,
    Map<String, dynamic>? healthGoals,
  }) async {
    return JarvisResponse(
      success: true,
      type: JarvisResponseType.finalResponse,
      intent: 'GENERAL_CONVERSATION',
      message: nextResponseText,
      timestamp: DateTime.now(),
    );
  }
}

class MockProactiveApiService extends ProactiveApiService {
  @override
  Future<DailyBriefingModel?> getDailyBriefing() async => null;
  @override
  Future<List<ProactiveEventModel>> getFeed() async => [];
}

class MockHealthApiService extends HealthIntelligenceApiService {
  @override
  Future<List<HealthTrendModel>> getTrends() async => [];
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockJarvisApiService mockJarvisApi;
  late MockProactiveApiService mockProactiveApi;
  late MockHealthApiService mockHealthApi;
  late VoiceInputService mockVoiceService;
  late JarvisTtsService mockTtsService;
  late JarvisHomeController controller;

  setUp(() {
    mockJarvisApi = MockJarvisApiService();
    mockProactiveApi = MockProactiveApiService();
    mockHealthApi = MockHealthApiService();
    mockVoiceService = VoiceInputService();
    mockTtsService = JarvisTtsService();

    controller = JarvisHomeController(
      apiService: mockJarvisApi,
      proactiveService: mockProactiveApi,
      healthService: mockHealthApi,
      voiceService: mockVoiceService,
      ttsService: mockTtsService,
    );
  });

  tearDown(() {
    controller.dispose();
  });

  Widget buildTestApp({double width = 390.0, double height = 844.0}) {
    return MaterialApp(
      home: MediaQuery(
        data: MediaQueryData(
          size: Size(width, height),
          devicePixelRatio: 3.0,
          viewInsets: EdgeInsets.zero,
          padding: const EdgeInsets.only(top: 44, bottom: 34),
        ),
        child: SizedBox(
          width: width,
          height: height,
          child: JarvisHomeScreen(
            controller: controller,
          ),
        ),
      ),
    );
  }

  Future<void> openConsole(WidgetTester tester) async {
    final keyboardBtn = find.byKey(const Key('jarvis_keyboard_button'));
    await tester.ensureVisible(keyboardBtn);
    await tester.pump(const Duration(milliseconds: 200));
    await tester.tap(keyboardBtn);
    for (int i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
  }

  Future<void> sendMessage(WidgetTester tester, String text) async {
    final textFieldFinder = find.byKey(const Key('jarvis_manual_text_field'));
    await tester.enterText(textFieldFinder, text);
    for (int i = 0; i < 3; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    final sendBtn = find.byKey(const Key('jarvis_manual_send_button'));
    await tester.tap(sendBtn);
    for (int i = 0; i < 5; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
  }

  testWidgets('TEST 1: Short command visibly appears in the composer', (tester) async {
    tester.view.physicalSize = const Size(390 * 3.0, 844 * 3.0);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(buildTestApp(width: 390, height: 844));
    await tester.pump(const Duration(milliseconds: 300));

    // Open Manual Assistant Console
    await openConsole(tester);

    // Verify Console sheet is open
    expect(find.text('Manual Assistant Console'), findsOneWidget);

    // Locate the TextField
    final textFieldFinder = find.byKey(const Key('jarvis_manual_text_field'));
    expect(textFieldFinder, findsOneWidget);

    // Type "Open WhatsApp"
    await tester.enterText(textFieldFinder, 'Open WhatsApp');
    await tester.pump(const Duration(milliseconds: 100));

    // Verify text is visibly rendered in TextField
    final editableTextFinder = find.descendant(of: textFieldFinder, matching: find.byType(EditableText));
    expect(editableTextFinder, findsOneWidget);
    final editableTextWidget = tester.widget<EditableText>(editableTextFinder);
    expect(editableTextWidget.controller.text, equals('Open WhatsApp'));

    final textFieldWidget = tester.widget<TextField>(textFieldFinder);
    final isDark = JarvisThemeManager().isDarkMode;
    expect(textFieldWidget.cursorColor, equals(isDark ? JarvisColors.neonCyan : const Color(0xFF0369A1)));
    expect(textFieldWidget.minLines, equals(1));
    expect(textFieldWidget.maxLines, equals(5));
    expect(textFieldWidget.style?.color, equals(isDark ? Colors.white : const Color(0xFF0F172A)));
    expect(tester.takeException(), isNull);
  });

  testWidgets('TEST 2: Long command wraps inside composer without horizontal overflow', (tester) async {
    tester.view.physicalSize = const Size(390 * 3.0, 844 * 3.0);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(buildTestApp(width: 390, height: 844));
    await tester.pump(const Duration(milliseconds: 300));

    // Open Manual Assistant Console
    await openConsole(tester);

    const longCommand = 'Please check everything on my schedule for today and tell me whether I have enough time between my morning workout, meeting, lunch, afternoon task, medication reminder and evening call.';
    final textFieldFinder = find.byKey(const Key('jarvis_manual_text_field'));
    await tester.enterText(textFieldFinder, longCommand);
    await tester.pump(const Duration(milliseconds: 200));

    // Expect no overflow errors
    expect(find.text(longCommand), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('TEST 3: Send long user message - wraps naturally in conversation', (tester) async {
    tester.view.physicalSize = const Size(390 * 3.0, 844 * 3.0);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(buildTestApp(width: 390, height: 844));
    await tester.pump(const Duration(milliseconds: 300));

    await openConsole(tester);

    const longUserMsg = 'Please check everything on my schedule for today and tell me whether I have enough time between my morning workout, meeting, lunch, afternoon task, medication reminder and evening call.';
    await sendMessage(tester, longUserMsg);

    // Controller should clear text
    final inputWidget = tester.widget<TextField>(find.byKey(const Key('jarvis_manual_text_field')));
    expect(inputWidget.controller?.text, isEmpty);

    // Message appears in list and wraps
    expect(find.text(longUserMsg), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('TEST 4: Render a long JARVIS response - wraps naturally and remains readable', (tester) async {
    tester.view.physicalSize = const Size(390 * 3.0, 844 * 3.0);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);

    const longResponse = 'Today you have several things scheduled including your workout, your meeting, your medication reminder, your afternoon task and your evening call.';
    mockJarvisApi.nextResponseText = longResponse;

    await tester.pumpWidget(buildTestApp(width: 390, height: 844));
    await tester.pump(const Duration(milliseconds: 300));

    await openConsole(tester);

    await sendMessage(tester, 'Check schedule');

    expect(find.descendant(of: find.byType(BottomSheet), matching: find.text(longResponse)), findsOneWidget);
    final textWidget = tester.widget<Text>(find.descendant(of: find.byType(BottomSheet), matching: find.text(longResponse)));
    expect(textWidget.softWrap, isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('TEST 5: Render multiple paragraphs - paragraph breaks remain visible with spacing', (tester) async {
    tester.view.physicalSize = const Size(390 * 3.0, 844 * 3.0);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);

    const para1 = 'Good morning. You have 3 appointments and 2 medications scheduled today.';
    const para2 = 'Your first meeting starts in 45 minutes at the Downtown Medical Office.';
    const multiPara = '$para1\n\n$para2';
    mockJarvisApi.nextResponseText = multiPara;

    await tester.pumpWidget(buildTestApp(width: 390, height: 844));
    await tester.pump(const Duration(milliseconds: 300));

    await openConsole(tester);

    await sendMessage(tester, 'Briefing');

    expect(find.descendant(of: find.byType(BottomSheet), matching: find.text(para1)), findsOneWidget);
    expect(find.descendant(of: find.byType(BottomSheet), matching: find.text(para2)), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('TEST 6: Narrow 320px layout - zero RenderFlex overflow and no clipped text', (tester) async {
    tester.view.physicalSize = const Size(320 * 3.0, 640 * 3.0);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.resetPhysicalSize);

    mockJarvisApi.nextResponseText = 'Short response on narrow screen.';

    await tester.pumpWidget(buildTestApp(width: 320, height: 640));
    await tester.pump(const Duration(milliseconds: 300));

    await openConsole(tester);

    await sendMessage(tester, 'Narrow test text that will wrap nicely');

    expect(tester.takeException(), isNull);
  });

  testWidgets('TEST 7: 390px and 412px layouts - normal polished layout', (tester) async {
    for (final width in [390.0, 412.0]) {
      tester.view.physicalSize = Size(width * 3.0, 892 * 3.0);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildTestApp(width: width, height: 892));
      await tester.pump(const Duration(milliseconds: 300));

      await openConsole(tester);

      await sendMessage(tester, 'Polished layout test at width $width');

      expect(tester.takeException(), isNull);

      // Close modal sheet for next iteration
      await tester.tap(find.byTooltip('Close console'));
      for (int i = 0; i < 5; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
    }
  });
}
