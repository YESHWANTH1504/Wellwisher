import 'package:flutter/material.dart';
import '../models/jarvis_models.dart';

class JarvisStateIndicator extends StatelessWidget {
  final JarvisOrbState state;
  final String statusText;
  final VoidCallback? onRetry;

  const JarvisStateIndicator({
    super.key,
    required this.state,
    required this.statusText,
    this.onRetry,
  });

  Color _getStateColor() {
    switch (state) {
      case JarvisOrbState.capturing:
      case JarvisOrbState.listening:
      case JarvisOrbState.listeningForWakeWord:
      case JarvisOrbState.listeningForCommand:
        return const Color(0xFF00F0FF);
      case JarvisOrbState.wakeWordDetected:
        return const Color(0xFF00E5FF);
      case JarvisOrbState.analyzing:
      case JarvisOrbState.transcribing:
      case JarvisOrbState.understanding:
      case JarvisOrbState.thinking:
      case JarvisOrbState.retrieving:
        return const Color(0xFFA855F7);
      case JarvisOrbState.planning:
      case JarvisOrbState.authorizing:
      case JarvisOrbState.executing:
      case JarvisOrbState.verifying:
        return const Color(0xFF10B981);
      case JarvisOrbState.speaking:
      case JarvisOrbState.responding:
        return const Color(0xFFFF9E00);
      case JarvisOrbState.waitingForConfirmation:
      case JarvisOrbState.awaitingConfirmation:
      case JarvisOrbState.warning:
        return const Color(0xFFFFD166);
      case JarvisOrbState.recovery:
        return const Color(0xFFFB923C);
      case JarvisOrbState.error:
        return const Color(0xFFFF453A);
      case JarvisOrbState.sleeping:
        return const Color(0xFF64748B);
      case JarvisOrbState.acting:
        return const Color(0xFF10B981);
      case JarvisOrbState.waitingForFollowup:
        return const Color(0xFF00F0FF);
      case JarvisOrbState.manualMode:
        return const Color(0xFF818CF8);
      case JarvisOrbState.completed:
      case JarvisOrbState.success:
      case JarvisOrbState.idle:
        return const Color(0xFF38BDF8);
      case JarvisOrbState.interrupted:
        return const Color(0xFFF97316);
      case JarvisOrbState.reconnecting:
        return const Color(0xFFEAB308);
    }
  }

  String _getStateLabel() {
    switch (state) {
      case JarvisOrbState.sleeping:
        return 'SLEEPING';
      case JarvisOrbState.acting:
        return 'ACTING';
      case JarvisOrbState.waitingForFollowup:
        return 'FOLLOW-UP';
      case JarvisOrbState.manualMode:
        return 'MANUAL';
      case JarvisOrbState.capturing:
        return 'CAPTURING';
      case JarvisOrbState.analyzing:
        return 'ANALYZING';
      case JarvisOrbState.listening:
      case JarvisOrbState.listeningForWakeWord:
      case JarvisOrbState.listeningForCommand:
        return 'LISTENING';
      case JarvisOrbState.wakeWordDetected:
        return 'WAKE WORD';
      case JarvisOrbState.transcribing:
      case JarvisOrbState.understanding:
      case JarvisOrbState.thinking:
      case JarvisOrbState.retrieving:
        return 'PROCESSING';
      case JarvisOrbState.planning:
      case JarvisOrbState.authorizing:
      case JarvisOrbState.executing:
      case JarvisOrbState.verifying:
        return 'COMPLETING';
      case JarvisOrbState.speaking:
      case JarvisOrbState.responding:
        return 'SPEAKING';
      case JarvisOrbState.waitingForConfirmation:
      case JarvisOrbState.awaitingConfirmation:
      case JarvisOrbState.warning:
        return 'CONFIRMATION';
      case JarvisOrbState.recovery:
        return 'RECOVERY';
      case JarvisOrbState.error:
        return 'ERROR';
      case JarvisOrbState.completed:
      case JarvisOrbState.success:
        return 'SUCCESS';
      case JarvisOrbState.idle:
        return 'ONLINE';
      case JarvisOrbState.interrupted:
        return 'INTERRUPTED';
      case JarvisOrbState.reconnecting:
        return 'RECONNECTING';
    }
  }

  @override
  Widget build(BuildContext context) {
    final stateColor = _getStateColor();
    final stateLabel = _getStateLabel();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Sleek Minimal Executive Status Badge
        AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: stateColor.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: stateColor.withValues(alpha: 0.3), width: 1.0),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: stateColor,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(color: stateColor.withValues(alpha: 0.6), blurRadius: 6, spreadRadius: 1),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Text(
                stateLabel,
                style: TextStyle(
                  color: stateColor,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.1,
                ),
              ),
            ],
          ),
        ),
        if (statusText.isNotEmpty && statusText != 'Ready.') ...[
          const SizedBox(height: 4),
          Text(
            statusText,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: state == JarvisOrbState.error ? const Color(0xFFFF6B6B) : Colors.white70,
              fontSize: 12,
              fontWeight: FontWeight.w400,
            ),
          ),
        ],
        if (state == JarvisOrbState.error && onRetry != null) ...[
          const SizedBox(height: 6),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded, size: 14, color: Color(0xFFFF6B6B)),
            label: const Text('Retry Connection', style: TextStyle(color: Color(0xFFFF6B6B), fontSize: 12)),
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
              backgroundColor: const Color(0xFFFF453A).withValues(alpha: 0.12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ],
    );
  }
}
