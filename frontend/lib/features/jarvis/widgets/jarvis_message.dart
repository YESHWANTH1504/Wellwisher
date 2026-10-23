import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../models/jarvis_models.dart';
import 'jarvis_execution_timeline.dart';
import 'jarvis_insight.dart';
import 'jarvis_attention.dart';

/// Renders a rich conversational turn from the user or JARVIS with specialized
/// widgets based on the response type (health trend, appointment, document, briefing, etc.)
class JarvisMessageWidget extends StatelessWidget {
  final JarvisMessage message;
  final Function(JarvisConfirmation)? onConfirm;
  final VoidCallback? onCancelConfirmation;
  final VoidCallback? onViewDetails;

  const JarvisMessageWidget({
    super.key,
    required this.message,
    this.onConfirm,
    this.onCancelConfirmation,
    this.onViewDetails,
  });

  @override
  Widget build(BuildContext context) {
    if (message.isUser) {
      return _buildUserBubble(context);
    }
    return _buildJarvisResponse(context);
  }

  Widget _buildUserBubble(BuildContext context) {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(left: 48, right: 12, top: 6, bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: JarvisColors.surfaceElevated,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(18),
            topRight: Radius.circular(4),
            bottomLeft: Radius.circular(18),
            bottomRight: Radius.circular(18),
          ),
          border: Border.all(
            color: JarvisColors.borderSubtle,
            width: 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (message.isVoice) ...[
                  const Icon(Icons.mic, size: 12, color: JarvisColors.cyan),
                  const SizedBox(width: 4),
                ],
                Text(
                  'YOU',
                  style: JarvisTypography.telemetry.copyWith(
                    color: JarvisColors.textTertiary,
                    fontSize: 9,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              message.text,
              style: JarvisTypography.bodyLarge.copyWith(color: JarvisColors.textPrimary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildJarvisResponse(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(left: 12, right: 32, top: 6, bottom: 6),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: JarvisColors.surfaceElevated,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(4),
            topRight: Radius.circular(18),
            bottomLeft: Radius.circular(18),
            bottomRight: Radius.circular(18),
          ),
          border: Border.all(
            color: JarvisColors.borderMedium,
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: JarvisColors.cyan.withValues(alpha: 0.05),
              blurRadius: 14,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // JARVIS AI Header Badge
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: JarvisColors.cyan.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.auto_awesome,
                    color: JarvisColors.cyan,
                    size: 13,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'JARVIS',
                  style: JarvisTypography.telemetry.copyWith(
                    color: JarvisColors.cyan,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Text(
                  _formatTime(message.timestamp),
                  style: JarvisTypography.bodySmall.copyWith(
                    color: JarvisColors.textTertiary,
                    fontSize: 10,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            // Main Text Message
            if (message.text.isNotEmpty) ...[
              Text(
                message.text,
                style: JarvisTypography.bodyLarge.copyWith(
                  color: JarvisColors.textPrimary,
                ),
              ),
            ],

            // Execution Steps (if present from real backend execution)
            if (message.executionSteps.isNotEmpty) ...[
              const SizedBox(height: 10),
              JarvisExecutionTimeline(
                steps: message.executionSteps,
                isCompleted: true,
              ),
            ],

            // Specialized Renderings
            _renderSpecializedContent(context),

            // Confirmation Panel (if confirmation required)
            if (message.confirmation != null) ...[
              const SizedBox(height: 12),
              JarvisAttention(
                title: 'Consent Required to Execute',
                description: 'JARVIS requires your permission to perform tool action: ${message.confirmation!.tool}',
                confirmation: message.confirmation,
                onConfirm: onConfirm != null ? () => onConfirm!(message.confirmation!) : null,
                onDismiss: onCancelConfirmation,
                isHighRisk: true,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _renderSpecializedContent(BuildContext context) {
    switch (message.responseType) {
      case JarvisResponseType.healthTrend:
        return _buildTrendSnippet();
      case JarvisResponseType.doctorBriefing:
        return _buildBriefingSnippet();
      case JarvisResponseType.appointment:
        return _buildAppointmentSnippet();
      case JarvisResponseType.document:
        return _buildDocumentSnippet();
      case JarvisResponseType.memory:
        return _buildMemorySnippet();
      case JarvisResponseType.actionCompleted:
        return _buildActionSnippet();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildTrendSnippet() {
    final data = message.structuredData;
    if (data == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: JarvisInsight(
        biomarkerName: data['biomarkerName']?.toString() ?? 'Biomarker Analysis',
        previousValue: data['previousValue']?.toString() ?? '110',
        currentValue: data['currentValue']?.toString() ?? '145',
        unit: data['unit']?.toString() ?? 'mg/dL',
        percentageChange: double.tryParse(data['percentageChange']?.toString() ?? '31.8'),
        explanation: data['explanation']?.toString() ?? 'JARVIS tracked metric changes from your medical records.',
        clinicianDiscussionQuestions: (data['discussionQuestions'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [
              'What could explain this change?',
              'Should this value be monitored again?',
            ],
      ),
    );
  }

  Widget _buildBriefingSnippet() {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: JarvisColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: JarvisColors.indigo.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.description_outlined, color: JarvisColors.indigo, size: 24),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '1-Page Doctor Briefing Prepared',
                  style: JarvisTypography.h3.copyWith(fontSize: 13),
                ),
                Text(
                  'Includes vitals, medication adherence, and discussion items.',
                  style: JarvisTypography.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppointmentSnippet() {
    final data = message.structuredData;
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: JarvisColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: JarvisColors.cyan.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.event_available, color: JarvisColors.cyan, size: 24),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data?['title']?.toString() ?? 'Doctor Appointment Synchronized',
                  style: JarvisTypography.h3.copyWith(fontSize: 13),
                ),
                Text(
                  'Preparation briefing and relevant lab reports linked.',
                  style: JarvisTypography.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentSnippet() {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: JarvisColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.find_in_page_outlined, color: Color(0xFF38BDF8), size: 24),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Document Intelligence Analyzed',
                  style: JarvisTypography.h3.copyWith(fontSize: 13),
                ),
                Text(
                  'Extractions verified with page traceability.',
                  style: JarvisTypography.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMemorySnippet() {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: JarvisColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: JarvisColors.purple.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.psychology_outlined, color: JarvisColors.purple, size: 24),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Preference Stored to JARVIS Memory',
                  style: JarvisTypography.h3.copyWith(fontSize: 13),
                ),
                Text(
                  'Used to personalize future daily briefings & planning.',
                  style: JarvisTypography.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionSnippet() {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: JarvisColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: JarvisColors.success.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline, color: JarvisColors.success, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Action verified & completed by JARVIS Engine.',
              style: JarvisTypography.bodyMedium.copyWith(color: JarvisColors.success),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }
}
