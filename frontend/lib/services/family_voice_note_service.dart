import 'package:flutter/foundation.dart';
import 'voice_assistant_service.dart';
import 'local_storage_service.dart';
import 'senior_caregiver_sync_service.dart';
import '../features/schedule/models/schedule_model.dart';

class FamilyVoiceNote {
  final String id;
  final String routineKey; // 'breakfast', 'medicine', 'walk', 'dinner', 'health_check', 'custom', 'default'
  final String senderName; // 'Rahul (Son)', 'Priya (Daughter)'
  final String senderRelation; // 'Son', 'Daughter', 'Granddaughter', 'Caregiver'
  final String messageText; // Spoken transcript
  final Map<String, String>? localizedTexts;
  final String durationStr;
  final String audioUrl;
  final DateTime createdAt;
  final bool isScheduled;
  final String? scheduledTime; // e.g. "08:00 AM", "01:30 PM"
  final String? scheduledRoutineTitle;

  String get routineId => routineKey;

  FamilyVoiceNote({
    required this.id,
    String? routineKey,
    String? routineId,
    required this.senderName,
    required this.senderRelation,
    required this.messageText,
    this.localizedTexts,
    required this.durationStr,
    required this.audioUrl,
    required this.createdAt,
    this.isScheduled = false,
    this.scheduledTime,
    this.scheduledRoutineTitle,
  }) : routineKey = routineKey ?? routineId ?? 'default';
}

class FamilyVoiceNoteService extends ChangeNotifier {
  static final FamilyVoiceNoteService _instance = FamilyVoiceNoteService._internal();
  factory FamilyVoiceNoteService() => _instance;
  FamilyVoiceNoteService._internal();

  final LocalStorageService _storage = LocalStorageService();

  // Preset scheduled routine notes
  final Map<String, FamilyVoiceNote> _voiceNotes = {
    'default': FamilyVoiceNote(
      id: 'fn_default',
      routineKey: 'default',
      senderName: 'Rahul',
      senderRelation: 'Son (மகன்)',
      messageText: 'Hi Mom! It\'s Rahul. Please take your morning medicine on time and drink a warm glass of water. Love you! ❤️',
      localizedTexts: {
        'ta-IN': 'அம்மா! உங்க மகன் ராகுல் பேசுறேன். காலை உணவை முடிச்சிட்டு மறக்காம BP மாத்திரை சாப்பிடுங்கம்மா. லவ் யூ அம்மா! ❤️',
        'hi-IN': 'नमस्ते माँ! आपका बेटा राहुल बोल रहा हूँ। नाश्ता कर लीजिए और सुबह की बीपी की गोली ले लीजिए। लव यू माँ! ❤️',
        'te-IN': 'అమ్మా! మీ కుమారుడు రాహుల్ మాట్లాడుతున్నాను. టిఫిన్ చేసి ఉదయం బీపీ మాత్ర వేసుకోండి. లవ్ యు అమ్మా! ❤️',
        'kn-IN': 'ಅಮ್ಮಾ! ನಿಮ್ಮ ಮಗ ರಾಹುಲ್. ಉಪಾಹಾರ ಸೇವಿಸಿ ಬಿಪಿ ಮಾತ್ರೆ ತಗೊಳ್ಳಿ. ಲವ್ ಯೂ ಅಮ್ಮಾ! ❤️',
        'ml-IN': 'അമ്മാ! മകൻ രാഹുലാണ്. പ്രഭാതഭക്ഷണം കഴിച്ച് ബിപി ഗുളിക കഴിക്കൂ. ലവ് യൂ അമ്മാ! ❤️',
        'en-US': 'Hi Mom! It\'s Rahul. Time to have your warm breakfast and take your morning BP tablet. Love you mom! ❤️',
      },
      durationStr: '0:06',
      audioUrl: '',
      createdAt: DateTime.now(),
      isScheduled: true,
      scheduledTime: '08:00 AM',
      scheduledRoutineTitle: 'Breakfast & Morning Pills',
    ),
    'breakfast': FamilyVoiceNote(
      id: 'fn_breakfast',
      routineKey: 'breakfast',
      senderName: 'Rahul',
      senderRelation: 'Son (மகன்)',
      messageText: 'Hi Mom! It\'s Rahul. Time to have your warm breakfast and take your morning BP tablet. Love you mom! ❤️',
      localizedTexts: {
        'ta-IN': 'அம்மா! உங்க மகன் ராகுல் பேசுறேன். காலை உணவை முடிச்சிட்டு மறக்காம BP மாத்திரை சாப்பிடுங்கம்மா. லவ் யூ அம்மா! ❤️',
        'hi-IN': 'नमस्ते माँ! आपका बेटा राहुल बोल रहा हूँ। नाश्ता कर लीजिए और सुबह की बीपी की गोली ले लीजिए। लव यू माँ! ❤️',
        'te-IN': 'అమ్మా! మీ కుమారుడు రాహుల్ మాట్లాడుతున్నాను. టిఫిన్ చేసి ఉదయం బీపీ మాత్ర వేసుకోండి. லవ్ యు అమ్మా! ❤️',
        'kn-IN': 'ಅಮ್ಮಾ! ನಿಮ್ಮ ಮಗ ರಾಹುಲ್. ಉಪಾಹಾರ ಸೇವಿಸಿ ಬಿಪಿ ಮಾತ್ರೆ ತಗೊಳ್ಳಿ. ಲವ್ ಯೂ ಅಮ್ಮಾ! ❤️',
        'ml-IN': 'അമ്മാ! മകൻ രാಹುലാണ്. പ്രഭാതഭക്ഷണം കഴിച്ച് ബിപി ഗുളിക കഴിക്കൂ. ലവ് യൂ അമ്മാ! ❤️',
        'en-US': 'Hi Mom! It\'s Rahul. Time to have your warm breakfast and take your morning BP tablet. Love you mom! ❤️',
      },
      durationStr: '0:06',
      audioUrl: '',
      createdAt: DateTime.now(),
      isScheduled: true,
      scheduledTime: '08:00 AM',
      scheduledRoutineTitle: 'Breakfast & Morning BP Pill',
    ),
    'medicine': FamilyVoiceNote(
      id: 'fn_medicine',
      routineKey: 'medicine',
      senderName: 'Priya',
      senderRelation: 'Daughter (மகள்)',
      messageText: 'Mom, it\'s Priya! Please take your medicine on time and drink a glass of fresh water. How is your health today mom? Take care! 💊',
      localizedTexts: {
        'ta-IN': 'அம்மா, பிரியா பேசுறேன்! மருந்தை நேரத்தில் சாப்பிடுங்கம்மா, உடம்பு எப்படி இருக்குமா? கவனமா இருங்கம்மா! 💊',
        'hi-IN': 'माँ, प्रिया बोल रही हूँ! समय पर दवाई ले लीजिए। आपकी तबियत कैसी है माँ? अपना ध्यान रखें! 💊',
        'te-IN': 'అమ్మా, ప్రియను! సమయానికి మందులు వేసుకోండి. మీ ఆరోగ్యం ఎలా ఉంది అమ్మా? జాగ్రత్త! 💊',
        'kn-IN': 'ಅಮ್ಮಾ, ಪ್ರಿಯಾ! ಸಮಯಕ್ಕೆ ಮಾತ್ರೆ ತಗೊಳ್ಳಿ. ಆರೋಗ್ಯ ಹೇಗಿದೆ ಅಮ್ಮಾ? ಕಾಳಜಿ ವಹಿಸಿ! 💊',
        'ml-IN': 'അമ്മാ, പ്രിയയാണ്! മരുന്ന് കൃത്യമായി കഴിക്കൂ. ആരോഗ്യം എങ്ങനെയുണ്ട് അമ്മാ? ശ്രദ്ധിക്കണേ! 💊',
        'en-US': 'Mom, it\'s Priya! Please take your medicine on time and drink a glass of fresh water. How is your health today mom? Take care! 💊',
      },
      durationStr: '0:07',
      audioUrl: '',
      createdAt: DateTime.now(),
      isScheduled: true,
      scheduledTime: '01:00 PM',
      scheduledRoutineTitle: 'Afternoon Medicine & Lunch',
    ),
    'walk': FamilyVoiceNote(
      id: 'fn_walk',
      routineKey: 'walk',
      senderName: 'Ananya',
      senderRelation: 'Granddaughter (பேத்தி)',
      messageText: 'Grandma! It\'s Ananya. Time for your fresh air evening garden walk. Did you wear your walking shoes? Have a lovely walk! 🚶‍♀️',
      localizedTexts: {
        'ta-IN': 'பாட்டி! நான் அனன்யா பேசுறேன். மாலை நடைப்பயிற்சிக்கு நேரமாச்சு. பூங்காவில் நல்லா காலாற நடந்துட்டு வாங்க பாட்டி! 🚶‍♀️',
        'hi-IN': 'दादी जी! मैं अनन्या। शाम की ताज़ी हवा में टहलने का समय हो गया है। आराम से टहल कर आइए! 🚶‍♀️',
        'te-IN': 'అమ్మమ్మా! నేను అనన్యను. సాయంత్రం ఆహ్లాదకరమైన నడక సమయం అయింది. జాగ్రత్తగా నడవండి! 🚶‍♀️',
        'kn-IN': 'ಅಜ್ಜೀ! ನಾನು ಅನನ್ಯಾ. ಸಂಜೆಯ ತಂಪಾದ ಗಾಳಿಯಲ್ಲಿ ನಡಿಗೆ ಸಮಯ. ಆರಾಮವಾಗಿ ವಾಕ್ ಮಾಡಿ ಬನ್ನಿ! 🚶‍♀️',
        'ml-IN': 'മുത്തശ്ശി! അനന്യയാണ്. വൈകുന്നേരത്തെ നടത്തത്തിന് സമയമായി. ശുദ്ധവായു ശ്വസിച്ച് നടക്കൂ മുത്തശ്ശി! 🚶‍♀️',
        'en-US': 'Grandma! It\'s Ananya. Time for your fresh air evening garden walk. Did you wear your walking shoes? Have a lovely walk! 🚶‍♀️',
      },
      durationStr: '0:06',
      audioUrl: '',
      createdAt: DateTime.now(),
      isScheduled: true,
      scheduledTime: '05:30 PM',
      scheduledRoutineTitle: 'Evening Garden Walk',
    ),
    'dinner': FamilyVoiceNote(
      id: 'fn_dinner',
      routineKey: 'dinner',
      senderName: 'Rahul',
      senderRelation: 'Son (மகன்)',
      messageText: 'Amma, Rahul here! Finish your light dinner and take your night pills. Sleep well and call me if you need anything! 🌙',
      localizedTexts: {
        'ta-IN': 'அம்மா, ராகுல்! இரவு உணவை முடிச்சிட்டு இரவு மாத்திரையை சாப்பிடுங்கம்மா. நிம்மதியா தூங்குங்கம்மா, குட் நைட்! 🌙',
        'hi-IN': 'माँ, राहुल! रात का हल्का खाना खाकर रात की दवाई ले लीजिए। अच्छी नींद लीजिए, शुभ रात्रि! 🌙',
        'te-IN': 'అమ్மா, రాహుల్! రాత్రి భోజనం చేసి రాత్రి మందులు వేసుకోండి. ప్రశాంతంగా నిద్రపోండి, గుడ్ నైట్! 🌙',
        'kn-IN': 'ಅಮ್ಮಾ, ರಾಹುಲ್! ರಾತ್ರಿಯ ಊಟ ಮುಗಿಸಿ ಮಾತ್ರೆ ತಗೊಳ್ಳಿ. ನೆಮ್ಮದಿಯಾಗಿ ಮಲಗಿ, ಶುಭ ರಾತ್ರಿ! 🌙',
        'ml-IN': 'അമ്മാ, രാഹുലാണ്! അത്താഴം കഴിച്ച് രാത്രിയിലെ മരുന്ന് കഴിക്കൂ. നല്ല ഉറക്കം ആശംസിക്കുന്നു, ഗുഡ് നൈറ്റ്! 🌙',
        'en-US': 'Amma, Rahul here! Finish your light dinner and take your night pills. Sleep well and call me if you need anything! 🌙',
      },
      durationStr: '0:07',
      audioUrl: '',
      createdAt: DateTime.now(),
      isScheduled: true,
      scheduledTime: '08:00 PM',
      scheduledRoutineTitle: 'Dinner & Night Pills',
    ),
    'health_check': FamilyVoiceNote(
      id: 'fn_health_check',
      routineKey: 'health_check',
      senderName: 'Rahul',
      senderRelation: 'Son (மகன்)',
      messageText: 'Hello Mom! Just checking in on you. How is your health today mom? Did you check your BP and blood sugar? Take care of yourself! ❤️',
      localizedTexts: {
        'ta-IN': 'வணக்கம் அம்மா! உங்க உடம்பு இப்போ எப்படி இருக்குமா? BP மற்றும் சுகர் அளவை பார்த்தீங்களா? உடம்பை பத்திரமா பார்த்துக்கோங்கம்மா! ❤️',
        'hi-IN': 'नमस्ते माँ! आपकी तबियत कैसी है माँ? क्या आपने बीपी और शुगर चेक किया? अपना पूरा ध्यान रखें! ❤️',
        'te-IN': 'నమస్కారం అమ్మా! మీ ఆరోగ్యం ఎలా ఉంది? బీపీ, షుగర్ చెక్ చేసుకున్నారా? జాగ్రత్తగా ఉండండి! ❤️',
        'kn-IN': 'ನಮಸ್ಕಾರ ಅಮ್ಮಾ! ನಿಮ್ಮ ಆರೋಗ್ಯ ಹೇಗಿದೆ? ಬಿಪಿ ಚೆಕ್ ಮಾಡಿದಿರಾ? ಕಾಳಜಿ ವಹಿಸಿ! ❤️',
        'ml-IN': 'നമസ്കാരം അമ്മാ! സുഖമാണോ? ബിപി പരിശോധിച്ചോ? ശരീരം നന്നായി നോക്കണേ! ❤️',
        'en-US': 'Hello Mom! Just checking in on you. How is your health today mom? Did you check your BP and blood sugar? Take care of yourself! ❤️',
      },
      durationStr: '0:08',
      audioUrl: '',
      createdAt: DateTime.now(),
      isScheduled: true,
      scheduledTime: '11:00 AM',
      scheduledRoutineTitle: 'Daily Health & Wellness Check',
    ),
  };

  // WhatsApp-style Voice Notes Feed (Instant and Scheduled messages)
  final List<FamilyVoiceNote> _voiceNotesFeed = [
    FamilyVoiceNote(
      id: 'vn_recent_1',
      routineKey: 'instant',
      senderName: 'Rahul (Son)',
      senderRelation: 'Son',
      messageText: 'Hi Mom! Just finished my office meeting. Hope you had a nice lunch. Drink plenty of water mom! ❤️',
      durationStr: '0:07',
      audioUrl: '',
      createdAt: DateTime.now().subtract(const Duration(minutes: 25)),
      isScheduled: false,
    ),
    FamilyVoiceNote(
      id: 'vn_recent_2',
      routineKey: 'breakfast',
      senderName: 'Rahul (Son)',
      senderRelation: 'Son',
      messageText: 'Hi Mom! It\'s Rahul. Time for your breakfast and morning BP tablet. Love you mom! ❤️',
      durationStr: '0:06',
      audioUrl: '',
      createdAt: DateTime.now().subtract(const Duration(hours: 4)),
      isScheduled: true,
      scheduledTime: '08:00 AM',
      scheduledRoutineTitle: 'Breakfast & Morning BP Pill',
    ),
  ];

  List<FamilyVoiceNote> getAllVoiceNotes() {
    return _voiceNotes.values.toList();
  }

  List<FamilyVoiceNote> get voiceNotesFeed => List.unmodifiable(_voiceNotesFeed);

  FamilyVoiceNote? getVoiceNoteForRoutine(String routineKey) {
    return _voiceNotes[routineKey] ?? _voiceNotes['default'];
  }

  FamilyVoiceNote? getVoiceNoteForRoutineItem(ScheduleItem item) {
    if (!_storage.familyVoiceModeEnabled) return null;

    final lowerTitle = item.title.toLowerCase();
    final lowerDesc = item.description.toLowerCase();

    if (lowerTitle.contains('breakfast') || lowerDesc.contains('breakfast')) {
      return _voiceNotes['breakfast'];
    }
    if (lowerTitle.contains('medicine') || lowerTitle.contains('pill') || lowerTitle.contains('மருந்து') || lowerDesc.contains('pill')) {
      return _voiceNotes['medicine'];
    }
    if (lowerTitle.contains('walk') || lowerTitle.contains('stretch') || lowerTitle.contains('exercise') || lowerTitle.contains('நடை')) {
      return _voiceNotes['walk'];
    }
    if (lowerTitle.contains('dinner') || lowerTitle.contains('sleep') || lowerTitle.contains('night') || lowerTitle.contains('இரவு')) {
      return _voiceNotes['dinner'];
    }
    if (lowerTitle.contains('water') || lowerTitle.contains('tea') || lowerTitle.contains('hydration')) {
      return _voiceNotes['medicine'];
    }

    return _voiceNotes['breakfast'] ?? _voiceNotes['default'];
  }

  FamilyVoiceNote? getVoiceNoteByKey(String key) {
    return _voiceNotes[key] ?? _voiceNotes['default'];
  }

  void saveVoiceNote(FamilyVoiceNote note) {
    _voiceNotes[note.routineKey] = note;
    _voiceNotesFeed.insert(0, note);
    notifyListeners();
  }

  // Send WhatsApp-style instant voice note from Worker/Caregiver to Senior
  void sendInstantVoiceNote({
    required String senderName,
    required String senderRelation,
    required String messageText,
    String durationStr = '0:06',
  }) {
    final note = FamilyVoiceNote(
      id: 'vn_inst_${DateTime.now().millisecondsSinceEpoch}',
      routineKey: 'instant',
      senderName: senderName,
      senderRelation: senderRelation,
      messageText: messageText,
      durationStr: durationStr,
      audioUrl: '',
      createdAt: DateTime.now(),
      isScheduled: false,
    );
    _voiceNotesFeed.insert(0, note);
    SeniorCaregiverSyncService().logSeniorActivity(
      title: 'Voice Note received from $senderName: "$messageText" 🎙️',
      category: 'voice_memo',
      isUrgent: false,
    );
    notifyListeners();
  }

  // Schedule a loved one voice note for a specific time and routine interval
  void scheduleVoiceNoteForSenior({
    required String senderName,
    required String senderRelation,
    required String messageText,
    required String scheduledTime, // e.g. "08:00 AM", "02:30 PM"
    required String routineTitle, // e.g. "Breakfast & Pills", "Afternoon Medicine"
    required String routineKey,
    String durationStr = '0:07',
  }) {
    final note = FamilyVoiceNote(
      id: 'vn_sched_${DateTime.now().millisecondsSinceEpoch}',
      routineKey: routineKey,
      senderName: senderName,
      senderRelation: senderRelation,
      messageText: messageText,
      durationStr: durationStr,
      audioUrl: '',
      createdAt: DateTime.now(),
      isScheduled: true,
      scheduledTime: scheduledTime,
      scheduledRoutineTitle: routineTitle,
    );
    _voiceNotes[routineKey] = note;
    _voiceNotesFeed.insert(0, note);

    SeniorCaregiverSyncService().logSeniorActivity(
      title: 'Scheduled Voice Memo by $senderName set for $scheduledTime ($routineTitle) ⏰🎙️',
      category: 'voice_memo',
      isUrgent: false,
    );
    notifyListeners();
  }

  String getSpokenTextForLanguage(FamilyVoiceNote note, String langCode) {
    if (note.localizedTexts != null && note.localizedTexts!.containsKey(langCode)) {
      return note.localizedTexts![langCode]!;
    }
    return 'Voice note from ${note.senderRelation} ${note.senderName}: "${note.messageText}"';
  }

  Future<void> playFamilyVoiceNote(FamilyVoiceNote note, String langCode) async {
    final spokenText = getSpokenTextForLanguage(note, langCode);

    final isMale = note.senderRelation.toLowerCase().contains('son') ||
        note.senderRelation.toLowerCase().contains('brother') ||
        note.senderRelation.toLowerCase().contains('father') ||
        note.senderName.toLowerCase().contains('rahul');

    await VoiceAssistantService.speak(
      spokenText,
      langCode: langCode,
      isMale: isMale,
    );
  }
}
