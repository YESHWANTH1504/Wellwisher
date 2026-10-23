import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/jarvis_colors.dart';
import '../../theme/jarvis_spacing.dart';

import '../../theme/jarvis_theme_manager.dart';

class JarvisNavItem {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final Color accentColor;

  const JarvisNavItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.accentColor,
  });
}

/// Custom futuristic 4-tab bottom navigation bar for JARVIS OS.
/// Features glowing active pill highlight, micro-animations, and haptic feedback.
class JarvisBottomNavigation extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTabSelected;

  static const List<JarvisNavItem> defaultItems = [
    JarvisNavItem(
      label: 'JARVIS',
      icon: Icons.auto_awesome_outlined,
      activeIcon: Icons.auto_awesome,
      accentColor: JarvisColors.cyan,
    ),
    JarvisNavItem(
      label: 'SCHEDULE',
      icon: Icons.calendar_month_outlined,
      activeIcon: Icons.calendar_month_rounded,
      accentColor: Color(0xFF00E676),
    ),
    JarvisNavItem(
      label: 'HEALTH',
      icon: Icons.favorite_outline_rounded,
      activeIcon: Icons.favorite_rounded,
      accentColor: Color(0xFFFF2A85),
    ),
    JarvisNavItem(
      label: 'MORE',
      icon: Icons.tune_rounded,
      activeIcon: Icons.tune_rounded,
      accentColor: JarvisColors.purple,
    ),
  ];

  const JarvisBottomNavigation({
    super.key,
    required this.currentIndex,
    required this.onTabSelected,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = JarvisThemeManager().isDarkMode;
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF070B14).withOpacity(0.95) : Colors.white.withOpacity(0.98),
        border: Border(
          top: BorderSide(
            color: isDark ? const Color(0x2600F0FF) : const Color(0xFFE2E8F0),
            width: 1.0,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black.withOpacity(0.6) : const Color(0x14000000),
            blurRadius: 20,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: List.generate(defaultItems.length, (index) {
              final item = defaultItems[index];
              final isSelected = currentIndex == index;

              return Expanded(
                child: InkWell(
                  onTap: () {
                    if (currentIndex != index) {
                      HapticFeedback.selectionClick();
                      onTabSelected(index);
                    }
                  },
                  splashColor: item.accentColor.withOpacity(0.12),
                  highlightColor: Colors.transparent,
                  child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 250),
                            curve: Curves.easeOutCubic,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? item.accentColor.withOpacity(0.16)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(JarvisSpacing.radiusPill),
                              border: Border.all(
                                color: isSelected
                                    ? item.accentColor.withOpacity(0.5)
                                    : Colors.transparent,
                                width: 1.0,
                              ),
                              boxShadow: isSelected
                                  ? [
                                      BoxShadow(
                                        color: item.accentColor.withOpacity(0.35),
                                        blurRadius: 10,
                                        spreadRadius: -1,
                                      )
                                    ]
                                  : null,
                            ),
                            child: Icon(
                              isSelected ? item.activeIcon : item.icon,
                              size: 19,
                              color: isSelected
                                  ? item.accentColor
                                  : JarvisColors.textTertiary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            item.label,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                              letterSpacing: 0.8,
                              color: isSelected
                                  ? (isDark ? Colors.white : const Color(0xFF0F172A))
                                  : (isDark ? Colors.white54 : const Color(0xFF64748B)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
          ),
        ),
      ),
    );
  }
}
