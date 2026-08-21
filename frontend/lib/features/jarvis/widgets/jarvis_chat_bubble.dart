import 'package:flutter/material.dart';
import '../models/jarvis_models.dart';
import 'confirmation_card.dart';
import 'action_card.dart';

class JarvisChatBubble extends StatelessWidget {
  final JarvisMessage message;
  final Function(JarvisConfirmation confirmation)? onConfirmAction;
  final VoidCallback? onCancelAction;

  const JarvisChatBubble({
    super.key,
    required this.message,
    this.onConfirmAction,
    this.onCancelAction,
  });

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
      child: Column(
        crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!isUser) ...[
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Color(0xFF2979FF),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.auto_awesome, color: Colors.white, size: 12),
                ),
                const SizedBox(width: 6),
                const Text(
                  'JARVIS',
                  style: TextStyle(color: Color(0xFF82B1FF), fontWeight: FontWeight.bold, fontSize: 11),
                ),
              ],
              if (isUser && message.isVoice) ...[
                const Icon(Icons.mic, color: Color(0xFF00E5FF), size: 12),
                const SizedBox(width: 4),
              ],
            ],
          ),
          const SizedBox(height: 4),
          Container(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isUser ? const Color(0xFF2979FF) : const Color(0xFF1E1E2C),
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(isUser ? 16 : 4),
                bottomRight: Radius.circular(isUser ? 4 : 16),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.15),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Text(
              message.text,
              style: TextStyle(
                color: isUser ? Colors.white : Colors.white.withValues(alpha: 0.95),
                fontSize: 15,
                height: 1.35,
              ),
            ),
          ),
          if (message.action != null)
            ActionCard(action: message.action!),
          if (message.confirmation != null && onConfirmAction != null && onCancelAction != null)
            ConfirmationCard(
              confirmation: message.confirmation!,
              onConfirm: () => onConfirmAction!(message.confirmation!),
              onCancel: onCancelAction!,
            ),
        ],
      ),
    );
  }
}
