import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/jarvis_colors.dart';
import '../../../core/theme/jarvis_spacing.dart';
import '../../../core/theme/jarvis_typography.dart';
import '../../../core/theme/jarvis_theme_manager.dart';
import '../../../core/widgets/jarvis/jarvis_glass_card.dart';
import '../../../core/widgets/jarvis/jarvis_soundwave_orb.dart';
import '../../../core/widgets/jarvis/jarvis_bottom_speech_bar.dart';
import '../../../services/jarvis_native_bridge.dart';
import '../controller/jarvis_home_controller.dart';
import '../models/jarvis_models.dart';
import '../widgets/confirmation_card.dart';
import '../widgets/jarvis_core.dart';
import 'jarvis_voice_settings_screen.dart';

/// True Voice-First Personal AI Assistant & Command Center Screen.
///
/// Features:
/// - Luminous obsidian dark design with neon cyan/blue/purple glow
/// - Prominent reactive dynamic AI Orb with breathing animation
/// - Push-to-talk central microphone with glowing ring
/// - 2x2 Quick Action grid connected to real services:
///   * "Create Reminder" -> Starts voice command / schedule prompt
///   * "Check Schedule" -> Switches to Schedule tab
///   * "Open WhatsApp" -> Calls real [JarvisNativeBridge.openApplication]
///   * "Health Stats" -> Switches to Health tab
/// - Live contextual subtitle card for spoken interactions & confirmations
/// - Dynamic action status card for native device actions
/// - Secondary manual mode sheet for text input & full message transcripts
class JarvisHomeScreen extends StatefulWidget {
  final JarvisHomeController? controller;
  final VoidCallback? onStateInvalidationRequired;
  final void Function(int index)? onSwitchTab;

  const JarvisHomeScreen({
    super.key,
    this.controller,
    this.onStateInvalidationRequired,
    this.onSwitchTab,
  });

  @override
  State<JarvisHomeScreen> createState() => _JarvisHomeScreenState();
}

class _JarvisHomeScreenState extends State<JarvisHomeScreen> {
  late final JarvisHomeController _controller;
  final TextEditingController _manualTextController = TextEditingController();
  final ScrollController _manualScrollController = ScrollController();
  bool _isDisposed = false;
  String? _lastActionStatus;
  bool _isActionSuccess = true;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ??
        JarvisHomeController(
          onStateInvalidationRequired: widget.onStateInvalidationRequired,
        );
    _controller.addListener(_onUpdate);
  }

  void _onUpdate() {
    if (mounted && !_isDisposed) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    _controller.removeListener(_onUpdate);
    if (widget.controller == null) {
      _controller.dispose();
    }
    _manualTextController.dispose();
    _manualScrollController.dispose();
    super.dispose();
  }

  void _handleOrbTap() {
    HapticFeedback.mediumImpact();
    if (_controller.isSpeaking) {
      _controller.interruptSpeech();
    } else if (_controller.isListening) {
      _controller.stopListening();
    } else {
      _controller.startListening();
    }
  }

  Future<void> _handleQuickActionWhatsApp() async {
    HapticFeedback.mediumImpact();
    setState(() {
      _lastActionStatus = 'Opening WhatsApp...';
      _isActionSuccess = true;
    });

    final res = await JarvisNativeBridge.openApplication(
      'com.whatsapp',
      appName: 'WhatsApp',
    );

    if (mounted) {
      final bool success = res['success'] == true;
      setState(() {
        _lastActionStatus = success
            ? 'WhatsApp launched successfully'
            : (res['message'] ?? 'Unable to launch WhatsApp');
        _isActionSuccess = success;
      });

      Future.delayed(const Duration(seconds: 4), () {
        if (mounted && _lastActionStatus != null) {
          setState(() => _lastActionStatus = null);
        }
      });
    }
  }

  void _handleQuickActionReminder() {
    HapticFeedback.mediumImpact();
    if (_controller.isListening) {
      _controller.stopListening();
    }
    _controller.submitMessage('Create a reminder for me');
  }

  void _openManualModeSheet() {
    HapticFeedback.lightImpact();
    final currentTheme = JarvisThemeManager();
    final currentIsDark = currentTheme.isDarkMode;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: currentIsDark ? JarvisColors.surface : currentTheme.surface,
      barrierColor: Colors.black.withOpacity(0.7),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (sheetContext) {
        return AnimatedBuilder(
          animation: Listenable.merge([_controller, JarvisThemeManager()]),
          builder: (context, _) {
            final theme = JarvisThemeManager();
            final isDark = theme.isDarkMode;

            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
              ),
              child: DraggableScrollableSheet(
                initialChildSize: 0.82,
                minChildSize: 0.45,
                maxChildSize: 0.95,
                expand: false,
                builder: (context, scrollController) {
                  return _buildManualModeContent(scrollController, sheetContext, isDark);
                },
              ),
            );
          },
        );
      },
    );
  }

  void _handleManualSubmit(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    _manualTextController.clear();
    _controller.submitMessage(trimmed);
  }

  @override
  Widget build(BuildContext context) {
    final state = _controller.currentState;
    final messages = _controller.messages;
    final lastMessage = messages.isNotEmpty ? messages.last : null;

    return AnimatedBuilder(
      animation: JarvisThemeManager(),
      builder: (context, _) {
        final theme = JarvisThemeManager();
        final isDark = theme.isDarkMode;

        return Scaffold(
          backgroundColor: theme.background,
          body: SafeArea(
            child: Stack(
              children: [
                // Accessibility & state-machine core representation
                SizedBox(
                  width: 0,
                  height: 0,
                  child: OverflowBox(
                    maxWidth: 0,
                    maxHeight: 0,
                    child: JarvisCore(state: state, size: 0),
                  ),
                ),

                // Ambient Radial Glow Backdrop (Dark mode only or subtle in light)
                Positioned.fill(
                  child: Center(
                    child: Container(
                      width: 360,
                      height: 360,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            _getBackdropGlowColor(state).withValues(alpha: isDark ? 0.10 : 0.05),
                            _getBackdropGlowColor(state).withValues(alpha: isDark ? 0.02 : 0.01),
                            Colors.transparent,
                          ],
                          stops: const [0.0, 0.6, 1.0],
                        ),
                      ),
                    ),
                  ),
                ),

                // Scrollable Content View
                SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: JarvisSpacing.lg),
                  child: Column(
                    children: [
                      // Top Header matching Reference: Avatar, JARVIS title, Theme Toggle, Settings
                      _buildReferenceHeader(state, isDark),

                      const SizedBox(height: 16),

                      // Central Glowing Soundwave Orb
                      Center(
                        child: JarvisSoundwaveOrb(
                          isListening: _controller.isListening,
                          isThinking: _controller.isThinking,
                          isSpeaking: _controller.isSpeaking,
                          onTap: _handleOrbTap,
                          size: 205,
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Real State-Driven Display Prompt
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 250),
                        child: Text(
                          _getReferenceStateTitle(state),
                          key: ValueKey<String>(_getReferenceStateTitle(state)),
                          textAlign: TextAlign.center,
                          style: JarvisTypography.headlineMedium.copyWith(
                            color: theme.textPrimary,
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.3,
                          ),
                        ),
                      ),

                      const SizedBox(height: 4),

                      // Subtitle
                      Text(
                        'Say "Hey Jarvis" or tap the mic',
                        textAlign: TextAlign.center,
                        style: JarvisTypography.caption.copyWith(
                          color: theme.textSecondary,
                          fontSize: 13,
                        ),
                      ),

                      const SizedBox(height: 20),

                  // Action Status Feedback (if active)
                  if (_lastActionStatus != null) ...[
                    Container(
                      margin: const EdgeInsets.only(bottom: JarvisSpacing.md),
                      padding: const EdgeInsets.symmetric(
                        horizontal: JarvisSpacing.md,
                        vertical: JarvisSpacing.sm,
                      ),
                      decoration: BoxDecoration(
                        color: (_isActionSuccess
                                ? JarvisColors.neonEmerald
                                : JarvisColors.neonRed)
                            .withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(JarvisSpacing.radiusPill),
                        border: Border.all(
                          color: _isActionSuccess
                              ? JarvisColors.neonEmerald
                              : JarvisColors.neonRed,
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _isActionSuccess
                                ? Icons.check_circle_rounded
                                : Icons.error_outline_rounded,
                            size: 16,
                            color: _isActionSuccess
                                ? JarvisColors.neonEmerald
                                : JarvisColors.neonRed,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _lastActionStatus!,
                            style: JarvisTypography.caption.copyWith(
                              color: _isActionSuccess
                                ? JarvisColors.neonEmerald
                                : JarvisColors.neonRed,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  // Contextual Subtitle & Spoken Turn Card (if confirmation required or message received)
                  if (lastMessage != null && (lastMessage.confirmation != null || _controller.isSpeaking)) ...[
                    _buildLastMessageCard(lastMessage),
                    const SizedBox(height: JarvisSpacing.md),
                  ],

                  // 2x2 Quick Action Cards matching reference
                  _buildReferenceQuickActionGrid(),

                  const SizedBox(height: 16),

                  // "You can say things like" Suggestion Card
                  _buildSuggestionsCard(),

                  const SizedBox(height: 20),

                  // Bottom Speech Bar (Keyboard, Mic with "Tap to speak", Waveform)
                  JarvisBottomSpeechBar(
                    isListening: _controller.isListening,
                    onMicTap: _handleOrbTap,
                    onKeyboardTap: _openManualModeSheet,
                    onWaveformTap: _handleOrbTap,
                  ),

                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        ),
      ),
    );
      },
    );
  }

  Widget _buildReferenceHeader(JarvisState state, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(top: 12, bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Left: User Profile Avatar
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: const Color(0x6638BDF8),
                width: 1.5,
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x3338BDF8),
                  blurRadius: 8,
                ),
              ],
            ),
            child: CircleAvatar(
              backgroundColor: isDark ? const Color(0xFF10192E) : Colors.white,
              child: const Icon(
                Icons.person_rounded,
                color: Color(0xFF38BDF8),
                size: 22,
              ),
            ),
          ),

          // Center: Title + Subtitle
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'JARVIS',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: JarvisTypography.h2.copyWith(
                    fontWeight: FontWeight.w900,
                    letterSpacing: 3.0,
                    fontSize: 18,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Your Personal AI Assistant',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: JarvisTypography.caption.copyWith(
                    color: isDark ? JarvisColors.textSecondary : const Color(0xFF475569),
                    fontSize: 11,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),

          // Right: Theme Switcher & Settings Gear Buttons
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Theme Toggle (Dark / White)
              Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () {
                    HapticFeedback.lightImpact();
                    JarvisThemeManager().toggleTheme();
                  },
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isDark ? const Color(0x660D1527) : Colors.white,
                      border: Border.all(
                        color: isDark ? const Color(0x3338BDF8) : const Color(0xFFCBD5E1),
                        width: 1.2,
                      ),
                      boxShadow: isDark ? null : [
                        const BoxShadow(
                          color: Color(0x0A000000),
                          blurRadius: 6,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(
                      isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                      color: isDark ? JarvisColors.cyan : const Color(0xFF0284C7),
                      size: 20,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Settings Gear Button
              Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () {
                    HapticFeedback.lightImpact();
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const JarvisVoiceSettingsScreen()),
                    );
                  },
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isDark ? const Color(0x660D1527) : Colors.white,
                      border: Border.all(
                        color: isDark ? const Color(0x3338BDF8) : const Color(0xFFCBD5E1),
                        width: 1.2,
                      ),
                      boxShadow: isDark ? null : [
                        const BoxShadow(
                          color: Color(0x0A000000),
                          blurRadius: 6,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(
                      Icons.settings_outlined,
                      color: isDark ? JarvisColors.textSecondary : const Color(0xFF475569),
                      size: 20,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _getReferenceStateTitle(JarvisState state) {
    if (state == JarvisState.capturing) {
      return "Capturing image...";
    } else if (state == JarvisState.analyzing) {
      return "Analyzing visual context...";
    } else if (_controller.isListening) {
      return "I'm listening...";
    } else if (_controller.isThinking) {
      return 'Thinking...';
    } else if (state == JarvisState.acting || state == JarvisState.executing) {
      return 'Working on it...';
    } else if (_controller.isSpeaking) {
      return 'Speaking...';
    } else if (state == JarvisState.completed) {
      return 'Done.';
    } else if (state == JarvisState.error) {
      return "I couldn't complete that.";
    }
    return 'How can I help?';
  }

  Widget _buildReferenceQuickActionGrid() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildActionTileCard(
                icon: Icons.camera_alt_outlined,
                iconColor: const Color(0xFF10B981),
                iconBgColor: const Color(0x2610B981),
                title: 'Look at this',
                onTap: () {
                  HapticFeedback.mediumImpact();
                  _controller.captureAndAnalyzeCamera(prompt: 'Look at this and describe what you see.');
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionTileCard(
                icon: Icons.screenshot_monitor_rounded,
                iconColor: const Color(0xFFA855F7),
                iconBgColor: const Color(0x26A855F7),
                title: 'Read my screen',
                onTap: () {
                  HapticFeedback.mediumImpact();
                  _controller.captureAndAnalyzeScreen(prompt: 'What is currently displayed on my screen?');
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionTileCard(
                icon: Icons.notifications_none_rounded,
                iconColor: const Color(0xFF00F0FF),
                iconBgColor: const Color(0x2600F0FF),
                title: 'Create a reminder',
                onTap: _handleQuickActionReminder,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionTileCard(
                icon: Icons.calendar_today_rounded,
                iconColor: const Color(0xFF38BDF8),
                iconBgColor: const Color(0x2638BDF8),
                title: 'Check my schedule',
                onTap: () => widget.onSwitchTab?.call(1),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionTileCard(
                icon: Icons.chat_bubble_outline_rounded,
                iconColor: const Color(0xFF25D366),
                iconBgColor: const Color(0x2625D366),
                title: 'Open WhatsApp',
                onTap: _handleQuickActionWhatsApp,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionTileCard(
                icon: Icons.favorite_rounded,
                iconColor: const Color(0xFFF43F5E),
                iconBgColor: const Color(0x26F43F5E),
                title: 'Show my health stats',
                onTap: () => widget.onSwitchTab?.call(2),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionTileCard({
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required String title,
    required VoidCallback onTap,
  }) {
    final isDark = JarvisThemeManager().isDarkMode;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            color: isDark ? const Color(0x990D1527) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? const Color(0x2638BDF8) : const Color(0xFFE2E8F0),
              width: 1.0,
            ),
            boxShadow: isDark
                ? null
                : [
                    const BoxShadow(
                      color: Color(0x0A000000),
                      blurRadius: 10,
                      offset: Offset(0, 3),
                    ),
                  ],
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: iconBgColor,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: JarvisTypography.bodySmall.copyWith(
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLastMessageCard(JarvisMessage message) {
    final isDark = JarvisThemeManager().isDarkMode;
    return JarvisGlassCard(
      glowColor: message.sender == 'user' ? JarvisColors.neonBlue : JarvisColors.neonCyan,
      padding: const EdgeInsets.all(JarvisSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(
                message.sender == 'user'
                    ? Icons.person_outline_rounded
                    : Icons.auto_awesome,
                size: 14,
                color: message.sender == 'user'
                    ? JarvisColors.textSecondary
                    : JarvisColors.neonCyan,
              ),
              const SizedBox(width: 6),
              Text(
                message.sender == 'user' ? 'YOU' : 'JARVIS',
                style: JarvisTypography.micro.copyWith(
                  color: message.sender == 'user'
                      ? JarvisColors.textSecondary
                      : JarvisColors.neonCyan,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.0,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          _buildMessageContent(message.text, message.sender == 'user', isDark),
          if (message.confirmation != null) ...[
            const SizedBox(height: JarvisSpacing.md),
            ConfirmationCard(
              confirmation: message.confirmation!,
              onConfirm: () => _controller.confirmAction(message.confirmation!),
              onCancel: _controller.cancelConfirmation,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSuggestionsCard() {
    final isDark = JarvisThemeManager().isDarkMode;
    final suggestions = [
      'Remind me to call Mom at 8 PM',
      "What's on my schedule today?",
      'How many steps have I taken?',
      'Play some relaxing music',
    ];

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0x990D1527) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0x2638BDF8) : const Color(0xFFE2E8F0),
          width: 1.0,
        ),
        boxShadow: isDark
            ? null
            : [
                const BoxShadow(
                  color: Color(0x0A000000),
                  blurRadius: 12,
                  offset: Offset(0, 4),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '“',
                style: TextStyle(
                  color: Color(0xFF38BDF8),
                  fontSize: 28,
                  height: 0.8,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'You can say things like:',
                  style: JarvisTypography.bodyMedium.copyWith(
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...suggestions.map(
            (suggestion) => Padding(
              padding: const EdgeInsets.only(left: 20, bottom: 8),
              child: InkWell(
                onTap: () {
                  HapticFeedback.lightImpact();
                  _controller.submitMessage(suggestion);
                },
                borderRadius: BorderRadius.circular(6),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Text(
                    '“$suggestion”',
                    style: JarvisTypography.caption.copyWith(
                      color: isDark ? Colors.white70 : const Color(0xFF475569),
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
  Widget _buildMessageContent(String text, bool isUser, bool isDark) {
    final textColor = isUser
        ? (isDark ? Colors.white : const Color(0xFF0F172A))
        : (isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A));

    // Split on double newlines to preserve authentic paragraph breaks from AI
    final paragraphs = text.split(RegExp(r'\n{2,}'));

    if (paragraphs.length <= 1) {
      return Text(
        text,
        softWrap: true,
        style: TextStyle(
          color: textColor,
          fontSize: 14,
          height: 1.45,
          letterSpacing: 0.1,
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (int i = 0; i < paragraphs.length; i++) ...[
          if (i > 0) const SizedBox(height: 8),
          Text(
            paragraphs[i].trim(),
            softWrap: true,
            style: TextStyle(
              color: textColor,
              fontSize: 14,
              height: 1.45,
              letterSpacing: 0.1,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildManualModeContent(
    ScrollController scrollController,
    BuildContext sheetContext,
    bool isDark,
  ) {
    final messages = _controller.messages;
    final theme = JarvisThemeManager();

    return Column(
      children: [
        // Sheet Handle
        Center(
          child: Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: isDark ? JarvisColors.border : const Color(0xFFCBD5E1),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),

        // Sheet Header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Icon(Icons.keyboard_rounded, color: isDark ? JarvisColors.neonCyan : const Color(0xFF0369A1), size: 18),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        'Manual Assistant Console',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Close console',
                icon: Icon(
                  Icons.close_rounded,
                  color: isDark ? JarvisColors.textSecondary : const Color(0xFF64748B),
                  size: 20,
                ),
                onPressed: () => Navigator.pop(sheetContext),
              ),
            ],
          ),
        ),

        Divider(
          color: isDark ? JarvisColors.border : const Color(0xFFE2E8F0),
          height: 1,
        ),

        // Conversation Stream
        Expanded(
          child: messages.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.forum_outlined,
                        color: isDark ? Colors.white.withOpacity(0.2) : Colors.black.withOpacity(0.2),
                        size: 48,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'No messages yet.\nType below or speak to JARVIS.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: isDark ? JarvisColors.textMuted : const Color(0xFF64748B),
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final msg = messages[index];
                    final isUser = msg.sender == 'user';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                      child: ConstrainedBox(
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * 0.82,
                        ),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: isUser
                                ? (isDark ? JarvisColors.surfaceElevated : const Color(0xFFE2E8F0))
                                : (isDark ? JarvisColors.surface : Colors.white),
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(18),
                              topRight: const Radius.circular(18),
                              bottomLeft: Radius.circular(isUser ? 18 : 4),
                              bottomRight: Radius.circular(isUser ? 4 : 18),
                            ),
                            border: Border.all(
                              color: isUser
                                  ? (isDark ? JarvisColors.border : const Color(0xFFCBD5E1))
                                  : (isDark ? JarvisColors.neonCyan.withOpacity(0.35) : const Color(0xFF0369A1).withOpacity(0.35)),
                              width: 1.0,
                            ),
                            boxShadow: [
                              if (!isUser)
                                BoxShadow(
                                  color: (isDark ? JarvisColors.neonCyan : const Color(0xFF0369A1)).withOpacity(0.06),
                                  blurRadius: 8,
                                  spreadRadius: 1,
                                ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (!isUser) ...[
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.auto_awesome, color: isDark ? JarvisColors.neonCyan : const Color(0xFF0369A1), size: 13),
                                    const SizedBox(width: 5),
                                    Text(
                                      'JARVIS',
                                      style: TextStyle(
                                        color: isDark ? JarvisColors.neonCyan : const Color(0xFF0369A1),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 1.0,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                              ],
                              _buildMessageContent(msg.text, isUser, isDark),
                              if (msg.confirmation != null) ...[
                                const SizedBox(height: 10),
                                ConfirmationCard(
                                  confirmation: msg.confirmation!,
                                  onConfirm: () => _controller.confirmAction(msg.confirmation!),
                                  onCancel: _controller.cancelConfirmation,
                                ),
                              ],
                              if (msg.executionSteps.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  children: msg.executionSteps.map((s) {
                                    final isComplete = s.status == JarvisExecutionStatus.completed;
                                    return Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: isComplete
                                            ? JarvisColors.neonEmerald.withOpacity(0.15)
                                            : JarvisColors.border,
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        s.label,
                                        style: TextStyle(
                                          color: isComplete ? JarvisColors.neonEmerald : JarvisColors.textSecondary,
                                          fontSize: 11,
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),

        // Multiline Modern Composer Bar (ChatGPT / Gemini style)
        Container(
          padding: EdgeInsets.fromLTRB(
            16,
            8,
            16,
            12 + MediaQuery.of(sheetContext).padding.bottom,
          ),
          decoration: BoxDecoration(
            color: isDark ? JarvisColors.background : theme.background,
            border: Border(
              top: BorderSide(
                color: isDark ? JarvisColors.border : const Color(0xFFE2E8F0),
              ),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Container(
                  constraints: const BoxConstraints(
                    minHeight: 44,
                    maxHeight: 120,
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDark ? JarvisColors.surfaceElevated : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isDark ? JarvisColors.border : const Color(0xFFCBD5E1),
                      width: 1.0,
                    ),
                  ),
                  child: Theme(
                    data: Theme.of(context).copyWith(
                      textSelectionTheme: TextSelectionThemeData(
                        cursorColor: isDark ? JarvisColors.neonCyan : const Color(0xFF0369A1),
                        selectionColor: (isDark ? JarvisColors.neonCyan : const Color(0xFF0369A1)).withOpacity(0.35),
                        selectionHandleColor: isDark ? JarvisColors.neonCyan : const Color(0xFF0369A1),
                      ),
                    ),
                    child: TextField(
                      key: const Key('jarvis_manual_text_field'),
                      controller: _manualTextController,
                      cursorColor: isDark ? JarvisColors.neonCyan : const Color(0xFF0369A1),
                      cursorWidth: 2.0,
                      cursorRadius: const Radius.circular(2),
                      minLines: 1,
                      maxLines: 5,
                      keyboardType: TextInputType.multiline,
                      textInputAction: TextInputAction.send,
                      scrollPhysics: const BouncingScrollPhysics(),
                      style: TextStyle(
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                        fontSize: 14.5,
                        height: 1.35,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Type a command to JARVIS...',
                        hintStyle: TextStyle(
                          color: isDark ? JarvisColors.textMuted : const Color(0xFF64748B),
                          fontSize: 13.5,
                        ),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 6),
                      ),
                      onSubmitted: (text) => _handleManualSubmit(text),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: IconButton(
                  key: const Key('jarvis_manual_send_button'),
                  tooltip: 'Send command to JARVIS',
                  icon: Icon(Icons.send_rounded, color: isDark ? JarvisColors.neonCyan : const Color(0xFF0369A1)),
                  onPressed: () => _handleManualSubmit(_manualTextController.text),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Color _getBackdropGlowColor(JarvisState state) {
    switch (state) {
      case JarvisState.sleeping:
        return JarvisColors.border;
      case JarvisState.listeningForWakeWord:
      case JarvisState.wakeWordDetected:
      case JarvisState.listening:
      case JarvisState.listeningForCommand:
        return JarvisColors.neonCyan;
      case JarvisState.thinking:
      case JarvisState.understanding:
        return JarvisColors.neonBlue;
      case JarvisState.acting:
      case JarvisState.executing:
        return JarvisColors.neonPurple;
      case JarvisState.speaking:
        return JarvisColors.neonBlue;
      case JarvisState.error:
        return JarvisColors.neonRed;
      default:
        return JarvisColors.neonCyan;
    }
  }
}
