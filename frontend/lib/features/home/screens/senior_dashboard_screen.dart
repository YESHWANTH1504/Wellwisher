import 'package:flutter/material.dart';
import '../../../core/routes/app_routes.dart';
import '../../../services/family_voice_note_service.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/senior_caregiver_sync_service.dart';
import '../../../services/voice_assistant_service.dart';
import '../../family/widgets/voice_note_composer_sheet.dart';
import '../../family/widgets/whatsapp_voice_note_bubble.dart';

class SeniorDashboardScreen extends StatefulWidget {
  const SeniorDashboardScreen({super.key});

  @override
  State<SeniorDashboardScreen> createState() => _SeniorDashboardScreenState();
}

class _SeniorDashboardScreenState extends State<SeniorDashboardScreen> {
  final LocalStorageService _storage = LocalStorageService();
  late String _currentLang;

  final List<Map<String, String>> _languages = [
    {'code': 'ta-IN', 'name': 'தமிழ்', 'flag': '🇮🇳'},
    {'code': 'en-US', 'name': 'English', 'flag': '🇬🇧'},
    {'code': 'hi-IN', 'name': 'हिन्दी', 'flag': '🇮🇳'},
    {'code': 'te-IN', 'name': 'తెలుగు', 'flag': '🇮🇳'},
    {'code': 'kn-IN', 'name': 'ಕನ್ನಡ', 'flag': '🇮🇳'},
    {'code': 'ml-IN', 'name': 'മലയാളം', 'flag': '🇮🇳'},
  ];

  @override
  void initState() {
    super.initState();
    _currentLang = _storage.selectedLanguage;
  }

  void _onLanguageSelected(String langCode) {
    setState(() {
      _currentLang = langCode;
      _storage.selectedLanguage = langCode;
    });

    final prompt = _getLocalizedText('langChanged');
    VoiceAssistantService.speak(prompt, langCode: langCode);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('🌐 ${ _getLanguageName(langCode) } selected'),
        backgroundColor: Colors.purple.shade700,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  String _getLanguageName(String code) {
    final match = _languages.firstWhere((l) => l['code'] == code, orElse: () => _languages[0]);
    return '${match['flag']} ${match['name']}';
  }

  String _getLocalizedText(String key) {
    switch (_currentLang) {
      case 'ta-IN':
        switch (key) {
          case 'greeting': return 'வணக்கம் அம்மா 👋';
          case 'subGreeting': return 'இனிய, ஆரோக்கியமான நாளாக அமையட்டும்!';
          case 'voiceTitle': return '🎙️ அம்மா வாய்ஸ் அசிஸ்டண்ட்';
          case 'voiceSub': return 'அட்டவணையை கேட்க அல்லது பேச தட்டவும்';
          case 'sosTitle': return 'அவசர உதவி';
          case 'sosSub': return 'SOS Alert';
          case 'medTitle': return 'மருந்து நேரம்';
          case 'medSub': return 'Medicine';
          case 'vitalsTitle': return 'உடல் நலம் (Vitals)';
          case 'logVitals': return 'பதிவு செய்';
          case 'bpLabel': return 'இரத்த அழுத்தம் (BP)';
          case 'sugarLabel': return 'சர்க்கரை (Sugar)';
          case 'pulseLabel': return 'இதய துடிப்பு';
          case 'suiteTitle': return 'முதியோர் சிறப்பு சேவைகள் 🌟';
          case 'rxScanner': return 'Rx ஸ்கேனர்';
          case 'caregiver': return 'பராமரிப்பாளர்';
          case 'brainGames': return 'நினைவாற்றல் கேம்ஸ்';
          case 'aiJournal': return 'AI டைரி';
          case 'routineTitle': return 'இன்றைய அட்டவணை (Today\'s Schedule)';
          case 'viewAll': return 'முழுவதும்';
          case 'r1Title': return '🌅 காலை உடற்பயிற்சி & நடை';
          case 'r1Sub': return '06:30 AM • காலை புத்துணர்ச்சி';
          case 'r2Title': return '🥣 காலை உணவு & BP மாத்திரை';
          case 'r2Sub': return '08:00 AM • வெதுவெதுப்பான தண்ணீர்';
          case 'r3Title': return '🚶 மாலை நடைப்பயிற்சி';
          case 'r3Sub': return '05:30 PM • 15 நிமிட நடை';
          case 'r4Title': return '🍽️ இரவு உணவு & மாத்திரை';
          case 'r4Sub': return '07:30 PM • இரவு உணவு';
          case 'speakSummary': return 'வணக்கம் அம்மா! இன்று காலை மருந்து உட்கொண்டீர்கள். மாலை நடைப்பயிற்சி மற்றும் இரவு 8 மணிக்கு மருந்து உள்ளது. உடல் நலமாக இருங்கள்!';
          case 'langChanged': return 'மொழி வெற்றிகரமாக மாற்றப்பட்டது அம்மா!';
          default: return '';
        }
      case 'hi-IN':
        switch (key) {
          case 'greeting': return 'नमस्ते माँ / दादाजी 👋';
          case 'subGreeting': return 'आपका दिन सुखमय और स्वस्थ रहे!';
          case 'voiceTitle': return '🎙️ माँ वॉइस असिस्टेंट';
          case 'voiceSub': return 'दिनचर्या सुनने या बात करने के लिए टैप करें';
          case 'sosTitle': return 'आपातकालीन सहायता';
          case 'sosSub': return 'SOS Alert';
          case 'medTitle': return 'दवाई का समय';
          case 'medSub': return 'Medicine';
          case 'vitalsTitle': return 'स्वास्थ्य आंकड़े (Vitals)';
          case 'logVitals': return 'लॉग करें';
          case 'bpLabel': return 'रक्तचाप (BP)';
          case 'sugarLabel': return 'शुगर (Sugar)';
          case 'pulseLabel': return 'हृदय गति';
          case 'suiteTitle': return 'वरिष्ठ नागरिक स्वास्थ्य सेवाएं 🌟';
          case 'rxScanner': return 'दवाई स्कैनर';
          case 'caregiver': return 'केयरगिवर हब';
          case 'brainGames': return 'दिमागी खेल';
          case 'aiJournal': return 'AI डायरी';
          case 'routineTitle': return 'आज की दिनचर्या (Schedule)';
          case 'viewAll': return 'सभी देखें';
          case 'r1Title': return '🌅 सुबह की सैर व व्यायाम';
          case 'r1Sub': return '06:30 AM • ताज़ी हवा';
          case 'r2Title': return '🥣 नाश्ता और बीपी की दवाई';
          case 'r2Sub': return '08:00 AM • गुनगुना पानी';
          case 'r3Title': return '🚶 शाम की हल्की सैर';
          case 'r3Sub': return '05:30 PM • 15 मिनट';
          case 'r4Title': return '🍽️ रात का खाना और दवाई';
          case 'r4Sub': return '07:30 PM • हल्का भोजन';
          case 'speakSummary': return 'नमस्ते माँ! आपकी आज की दिनचर्या और दवाई समय पर है। अपना ख्याल रखें!';
          case 'langChanged': return 'भाषा सफलतापूर्वक बदल दी गई है माँ!';
          default: return '';
        }
      case 'te-IN':
        switch (key) {
          case 'greeting': return 'నమస్కారం అమ్మా 👋';
          case 'subGreeting': return 'ఈ రోజు ప్రశాంతంగా, ఆరోగ్యంగా ఉండండి!';
          case 'voiceTitle': return '🎙️ అమ్మ వాయిస్ అసిస్టెంట్';
          case 'voiceSub': return 'దినచర్య వినడానికి లేదా మాట్లాడటానికి నొక్కండి';
          case 'sosTitle': return 'అత్యవసర సహాయం';
          case 'sosSub': return 'SOS Alert';
          case 'medTitle': return 'మందుల సమయం';
          case 'medSub': return 'Medicine';
          case 'vitalsTitle': return 'ఆరోగ్య వివరాలు (Vitals)';
          case 'logVitals': return 'నమోదు';
          case 'bpLabel': return 'రక్తపోటు (BP)';
          case 'sugarLabel': return 'షుగర్ (Sugar)';
          case 'pulseLabel': return 'గుండె వేగం';
          case 'suiteTitle': return 'ఆరోగ్య సేవలు 🌟';
          case 'rxScanner': return 'మందుల స్కానర్';
          case 'caregiver': return 'కేర్‌గివర్ హబ్';
          case 'brainGames': return 'బ్రెయిన్ గేమ్స్';
          case 'aiJournal': return 'AI జర్నల్';
          case 'routineTitle': return 'ఈ రోజు దినచర్య (Schedule)';
          case 'viewAll': return 'అన్నీ చూడు';
          case 'r1Title': return '🌅 ఉదయం నడక & వ్యాయామం';
          case 'r1Sub': return '06:30 AM • స్వచ్ఛమైన గాలి';
          case 'r2Title': return '🥣 టిఫిన్ & బీపీ మాత్ర';
          case 'r2Sub': return '08:00 AM • గోరువెచ్చని నీళ్ళు';
          case 'r3Title': return '🚶 సాయంత్రం నడక';
          case 'r3Sub': return '05:30 PM • 15 నిమిషాలు';
          case 'r4Title': return '🍽️ రాత్రి భోజనం & మందులు';
          case 'r4Sub': return '07:30 PM • తేలికపాటి ఆహారం';
          case 'speakSummary': return 'నమస్కారం అమ్మా! మీ ఈ రోజు దినచర్య మరియు మందుల వివరాలు సిద్ధంగా ఉన్నాయి.';
          case 'langChanged': return 'భాష విజయవంతంగా మార్చబడింది అమ్మా!';
          default: return '';
        }
      case 'kn-IN':
        switch (key) {
          case 'greeting': return 'ನಮಸ್ಕಾರ ಅಮ್ಮಾ 👋';
          case 'subGreeting': return 'ಶಾಂತಿಯುತ ಮತ್ತು ಆರೋಗ್ಯಕರ ದಿನವಾಗಿರಲಿ!';
          case 'voiceTitle': return '🎙️ ಅಮ್ಮ ವಾಯ್ಸ್ ಅಸಿಸ್ಟೆಂಟ್';
          case 'voiceSub': return 'ದಿನಚರಿ ಕೇಳಲು ಅಥವಾ ಮಾತನಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ';
          case 'sosTitle': return 'ತುರ್ತು ಸಹಾಯ';
          case 'sosSub': return 'SOS Alert';
          case 'medTitle': return 'ಮಾತ್ರೆ ಸಮಯ';
          case 'medSub': return 'Medicine';
          case 'vitalsTitle': return 'ಆರೋಗ್ಯ ವಿವರ (Vitals)';
          case 'logVitals': return 'ದಾಖಲಿಸಿ';
          case 'bpLabel': return 'ರಕ್ತದೊತ್ತಡ (BP)';
          case 'sugarLabel': return 'ಸಕ್ಕರೆ (Sugar)';
          case 'pulseLabel': return 'ಹೃದಯ ಬಡಿತ';
          case 'suiteTitle': return 'ಆರೋಗ್ಯ ಸೇವೆಗಳು 🌟';
          case 'rxScanner': return 'ಮಾತ್ರೆ ಸ್ಕ್ಯಾನರ್';
          case 'caregiver': return 'ಕೇರ್‌ಗಿವರ್';
          case 'brainGames': return 'ಮೆದುಳಿನ ಆಟ';
          case 'aiJournal': return 'AI ಡೈರಿ';
          case 'routineTitle': return 'ಇಂದಿನ ವೇಳಾಪಟ್ಟಿ (Schedule)';
          case 'viewAll': return 'ಎಲ್ಲ ನೋಡಿ';
          case 'r1Title': return '🌅 ಬೆಳಗಿನ ನಡಿಗೆ & ಕಸರತ್ತು';
          case 'r1Sub': return '06:30 AM • ತಾಜಾ ಗಾಳಿ';
          case 'r2Title': return '🥣 ಉಪಾಹಾರ & ಬಿಪಿ ಮಾತ್ರೆ';
          case 'r2Sub': return '08:00 AM • ಬಿಸಿ ನೀರು';
          case 'r3Title': return '🚶 ಸಂಜೆಯ ನಡಿಗೆ';
          case 'r3Sub': return '05:30 PM • 15 ನಿಮಿಷ';
          case 'r4Title': return '🍽️ ರಾತ್ರಿಯ ಊಟ & ಮಾತ್ರೆ';
          case 'r4Sub': return '07:30 PM • ಲಘು ಆಹಾರ';
          case 'speakSummary': return 'ನಮಸ್ಕಾರ ಅಮ್ಮಾ! ನಿಮ್ಮ ಇಂದಿನ ವೇಳಾಪಟ್ಟಿ ಸಿದ್ಧವಾಗಿದೆ.';
          case 'langChanged': return 'ಭಾಷೆಯನ್ನು ಬದಲಾಯಿಸಲಾಗಿದೆ ಅಮ್ಮಾ!';
          default: return '';
        }
      case 'ml-IN':
        switch (key) {
          case 'greeting': return 'നമസ്കാരം അമ്മാ 👋';
          case 'subGreeting': return 'ആരോഗ്യമുള്ള ഒരു ദിനം ആശംസിക്കുന്നു!';
          case 'voiceTitle': return '🎙️ അമ്മ വോയ്‌സ് അസിസ്റ്റന്റ്';
          case 'voiceSub': return 'ദിനചര്യ കേൾക്കാനോ സംസാരിക്കാനോ ടാപ്പ് ചെയ്യുക';
          case 'sosTitle': return 'അടിയന്തിര സഹായം';
          case 'sosSub': return 'SOS Alert';
          case 'medTitle': return 'മരുന്ന് സമയം';
          case 'medSub': return 'Medicine';
          case 'vitalsTitle': return 'ആരോഗ്യ വിവരങ്ങൾ (Vitals)';
          case 'logVitals': return 'രേഖപ്പെടുത്തുക';
          case 'bpLabel': return 'രക്തസമ്മർദ്ദം (BP)';
          case 'sugarLabel': return 'ഷുഗർ (Sugar)';
          case 'pulseLabel': return 'ഹൃദയമിടിപ്പ്';
          case 'suiteTitle': return 'ആരോഗ്യ സേവനങ്ങൾ 🌟';
          case 'rxScanner': return 'മരുന്ന് സ്കാനർ';
          case 'caregiver': return 'കെയർഗിവർ';
          case 'brainGames': return 'ബ്രെയിൻ ഗെയിംസ്';
          case 'aiJournal': return 'AI ഡയറി';
          case 'routineTitle': return 'ഇന്നത്തെ ദിനചര്യ (Schedule)';
          case 'viewAll': return 'എല്ലാം കാണുക';
          case 'r1Title': return '🌅 രാവിലത്തെ നടത്തം';
          case 'r1Sub': return '06:30 AM • ശുദ്ധവായു';
          case 'r2Title': return '🥣 പ്രഭാതഭക്ഷണവും ബിപി മരുന്നും';
          case 'r2Sub': return '08:00 AM • ചെറുചൂടുവെള്ളം';
          case 'r3Title': return '🚶 വൈകുന്നേരത്തെ നടത്തം';
          case 'r3Sub': return '05:30 PM • 15 മിനിറ്റ്';
          case 'r4Title': return '🍽️ അത്താഴവും മരുന്നും';
          case 'r4Sub': return '07:30 PM • ലഘുഭക്ഷണം';
          case 'speakSummary': return 'നമസ്കാരം അമ്മാ! ഇന്നത്തെ മരുന്നും ദിനചര്യയും കൃത്യമായി ചെയ്യുക.';
          case 'langChanged': return 'ഭാഷ വിജയകരമായി മാറ്റി അമ്മാ!';
          default: return '';
        }
      default: // en-US
        switch (key) {
          case 'greeting': return 'Hello Mom / Grandparent 👋';
          case 'subGreeting': return 'Have a peaceful, healthy & joyful day!';
          case 'voiceTitle': return '🎙️ Amma Voice Companion';
          case 'voiceSub': return 'Tap to speak or listen to daily routines';
          case 'sosTitle': return 'Emergency SOS';
          case 'sosSub': return 'Alert Family';
          case 'medTitle': return 'Medicine Time';
          case 'medSub': return 'Pill Routine';
          case 'vitalsTitle': return 'Health Vitals';
          case 'logVitals': return 'Log Vitals';
          case 'bpLabel': return 'Blood Pressure (BP)';
          case 'sugarLabel': return 'Sugar Level';
          case 'pulseLabel': return 'Heart Rate';
          case 'suiteTitle': return 'Senior Smart Health Suite 🌟';
          case 'rxScanner': return 'Rx Pill Scanner';
          case 'caregiver': return 'Caregiver Hub';
          case 'brainGames': return 'Brain Games';
          case 'aiJournal': return 'AI Journal';
          case 'routineTitle': return 'Today\'s Schedule';
          case 'viewAll': return 'View All';
          case 'r1Title': return '🌅 Morning Stretching & Fresh Air';
          case 'r1Sub': return '06:30 AM • Morning stretch';
          case 'r2Title': return '🥣 Breakfast & BP Medicine';
          case 'r2Sub': return '08:00 AM • Warm water & breakfast';
          case 'r3Title': return '🚶 Evening Garden Walk';
          case 'r3Sub': return '05:30 PM • 15-min gentle walk';
          case 'r4Title': return '🍽️ Light Dinner & Evening Medicine';
          case 'r4Sub': return '07:30 PM • Dinner & medication';
          case 'speakSummary': return 'Hello Mom! Your morning medication is logged. Evening walk and 8 PM pills are next. Stay healthy and well!';
          case 'langChanged': return 'Language changed successfully Mom!';
          default: return '';
        }
    }
  }

  void _speakTodaySummary() {
    VoiceAssistantService.speak(
      _getLocalizedText('speakSummary'),
      langCode: _currentLang,
    );
  }

  void _showRecordVoiceMemoSheet() {
    VoiceNoteComposerSheet.show(context);
  }

  void _triggerSos() {
    SeniorCaregiverSyncService().triggerSosAlert('Location: Home • Immediate assistance required');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.red, size: 28),
            SizedBox(width: 8),
            Flexible(child: Text('Emergency SOS Alert')),
          ],
        ),
        content: const Text(
          'Emergency Alert sent to your family & caregiver! They are notified immediately.',
          style: TextStyle(fontSize: 14),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('OK', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Language Selector Bar (Responsive Horizontal Scroll)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E1E1E) : Colors.purple.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isDark ? Colors.purple.shade900 : Colors.purple.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.language_rounded, color: Colors.purple, size: 20),
                    const SizedBox(width: 6),
                    Text(
                      'Language / மொழி:',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isDark ? Colors.purple.shade200 : Colors.purple),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: _languages.map((lang) {
                            final isSelected = _currentLang == lang['code'];
                            return Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: ChoiceChip(
                                label: Text('${lang['flag']} ${lang['name']}'),
                                selected: isSelected,
                                selectedColor: Colors.purple.shade700,
                                labelStyle: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: isSelected ? Colors.white : (isDark ? Colors.white : Colors.black87),
                                ),
                                onSelected: (_) => _onLanguageSelected(lang['code']!),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Header Row (Fully Responsive)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.purple.shade100,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '👵 SENIOR CITIZEN CARE',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.purple.shade900,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.pink.shade50,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.pink.shade200),
                              ),
                              child: Text(
                                '🔗 Code: ${_storage.linkedSeniorCode}',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.pink.shade900,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _getLocalizedText('greeting'),
                          style: theme.textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.purple.shade900,
                            fontSize: 20,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          _getLocalizedText('subGreeting'),
                          style: const TextStyle(fontSize: 12, color: Colors.black87),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: () {
                      Navigator.pushNamed(context, AppRoutes.portal);
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.purple.shade50,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.purple.shade200),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.swap_horiz_rounded, size: 16, color: Colors.purple),
                          SizedBox(width: 4),
                          Text(
                            'Portals',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.purple),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Prominent "Amma Voice Assistant" Microphone Card
              InkWell(
                onTap: () {
                  Navigator.pushNamed(context, AppRoutes.voiceCompanion);
                },
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF8E2DE2), Color(0xFF4A00E0)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.purple.withValues(alpha: 0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.record_voice_over_rounded,
                          color: Colors.purple,
                          size: 30,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _getLocalizedText('voiceTitle'),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _getLocalizedText('voiceSub'),
                              style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 11),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.volume_up_rounded, color: Colors.white, size: 26),
                        onPressed: _speakTodaySummary,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 14),

              // Emergency SOS and Medication Highlights Row (Flexible & Overflow Free)
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: _triggerSos,
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF2C1417) : Colors.red.shade50,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isDark ? Colors.red.shade900 : Colors.red.shade300, width: 1.2),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: Colors.red.shade600,
                              radius: 18,
                              child: const Icon(Icons.sos_rounded, color: Colors.white, size: 20),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _getLocalizedText('sosTitle'),
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                      color: isDark ? Colors.redAccent.shade100 : Colors.red,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    _getLocalizedText('sosSub'),
                                    style: TextStyle(fontSize: 10, color: isDark ? Colors.white70 : Colors.black87),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: InkWell(
                      onTap: () => Navigator.pushNamed(context, AppRoutes.medications),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF0F2625) : Colors.teal.shade50,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isDark ? Colors.teal.shade900 : Colors.teal.shade300, width: 1.2),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: Colors.teal.shade600,
                              radius: 18,
                              child: const Icon(Icons.medication_rounded, color: Colors.white, size: 20),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _getLocalizedText('medTitle'),
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                      color: isDark ? Colors.tealAccent : Colors.teal,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    _getLocalizedText('medSub'),
                                    style: TextStyle(fontSize: 10, color: isDark ? Colors.white70 : Colors.black87),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Family Voice Reminders Hub Card (Son/Daughter/Granddaughter Voice Memos)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isDark
                        ? [const Color(0xFF261224), const Color(0xFF1E142B)]
                        : [const Color(0xFFFCE4EC), const Color(0xFFF3E5F5)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: isDark ? Colors.purple.shade900 : Colors.pink.shade200),
                  boxShadow: [
                    BoxShadow(color: Colors.pink.withValues(alpha: isDark ? 0.05 : 0.1), blurRadius: 8, offset: const Offset(0, 3)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              CircleAvatar(
                                backgroundColor: Colors.pink.shade600,
                                radius: 16,
                                child: const Icon(Icons.record_voice_over_rounded, color: Colors.white, size: 18),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '👨‍👩‍👧 Family Voice Memos',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: isDark ? Colors.pink.shade200 : Colors.pink.shade900,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      _storage.familyVoiceModeEnabled ? 'Active • Son Rahul, Priya & Ananya' : 'Disabled in Caregiver Hub',
                                      style: TextStyle(fontSize: 10, color: isDark ? Colors.grey.shade400 : Colors.grey.shade800),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        TextButton(
                          onPressed: () => Navigator.pushNamed(context, AppRoutes.caregiverHub),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: Text(
                            'Family Hub',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: isDark ? Colors.pink.shade200 : Colors.pink.shade900),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _FamilyVoiceMemoChip(
                            icon: Icons.breakfast_dining_rounded,
                            label: '🥣 Rahul: Breakfast',
                            color: Colors.orange.shade800,
                            onTap: () {
                              final note = FamilyVoiceNoteService().getVoiceNoteByKey('breakfast');
                              if (note != null) {
                                FamilyVoiceNoteService().playFamilyVoiceNote(note, _currentLang);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Playing Son Rahul: Breakfast & Medicine Memo ❤️')),
                                );
                              }
                            },
                          ),
                          _FamilyVoiceMemoChip(
                            icon: Icons.favorite_rounded,
                            label: '🩺 Rahul: Health Check',
                            color: Colors.red.shade700,
                            onTap: () {
                              final note = FamilyVoiceNoteService().getVoiceNoteByKey('health_check');
                              if (note != null) {
                                FamilyVoiceNoteService().playFamilyVoiceNote(note, _currentLang);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Playing Son Rahul: "How is your health Mom?" ❤️')),
                                );
                              }
                            },
                          ),
                          _FamilyVoiceMemoChip(
                            icon: Icons.medication_rounded,
                            label: '💊 Priya: Medicine',
                            color: Colors.teal.shade800,
                            onTap: () {
                              final note = FamilyVoiceNoteService().getVoiceNoteByKey('medicine');
                              if (note != null) {
                                FamilyVoiceNoteService().playFamilyVoiceNote(note, _currentLang);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Playing Daughter Priya: Medicine & Hydration ❤️')),
                                );
                              }
                            },
                          ),
                          _FamilyVoiceMemoChip(
                            icon: Icons.directions_walk_rounded,
                            label: '🚶 Ananya: Walk',
                            color: Colors.green.shade800,
                            onTap: () {
                              final note = FamilyVoiceNoteService().getVoiceNoteByKey('walk');
                              if (note != null) {
                                FamilyVoiceNoteService().playFamilyVoiceNote(note, _currentLang);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Playing Granddaughter Ananya: Evening Walk ❤️')),
                                );
                              }
                            },
                          ),
                          _FamilyVoiceMemoChip(
                            icon: Icons.dinner_dining_rounded,
                            label: '🌙 Rahul: Dinner',
                            color: Colors.purple.shade800,
                            onTap: () {
                              final note = FamilyVoiceNoteService().getVoiceNoteByKey('dinner');
                              if (note != null) {
                                FamilyVoiceNoteService().playFamilyVoiceNote(note, _currentLang);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Playing Son Rahul: Night Pills & Dinner ❤️')),
                                );
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    ListenableBuilder(
                      listenable: FamilyVoiceNoteService(),
                      builder: (context, _) {
                        final notes = FamilyVoiceNoteService().voiceNotesFeed;
                        if (notes.isEmpty) return const SizedBox.shrink();
                        final latest = notes.first;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: WhatsAppVoiceNoteBubble(
                            note: latest,
                            isFromCaregiver: true,
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 6),
                    InkWell(
                      onTap: _showRecordVoiceMemoSheet,
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.pink.shade700,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.pink.withValues(alpha: 0.25),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.mic_rounded, color: Colors.white, size: 18),
                            SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                '🎙️ Record Voice for Mom / Grandparent (குரல் பதிவு)',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Senior Caregiver & Brain Suite
              Text(
                _getLocalizedText('suiteTitle'),
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _SeniorFeatureChip(
                      icon: Icons.family_restroom,
                      label: _getLocalizedText('caregiver'),
                      color: Colors.purple.shade700,
                      onTap: () => Navigator.pushNamed(context, AppRoutes.caregiverHub),
                    ),
                    _SeniorFeatureChip(
                      icon: Icons.psychology,
                      label: _getLocalizedText('brainGames'),
                      color: Colors.amber.shade900,
                      onTap: () => Navigator.pushNamed(context, AppRoutes.cognitiveGame),
                    ),
                    _SeniorFeatureChip(
                      icon: Icons.edit_note,
                      label: _getLocalizedText('aiJournal'),
                      color: Colors.blue.shade700,
                      onTap: () => Navigator.pushNamed(context, AppRoutes.aiJournal),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Today's Senior Routine Highlights
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      _getLocalizedText('routineTitle'),
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pushNamed(context, AppRoutes.seniorDashboard),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(_getLocalizedText('viewAll'), style: const TextStyle(fontSize: 12)),
                  ),
                ],
              ),

              const SizedBox(height: 6),

              _SeniorRoutineItem(
                title: _getLocalizedText('r1Title'),
                subtitle: _getLocalizedText('r1Sub'),
                isCompleted: true,
              ),
              _SeniorRoutineItem(
                title: _getLocalizedText('r2Title'),
                subtitle: _getLocalizedText('r2Sub'),
                isCompleted: true,
              ),
              _SeniorRoutineItem(
                title: _getLocalizedText('r3Title'),
                subtitle: _getLocalizedText('r3Sub'),
                isCompleted: false,
              ),
              _SeniorRoutineItem(
                title: _getLocalizedText('r4Title'),
                subtitle: _getLocalizedText('r4Sub'),
                isCompleted: false,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SeniorFeatureChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _SeniorFeatureChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withValues(alpha: 0.4), width: 1.2),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SeniorRoutineItem extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool isCompleted;

  const _SeniorRoutineItem({
    required this.title,
    required this.subtitle,
    required this.isCompleted,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      color: theme.cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: isDark ? Colors.purple.shade900 : Colors.purple.shade100),
      ),
      child: ListTile(
        dense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        leading: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: isDark ? Colors.purple.shade900.withValues(alpha: 0.3) : Colors.purple.shade100,
            shape: BoxShape.circle,
          ),
          child: Icon(Icons.elderly_rounded, color: isDark ? Colors.purple.shade200 : Colors.purple, size: 20),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 13,
            decoration: isCompleted ? TextDecoration.lineThrough : null,
            color: isCompleted ? (isDark ? Colors.grey.shade500 : Colors.grey) : (isDark ? Colors.white : Colors.black87),
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(fontSize: 11, color: isDark ? Colors.grey.shade400 : Colors.grey[700]),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Icon(
          isCompleted ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
          color: isCompleted ? Colors.green : (isDark ? Colors.grey.shade600 : Colors.grey),
          size: 22,
        ),
      ),
    );
  }
}

class _FamilyVoiceMemoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _FamilyVoiceMemoChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withValues(alpha: 0.4), width: 1.2),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: color),
              ),
              const SizedBox(width: 4),
              Icon(Icons.volume_up_rounded, color: color, size: 14),
            ],
          ),
        ),
      ),
    );
  }
}

