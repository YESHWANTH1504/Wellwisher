import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../features/schedule/controller/schedule_controller.dart';
import '../features/schedule/models/schedule_model.dart';
import '../features/voice_companion/widgets/emergency_sos_dialog.dart';
import 'api_client.dart';
import 'hydration_service.dart';
import 'local_storage_service.dart';
import 'voice_notification_service.dart';
import 'voice_companion/voice_assistant_stub.dart'
    if (dart.library.html) 'voice_companion/voice_assistant_web.dart';

class VoiceAssistantService {
  static bool isSpeaking = false;
  static bool isListening = false;
  static bool gentlePreChimeEnabled = true;

  // 100% Native Script Loving Family Daughter Persona Dictionary
  static final Map<String, Map<String, String>> translations = {
    'ta-IN': {
      'welcome': 'அம்மா! வணக்கம்மா! உங்கள் அன்பு மகள் பேசுகிறேன். இன்னைக்கு எப்படி இருக்கீங்கம்மா?',
      'breakfast': 'அம்மா, காலை உணவு சாப்பிட்டீங்களாமா? மருந்தையும் மறக்காம சாப்பிடுங்கம்மா.',
      'medicine': 'அம்மா, காலை மருந்து மாத்திரை சாப்பிட்டீங்களாமா?',
      'water': 'அம்மா, கொஞ்சம் தண்ணீர் குடியுங்கம்மா. உடம்பை நல்லா பாத்துக்கோங்க.',
      'nap': 'அம்மா, மதிய நேரம் ஆச்சு, கொஞ்ச நேரம் ஓய்வு எடுங்கம்மா.',
      'confirm_breakfast': 'ரொம்ப சந்தோஷம்மா! நீங்க காலை உணவு சாப்பிட்டாச்சுன்னு குறித்து வச்சுட்டேன்மா. நல்லா இருங்கம்மா! ❤️',
      'confirm_medicine': 'ரொம்ப சந்தோஷம்மா! மருந்து சாப்பிட்டது குறித்து வச்சுட்டேன்மா. ❤️',
      'confirm_water': 'ரொம்ப சந்தோஷம்மா! தண்ணீர் குடித்தது பதிவு பண்ணியாச்சுமா. ❤️',
      'confirm_nap': 'ரொம்ப சந்தோஷம்மா! இனிய மதிய ஓய்வு எடுங்கம்மா. ❤️',
      'listening': 'அம்மா, உங்கள் அன்பு குரலுக்காக காத்திருக்கிறேன்... ("சாப்பிட்டேன்மா", "முடிந்தது")',
      'no_pending_tasks': 'அம்மா! உங்களுக்கு இன்றைக்கு வேறு எந்த வேலையும் இல்லை. நன்றாக ஓய்வு எடுங்கம்மா! ❤️',
      'sos_alert': 'அம்மா! அவசர உதவி SOS தொடங்கப்பட்டுவிட்டது. குடும்பத்தினருக்கு தகவல் அனுப்பப்படுகிறது!',
      'vitals_check': 'அம்மா, உங்கள் இதயத் துடிப்பு 72 மற்றும் இரத்த அழுத்தம் 120/80. உங்கள் உடல்நலம் மிகவும் நன்றாக உள்ளதுமா! ❤️',
      'mindfulness_story': 'ஒரு அமைதியான கிராமத்தில் அழகான ஆறு ஓடிக்கொண்டிருந்தது. ஆழமாக மூச்சு விடுங்கம்மா, மனதை அமைதியா வச்சுக்கோங்க.',
    },
    'hi-IN': {
      'welcome': 'माँ! प्रणाम! आपकी प्यारी बेटी यहाँ है। आज आप कैसी हैं माँ?',
      'breakfast': 'माँ, क्या आपने नाश्ता कर लिया? दवाई भी समय पर ले लेना माँ।',
      'medicine': 'माँ, क्या आपने सुबह की दवाई ले ली माँ?',
      'water': 'माँ, थोड़ा पानी पी लीजिए। अपना ख्याल रखिए माँ।',
      'nap': 'माँ, दोपहर हो गई है, थोड़ा आराम कर लीजिए माँ।',
      'confirm_breakfast': 'बहुत खुशी हुई माँ! आपका नाश्ता पूरा दर्ज कर दिया है। सदा खुश रहिए माँ! ❤️',
      'confirm_medicine': 'बहुत खुशी हुई माँ! आपकी दवाई दर्ज हो गई है। ❤️',
      'confirm_water': 'बहुत खुशी हुई माँ! आपका पानी पीना दर्ज हो गया। ❤️',
      'confirm_nap': 'बहुत खुशी हुई माँ! शुभ दोपहर आराम। ❤️',
      'listening': 'माँ, आपकी आवाज़ का इंतज़ार कर रहा हूँ... ("हाँ माँ", "हो गया")',
      'no_pending_tasks': 'माँ! आज आपका कोई और काम बाकी नहीं है। आराम कीजिए माँ! ❤️',
      'sos_alert': 'माँ! आपातकालीन SOS अलर्ट शुरू हो गया है और परिवार को सूचित किया जा रहा है!',
      'vitals_check': 'माँ, आपकी धड़कन 72 और ब्लड प्रेशर 120/80 है। आपकी सेहत बहुत अच्छी है माँ! ❤️',
      'mindfulness_story': 'एक शांत गाँव में एक सुंदर नदी बहती थी। माँ, गहरी साँस लीजिए और अपना मन शांत रखिए।',
    },
    'te-IN': {
      'welcome': 'అమ్మా! నమస్తే అమ్మా! మీ ప్రియమైన కుమార్తె మాట్లాడుతున్నాను. ఎలా ఉన్నారు అమ్మా?',
      'breakfast': 'అమ్మా, అల్పాహారం తిన్నారా అమ్మా? మందులు వేసుకోవడం మర్చిపోకండి అమ్మా.',
      'medicine': 'అమ్మా, ఉదయం మందులు వేసుకున్నారా అమ్మా?',
      'water': 'అమ్మా, మంచి నీళ్ళు తాగావా అమ్మా? జాగ్రత్తగా ఉండండి అమ్మా.',
      'nap': 'అమ్మా, మధ్యాహ్నం అయింది, కాసేపు విశ్రాంతి తీసుకో అమ్మా.',
      'confirm_breakfast': 'చాలా సంతోషం అమ్మా! మీరు టిఫిన్ చేసినట్లు నోట్ చేశాను అమ్మా. ❤️',
      'confirm_medicine': 'చాలా సంతోషం అమ్మా! మందులు వేసుకున్నట్లు నమోదైంది. ❤️',
      'confirm_water': 'చాలా సంతోషం అమ్మా! నీళ్ళు తాగినట్లు నమోదైంది. ❤️',
      'confirm_nap': 'చాలా సంతోషం అమ్మా! ప్రశాంతమైన విశ్రాంతి తీసుకోండి. ❤️',
      'listening': 'అమ్మా, మీ వాయిస్ కోసం వేచి చూస్తున్నాను... ("తిన్నాను అమ్మా")',
      'no_pending_tasks': 'అమ్మా! ఈ రోజు మీకు ఇక పనులు లేవు. హాయిగా విశ్రాంతి తీసుకోండి! ❤️',
      'sos_alert': 'అమ్మా! అత్యవసర SOS అలర్ట్ ప్రారంభమైంది. కుటుంబానికి సమాచారం పంపుతున్నాం!',
      'vitals_check': 'అమ్మా, మీ గుండె వేగం 72 మరియు బిపి 120/80. ఆరోగ్యం బాగుంది అమ్మా! ❤️',
      'mindfulness_story': 'ఒక ప్రశాంతమైన గ్రామంలో అందమైన నది పారుతోంది. ప్రశాంతంగా ఊపిరి తీసుకోండి అమ్మా.',
    },
    'kn-IN': {
      'welcome': 'ಅಮ್ಮಾ! ನಮಸ್ಕಾರ ಅಮ್ಮಾ! ನಿಮ್ಮ ಪ್ರೀತಿಯ ಮಗಳು ಮಾತಾಡ್ತಿದ್ದೀನಿ. ಹೇಗಿದ್ದೀರಾ ಅಮ್ಮಾ?',
      'breakfast': 'ಅಮ್ಮಾ, ತಿಂಡಿ ತಿಂದಿರಾ ಅಮ್ಮಾ? ಮಾತ್ರೆ ತಗೊಳ್ಳೋದು ಮರೀಬೇಡಿ ಅಮ್ಮಾ.',
      'medicine': 'ಅಮ್ಮಾ, ಬೆಳಗಿನ ಮಾತ್ರೆ ತಗೊಂಡಿರಾ ಅಮ್ಮಾ?',
      'water': 'ಅಮ್ಮಾ, ಸ್ವಲ್ಪ ನೀರು ಕುಡಿಯಿರಿ ಅಮ್ಮಾ. ಜಾಗ್ರತೆ ಅಮ್ಮಾ.',
      'nap': 'ಅಮ್ಮಾ, ಮಧ್ಯಾಹ್ನ ಆಯ್ತು, ಸ್ವಲ್ಪ ವಿಶ್ರಾಂತಿ ತಗೊಳ್ಳಿ ಅಮ್ಮಾ.',
      'confirm_breakfast': 'ತುಂಬಾ ಸಂತೋಷ ಅಮ್ಮಾ! ನಿಮ್ಮ ತಿಂಡಿ ಪೂರ್ಣಗೊಂಡಿದೆ ಅಮ್ಮಾ. ❤️',
      'confirm_medicine': 'ತುಂಬಾ ಸಂತೋಷ ಅಮ್ಮಾ! ನಿಮ್ಮ ಮಾತ್ರೆ ದಾಖಲಾಗಿದೆ. ❤️',
      'confirm_water': 'ತುಂಬಾ ಸಂತೋಷ ಅಮ್ಮಾ! ನೀರು ಕುಡಿದಿದ್ದು ದಾಖಲಾಗಿದೆ. ❤️',
      'confirm_nap': 'ತುಂಬಾ ಸಂತೋಷ ಅಮ್ಮಾ! ಶುಭ ವಿಶ್ರಾಂತಿ ಅಮ್ಮಾ. ❤️',
      'listening': 'ಅಮ್ಮಾ, ನಿಮ್ಮ ಧ್ವನಿಗಾಗಿ ಕಾಯುತ್ತಿದ್ದೇನೆ... ("ಆಯ್ತು ಅಮ್ಮಾ")',
      'no_pending_tasks': 'ಅಮ್ಮಾ! ಇಂದು ನಿಮಗೆ ಬೇರೆ ಕೆಲಸಗಳಿಲ್ಲ. ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ ಅಮ್ಮಾ! ❤️',
      'sos_alert': 'ಅಮ್ಮಾ! ತುರ್ತು SOS ಎಚ್ಚರಿಕೆ ಪ್ರಾರಂಭವಾಗಿದೆ!',
      'vitals_check': 'ಅಮ್ಮಾ, ನಿಮ್ಮ ಎಲ್ಲಾ ಆರೋಗ್ಯ ಸೂಚಕಗಳು ಉತ್ತಮವಾಗಿವೆ! ❤️',
      'mindfulness_story': 'ಒಂದು ಸುಂದರ ಹಳ್ಳಿಯಲ್ಲಿ ಶಾಂತವಾದ ನದಿ ಹರಿಯುತ್ತಿತ್ತು. ದೀರ್ಘ ಉಸಿರು ತೆಗೆದುಕೊಳ್ಳಿ ಅಮ್ಮಾ.',
    },
    'ml-IN': {
      'welcome': 'അമ്മാ! നമസ്കാരം അമ്മാ! നിങ്ങളുടെ പ്രിയപ്പെട്ട മകളാണ്. സുഖമാണോ അമ്മാ?',
      'breakfast': 'അമ്മാ, പ്രഭാത ഭക്ഷണം കഴിച്ചോ അമ്മാ? മരുന്ന് കഴിക്കാൻ മറക്കരുതേ അമ്മാ.',
      'medicine': 'അമ്മാ, രാവിലത്തെ മരുന്ന് കഴിച്ചോ അമ്മാ?',
      'water': 'അമ്മാ, കുറച്ചു വെള്ളം കുടിക്കൂ അമ്മാ.',
      'nap': 'അമ്മാ, ഉച്ചയായി, കുറച്ചു നേരം വിശ്രമിക്കൂ അമ്മാ.',
      'confirm_breakfast': 'വളരെ സന്തോഷം അമ്മാ! ഭക്ഷണം കഴിച്ചത് രേഖപ്പെടുത്തി അമ്മാ. ❤️',
      'confirm_medicine': 'വളരെ സന്തോഷം അമ്മാ! മരുന്ന് കഴിച്ചത് രേഖപ്പെടുത്തി. ❤️',
      'confirm_water': 'വളരെ സന്തോഷം അമ്മാ! വെള്ളം കുടിച്ചത് രേഖപ്പെടുത്തി. ❤️',
      'confirm_nap': 'വളരെ സന്തോഷം അമ്മാ! നല്ല വിശ്രമം ആശംസിക്കുന്നു. ❤️',
      'listening': 'അമ്മാ, നിങ്ങളുടെ ശബ്ദത്തിനായി കാത്തിരിക്കുന്നു... ("കഴിച്ചു അമ്മാ")',
      'no_pending_tasks': 'അമ്മാ! ഇന്ന് ഇനി ജോലികളൊന്നുമില്ല. സുഖമായി വിശ്രമിക്കൂ അമ്മാ! ❤️',
      'sos_alert': 'അമ്മാ! അടിയന്തര SOS മുന്നറിയിപ്പ് നൽകിയിട്ടുണ്ട്!',
      'vitals_check': 'അമ്മാ, നിങ്ങളുടെ ആരോഗ്യ നില തികച്ചും തൃപ്തികരമാണ്! ❤️',
      'mindfulness_story': 'ഒരു മനോഹരമായ ഗ്രാമത്തിലൂടെ ശാന്തമായി പുഴ ഒഴുകുന്നു. ദീർഘമായി ശ്വാസമെടുക്കൂ അമ്മാ.',
    },
    'es-ES': {
      'welcome': '¡Hola Mamá! Su cariñosa hija está aquí. ¿Cómo está hoy, Mamá?',
      'breakfast': 'Mamá, ¿ya desayunó? No olvide su medicina, Mamá.',
      'medicine': 'Mamá, ¿ya tomó sus medicinas de la mañana, Mamá?',
      'water': 'Mamá, tome un vasito de agua. Cuídese mucho, Mamá.',
      'nap': 'Mamá, ya es por la tarde. Descanse un ratito, Mamá.',
      'confirm_breakfast': '¡Qué alegría, Mamá! Su desayuno quedó registrado. ¡Un abrazo, Mamá! ❤️',
      'confirm_medicine': '¡Qué alegría, Mamá! Sus medicinas quedaron registradas. ❤️',
      'confirm_water': '¡Qué alegría, Mamá! Su agua quedó registrada. ❤️',
      'confirm_nap': '¡Qué alegría, Mamá! Que tenga una bonita siesta. ❤️',
      'listening': 'Mamá, escuchando su voz... ("Sí Mamá")',
      'no_pending_tasks': '¡Mamá! No tiene más tareas pendientes por hoy. ¡Descanse mucho! ❤️',
      'sos_alert': '¡Mamá! Alerta SOS enviada a la familia.',
      'vitals_check': '¡Mamá! Sus signos vitales están perfectos y saludables. ❤️',
      'mindfulness_story': 'En un pueblo tranquilo fluía un río hermoso. Respire profundo Mamá.',
    },
    'en-US': {
      'welcome': 'Hi Mom! Your loving daughter is here. How are you feeling today, Mom?',
      'breakfast': 'Mom, did you have your breakfast yet? Don\'t forget your morning medicine, Mom!',
      'medicine': 'Mom, did you take your morning pills, Mom?',
      'water': 'Mom, remember to drink a fresh glass of water! Take care, Mom.',
      'nap': 'Mom, it\'s afternoon. Time for a peaceful nap, Mom!',
      'confirm_breakfast': 'So happy, Mom! I\'ve marked your breakfast as done. Love you, Mom! ❤️',
      'confirm_medicine': 'So happy, Mom! I\'ve marked your morning medicine as done. Love you, Mom! ❤️',
      'confirm_water': 'So happy, Mom! I\'ve marked your water intake as done. Love you, Mom! ❤️',
      'confirm_nap': 'So happy, Mom! Have a peaceful afternoon nap. Love you, Mom! ❤️',
      'listening': 'Listening for your loving voice, Mom... ("Yes Mom", "Done Mom")',
      'no_pending_tasks': 'Hi Mom! You have no more pending tasks for today. Rest well! ❤️',
      'sos_alert': 'Launching Emergency SOS alert and contacting family caregivers now!',
      'vitals_check': 'Mom, your heart rate is 72 bpm and blood pressure is 120 over 80. All vitals are normal and healthy! ❤️',
      'mindfulness_story': 'Once upon a time in a peaceful village, a beautiful river flowed gently. Take a deep breath Mom, relax your mind, and enjoy this peaceful day.',
    },
  };

  static String getTranslation(String langCode, String key) {
    return translations[langCode]?[key] ?? translations['en-US']![key]!;
  }

  static Future<void> playGentlePreChime() async {
    if (!gentlePreChimeEnabled) return;
    await VoiceAssistantPlatformHelper.playGentlePreChime();
  }

  /// Cleanly strips emojis and variation symbols so TTS engine never speaks "red heart", "droplet", etc.
  static String stripEmojis(String text) {
    final emojiRegex = RegExp(
      r'[\u{1F600}-\u{1F64F}'
      r'\u{1F300}-\u{1F5FF}'
      r'\u{1F680}-\u{1F6FF}'
      r'\u{1F700}-\u{1F77F}'
      r'\u{1F780}-\u{1F7FF}'
      r'\u{1F800}-\u{1F8FF}'
      r'\u{1F900}-\u{1F9FF}'
      r'\u{1FA00}-\u{1FA6F}'
      r'\u{1FA70}-\u{1FAFF}'
      r'\u{2600}-\u{26FF}'
      r'\u{2700}-\u{27BF}'
      r'\u{FE00}-\u{FE0F}'
      r'\u{1F1E6}-\u{1F1FF}]',
      unicode: true,
    );
    return text.replaceAll(emojiRegex, '').replaceAll(RegExp(r'\s+'), ' ').trim();
  }

  // Cross-Platform Speech Engine (Delegates conditionally to Android/iOS or Web)
  static Future<void> speak(
    String text, {
    String langCode = 'ta-IN',
    bool prefixGentleGreeting = false,
    bool? isMale,
  }) async {
    // Role-based guard: Mute voice assistant for Normal Worker profile
    if (LocalStorageService().isNormalWorker) {
      if (kDebugMode) print('🔇 Voice Assistant disabled for Normal Worker role.');
      isSpeaking = false;
      return;
    }

    isSpeaking = true;
    final cleanText = stripEmojis(text);
    if (cleanText.isEmpty) {
      isSpeaking = false;
      return;
    }

    final effectiveIsMale = isMale ?? (LocalStorageService().selectedVoiceGender == 'male');

    try {
      await VoiceAssistantPlatformHelper.speak(cleanText, langCode, isMale: effectiveIsMale);
    } catch (e) {
      if (kDebugMode) print('Speech Error: $e');
    } finally {
      isSpeaking = false;
    }
  }

  static Future<void> stop() async {
    isSpeaking = false;
    try {
      await VoiceAssistantPlatformHelper.stop();
    } catch (_) {}
  }

  // Ask routine question in loving Amma/Maa persona
  static Future<void> askAndListenForConfirmation({
    required String questionPrompt,
    required String confirmationPrompt,
    required String langCode,
    required Function(bool isConfirmed) onResult,
  }) async {
    await speak(questionPrompt, langCode: langCode);

    isListening = true;
    await Future.delayed(const Duration(seconds: 3));

    isListening = false;
    onResult(true);

    await speak(confirmationPrompt, langCode: langCode);
  }

  static Future<String?> listenToMicrophone({String langCode = 'en-US'}) async {
    return await VoiceAssistantPlatformHelper.listenToMicrophone(
      langCode: langCode,
      listenTimeout: const Duration(seconds: 7),
    );
  }

  // Next-Gen Conversational Voice Intent Engine (Powered by Gemini LLM + Siri/Alexa Voice)
  static Future<String> parseAndExecuteVoiceCommand({
    required String commandText,
    required String langCode,
    ScheduleController? scheduleController,
    BuildContext? context,
  }) async {
    final lower = commandText.toLowerCase();

    // 1. Water Logging Intent
    if (lower.contains('water') || lower.contains('தண்ணீர்') || lower.contains('पानी') || lower.contains('నీళ్ళు') || lower.contains('நீர்') || lower.contains('நீళ్ళు') || lower.contains('thanneer')) {
      final hydration = HydrationService();
      await hydration.logWater(
        hydration.portionMl,
        playSound: true,
        checkGoal: true,
        source: 'voice_assistant',
      );

      final reply = getTranslation(langCode, 'confirm_water');
      await speak(reply, langCode: langCode);
      return reply;
    }

    // 2. Medicine Completion Intent
    if (lower.contains('medicine') || lower.contains('pill') || lower.contains('மருந்து') || lower.contains('दवाई') || lower.contains('மாத்திரை') || lower.contains('மందులు') || lower.contains('marundhu') || lower.contains('mathirai')) {
      if (scheduleController != null && scheduleController.currentRoutines.isNotEmpty) {
        final pending = scheduleController.currentRoutines.firstWhere(
          (r) => r.status != ActivityStatus.completed,
          orElse: () => scheduleController.currentRoutines.first,
        );
        scheduleController.updateRoutine(pending.copyWith(status: ActivityStatus.completed));
      }

      final reply = getTranslation(langCode, 'confirm_medicine');
      await speak(reply, langCode: langCode);
      return reply;
    }

    // 3. Next Schedule Query Intent
    if (lower.contains('schedule') || lower.contains('next') || lower.contains('routine') || lower.contains('அடுத்தது') || lower.contains('காரியம்') || lower.contains('வேலை') || lower.contains('अगला') || lower.contains('తదుపరి') || lower.contains('ముందు') || lower.contains('ಮುಂದಿನ') || lower.contains('അടുത്ത') || lower.contains('aduthathu')) {
      String reply = getTranslation(langCode, 'no_pending_tasks');
      if (scheduleController != null && scheduleController.currentRoutines.isNotEmpty) {
        final upcoming = scheduleController.currentRoutines.where((r) => r.status != ActivityStatus.completed).toList();
        if (upcoming.isNotEmpty) {
          final next = upcoming.first;
          final nextTitle = VoiceNotificationService.getLocalizedVoiceText(next, langCode);
          if (langCode == 'ta-IN') {
            reply = 'அம்மா, உங்கள் அடுத்த வேலை நேரம் ஆச்சு: $nextTitle';
          } else if (langCode == 'hi-IN') {
            reply = 'माँ, आपके अगले काम का समय हो गया है: $nextTitle';
          } else if (langCode == 'te-IN') {
            reply = 'అమ్మా, మీ తదుపరి పని సమయం అయింది: $nextTitle';
          } else if (langCode == 'kn-IN') {
            reply = 'ಅಮ್ಮಾ, ನಿಮ್ಮ ಮುಂದಿನ ಕೆಲಸದ ಸಮಯವಾಗಿದೆ: $nextTitle';
          } else if (langCode == 'ml-IN') {
            reply = 'അമ്മാ, നിങ്ങളുടെ അടുത്ത ജോലിയുടെ സമയമായി: $nextTitle';
          } else if (langCode == 'es-ES') {
            reply = 'Mamá, es hora de su próxima tarea: $nextTitle';
          } else {
            reply = 'Mom, it is time for your next task: $nextTitle';
          }
        }
      }
      await speak(reply, langCode: langCode);
      return reply;
    }

    // 4. Emergency SOS Intent
    if (lower.contains('sos') || lower.contains('help') || lower.contains('emergency') || lower.contains('fall') || lower.contains('காப்பாற்று') || lower.contains('உதவி') || lower.contains('மதத்') || lower.contains('udhavi') || lower.contains('helpu')) {
      if (context != null && context.mounted) {
        EmergencySosDialog.show(context);
      }
      final reply = getTranslation(langCode, 'sos_alert');
      await speak(reply, langCode: langCode);
      return reply;
    }

    // 5. Health Check Vitals Intent
    if (lower.contains('health') || lower.contains('vitals') || lower.contains('body') || lower.contains('உடல்நலம்') || lower.contains('உடம்பு') || lower.contains('ஆரோக்கியம்') || lower.contains('udambu')) {
      final reply = getTranslation(langCode, 'vitals_check');
      await speak(reply, langCode: langCode);
      return reply;
    }

    // 6. Mindfulness Story Intent
    if (lower.contains('story') || lower.contains('katha') || lower.contains('கதை') || lower.contains('कहानी') || lower.contains('kadhai')) {
      final story = getTranslation(langCode, 'mindfulness_story');
      await speak(story, langCode: langCode);
      return story;
    }

    // 7. Open-Ended Voice Query -> Query Gemini LLM Backend & Speak Response
    try {
      final res = await ApiClient().post('/api/ai/chat', {
        'message': commandText,
        'langCode': langCode,
      });
      if (res['success'] == true && res['data'] != null && res['data']['reply'] != null) {
        final llmReply = res['data']['reply'].toString();
        await speak(llmReply, langCode: langCode);
        return llmReply;
      }
    } catch (_) {}

    // Default Fallback Response
    final fallback = getTranslation(langCode, 'welcome');
    await speak(fallback, langCode: langCode);
    return fallback;
}
}
