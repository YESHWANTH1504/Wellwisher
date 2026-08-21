import 'package:flutter/material.dart';
import '../../../services/hydration_service.dart';

class HydrationTrackerWidget extends StatefulWidget {
  const HydrationTrackerWidget({super.key});

  @override
  State<HydrationTrackerWidget> createState() => _HydrationTrackerWidgetState();
}

class _HydrationTrackerWidgetState extends State<HydrationTrackerWidget> {
  final HydrationService _hydrationService = HydrationService();

  @override
  void initState() {
    super.initState();
    _hydrationService.init();
  }

  Future<void> _logWater(int amount) async {
    await _hydrationService.logWater(
      amount,
      playSound: true,
      checkGoal: true,
      source: 'dashboard_quick_log',
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Logged +${amount}ml Water! 💧 Daily Total: ${_hydrationService.dailyHydrationTotalMl}ml'),
          backgroundColor: Colors.teal.shade700,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return ListenableBuilder(
      listenable: _hydrationService,
      builder: (context, _) {
        final currentMl = _hydrationService.dailyHydrationTotalMl;
        final goalMl = _hydrationService.goalMl;
        final portionMl = _hydrationService.portionMl;
        final pct = _hydrationService.progressFraction;
        final isGoalReached = currentMl >= goalMl;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.blue.shade50,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isGoalReached
                  ? (isDark ? Colors.tealAccent : Colors.teal)
                  : (isDark ? Colors.blue.shade800 : Colors.blue.shade200),
              width: isGoalReached ? 2 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Responsive Header Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Icon(
                          isGoalReached ? Icons.check_circle_rounded : Icons.water_drop_rounded,
                          color: isGoalReached ? Colors.teal : Colors.blueAccent,
                          size: 22,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            isGoalReached ? 'Daily Hydration Goal Reached! 🎉' : 'Daily Hydration Tracker',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: isDark ? Colors.white : Colors.black87,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isGoalReached
                          ? Colors.teal.withValues(alpha: 0.2)
                          : Colors.blueAccent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${(pct * 100).toInt()}% Goal',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: isGoalReached ? (isDark ? Colors.tealAccent : Colors.teal) : Colors.blueAccent,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Liquid Progress Bar Card
              Row(
                children: [
                  // Liquid Cup Representation
                  Container(
                    width: 56,
                    height: 78,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0F172A) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isGoalReached
                            ? (isDark ? Colors.tealAccent : Colors.teal)
                            : (isDark ? Colors.blue.shade700 : Colors.blue.shade300),
                        width: 2,
                      ),
                    ),
                    child: Stack(
                      alignment: Alignment.bottomCenter,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 600),
                          curve: Curves.easeOutCubic,
                          width: double.infinity,
                          height: 74 * pct,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: isGoalReached
                                  ? [Colors.tealAccent, Colors.teal]
                                  : [Colors.lightBlueAccent, Colors.blueAccent],
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                            ),
                            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(10)),
                          ),
                        ),
                        Center(
                          child: Icon(
                            isGoalReached ? Icons.stars_rounded : Icons.opacity_rounded,
                            color: isDark ? Colors.white70 : (isGoalReached ? Colors.teal.shade900 : Colors.blueGrey),
                            size: 22,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 14),

                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${currentMl}ml / ${goalMl}ml',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isGoalReached
                              ? 'Target achieved! Extra hydration keeps you energized.'
                              : '${goalMl - currentMl > 0 ? goalMl - currentMl : 0}ml remaining (${((goalMl - currentMl) / portionMl).ceil()} portions to go).',
                          style: TextStyle(
                            color: isGoalReached ? Colors.teal : (isDark ? Colors.grey.shade400 : Colors.grey[700]),
                            fontSize: 12,
                            fontWeight: isGoalReached ? FontWeight.w600 : FontWeight.normal,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 8),

                        // Quick Log Buttons (Configured portion + standard glass)
                        Row(
                          children: [
                            Expanded(
                              flex: 5,
                              child: ElevatedButton.icon(
                                onPressed: () => _logWater(portionMl),
                                icon: const Icon(Icons.water_drop_rounded, size: 14),
                                label: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    '+${portionMl}ml (Cup)',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blueAccent,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              flex: 5,
                              child: OutlinedButton.icon(
                                onPressed: () => _logWater(250),
                                icon: const Icon(Icons.local_cafe_rounded, size: 14),
                                label: const FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    '+250ml (Glass)',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: isDark ? Colors.lightBlueAccent : Colors.blueAccent,
                                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                                  side: BorderSide(color: isDark ? Colors.lightBlueAccent : Colors.blueAccent),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
