import 'package:flutter/material.dart';
import '../models/jarvis_models.dart';
import 'confirmation_card.dart';
import 'action_card.dart';

class JarvisMessageBubble extends StatelessWidget {
  final JarvisMessage message;
  final Function(JarvisConfirmation)? onConfirmAction;
  final VoidCallback? onCancelAction;

  const JarvisMessageBubble({
    super.key,
    required this.message,
    this.onConfirmAction,
    this.onCancelAction,
  });

  @override
  Widget build(BuildContext context) {
    if (message.isUser) {
      return _buildUserBubble(context);
    } else {
      return _buildJarvisBubble(context);
    }
  }

  Widget _buildUserBubble(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(0, (1 - value) * 10),
            child: child,
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(left: 48, right: 16, top: 6, bottom: 6),
        alignment: Alignment.centerRight,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(18),
              topRight: Radius.circular(4),
              bottomLeft: Radius.circular(18),
              bottomRight: Radius.circular(18),
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF1D4ED8).withValues(alpha: 0.3),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
            border: Border.all(color: const Color(0xFF60A5FA).withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (message.isVoice) ...[
                    const Icon(Icons.mic, color: Color(0xFF93C5FD), size: 14),
                    const SizedBox(width: 4),
                  ],
                  Flexible(
                    child: Text(
                      message.text,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14.5,
                        fontWeight: FontWeight.w400,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                _formatTime(message.timestamp),
                style: const TextStyle(
                  color: Colors.white54,
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildJarvisBubble(BuildContext context) {
    final isError = message.responseType == JarvisResponseType.error;
    final isConfirmation = message.requiresConfirmation;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(0, (1 - value) * 12),
            child: child,
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(left: 14, right: 36, top: 8, bottom: 8),
        alignment: Alignment.centerLeft,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Holographic JARVIS Avatar
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isError
                      ? [const Color(0xFFFF1744), const Color(0xFFB00020)]
                      : (isConfirmation
                          ? [const Color(0xFFFFD166), const Color(0xFFFF9F1C)]
                          : (isDark
                              ? [const Color(0xFF00E5FF), const Color(0xFF3A86FF)]
                              : [const Color(0xFF0369A1), const Color(0xFF1D4ED8)])),
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: (isError
                            ? const Color(0xFFFF1744)
                            : (isConfirmation
                                ? const Color(0xFFFFD166)
                                : (isDark ? const Color(0xFF00E5FF) : const Color(0xFF0369A1))))
                        .withValues(alpha: 0.35),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Icon(
                isError
                    ? Icons.warning_amber_rounded
                    : (isConfirmation ? Icons.security_rounded : Icons.auto_awesome),
                color: isConfirmation ? Colors.black87 : Colors.white,
                size: 16,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF131728) : Colors.white,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(4),
                        topRight: Radius.circular(18),
                        bottomLeft: Radius.circular(18),
                        bottomRight: Radius.circular(18),
                      ),
                      border: Border.all(
                        color: isError
                            ? const Color(0xFFFF1744).withValues(alpha: 0.5)
                            : (isConfirmation
                                ? const Color(0xFFFFD166).withValues(alpha: 0.5)
                                : (isDark ? const Color(0xFF00E5FF).withValues(alpha: 0.25) : const Color(0xFF0369A1).withValues(alpha: 0.35))),
                        width: 1.2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: (isError
                                  ? const Color(0xFFFF1744)
                                  : (isConfirmation
                                      ? const Color(0xFFFFD166)
                                      : (isDark ? const Color(0xFF00E5FF) : const Color(0xFF0369A1))))
                              .withValues(alpha: 0.08),
                          blurRadius: 14,
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'JARVIS',
                              style: TextStyle(
                                color: isError
                                    ? const Color(0xFFFF5252)
                                    : (isConfirmation
                                        ? const Color(0xFFFFD166)
                                        : (isDark ? const Color(0xFF80D8FF) : const Color(0xFF0369A1))),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.2,
                              ),
                            ),
                            Text(
                              _formatTime(message.timestamp),
                              style: TextStyle(
                                color: isDark ? Colors.white38 : const Color(0xFF94A3B8),
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        SelectableText(
                          message.text,
                          style: TextStyle(
                            color: isError
                                ? const Color(0xFFFF8A80)
                                : (isDark ? const Color(0xFFE2E8F0) : const Color(0xFF0F172A)),
                            fontSize: 14.5,
                            height: 1.45,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Cryptographic Confirmation Card (Phase 4 Security Gate)
                  if (message.requiresConfirmation && message.confirmation != null) ...[
                    const SizedBox(height: 8),
                    ConfirmationCard(
                      confirmation: message.confirmation!,
                      onConfirm: () => onConfirmAction?.call(message.confirmation!),
                      onCancel: () => onCancelAction?.call(),
                    ),
                  ],

                  // Action Completed Card
                  if (message.action != null) ...[
                    const SizedBox(height: 8),
                    ActionCard(action: message.action!),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final min = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$min $period';
  }
}
