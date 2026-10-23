import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../controller/jarvis_controller.dart';
import '../core/jarvis_colors.dart';
import '../widgets/jarvis_core.dart';
import '../widgets/jarvis_calendar_sheet.dart';
import '../services/jarvis_tts_service.dart';
import 'jarvis_voice_settings_screen.dart';
import 'jarvis_memories_screen.dart';

/// JARVIS Dedicated Assistant Screen
/// Voice-first dynamic interface with reactive AI core and natural assistant cards.
class JarvisScreen extends StatefulWidget {
  final JarvisController? controller;
  final VoidCallback? onStateInvalidationRequired;

  const JarvisScreen({
    super.key,
    this.controller,
    this.onStateInvalidationRequired,
  });

  @override
  State<JarvisScreen> createState() => _JarvisScreenState();
}

class _JarvisScreenState extends State<JarvisScreen> {
  late final JarvisController _controller;
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isDisposed = false;
  bool _showKeyboard = false;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ??
        JarvisController(
          onStateInvalidationRequired: widget.onStateInvalidationRequired,
        );
    _controller.addListener(_onControllerUpdate);
  }

  void _onControllerUpdate() {
    if (mounted && !_isDisposed) {
      setState(() {});
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients && mounted) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
        );
      }
    });
  }

  @override
  void dispose() {
    _isDisposed = true;
    _controller.removeListener(_onControllerUpdate);
    if (widget.controller == null) {
      _controller.dispose();
    }
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _openCalendarSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const JarvisCalendarSheet(),
    );
  }

  void _handleSubmitted(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    _textController.clear();
    FocusScope.of(context).unfocus();
    setState(() => _showKeyboard = false);
    if (trimmed.toLowerCase().contains('show my calendar') ||
        trimmed.toLowerCase().contains('open my calendar') ||
        trimmed.toLowerCase().contains("open today's schedule") ||
        trimmed.toLowerCase().contains('show this week')) {
      _openCalendarSheet();
    }
    _controller.submitMessage(trimmed);
  }

  void _handleMicTap() {
    HapticFeedback.mediumImpact();
    if (_controller.isSpeaking) {
      _controller.interruptSpeech();
    } else if (_controller.isListening) {
      _controller.stopListening();
    } else {
      _controller.startListening();
    }
  }

  Widget _buildQuickVoiceSwitcher() {
    final isMale = _controller.currentVoiceGender == JarvisVoiceGender.male;
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              _controller.switchVoice(JarvisVoiceGender.female);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: !isMale ? const Color(0xFF00D2FF).withOpacity(0.25) : Colors.transparent,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                '♀ Female',
                style: TextStyle(
                  color: !isMale ? const Color(0xFF00D2FF) : const Color(0xFF64748B),
                  fontWeight: !isMale ? FontWeight.bold : FontWeight.normal,
                  fontSize: 12,
                ),
              ),
            ),
          ),
          GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              _controller.switchVoice(JarvisVoiceGender.male);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: isMale ? const Color(0xFF00D2FF).withOpacity(0.25) : Colors.transparent,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                '♂ Male',
                style: TextStyle(
                  color: isMale ? const Color(0xFF00D2FF) : const Color(0xFF64748B),
                  fontWeight: isMale ? FontWeight.bold : FontWeight.normal,
                  fontSize: 12,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isListening = _controller.isListening;
    final isSpeaking = _controller.isSpeaking;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B1120),
        elevation: 0,
        title: const Text(
          'JARVIS',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            letterSpacing: 2.0,
            fontSize: 18,
          ),
        ),
        actions: [
          _buildQuickVoiceSwitcher(),
          IconButton(
            icon: const Icon(Icons.calendar_month_rounded, color: Color(0xFF94A3B8)),
            tooltip: 'Personal Schedule',
            onPressed: _openCalendarSheet,
          ),
          IconButton(
            icon: const Icon(Icons.tune_rounded, color: Color(0xFF94A3B8)),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const JarvisVoiceSettingsScreen()),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Center AI Core & Conversation
            Expanded(
              child: SingleChildScrollView(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    const SizedBox(height: 16),
                    JarvisCore(
                      state: _controller.currentState,
                      size: 150,
                      showLabel: false,
                    ),
                    const SizedBox(height: 16),
                    if (_controller.messages.isEmpty)
                      _buildWelcomePrompts()
                    else
                      _buildConversationList(),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // Bottom Voice Deck
            _buildBottomDeck(isListening, isSpeaking),
          ],
        ),
      ),
    );
  }

  Widget _buildWelcomePrompts() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'How can I help you today?',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Ask questions, request jokes, manage your calendar, or set smart reminders.',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildPromptChip('Tell me a joke'),
              _buildPromptChip('What is on my calendar tomorrow?'),
              _buildPromptChip('Remind me to call Mom at 6 PM'),
              _buildPromptChip('Explain quantum computing'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPromptChip(String label) {
    return InkWell(
      onTap: () => _handleSubmitted(label),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFF334155)),
        ),
        child: Text(label, style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 12)),
      ),
    );
  }

  Widget _buildConversationList() {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _controller.messages.length,
      itemBuilder: (context, i) {
        final m = _controller.messages[i];
        final isUser = m.isUser;

        if (isUser) {
          return Align(
            alignment: Alignment.centerRight,
            child: Container(
              margin: const EdgeInsets.only(bottom: 12, left: 60),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(m.text, style: const TextStyle(color: Colors.white, fontSize: 14)),
            ),
          );
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFF00E5FF).withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.auto_awesome, color: Color(0xFF00E5FF), size: 14),
                  SizedBox(width: 6),
                  Text('JARVIS', style: TextStyle(color: Color(0xFF00E5FF), fontSize: 11, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 8),
              Text(m.text, style: const TextStyle(color: Colors.white, fontSize: 15, height: 1.4)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBottomDeck(bool isListening, bool isSpeaking) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
      decoration: const BoxDecoration(
        color: Color(0xFF0B1120),
        border: Border(top: BorderSide(color: Color(0xFF1E293B))),
      ),
      child: Column(
        children: [
          if (_showKeyboard)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: JarvisColors.border),
              ),
              child: TextField(
                controller: _textController,
                cursorColor: JarvisColors.neonCyan,
                cursorWidth: 2.0,
                cursorRadius: const Radius.circular(2),
                minLines: 1,
                maxLines: 4,
                keyboardType: TextInputType.multiline,
                textInputAction: TextInputAction.send,
                scrollPhysics: const BouncingScrollPhysics(),
                style: const TextStyle(color: Colors.white, fontSize: 14.5, height: 1.35),
                autofocus: true,
                decoration: const InputDecoration(
                  hintText: 'Ask JARVIS anything...',
                  hintStyle: TextStyle(color: Color(0xFF64748B)),
                  border: InputBorder.none,
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(vertical: 6),
                ),
                onSubmitted: _handleSubmitted,
              ),
            ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              IconButton(
                icon: Icon(_showKeyboard ? Icons.keyboard_hide : Icons.keyboard, color: const Color(0xFF94A3B8)),
                onPressed: () => setState(() => _showKeyboard = !_showKeyboard),
              ),
              GestureDetector(
                onTap: _handleMicTap,
                child: Container(
                  width: 68,
                  height: 68,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: isSpeaking
                          ? [const Color(0xFFFF5252), const Color(0xFFFF1744)]
                          : (isListening
                              ? [const Color(0xFF00E5FF), const Color(0xFF00B0FF)]
                              : [const Color(0xFF00E5FF), const Color(0xFF7C4DFF)]),
                    ),
                  ),
                  child: Icon(
                    isSpeaking ? Icons.stop : (isListening ? Icons.mic : Icons.mic_none),
                    color: Colors.black,
                    size: 32,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.psychology_outlined, color: Color(0xFF94A3B8)),
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const JarvisMemoriesScreen()),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
