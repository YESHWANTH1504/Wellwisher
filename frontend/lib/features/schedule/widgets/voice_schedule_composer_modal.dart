import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../../../services/notification_service.dart';
import '../../../services/sound_service.dart';
import '../../../services/voice_assistant_service.dart';
import '../../../services/voice_schedule_parser.dart';
import '../controller/schedule_controller.dart';
import '../models/schedule_model.dart';

class VoiceScheduleComposerModal extends StatefulWidget {
  final ScheduleController controller;
  final DateTime? initialDate;

  const VoiceScheduleComposerModal({
    super.key,
    required this.controller,
    this.initialDate,
  });

  static Future<void> show(
    BuildContext context, {
    required ScheduleController controller,
    DateTime? initialDate,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => VoiceScheduleComposerModal(
        controller: controller,
        initialDate: initialDate,
      ),
    );
  }

  @override
  State<VoiceScheduleComposerModal> createState() => _VoiceScheduleComposerModalState();
}

class _VoiceScheduleComposerModalState extends State<VoiceScheduleComposerModal>
    with SingleTickerProviderStateMixin {
  late stt.SpeechToText _speech;
  bool _isListening = false;
  bool _speechEnabled = false;
  String _spokenText = '';
  String _statusMessage = 'Tap the microphone and say your reminder...';
  ParsedVoiceSchedule? _parsedSchedule;

  late AnimationController _animController;
  late Animation<double> _pulseAnimation;

  final TextEditingController _customTextController = TextEditingController();

  final List<String> _quickVoiceSuggestions = [
    'Set a reminder to go for an early morning walk at 6:00 AM',
    'Remind me to drink 500ml fresh water at 10:30 AM',
    'Schedule nutritious lunch and screen break at 1:00 PM',
    'Set a reminder for evening green tea at 4:30 PM',
    'Remind me for dinner and light walk at 8:00 PM',
  ];

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.22).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );

    _initSpeech();
  }

  @override
  void dispose() {
    _speech.stop();
    _animController.dispose();
    _customTextController.dispose();
    super.dispose();
  }

  Future<void> _initSpeech() async {
    try {
      _speechEnabled = await _speech.initialize(
        onStatus: (status) {
          if (status == 'notListening' || status == 'done') {
            if (mounted) {
              setState(() {
                _isListening = false;
              });
            }
          }
        },
        onError: (val) {
          if (mounted) {
            setState(() {
              _isListening = false;
              _statusMessage = 'Microphone ready. Tap the mic to speak or edit the text below.';
            });
          }
        },
      );
      if (_speechEnabled && mounted) {
        _startListening();
      }
    } catch (_) {
      _speechEnabled = false;
    }
  }

  void _startListening() async {
    if (!_speechEnabled) {
      _speechEnabled = await _speech.initialize();
    }

    if (_speechEnabled) {
      setState(() {
        _isListening = true;
        _statusMessage = '🎙️ Listening... Speak your schedule now (e.g. "Early morning walk at 6:00 AM")';
      });

      try {
        await _speech.listen(
          onResult: (result) {
            if (mounted) {
              setState(() {
                _spokenText = result.recognizedWords;
                _customTextController.text = _spokenText;
                if (_spokenText.isNotEmpty) {
                  _parseSpokenText(_spokenText);
                  _statusMessage = 'Transcribing voice in real-time...';
                }
              });
            }
          },
          listenOptions: stt.SpeechListenOptions(
            listenMode: stt.ListenMode.dictation,
            cancelOnError: false,
            partialResults: true,
          ),
        );
      } catch (_) {
        // Fallback for devices with restrictive speech audio
        _speech.listen(
          onResult: (result) {
            if (mounted) {
              setState(() {
                _spokenText = result.recognizedWords;
                _customTextController.text = _spokenText;
                if (_spokenText.isNotEmpty) {
                  _parseSpokenText(_spokenText);
                }
              });
            }
          },
        );
      }
    } else {
      setState(() {
        _statusMessage = 'Speak or type your reminder command below:';
      });
    }
  }

  void _stopListening() async {
    await _speech.stop();
    setState(() {
      _isListening = false;
      if (_spokenText.isEmpty) {
        _statusMessage = 'Tap the microphone or choose a quick suggestion below.';
      }
    });
  }

  void _parseSpokenText(String text) {
    final parsed = VoiceScheduleParser.parse(
      text,
      fallbackDate: widget.initialDate ?? widget.controller.selectedDate,
    );
    setState(() {
      _parsedSchedule = parsed;
    });
  }

  void _selectSuggestion(String suggestion) {
    setState(() {
      _spokenText = suggestion;
      _customTextController.text = suggestion;
      _parseSpokenText(suggestion);
      _statusMessage = 'Processed voice phrase!';
    });
  }

  Future<void> _confirmAndSchedule() async {
    final effectiveText = _customTextController.text.trim().isNotEmpty
        ? _customTextController.text.trim()
        : _spokenText.trim();

    if (_parsedSchedule == null && effectiveText.isNotEmpty) {
      _parseSpokenText(effectiveText);
    }

    if (_parsedSchedule == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please speak a reminder or select a suggestion first')),
      );
      return;
    }

    final parsed = _parsedSchedule!;
    final baseId = 'voice_routine_${DateTime.now().millisecondsSinceEpoch}';

    final newItem = ScheduleItem(
      id: baseId,
      title: parsed.title,
      description: 'Voice scheduled plan: "${parsed.rawText}"',
      time: parsed.time,
      category: parsed.category,
      status: ActivityStatus.upcoming,
      date: parsed.date,
      reminderEnabled: true,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    // 1. Save routine to state & persistence
    await widget.controller.addNewRoutine(newItem);

    // 2. Schedule exact background alarm
    await NotificationService().scheduleRoutineAlarm(newItem);

    // 3. Audio chime + voice confirmation feedback
    SoundService.playChime();
    final confirmVoiceText = 'Scheduled ${newItem.title} at ${newItem.time} for ${_formatDateShort(newItem.date)}';
    VoiceAssistantService.speak(confirmVoiceText);

    if (mounted) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✅ Scheduled "${newItem.title}" for ${newItem.time} (${_formatDateShort(newItem.date)})!'),
          backgroundColor: const Color(0xFF16A34A),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  String _formatDateShort(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = theme.colorScheme.primary;

    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Modal Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.deepPurple.shade900.withValues(alpha: 0.4) : Colors.deepPurple.shade50,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.auto_awesome_rounded, color: Colors.deepPurpleAccent, size: 20),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'AI Voice Schedule Assistant',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Pulsing Microphone Button
            GestureDetector(
              onTap: _isListening ? _stopListening : _startListening,
              child: AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _isListening ? _pulseAnimation.value : 1.0,
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: _isListening
                              ? [Colors.redAccent, Colors.deepOrange]
                              : [primaryColor, Colors.teal.shade700],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: (_isListening ? Colors.redAccent : primaryColor).withValues(alpha: 0.4),
                            blurRadius: _isListening ? 18 : 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Icon(
                        _isListening ? Icons.mic_rounded : Icons.mic_none_rounded,
                        color: Colors.white,
                        size: 38,
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 12),

            // Status message
            Text(
              _statusMessage,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: _isListening ? Colors.redAccent.shade700 : (isDark ? Colors.grey.shade400 : Colors.grey.shade700),
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 12),

            // Spoken Transcription Display Box with Direct Edit Support
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? Colors.white10 : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _isListening ? primaryColor.withValues(alpha: 0.6) : (isDark ? Colors.white24 : Colors.grey.shade300),
                  width: _isListening ? 1.8 : 1.0,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            _isListening ? Icons.graphic_eq_rounded : Icons.record_voice_over_rounded,
                            size: 15,
                            color: _isListening ? Colors.redAccent : (isDark ? Colors.grey.shade400 : Colors.grey.shade700),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            _isListening ? 'Live Voice Recording...' : 'Voice / Spoken Command:',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _isListening ? Colors.redAccent : (isDark ? Colors.grey.shade400 : Colors.grey.shade700),
                            ),
                          ),
                        ],
                      ),
                      if (_spokenText.isNotEmpty || _customTextController.text.isNotEmpty)
                        InkWell(
                          onTap: () {
                            setState(() {
                              _spokenText = '';
                              _customTextController.clear();
                              _parsedSchedule = null;
                            });
                          },
                          child: Text(
                            'Clear',
                            style: TextStyle(fontSize: 11, color: Colors.red.shade400, fontWeight: FontWeight.bold),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _customTextController,
                    maxLines: 2,
                    decoration: InputDecoration(
                      hintText: 'e.g. "Set me a reminder to go for an early morning walk at 6:00 AM"',
                      hintStyle: TextStyle(fontSize: 12.5, color: Colors.grey.shade500, fontStyle: FontStyle.italic),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: EdgeInsets.zero,
                    ),
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                    onChanged: (text) {
                      _spokenText = text;
                      if (text.trim().isNotEmpty) {
                        _parseSpokenText(text);
                      } else {
                        setState(() {
                          _parsedSchedule = null;
                        });
                      }
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Live AI Extracted Plan Card Preview
            if (_parsedSchedule != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF064E3B) : const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isDark ? const Color(0xFF059669) : const Color(0xFF86EFAC), width: 1.3),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A), size: 16),
                        const SizedBox(width: 5),
                        Text(
                          'AI Extracted Schedule Details',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isDark ? const Color(0xFF4ADE80) : const Color(0xFF16A34A),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Activity Title', style: TextStyle(fontSize: 10, color: isDark ? Colors.grey.shade400 : Colors.grey)),
                              Text(
                                _parsedSchedule!.title,
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF16A34A),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.access_time_filled_rounded, color: Colors.white, size: 13),
                              const SizedBox(width: 4),
                              Text(
                                _parsedSchedule!.time,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.calendar_today_rounded, size: 12, color: Colors.grey),
                            const SizedBox(width: 4),
                            Text(
                              'Date: ${_formatDateShort(_parsedSchedule!.date)}',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.black87),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.teal.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.teal.shade200),
                          ),
                          child: Text(
                            '📂 ${_parsedSchedule!.category.displayName}',
                            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Colors.teal.shade800),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Confirm & Schedule Button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _confirmAndSchedule,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF16A34A),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 3,
                  ),
                  icon: const Icon(Icons.check_circle_outline_rounded, size: 20),
                  label: Text(
                    'Confirm & Schedule "${_parsedSchedule!.title}" (${_parsedSchedule!.time}) ✅',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],

            const SizedBox(height: 16),

            // Quick Voice Suggestion Chips (1-Tap Test)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.tips_and_updates_rounded, size: 14, color: Colors.amber),
                    SizedBox(width: 4),
                    Text(
                      'Try saying or tap to test:',
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: _quickVoiceSuggestions.map((suggestion) {
                    return ActionChip(
                      backgroundColor: Colors.grey.shade100,
                      side: BorderSide(color: Colors.grey.shade300),
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      label: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.mic_rounded, size: 12, color: Colors.teal),
                          const SizedBox(width: 4),
                          Text(
                            suggestion,
                            style: const TextStyle(fontSize: 11, color: Colors.black87),
                          ),
                        ],
                      ),
                      onPressed: () => _selectSuggestion(suggestion),
                    );
                  }).toList(),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
