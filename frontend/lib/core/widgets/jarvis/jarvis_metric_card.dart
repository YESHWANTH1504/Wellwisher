import 'package:flutter/material.dart';
import '../../theme/jarvis_colors.dart';
import '../../theme/jarvis_spacing.dart';
import '../../theme/jarvis_typography.dart';
import 'jarvis_glass_card.dart';

/// The 9 health data states required by JARVIS Health Intelligence.
enum JarvisHealthDataState {
  available,
  noData,
  permissionDenied,
  unsupported,
  error,
  loading,
  synced,
  estimated,
  manual,
}

/// A high-fidelity, futuristic metric card that displays authoritative health data.
/// Strictly respects the 9 Health Data States — never displays fake zeros.
class JarvisMetricCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color accentColor;
  final JarvisHealthDataState state;
  final String? value;
  final String? unit;
  final String? provenance;
  final double? progress; // 0.0 to 1.0
  final VoidCallback? onTap;
  final VoidCallback? onActionTap;
  final String? actionLabel;

  const JarvisMetricCard({
    super.key,
    required this.title,
    required this.icon,
    required this.accentColor,
    required this.state,
    this.value,
    this.unit,
    this.provenance,
    this.progress,
    this.onTap,
    this.onActionTap,
    this.actionLabel,
  });

  @override
  Widget build(BuildContext context) {
    return JarvisGlassCard(
      onTap: onTap,
      glowColor: accentColor,
      borderRadius: JarvisSpacing.radiusCardSm,
      padding: const EdgeInsets.all(JarvisSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Header: Icon + Title + State Badge
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: accentColor.withOpacity(0.3),
                    width: 1,
                  ),
                ),
                child: Icon(icon, size: 16, color: accentColor),
              ),
              const SizedBox(width: JarvisSpacing.sm),
              Expanded(
                child: Text(
                  title,
                  style: JarvisTypography.bodySmall.copyWith(
                    color: JarvisColors.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _buildStateBadge(),
            ],
          ),

          const SizedBox(height: JarvisSpacing.md),

          // Main Content: Derived strictly by state
          _buildContent(context),

          // Optional Progress Indicator
          if (progress != null &&
              (state == JarvisHealthDataState.available ||
                  state == JarvisHealthDataState.synced ||
                  state == JarvisHealthDataState.estimated ||
                  state == JarvisHealthDataState.manual)) ...[
            const SizedBox(height: JarvisSpacing.sm),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress!.clamp(0.0, 1.0),
                backgroundColor: JarvisColors.glassBorder.withOpacity(0.3),
                valueColor: AlwaysStoppedAnimation<Color>(accentColor),
                minHeight: 4,
              ),
            ),
          ],

          const SizedBox(height: JarvisSpacing.xs),

          // Provenance / Subtitle footer
          _buildProvenanceFooter(),
        ],
      ),
    );
  }

  Widget _buildStateBadge() {
    switch (state) {
      case JarvisHealthDataState.synced:
        return _pillBadge('SYNCED', JarvisColors.neonCyan);
      case JarvisHealthDataState.estimated:
        return _pillBadge('ESTIMATED', JarvisColors.neonAmber);
      case JarvisHealthDataState.manual:
        return _pillBadge('MANUAL', JarvisColors.neonPurple);
      case JarvisHealthDataState.permissionDenied:
        return _pillBadge('LOCKED', JarvisColors.neonAmber);
      case JarvisHealthDataState.unsupported:
        return _pillBadge('N/A', JarvisColors.textMuted);
      case JarvisHealthDataState.error:
        return _pillBadge('ERROR', JarvisColors.neonRed);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _pillBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(JarvisSpacing.radiusPill),
        border: Border.all(color: color.withOpacity(0.3), width: 0.8),
      ),
      child: Text(
        text,
        style: JarvisTypography.micro.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 9,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context) {
    switch (state) {
      case JarvisHealthDataState.loading:
        return _buildLoadingSkeleton();

      case JarvisHealthDataState.noData:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'No data recorded',
              style: JarvisTypography.titleMedium.copyWith(
                color: JarvisColors.textMuted,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              'Awaiting wearable sync or entry',
              style: JarvisTypography.micro.copyWith(
                color: JarvisColors.textMuted.withOpacity(0.7),
              ),
            ),
          ],
        );

      case JarvisHealthDataState.permissionDenied:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Permission required',
              style: JarvisTypography.bodySmall.copyWith(
                color: JarvisColors.neonAmber,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            InkWell(
              onTap: onActionTap,
              borderRadius: BorderRadius.circular(4),
              child: Text(
                actionLabel ?? 'Grant Access →',
                style: JarvisTypography.caption.copyWith(
                  color: JarvisColors.neonCyan,
                  fontWeight: FontWeight.w600,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        );

      case JarvisHealthDataState.unsupported:
        return Text(
          'Unavailable on device',
          style: JarvisTypography.bodySmall.copyWith(
            color: JarvisColors.textMuted,
          ),
        );

      case JarvisHealthDataState.error:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Unable to load data',
              style: JarvisTypography.bodySmall.copyWith(
                color: JarvisColors.neonRed,
              ),
            ),
            if (onActionTap != null) ...[
              const SizedBox(height: 4),
              InkWell(
                onTap: onActionTap,
                child: Text(
                  actionLabel ?? 'Retry',
                  style: JarvisTypography.micro.copyWith(
                    color: JarvisColors.neonCyan,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ],
        );

      case JarvisHealthDataState.available:
      case JarvisHealthDataState.synced:
      case JarvisHealthDataState.estimated:
      case JarvisHealthDataState.manual:
        return Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              value ?? '--',
              style: JarvisTypography.displayLarge.copyWith(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
                color: JarvisColors.textPrimary,
              ),
            ),
            if (unit != null) ...[
              const SizedBox(width: 4),
              Text(
                unit!,
                style: JarvisTypography.bodySmall.copyWith(
                  color: JarvisColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ],
        );
    }
  }

  Widget _buildLoadingSkeleton() {
    return Container(
      height: 28,
      width: 90,
      decoration: BoxDecoration(
        color: JarvisColors.glassBorder.withOpacity(0.2),
        borderRadius: BorderRadius.circular(6),
      ),
    );
  }

  Widget _buildProvenanceFooter() {
    if (provenance == null || provenance!.isEmpty) {
      return const SizedBox.shrink();
    }
    return Text(
      provenance!,
      style: JarvisTypography.micro.copyWith(
        color: JarvisColors.textMuted,
        fontSize: 10,
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}
