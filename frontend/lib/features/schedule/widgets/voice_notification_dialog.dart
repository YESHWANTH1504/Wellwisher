import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/app_service_locator.dart';
import '../../../services/family_voice_note_service.dart';
import '../../../services/hydration_service.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/sound_service.dart';
import '../../../services/voice_assistant_service.dart';
import '../../../services/voice_notification_service.dart';
import '../controller/schedule_controller.dart';
import '../models/schedule_model.dart';

class VoiceNotificationDialog extends StatefulWidget {
  final ScheduleItem item;
  final ScheduleController? controller;

  const VoiceNotificationDialog({
    super.key,
    required this.item,
    this.controller,
  });

  @override
  State<VoiceNotificationDialog> createState() => _VoiceNotificationDialogState();
}

class _VoiceNotificationDialogState extends State<VoiceNotificationDialog>
    with SingleTickerProviderStateMixin {
  final LocalStorageService _storage = LocalStorageService();
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  bool _isSpeaking = false;
  late String _currentLang;
  late String _voiceText;

  @override
  void initState() {
    super.initState();
    _currentLang = _storage.selectedLanguage;
    _voiceText = VoiceNotificationService.getLocalizedVoiceText(widget.item, _currentLang);

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Speak automatically on popup load if enabled
    if (_storage.autoSpeakPopups) {
      _speakAlert();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _speakAlert() async {
    if (VoiceAssistantService.isSpeaking) {
      setState(() {
        _isSpeaking = true;
      });
      Timer.periodic(const Duration(milliseconds: 300), (timer) {
        if (!VoiceAssistantService.isSpeaking) {
          timer.cancel();
          if (mounted) {
            setState(() {
              _isSpeaking = false;
            });
          }
        }
      });
      return;
    }

    setState(() {
      _isSpeaking = true;
    });

    SoundService.playChime();

    // Check if Family Voice Mode is enabled and there is a family voice note for this routine
    final familyNote = FamilyVoiceNoteService().getVoiceNoteForRoutineItem(widget.item);
    if (_storage.familyVoiceModeEnabled && familyNote != null) {
      await FamilyVoiceNoteService().playFamilyVoiceNote(familyNote, _currentLang);
    } else {
      await VoiceAssistantService.speak(_voiceText, langCode: _currentLang);
    }

    if (mounted) {
      setState(() {
        _isSpeaking = false;
      });
    }
  }

  LinearGradient _getCategoryGradient(ActivityCategory category) {
    switch (category) {
      case ActivityCategory.medicine:
      case ActivityCategory.eyeCare:
        return const LinearGradient(
          colors: [Color(0xFF8E24AA), Color(0xFFD81B60)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case ActivityCategory.breakfast:
      case ActivityCategory.meal:
        return const LinearGradient(
          colors: [Color(0xFFE65100), Color(0xFFF57C00)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case ActivityCategory.waterReminder:
        return const LinearGradient(
          colors: [Color(0xFF0288D1), Color(0xFF00ACC1)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case ActivityCategory.exercise:
      case ActivityCategory.stretchBreak:
        return const LinearGradient(
          colors: [Color(0xFF2E7D32), Color(0xFF43A047)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      default:
        return const LinearGradient(
          colors: [Color(0xFF1565C0), Color(0xFF1E88E5)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final gradient = _getCategoryGradient(widget.item.category);

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      elevation: 10,
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 36, vertical: 16),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 320),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header Card with Category Colors & Pulse Speaker
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
                  decoration: BoxDecoration(
                    gradient: gradient,
                  ),
                  child: Column(
                    children: [
                      // Senior Alert Badge & Close Button
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: widget.item.requiresCompletionStatus ? Colors.amber.shade400 : Colors.white.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  widget.item.requiresCompletionStatus ? Icons.star_rounded : Icons.volume_up_rounded,
                                  color: widget.item.requiresCompletionStatus ? Colors.black87 : Colors.white,
                                  size: 12,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  widget.item.requiresCompletionStatus ? '⭐ MAIN MEAL (STATUS REQUIRED)' : 'VOICE REMINDER',
                                  style: TextStyle(
                                    color: widget.item.requiresCompletionStatus ? Colors.black87 : Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 9,
                                    letterSpacing: 0.4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            constraints: const BoxConstraints(),
                            padding: EdgeInsets.zero,
                            onPressed: () => Navigator.of(context).pop(),
                            icon: const Icon(Icons.close_rounded, color: Colors.white, size: 18),
                            tooltip: 'Dismiss',
                          ),
                        ],
                      ),

                      const SizedBox(height: 6),

                      // Pulsing Category Icon
                      ScaleTransition(
                        scale: _pulseAnimation,
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.15),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(
                            widget.item.category.icon,
                            size: 20,
                            color: widget.item.category.color,
                          ),
                        ),
                      ),

                      const SizedBox(height: 6),

                      // Time Chip
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '⏰ ${widget.item.time}',
                          style: const TextStyle(
                            color: Colors.black87,
                            fontWeight: FontWeight.w700,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Content Body
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
                  child: Column(
                    children: [
                      // Title in Clear Compact Font
                      Text(
                        widget.item.title,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                          fontSize: 15,
                        ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 6),

                      // Description text box
                      if (widget.item.description.isNotEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.outline.withValues(alpha: 0.4)),
                          ),
                          child: Text(
                            widget.item.description,
                            style: const TextStyle(
                              fontSize: 12,
                              height: 1.25,
                              color: Colors.black87,
                              fontWeight: FontWeight.w500,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      const SizedBox(height: 6),

                      // Family Voice Note Audio Clip Card
                      Builder(
                        builder: (context) {
                          final note = FamilyVoiceNoteService().getVoiceNoteForRoutineItem(widget.item);
                          final isFamilyMode = _storage.familyVoiceModeEnabled;
                          if (note == null || !isFamilyMode) return const SizedBox.shrink();
                          final spokenPreview = FamilyVoiceNoteService().getSpokenTextForLanguage(note, _currentLang);
                          return Container(
                            width: double.infinity,
                            margin: const EdgeInsets.only(bottom: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                            decoration: BoxDecoration(
                              color: Colors.pink.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.pink.shade300, width: 1.2),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 14,
                                  backgroundColor: Colors.pink.shade600,
                                  child: const Icon(Icons.mic, color: Colors.white, size: 16),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '❤️ Voice from ${note.senderName} (${note.senderRelation})',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.pink.shade900),
                                      ),
                                      Text(
                                        spokenPreview,
                                        style: TextStyle(fontSize: 10, color: Colors.grey.shade800, fontStyle: FontStyle.italic),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  constraints: const BoxConstraints(),
                                  padding: EdgeInsets.zero,
                                  icon: const Icon(Icons.play_circle_fill_rounded, color: Colors.pinkAccent, size: 24),
                                  tooltip: 'Play Family Voice Memo',
                                  onPressed: () {
                                    FamilyVoiceNoteService().playFamilyVoiceNote(note, _currentLang);
                                  },
                                ),
                              ],
                            ),
                          );
                        },
                      ),

                      const SizedBox(height: 8),

                      // Spoken Status Wave Indicator
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          color: _isSpeaking ? Colors.amber.shade50 : Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: _isSpeaking ? Colors.amber.shade300 : Colors.blue.shade200,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _isSpeaking ? Icons.record_voice_over_rounded : Icons.spatial_audio_off_rounded,
                              color: _isSpeaking ? Colors.amber.shade900 : Colors.blue.shade700,
                              size: 16,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                _isSpeaking ? '🗣️ Speaking voice alert...' : '💡 Tap buttons to complete or replay',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: _isSpeaking ? Colors.amber.shade900 : Colors.blue.shade900,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 10),

                      // Action Buttons:
                      // If Main Meal (Breakfast, Lunch, Dinner): Green (Mark Complete) & Red (Snooze 10m)
                      // If Reminder: Got it / Dismiss
                      if (widget.item.requiresCompletionStatus)
                        Row(
                          children: [
                            // 1. Green Button: Mark Complete
                            Expanded(
                              child: SizedBox(
                                height: 44,
                                child: ElevatedButton.icon(
                                  onPressed: () {
                                    Navigator.of(context, rootNavigator: true).pop();
                                    final controller = widget.controller ?? AppServiceLocator().scheduleController;
                                    final updated = widget.item.copyWith(status: ActivityStatus.completed);
                                    controller.updateRoutine(updated);
                                    VoiceNotificationService().resetAlertedItem(widget.item.id);

                                    final isHydration = widget.item.category == ActivityCategory.waterReminder ||
                                        widget.item.title.toLowerCase().contains('water') ||
                                        widget.item.title.toLowerCase().contains('hydration');

                                    if (isHydration) {
                                      final portion = HydrationService().portionMl;
                                      HydrationService().logWater(
                                        portion,
                                        playSound: true,
                                        checkGoal: true,
                                        source: 'senior_voice_dialog',
                                      );
                                      final confirmMsg = VoiceAssistantService.getTranslation(_currentLang, 'confirm_water');
                                      VoiceAssistantService.speak(confirmMsg, langCode: _currentLang);
                                    } else {
                                      SoundService.playChime();
                                      final confirmMsg = VoiceAssistantService.getTranslation(_currentLang, 'confirm_medicine');
                                      VoiceAssistantService.speak(confirmMsg, langCode: _currentLang);
                                    }
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF16A34A),
                                    foregroundColor: Colors.white,
                                    elevation: 2,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  icon: const Icon(Icons.check_circle_rounded, size: 18, color: Colors.white),
                                  label: const FittedBox(
                                    fit: BoxFit.scaleDown,
                                    child: Text(
                                      'Mark Complete ✅',
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            // 2. Red Button: Snooze (10m)
                            Expanded(
                              child: SizedBox(
                                height: 44,
                                child: ElevatedButton.icon(
                                  onPressed: () {
                                    Navigator.of(context, rootNavigator: true).pop();
                                    final controller = widget.controller ?? AppServiceLocator().scheduleController;
                                    controller.snoozeRoutineById(widget.item.id, 10);
                                    VoiceNotificationService().resetAlertedItem(widget.item.id);
                                    String snoozeMsg;
                                    switch (_currentLang) {
                                      case 'ta-IN':
                                        snoozeMsg = '10 நிமிடங்கள் ஒத்திவைக்கப்பட்டது அம்மா!';
                                        break;
                                      case 'hi-IN':
                                        snoozeMsg = '10 मिनट के लिए स्नूज़ कर दिया गया है माँ!';
                                        break;
                                      case 'te-IN':
                                        snoozeMsg = '10 నిమిషాలు వాయిదా వేయబడింది అమ్మా!';
                                        break;
                                      default:
                                        snoozeMsg = 'Snoozed for 10 minutes, Mom!';
                                    }
                                    VoiceAssistantService.speak(
                                      snoozeMsg,
                                      langCode: _currentLang,
                                    );
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFFDC2626),
                                    foregroundColor: Colors.white,
                                    elevation: 2,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  icon: const Icon(Icons.snooze_rounded, size: 18, color: Colors.white),
                                  label: const FittedBox(
                                    fit: BoxFit.scaleDown,
                                    child: Text(
                                      'Snooze (10m) ⏰',
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        )
                      else
                        Row(
                          children: [
                            Expanded(
                              child: SizedBox(
                                height: 44,
                                child: ElevatedButton.icon(
                                  onPressed: () => Navigator.of(context, rootNavigator: true).pop(),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: Colors.white,
                                    elevation: 2,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  icon: const Icon(Icons.check_rounded, size: 18, color: Colors.white),
                                  label: const FittedBox(
                                    fit: BoxFit.scaleDown,
                                    child: Text(
                                      'Got it / Dismiss 🔔',
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),

                      const SizedBox(height: 8),

                      // Secondary Row: Replay & Dismiss
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          OutlinedButton.icon(
                            onPressed: _speakAlert,
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.primary,
                              side: const BorderSide(color: AppColors.primary, width: 1.2),
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            icon: const Icon(Icons.replay_rounded, size: 14),
                            label: const Text(
                              'Replay Voice',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                            ),
                          ),
                          TextButton(
                            onPressed: () => Navigator.of(context).pop(),
                            child: const Text(
                              'Dismiss Pop-up',
                              style: TextStyle(
                                color: Colors.grey,
                                fontWeight: FontWeight.w600,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
