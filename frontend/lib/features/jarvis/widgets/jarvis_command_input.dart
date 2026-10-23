import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../models/jarvis_models.dart';
import 'jarvis_waveform.dart';

/// Premium command bar for typing or speaking instructions to JARVIS.
class JarvisCommandInput extends StatefulWidget {
  final TextEditingController controller;
  final JarvisState state;
  final ValueChanged<String> onSubmitted;
  final VoidCallback onMicTap;
  final VoidCallback? onAttachTap;
  final List<String> quickCommands;
  final ValueChanged<String>? onQuickCommandTap;

  const JarvisCommandInput({
    super.key,
    required this.controller,
    required this.state,
    required this.onSubmitted,
    required this.onMicTap,
    this.onAttachTap,
    this.quickCommands = const [
      'Plan my day',
      'Health briefing',
      'My appointments',
      'Recent reports',
      'Pending actions',
    ],
    this.onQuickCommandTap,
  });

  @override
  State<JarvisCommandInput> createState() => _JarvisCommandInputState();
}

class _JarvisCommandInputState extends State<JarvisCommandInput> {
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _hasText = widget.controller.text.trim().isNotEmpty;
    widget.controller.addListener(_onTextChanged);
  }

  void _onTextChanged() {
    final has = widget.controller.text.trim().isNotEmpty;
    if (has != _hasText) {
      setState(() {
        _hasText = has;
      });
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _submit() {
    final text = widget.controller.text.trim();
    if (text.isNotEmpty) {
      widget.controller.clear();
      widget.onSubmitted(text);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isListening = widget.state == JarvisState.listening;
    final isThinking = widget.state == JarvisState.thinking ||
        widget.state == JarvisState.retrieving ||
        widget.state == JarvisState.executing;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Quick Action Chips Carousel
        if (widget.quickCommands.isNotEmpty && !isListening) ...[
          SizedBox(
            height: 34,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: widget.quickCommands.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final cmd = widget.quickCommands[index];
                return InkWell(
                  onTap: () {
                    if (widget.onQuickCommandTap != null) {
                      widget.onQuickCommandTap!(cmd);
                    } else {
                      widget.onSubmitted(cmd);
                    }
                  },
                  borderRadius: BorderRadius.circular(18),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: JarvisColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: JarvisColors.borderSubtle,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.auto_awesome,
                          color: JarvisColors.cyan,
                          size: 13,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          cmd,
                          style: JarvisTypography.bodySmall.copyWith(
                            color: JarvisColors.textPrimary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 10),
        ],

        // Main Input Bar Container
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: JarvisColors.surfaceElevated,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: isListening
                  ? JarvisColors.cyan
                  : isThinking
                      ? JarvisColors.indigo
                      : JarvisColors.borderMedium,
              width: isListening ? 1.8 : 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: (isListening ? JarvisColors.cyan : JarvisColors.indigo)
                    .withValues(alpha: isListening ? 0.25 : 0.1),
                blurRadius: 16,
                spreadRadius: 1,
              ),
            ],
          ),
          child: Row(
            children: [
              // Attachment / Give to JARVIS button
              if (widget.onAttachTap != null && !isListening) ...[
                IconButton(
                  tooltip: 'Give document or image to JARVIS',
                  icon: const Icon(
                    Icons.add_photo_alternate_outlined,
                    color: JarvisColors.textSecondary,
                    size: 20,
                  ),
                  onPressed: widget.onAttachTap,
                ),
              ],

              // Text Field / Waveform Visualizer
              Expanded(
                child: isListening
                    ? const Padding(
                        padding: EdgeInsets.symmetric(vertical: 6),
                        child: Center(
                          child: JarvisWaveform(
                            isActive: true,
                            activeColor: JarvisColors.cyan,
                            height: 28,
                          ),
                        ),
                      )
                    : TextField(
                        controller: widget.controller,
                        style: JarvisTypography.bodyLarge,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _submit(),
                        decoration: InputDecoration(
                          hintText: 'Ask JARVIS anything...',
                          hintStyle: JarvisTypography.bodyMedium.copyWith(
                            color: JarvisColors.textTertiary,
                          ),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          filled: false,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                        ),
                      ),
              ),

              // Microphone Button
              IconButton(
                tooltip: isListening ? 'Stop listening' : 'Talk to JARVIS',
                icon: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isListening
                        ? JarvisColors.cyan
                        : JarvisColors.surfaceHighlight,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isListening ? Icons.mic : Icons.mic_none,
                    color: isListening
                        ? JarvisColors.background
                        : JarvisColors.cyan,
                    size: 20,
                  ),
                ),
                onPressed: widget.onMicTap,
              ),

              // Send Button (Visible when text entered)
              if (_hasText && !isListening) ...[
                IconButton(
                  tooltip: 'Send to JARVIS',
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                      color: JarvisColors.cyan,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.arrow_upward_rounded,
                      color: JarvisColors.background,
                      size: 20,
                    ),
                  ),
                  onPressed: _submit,
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
