import 'package:flutter/material.dart';
import '../models/jarvis_models.dart';

class ConfirmationCard extends StatelessWidget {
  final JarvisConfirmation confirmation;
  final VoidCallback onConfirm;
  final VoidCallback onCancel;

  const ConfirmationCard({
    super.key,
    required this.confirmation,
    required this.onConfirm,
    required this.onCancel,
  });

  String _formatToolTitle(String tool) {
    switch (tool) {
      case 'delete_schedule':
        return 'Delete Scheduled Item';
      case 'send_family_notification':
        return 'Send Family Alert';
      case 'delete_memory':
        return 'Delete Saved Memory';
      default:
        return 'Confirm Action: $tool';
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _formatToolTitle(confirmation.tool);
    final args = confirmation.arguments;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E2C),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFFD600).withValues(alpha: 0.6), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFFD600).withValues(alpha: 0.12),
            blurRadius: 12,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: Color(0xFFFFD600), size: 24),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (args.isNotEmpty) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.black26,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: args.entries.map((e) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Text(
                      '• ${e.key}: ${e.value}',
                      style: const TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 10),
          ],
          const Text(
            '⚠️ This action requires your explicit permission to proceed.',
            style: TextStyle(color: Colors.white60, fontSize: 12, fontStyle: FontStyle.italic),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: onCancel,
                child: const Text('Cancel', style: TextStyle(color: Colors.white60)),
              ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                onPressed: onConfirm,
                icon: const Icon(Icons.check, size: 18),
                label: const Text('Confirm'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFFD600),
                  foregroundColor: Colors.black87,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
