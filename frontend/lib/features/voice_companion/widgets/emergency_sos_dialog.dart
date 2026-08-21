import 'package:flutter/material.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/sound_service.dart';
import '../../../services/voice_assistant_service.dart';

class EmergencySosDialog extends StatefulWidget {
  const EmergencySosDialog({super.key});

  static Future<void> show(BuildContext context) async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const EmergencySosDialog(),
    );
  }

  @override
  State<EmergencySosDialog> createState() => _EmergencySosDialogState();
}

class _EmergencySosDialogState extends State<EmergencySosDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _sirenController;
  late Animation<double> _sirenAnimation;
  final LocalStorageService _storage = LocalStorageService();

  @override
  void initState() {
    super.initState();
    _sirenController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    )..repeat(reverse: true);

    _sirenAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _sirenController, curve: Curves.easeInOut),
    );

    SoundService.playChime();
    final lang = _storage.selectedLanguage;
    final alertSpeech = _getReassuranceSpeech(lang);
    VoiceAssistantService.speak(alertSpeech, langCode: lang);
  }

  String _getReassuranceSpeech(String lang) {
    switch (lang) {
      case 'ta-IN':
        return 'அம்மா! பயப்படாதீங்கம்மா! உங்கள் மகன் ராகுலுக்கு தகவல் அனுப்பியாச்சு. உதவி வந்துட்டு இருக்குமா! ❤️';
      case 'hi-IN':
        return 'माँ! घबराइए मत! आपके बेटे राहुल को संदेश भेज दिया गया है। मदद आ रही है माँ! ❤️';
      case 'te-IN':
        return 'అమ్మా! భయపడకండి అమ్మా! మీ కుమారుడు రాహుల్‌కి సందేశం వెళ్ళింది. సహాయం వస్తోంది! ❤️';
      default:
        return 'Don\'t worry Mom! Alerting your son Rahul and calling emergency contacts right now! ❤️';
    }
  }

  @override
  void dispose() {
    _sirenController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Siren Emergency Red Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFFD32F2F), Color(0xFFC62828)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                children: [
                  ScaleTransition(
                    scale: _sirenAnimation,
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.warning_amber_rounded,
                        size: 48,
                        color: Color(0xFFD32F2F),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    '🚨 EMERGENCY SOS ALERT 🚨',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 20,
                      letterSpacing: 1.0,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Dispatching location to family caregivers...',
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),

            // Content Body
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const Text(
                    'Don\'t worry! Help is on the way.',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Notifying Rahul (Son) and Dr. Sharma with your live GPS location.',
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),

                  // Contact Card List
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(
                      children: [
                        const CircleAvatar(
                          backgroundColor: Colors.red,
                          child: Icon(Icons.person, color: Colors.white),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'Rahul (Son)',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                              Text('+1 (555) 019-2834 • Primary Caregiver', style: TextStyle(fontSize: 11, color: Colors.black87)),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.phone, color: Colors.green, size: 28),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('📞 Calling Rahul (Son)...')),
                            );
                          },
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Action Buttons
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('📞 Initiating Emergency Call to Rahul...')),
                        );
                        Navigator.of(context).pop();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green.shade700,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      icon: const Icon(Icons.call, size: 24),
                      label: const Text('Call Rahul Now 📞', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),

                  const SizedBox(height: 10),

                  TextButton(
                    onPressed: () {
                      VoiceAssistantService.speak('SOS alarm cancelled.', langCode: _storage.selectedLanguage);
                      Navigator.of(context).pop();
                    },
                    child: const Text('Cancel False Alarm', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
