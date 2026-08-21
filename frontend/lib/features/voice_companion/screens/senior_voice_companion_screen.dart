import 'package:flutter/material.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/voice_assistant_service.dart';
import '../../../services/voice_notification_service.dart';
import '../../../services/app_service_locator.dart';
import '../../schedule/controller/schedule_controller.dart';
import '../../schedule/models/schedule_model.dart';

class SeniorVoiceCompanionScreen extends StatefulWidget {
  final ScheduleController? scheduleController;

  const SeniorVoiceCompanionScreen({super.key, this.scheduleController});

  @override
  State<SeniorVoiceCompanionScreen> createState() => _SeniorVoiceCompanionScreenState();
}

class _SeniorVoiceCompanionScreenState extends State<SeniorVoiceCompanionScreen>
    with SingleTickerProviderStateMixin {
  final LocalStorageService _storage = LocalStorageService();
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  late String _currentLang;
  late String _selectedGender;
  late String _assistantSpeech;
  String _userSpokenTranscript = "";
  bool _isProcessing = false;
  bool _gentleChimeOn = true;
  late bool _isVoiceAssistantEnabled;

  final List<Map<String, String>> _supportedLanguages = [
    {'code': 'ta-IN', 'name': 'தமிழ் (அம்மா)', 'flag': '🇮🇳'},
    {'code': 'hi-IN', 'name': 'हिंदी (माँ)', 'flag': '🇮🇳'},
    {'code': 'te-IN', 'name': 'తెలుగు (அమ్మా)', 'flag': '🇮🇳'},
    {'code': 'kn-IN', 'name': 'ಕನ್ನಡ (ಅಮ್ಮ)', 'flag': '🇮🇳'},
    {'code': 'ml-IN', 'name': 'മലയാളം (அമ്മ)', 'flag': '🇮🇳'},
    {'code': 'en-US', 'name': 'English (Mom)', 'flag': '🇬🇧'},
    {'code': 'es-ES', 'name': 'Español (Mamá)', 'flag': '🇪🇸'},
  ];

  @override
  void initState() {
    super.initState();
    _currentLang = _storage.selectedLanguage;
    _selectedGender = _storage.selectedVoiceGender;
    _isVoiceAssistantEnabled = _storage.autoSpeakPopups;
    _assistantSpeech = VoiceAssistantService.getTranslation(_currentLang, 'welcome');

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.18).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _onLanguageChanged(String newLangCode) {
    setState(() {
      _currentLang = newLangCode;
      _storage.selectedLanguage = newLangCode;
      _assistantSpeech = VoiceAssistantService.getTranslation(newLangCode, 'welcome');
      _userSpokenTranscript = "";
    });

    VoiceAssistantService.speak(_assistantSpeech, langCode: newLangCode, isMale: _selectedGender == 'male');
  }

  void _onGenderChanged(String newGender) {
    setState(() {
      _selectedGender = newGender;
      _storage.selectedVoiceGender = newGender;
    });
    VoiceAssistantService.speak(_assistantSpeech, langCode: _currentLang, isMale: newGender == 'male');
  }

  Future<void> _handleVoiceCommand(String rawCommand) async {
    setState(() {
      _isProcessing = true;
      _userSpokenTranscript = '🗣️ Voice Command: "$rawCommand"';
    });

    final reply = await VoiceAssistantService.parseAndExecuteVoiceCommand(
      commandText: rawCommand,
      langCode: _currentLang,
      scheduleController: widget.scheduleController,
      context: context,
    );

    if (mounted) {
      setState(() {
        _isProcessing = false;
        _assistantSpeech = reply;
      });
    }
  }

  Future<void> _checkRoutineVoice({
    required String promptKey,
    required String confirmKey,
    required String routineKeywords,
    required String fallbackTitle,
  }) async {
    final promptQuestion = VoiceAssistantService.getTranslation(_currentLang, promptKey);
    final confirmMessage = VoiceAssistantService.getTranslation(_currentLang, confirmKey);
    final listeningText = VoiceAssistantService.getTranslation(_currentLang, 'listening');

    setState(() {
      _isProcessing = true;
      _assistantSpeech = promptQuestion;
      _userSpokenTranscript = listeningText;
    });

    await VoiceAssistantService.askAndListenForConfirmation(
      questionPrompt: promptQuestion,
      confirmationPrompt: confirmMessage,
      langCode: _currentLang,
      onResult: (isConfirmed) async {
        if (isConfirmed) {
          final controller = widget.scheduleController ?? AppServiceLocator().scheduleController;
          final routines = controller.currentRoutines;
          final matchIndex = routines.indexWhere(
            (r) => r.title.toLowerCase().contains(routineKeywords.toLowerCase()),
          );

          if (matchIndex != -1) {
            final target = routines[matchIndex];
            final updated = target.copyWith(status: ActivityStatus.completed);
            await controller.updateRoutine(updated);
          } else {
            final newRoutine = ScheduleItem(
              id: '${DateTime.now().millisecondsSinceEpoch}_voice',
              title: fallbackTitle,
              description: 'Completed via Loving Amma Voice Companion',
              time: '08:30 AM',
              category: ActivityCategory.breakfast,
              status: ActivityStatus.completed,
              date: controller.selectedDate,
              reminderEnabled: true,
              createdAt: DateTime.now(),
              updatedAt: DateTime.now(),
            );
            await controller.addNewRoutine(newRoutine);
          }

          if (mounted) {
            setState(() {
              _userSpokenTranscript = '🗣️ Voice Response Confirmed!';
              _assistantSpeech = confirmMessage;
            });
          }
        }
      },
    );

    if (mounted) {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          '❤️ Loving Family Voice Companion',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 19),
        ),
        actions: [
          IconButton(
            icon: Icon(
              _isVoiceAssistantEnabled ? Icons.volume_up_rounded : Icons.volume_off_rounded,
              color: _isVoiceAssistantEnabled ? Colors.green.shade700 : Colors.red.shade700,
            ),
            tooltip: _isVoiceAssistantEnabled ? 'Turn OFF Voice Assistance' : 'Turn ON Voice Assistance',
            onPressed: () {
              final newStatus = !_isVoiceAssistantEnabled;
              setState(() {
                _isVoiceAssistantEnabled = newStatus;
                _storage.autoSpeakPopups = newStatus;
                _storage.voicePopupsEnabled = newStatus;
              });
              if (!newStatus) {
                VoiceAssistantService.stop();
              }
            },
          ),
        ],
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            children: [
              // Master Voice Assistance ON / OFF Toggle Switch Card
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: _isVoiceAssistantEnabled ? Colors.green.shade50 : Colors.red.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _isVoiceAssistantEnabled ? Colors.green.shade300 : Colors.red.shade200,
                    width: 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _isVoiceAssistantEnabled ? Icons.mic_rounded : Icons.mic_off_rounded,
                      color: _isVoiceAssistantEnabled ? Colors.green.shade700 : Colors.red.shade700,
                      size: 28,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isVoiceAssistantEnabled ? '🎙️ Voice Assistance ON' : '🔇 Voice Assistance OFF',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: _isVoiceAssistantEnabled ? Colors.green.shade900 : Colors.red.shade900,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _isVoiceAssistantEnabled
                                ? 'Voice assistant speaks prompts & responds out loud.'
                                : 'Voice assistant is turned OFF. Tap switch to turn ON.',
                            style: TextStyle(fontSize: 11, color: Colors.grey[800]),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _isVoiceAssistantEnabled,
                      activeThumbColor: Colors.green.shade700,
                      onChanged: (val) {
                        setState(() {
                          _isVoiceAssistantEnabled = val;
                          _storage.autoSpeakPopups = val;
                          _storage.voicePopupsEnabled = val;
                        });
                        if (!val) {
                          VoiceAssistantService.stop();
                        }
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Language Selector Bar
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _supportedLanguages.map((lang) {
                    final isSelected = lang['code'] == _currentLang;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text('${lang['flag']} ${lang['name']}'),
                        selected: isSelected,
                        selectedColor: primaryColor,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : Colors.black87,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 14,
                        ),
                        onSelected: (_) => _onLanguageChanged(lang['code']!),
                      ),
                    );
                  }).toList(),
                ),
              ),

              const SizedBox(height: 10),

              // Voice Gender Selector Bar (Female vs Male)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ChoiceChip(
                    avatar: const Icon(Icons.female, size: 16),
                    label: const Text('👩 Female Voice (Amma)'),
                    selected: _selectedGender == 'female',
                    selectedColor: primaryColor,
                    labelStyle: TextStyle(
                      color: _selectedGender == 'female' ? Colors.white : Colors.black87,
                      fontWeight: _selectedGender == 'female' ? FontWeight.bold : FontWeight.normal,
                      fontSize: 13,
                    ),
                    onSelected: (_) => _onGenderChanged('female'),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    avatar: const Icon(Icons.male, size: 16),
                    label: const Text('👨 Male Voice (Rahul)'),
                    selected: _selectedGender == 'male',
                    selectedColor: primaryColor,
                    labelStyle: TextStyle(
                      color: _selectedGender == 'male' ? Colors.white : Colors.black87,
                      fontWeight: _selectedGender == 'male' ? FontWeight.bold : FontWeight.normal,
                      fontSize: 13,
                    ),
                    onSelected: (_) => _onGenderChanged('male'),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Loving Amma / Maa Banner Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Colors.pinkAccent, Colors.deepOrangeAccent]),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.pinkAccent.withValues(alpha: 0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const CircleAvatar(
                      radius: 26,
                      backgroundColor: Colors.white,
                      child: Text('👵', style: TextStyle(fontSize: 28)),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            '❤️ Loving "Amma / Maa / Mom" Voice Persona',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Speaks warmly like a caring family member ("Amma, did you eat breakfast?")',
                            style: TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Gentle Chime Banner
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.amber.shade300),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.notifications_active_outlined, color: Colors.amber, size: 28),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                '🛡️ Gentle Anti-Panic Pre-Chime Active',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.black87),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Plays a soft chime before speaking so seniors are never startled.',
                                style: TextStyle(fontSize: 11, color: Colors.grey[800]),
                              ),
                            ],
                          ),
                        ),
                        Switch(
                          value: _gentleChimeOn,
                          activeThumbColor: Colors.amber.shade700,
                          onChanged: (val) {
                            setState(() {
                              _gentleChimeOn = val;
                              VoiceAssistantService.gentlePreChimeEnabled = val;
                            });
                          },
                        ),
                      ],
                    ),
                    const Divider(height: 16),
                    InkWell(
                      onTap: () {
                        final testSample = VoiceAssistantService.getTranslation(_currentLang, 'welcome');
                        VoiceAssistantService.speak(testSample, langCode: _currentLang);
                      },
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.volume_up_rounded, color: Colors.deepOrange, size: 18),
                          SizedBox(width: 6),
                          Text(
                            '🔊 Tap Here to Test Amma/Maa Voice Out Loud',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: Colors.deepOrange,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Pop-Up Voice Notification Action Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.purple.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.purple.shade200),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(Icons.record_voice_over_rounded, color: Colors.purple.shade700, size: 28),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                '🗣️ Pop-Up Voice Schedule Alerts',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.black87),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Shows full-screen pop-up dialog with voice reminders when routines are due.',
                                style: TextStyle(fontSize: 11, color: Colors.black.withValues(alpha: 0.7)),
                              ),
                            ],
                          ),
                        ),
                        Switch(
                          value: _storage.voicePopupsEnabled,
                          activeThumbColor: Colors.purple.shade700,
                          onChanged: (val) {
                            setState(() {
                              _storage.voicePopupsEnabled = val;
                            });
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          VoiceNotificationService().testVoicePopup(
                            context,
                            controller: widget.scheduleController,
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.purple.shade700,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.play_circle_fill_rounded, size: 20),
                        label: const Text(
                          'Test Senior Voice Pop-Up Alert Now',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Large Voice Status Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: primaryColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: primaryColor.withValues(alpha: 0.3), width: 2),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.favorite_rounded, color: Colors.pinkAccent, size: 44),
                    const SizedBox(height: 14),
                    Text(
                      _assistantSpeech,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.onSurface,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () {
                        VoiceAssistantService.speak(_assistantSpeech, langCode: _currentLang);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.volume_up_rounded),
                      label: const Text('▶️ Listen to Amma Greeting', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                    if (_userSpokenTranscript.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Text(
                          _userSpokenTranscript,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: Colors.teal,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 28),

              const SizedBox(height: 20),

              // Hands-Free Conversational Voice Intent Action Bar (Outshining Siri/Alexa)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.teal.shade50,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.teal.shade200, width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.auto_awesome_rounded, color: Colors.teal, size: 22),
                        SizedBox(width: 8),
                        Text(
                          '🗣️ Hands-Free Conversational Voice Actions',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.black87),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ActionChip(
                          avatar: const Icon(Icons.water_drop_rounded, size: 16, color: Colors.blue),
                          label: const Text('💧 Log Water', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          backgroundColor: Colors.white,
                          onPressed: () => _handleVoiceCommand('I drank water'),
                        ),
                        ActionChip(
                          avatar: const Icon(Icons.check_circle_rounded, size: 16, color: Colors.green),
                          label: const Text('💊 Completed Pills', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          backgroundColor: Colors.white,
                          onPressed: () => _handleVoiceCommand('I took my medicine'),
                        ),
                        ActionChip(
                          avatar: const Icon(Icons.access_time_rounded, size: 16, color: Colors.purple),
                          label: const Text('📅 What\'s Next?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          backgroundColor: Colors.white,
                          onPressed: () => _handleVoiceCommand('What is my next schedule?'),
                        ),
                        ActionChip(
                          avatar: const Icon(Icons.favorite_rounded, size: 16, color: Colors.red),
                          label: const Text('🩺 Check Vitals', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          backgroundColor: Colors.white,
                          onPressed: () => _handleVoiceCommand('How is my health vitals?'),
                        ),
                        ActionChip(
                          avatar: const Icon(Icons.auto_stories_rounded, size: 16, color: Colors.orange),
                          label: const Text('📖 Mindfulness Story', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          backgroundColor: Colors.white,
                          onPressed: () => _handleVoiceCommand('Tell me a soothing story'),
                        ),
                        ActionChip(
                          avatar: const Icon(Icons.warning_amber_rounded, size: 16, color: Colors.redAccent),
                          label: const Text('🚨 Emergency SOS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.red)),
                          backgroundColor: Colors.red.shade50,
                          onPressed: () => _handleVoiceCommand('Emergency SOS help me'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Animated Pulsing Microphone Button
              ScaleTransition(
                scale: _isProcessing ? _pulseAnimation : const AlwaysStoppedAnimation(1.0),
                child: GestureDetector(
                  onTap: _isProcessing
                      ? null
                      : () async {
                          setState(() {
                            _isProcessing = true;
                            _userSpokenTranscript = '🎙️ Listening to your voice... Speak now!';
                          });

                          final transcript = await VoiceAssistantService.listenToMicrophone(langCode: _currentLang);

                          if (transcript != null && transcript.trim().isNotEmpty) {
                            await _handleVoiceCommand(transcript.trim());
                          } else {
                            await _handleVoiceCommand('What is my next schedule?');
                          }
                        },
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: primaryColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: primaryColor.withValues(alpha: 0.4),
                          blurRadius: 20,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.mic_rounded,
                      color: Colors.white,
                      size: 60,
                    ),
                  ),
                ),
              ),


              const SizedBox(height: 12),
              Text(
                _isProcessing ? 'Processing voice command...' : 'Tap Mic or Action Chips Above',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.grey),
              ),

              const SizedBox(height: 32),

              // Senior 1-Tap Quick Voice Check Cards
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Loving Voice Reminders',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
                ),
              ),
              const SizedBox(height: 14),

              _SeniorVoiceTile(
                icon: Icons.restaurant_rounded,
                title: '🍳 Amma Breakfast Check',
                subtitle: 'Asks: "Amma, did you eat breakfast?"',
                color: Colors.orange,
                onTap: () => _checkRoutineVoice(
                  promptKey: 'breakfast',
                  confirmKey: 'confirm_breakfast',
                  routineKeywords: 'breakfast',
                  fallbackTitle: 'Healthy Breakfast',
                ),
              ),
              _SeniorVoiceTile(
                icon: Icons.medication_rounded,
                title: '💊 Amma Medicine Check',
                subtitle: 'Asks: "Amma, did you take your pills?"',
                color: Colors.teal,
                onTap: () => _checkRoutineVoice(
                  promptKey: 'medicine',
                  confirmKey: 'confirm_medicine',
                  routineKeywords: 'medicine',
                  fallbackTitle: 'Morning Medicine',
                ),
              ),
              _SeniorVoiceTile(
                icon: Icons.water_drop_rounded,
                title: '💧 Amma Water Intake Check',
                subtitle: 'Asks: "Amma, drink a glass of water"',
                color: Colors.blueAccent,
                onTap: () => _checkRoutineVoice(
                  promptKey: 'water',
                  confirmKey: 'confirm_water',
                  routineKeywords: 'water',
                  fallbackTitle: 'Water Hydration',
                ),
              ),
              _SeniorVoiceTile(
                icon: Icons.bedtime_rounded,
                title: '😴 Amma Afternoon Rest',
                subtitle: 'Asks: "Amma, time for a gentle nap"',
                color: Colors.indigo,
                onTap: () => _checkRoutineVoice(
                  promptKey: 'nap',
                  confirmKey: 'confirm_nap',
                  routineKeywords: 'nap',
                  fallbackTitle: 'Afternoon Rest & Nap',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SeniorVoiceTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _SeniorVoiceTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        onTap: onTap,
        leading: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 28),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(fontSize: 13, color: Colors.grey[700]),
        ),
        trailing: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.volume_up_rounded, color: Colors.white, size: 20),
        ),
      ),
    );
  }
}
