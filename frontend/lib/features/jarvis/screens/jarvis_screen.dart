import 'package:flutter/material.dart';
import '../controller/jarvis_controller.dart';
import '../models/jarvis_models.dart';
import '../widgets/jarvis_orb.dart';
import '../widgets/jarvis_chat_bubble.dart';

import 'jarvis_settings_screen.dart';
import 'document_list_screen.dart';
import 'document_upload_screen.dart';

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

  final List<String> _quickSuggestions = [
    'What does my blood report say?',
    'Compare my reports',
    'Plan my day',
    'Give me my morning briefing',
    'What is next on my schedule?',
    'How did I do today?',
    'Remember that I prefer morning meetings',
  ];

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
    if (mounted) {
      setState(() {});
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _controller.removeListener(_onControllerUpdate);
    if (widget.controller == null) {
      _controller.dispose();
    }
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _handleSubmitted(String text) {
    if (text.trim().isEmpty) return;
    _textController.clear();
    _controller.submitMessage(text);
  }

  @override
  Widget build(BuildContext context) {
    final orbState = _controller.orbState;
    final messages = _controller.messages;
    final currentTranscript = _controller.currentTranscript;

    return Scaffold(
      backgroundColor: const Color(0xFF0C0D14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0C0D14),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white70, size: 20),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: orbState == JarvisOrbState.listening
                    ? const Color(0xFF00E5FF)
                    : (orbState == JarvisOrbState.thinking
                        ? const Color(0xFF7C4DFF)
                        : const Color(0xFF00E676)),
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'JARVIS AI Companion',
              style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.document_scanner_rounded, color: Color(0xFF38BDF8)),
            tooltip: 'Health Documents & Reports',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const DocumentListScreen()),
            ),
          ),
          IconButton(
            icon: Icon(
              _controller.isVoiceEnabled ? Icons.volume_up_rounded : Icons.volume_off_rounded,
              color: _controller.isVoiceEnabled ? const Color(0xFF00E5FF) : Colors.white38,
            ),
            tooltip: _controller.isVoiceEnabled ? 'Voice Responses Enabled' : 'Voice Responses Muted',
            onPressed: () => _controller.toggleVoice(!_controller.isVoiceEnabled),
          ),
          IconButton(
            icon: const Icon(Icons.analytics_outlined, color: Color(0xFF00E5FF)),
            tooltip: 'Autonomous Health Center',
            onPressed: () => Navigator.pushNamed(context, '/jarvis/health'),
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: Colors.white70),
            tooltip: 'JARVIS Settings',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const JarvisSettingsScreen()),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Top Ambient Animated Header with Orb
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                children: [
                  JarvisOrb(
                    state: orbState,
                    size: 110,
                    onTap: () {
                      if (orbState == JarvisOrbState.listening) {
                        _controller.stopListening();
                      } else {
                        _controller.startListening();
                      }
                    },
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _controller.statusMessage,
                    style: const TextStyle(
                      color: Color(0xFF82B1FF),
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (currentTranscript != null && currentTranscript.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 24),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00E5FF).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF00E5FF).withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        '🎙 "$currentTranscript"',
                        style: const TextStyle(color: Color(0xFF00E5FF), fontSize: 13, fontStyle: FontStyle.italic),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const Divider(color: Colors.white10, height: 1),

            // Middle Scrollable Chat Transcript
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: messages.length,
                itemBuilder: (context, index) {
                  final msg = messages[index];
                  return JarvisChatBubble(
                    message: msg,
                    onConfirmAction: (conf) => _controller.confirmPendingAction(conf),
                    onCancelAction: () => _controller.cancelPendingAction(),
                  );
                },
              ),
            ),

            // Quick Suggestion Chips
            Container(
              height: 38,
              margin: const EdgeInsets.symmetric(vertical: 4),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: _quickSuggestions.length,
                itemBuilder: (context, index) {
                  final suggestion = _quickSuggestions[index];
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ActionChip(
                      backgroundColor: const Color(0xFF1E1E2C),
                      side: BorderSide(color: Colors.white.withValues(alpha: 0.12)),
                      label: Text(
                        suggestion,
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      onPressed: () => _handleSubmitted(suggestion),
                    ),
                  );
                },
              ),
            ),

            // Bottom Input Dock
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: const BoxDecoration(
                color: Color(0xFF13141F),
                border: Border(top: BorderSide(color: Colors.white10)),
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.attach_file_rounded, color: Color(0xFF38BDF8)),
                    tooltip: 'Attach & Scan Health Document',
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const DocumentUploadScreen()),
                    ),
                  ),
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E1E2C),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: Colors.white12),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: TextField(
                        controller: _textController,
                        style: const TextStyle(color: Colors.white, fontSize: 15),
                        decoration: const InputDecoration(
                          hintText: 'Command JARVIS or ask anything...',
                          hintStyle: TextStyle(color: Colors.white38, fontSize: 14),
                          border: InputBorder.none,
                        ),
                        onSubmitted: _handleSubmitted,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Send Text Button
                  IconButton(
                    icon: const Icon(Icons.send_rounded, color: Color(0xFF2979FF)),
                    onPressed: () => _handleSubmitted(_textController.text),
                  ),
                  const SizedBox(width: 4),
                  // Large Voice Microphone Button with Accessible Semantic Label
                  Semantics(
                    label: 'Talk to JARVIS',
                    button: true,
                    child: GestureDetector(
                      onTap: () {
                        if (orbState == JarvisOrbState.listening) {
                          _controller.stopListening();
                        } else {
                          _controller.startListening();
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: orbState == JarvisOrbState.listening
                              ? const Color(0xFF00E5FF)
                              : const Color(0xFF2979FF),
                          boxShadow: [
                            BoxShadow(
                              color: (orbState == JarvisOrbState.listening
                                      ? const Color(0xFF00E5FF)
                                      : const Color(0xFF2979FF))
                                  .withValues(alpha: 0.4),
                              blurRadius: 10,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: Icon(
                          orbState == JarvisOrbState.listening ? Icons.mic : Icons.mic_none_rounded,
                          color: orbState == JarvisOrbState.listening ? Colors.black87 : Colors.white,
                          size: 24,
                        ),
                      ),
                    ),
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
