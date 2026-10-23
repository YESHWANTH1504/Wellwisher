import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/theme/jarvis_colors.dart';
import '../../../core/theme/jarvis_theme_manager.dart';
import '../../../core/widgets/jarvis/jarvis_daily_progress_ring.dart';
import '../../../core/widgets/jarvis/jarvis_glass_card.dart';
import '../controller/jarvis_health_controller.dart';
import '../models/health_models.dart';

/// JarvisHealthDashboardScreen
/// Reference-matched futuristic Health Intelligence control surface.
///
/// Principles:
/// - Exact visual layout match to Reference Screen 3 (3-column hero, sprout banner, 2x3 metrics, action card).
/// - ZERO invented "Health Score" — center hero ring displays authentic "Daily Progress" / "Today's Activity".
/// - Genuine Health Connect data only; missing metrics show explicit contextual NO_DATA states instead of fake zeros.
/// - Strictly non-diagnostic and informational.
class JarvisHealthDashboardScreen extends StatefulWidget {
  final JarvisHealthController controller;

  const JarvisHealthDashboardScreen({
    super.key,
    required this.controller,
  });

  @override
  State<JarvisHealthDashboardScreen> createState() => _JarvisHealthDashboardScreenState();
}

class _JarvisHealthDashboardScreenState extends State<JarvisHealthDashboardScreen> {
  int _selectedTimeRangeIndex = 0;
  final List<String> _timeRanges = ['Today', 'Week', 'Month', 'Year'];

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([widget.controller, JarvisThemeManager()]),
      builder: (context, _) {
        final theme = JarvisThemeManager();
        final isDark = theme.isDarkMode;
        final summary = widget.controller.summary;
        final isLoading = widget.controller.isLoading;
        final perms = summary.permissions;
        final corePerms = Map<String, bool>.from(perms)..remove('READ_BACKGROUND');
        final hasNoPermissions = corePerms.isEmpty || corePerms.values.every((v) => v == false);

        return Scaffold(
          backgroundColor: theme.background,
          body: SafeArea(
            child: RefreshIndicator(
              color: JarvisColors.cyan,
              backgroundColor: isDark ? const Color(0xFF0D1527) : Colors.white,
              onRefresh: () => widget.controller.refreshAll(),
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                slivers: [
                  _buildHeader(context, isDark),
                  if (isLoading)
                    const SliverToBoxAdapter(
                      child: LinearProgressIndicator(
                        minHeight: 2,
                        color: JarvisColors.cyan,
                        backgroundColor: Colors.transparent,
                      ),
                    ),
                  if (hasNoPermissions)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: _buildPermissionBanner(),
                      ),
                    ),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 1. Time Range Selector (Today, Week, Month, Year)
                          _buildTimeRangeSelector(isDark),
                          const SizedBox(height: 16),

                          // 2. 3-Column Hero Activity Section
                          _buildHeroThreeColumnSection(summary, isDark),
                          const SizedBox(height: 16),

                          // 3. Sprout Motivation Banner
                          _buildSproutMotivationBanner(isDark),
                          const SizedBox(height: 20),

                          // 4. Section Title: Activity & Vitals
                          _buildSectionTitle('ACTIVITY & VITALS', isDark),
                          const SizedBox(height: 12),

                          // 5. 2x3 Metric Cards Grid
                          _buildMetricCardsGrid(summary, isDark),
                          const SizedBox(height: 16),

                          // 6. Action Card: Start a Workout
                          _buildStartWorkoutActionCard(isDark),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ==========================================
  // HEADER (Reference Design)
  // ==========================================
  Widget _buildHeader(BuildContext context, bool isDark) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
        child: Row(
          children: [
            // User Avatar with gradient border
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [JarvisColors.cyan, JarvisColors.purple],
                ),
                boxShadow: [
                  BoxShadow(
                    color: JarvisColors.cyan.withOpacity(0.3),
                    blurRadius: 8,
                  ),
                ],
              ),
              padding: const EdgeInsets.all(2),
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isDark ? const Color(0xFF0D1527) : const Color(0xFFE0F2FE),
                ),
                child: Icon(
                  Icons.person_rounded,
                  color: isDark ? Colors.white : const Color(0xFF0284C7),
                  size: 20,
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Title & Subtitle
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Health',
                    style: TextStyle(
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.3,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    'A healthier you, with Jarvis',
                    style: TextStyle(
                      color: isDark ? Colors.white54 : const Color(0xFF64748B),
                      fontSize: 11,
                      letterSpacing: 0.2,
                    ),
                  ),
                ],
              ),
            ),
            // Theme Toggle button
            IconButton(
              icon: Icon(
                isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                color: isDark ? Colors.white70 : const Color(0xFF0F172A),
                size: 20,
              ),
              tooltip: isDark ? 'Switch to White Theme' : 'Switch to Dark Theme',
              onPressed: () => JarvisThemeManager().toggleTheme(),
            ),
            // Settings Gear button
            IconButton(
              icon: Icon(
                Icons.settings_outlined,
                color: isDark ? Colors.white70 : const Color(0xFF64748B),
                size: 20,
              ),
              tooltip: 'Configure Goals',
              onPressed: _showGoalSettingsDialog,
            ),
            // Refresh button
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: JarvisColors.cyan, size: 20),
              tooltip: 'Refresh',
              onPressed: () => widget.controller.refreshAll(),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // TIME RANGE SELECTOR (Glass Pill)
  // ==========================================
  Widget _buildTimeRangeSelector(bool isDark) {
    return Container(
      height: 42,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A).withOpacity(0.8) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.08) : const Color(0xFFCBD5E1),
        ),
      ),
      child: Row(
        children: List.generate(_timeRanges.length, (index) {
          final isSelected = _selectedTimeRangeIndex == index;
          return Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() => _selectedTimeRangeIndex = index);
                if (index == 0) {
                  widget.controller.selectDate(DateTime.now());
                }
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: isSelected
                      ? const LinearGradient(
                          colors: [Color(0xFF00E5FF), Color(0xFF2979FF)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : null,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: const Color(0xFF00E5FF).withOpacity(0.35),
                            blurRadius: 10,
                            spreadRadius: -1,
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  _timeRanges[index],
                  style: TextStyle(
                    color: isSelected
                        ? Colors.black
                        : (isDark ? Colors.white60 : const Color(0xFF64748B)),
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  // ==========================================
  // 3-COLUMN HERO SECTION (Reference-Matched)
  // Left: Steps + Distance | Center: Daily Progress Ring | Right: Heart Rate + Sleep
  // ==========================================
  Widget _buildHeroThreeColumnSection(HealthDailySummary summary, bool isDark) {
    final steps = summary.steps;
    final dist = summary.distance;
    final hr = summary.heartRate;
    final sleep = summary.sleep;

    // Genuine goal progress calculation (ZERO fabricated "Health Score")
    final hasStepsData = steps.available && steps.count != null;
    final progressVal = summary.wellnessProgressPercent.toDouble();
    final hasAnyActivity = hasStepsData || (summary.calories.available && summary.calories.activeCalories != null);

    return JarvisGlassCard(
      glowColor: JarvisColors.cyan,
      borderRadius: 24,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Left Column: Steps & Distance
          Expanded(
            flex: 3,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildHeroMetricTile(
                  icon: Icons.directions_walk_rounded,
                  iconColor: const Color(0xFF00E5FF),
                  valueText: hasStepsData ? steps.count!.toLocaleString() : '--',
                  unitText: 'Steps',
                  subText: hasStepsData ? 'Goal: ${steps.goal.toLocaleString()}' : 'No steps',
                  isDark: isDark,
                ),
                const SizedBox(height: 14),
                _buildHeroMetricTile(
                  icon: Icons.location_on_outlined,
                  iconColor: const Color(0xFF14B8A6),
                  valueText: dist.available && dist.kilometers != null ? '${dist.kilometers!.toStringAsFixed(1)} km' : '--',
                  unitText: 'Distance',
                  subText: dist.available && dist.meters != null ? '${dist.meters!.toLocaleString()} m' : 'No distance',
                  isDark: isDark,
                ),
              ],
            ),
          ),

          // Center Column: Daily Progress Ring
          Expanded(
            flex: 4,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                JarvisDailyProgressRing(
                  progressPercent: hasAnyActivity ? progressVal : 0.0,
                  label: "Today's Activity",
                  statusText: progressVal >= 100 ? 'Completed' : (progressVal >= 50 ? 'Good' : 'Active'),
                  hasData: hasAnyActivity,
                ),
              ],
            ),
          ),

          // Right Column: Heart Rate & Sleep
          Expanded(
            flex: 3,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildHeroMetricTile(
                  icon: Icons.favorite_rounded,
                  iconColor: const Color(0xFFFF2A85),
                  valueText: hr.available && hr.latestBpm != null ? '${hr.latestBpm}' : '--',
                  unitText: 'BPM',
                  subText: hr.available && hr.restingBpm != null ? 'Rest: ${hr.restingBpm}' : (hr.available ? 'Latest' : 'No HR data'),
                  isDark: isDark,
                ),
                const SizedBox(height: 14),
                _buildHeroMetricTile(
                  icon: Icons.bedtime_rounded,
                  iconColor: const Color(0xFF818CF8),
                  valueText: sleep.available && sleep.formattedDuration.isNotEmpty ? sleep.formattedDuration : '--',
                  unitText: 'Sleep',
                  subText: sleep.available ? 'Target: ${sleep.targetMinutes ~/ 60}h' : 'No sleep data',
                  isDark: isDark,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroMetricTile({
    required IconData icon,
    required Color iconColor,
    required String valueText,
    required String unitText,
    required String subText,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A).withOpacity(0.6) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.06) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 14, color: iconColor),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  valueText,
                  style: TextStyle(
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            unitText,
            style: TextStyle(
              color: isDark ? Colors.white70 : const Color(0xFF475569),
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 1),
          Text(
            subText,
            style: TextStyle(
              color: isDark ? Colors.white38 : const Color(0xFF94A3B8),
              fontSize: 9,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // ==========================================
  // SPROUT MOTIVATION BANNER (Reference-Matched)
  // ==========================================
  Widget _buildSproutMotivationBanner(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [
                  const Color(0xFF064E3B).withOpacity(0.5),
                  const Color(0xFF022C22).withOpacity(0.7),
                ]
              : [
                  const Color(0xFFECFDF5),
                  const Color(0xFFD1FAE5),
                ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? const Color(0xFF10B981).withOpacity(0.35) : const Color(0xFFA7F3D0),
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF10B981).withOpacity(isDark ? 0.12 : 0.06),
            blurRadius: 16,
            spreadRadius: -2,
          ),
        ],
      ),
      child: Row(
        children: [
          // Sprout badge
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF10B981).withOpacity(isDark ? 0.2 : 0.15),
              border: Border.all(color: const Color(0xFF10B981).withOpacity(0.5)),
            ),
            child: const Icon(Icons.eco_rounded, color: Color(0xFF10B981), size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Small steps. Big results.',
                  style: TextStyle(
                    color: isDark ? Colors.white : const Color(0xFF065F46),
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  "Keep going, you're doing great!",
                  style: TextStyle(
                    color: isDark ? const Color(0xFF6EE7B7) : const Color(0xFF047857),
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right_rounded,
            color: isDark ? const Color(0xFF6EE7B7) : const Color(0xFF047857),
            size: 20,
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title, bool isDark) {
    return Text(
      title,
      style: TextStyle(
        color: isDark ? Colors.white54 : const Color(0xFF64748B),
        fontSize: 11,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.2,
      ),
    );
  }

  // ==========================================
  // 2x3 METRIC CARDS GRID (Preserves all 9 Health States)
  // Workouts, Calories, Blood Pressure, Weight, Sleep, Distance
  // ==========================================
  Widget _buildMetricCardsGrid(HealthDailySummary summary, bool isDark) {
    return Column(
      children: [
        // Row 1: Workouts & Calories
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _buildWorkoutsCard(summary.workouts, isDark)),
            const SizedBox(width: 12),
            Expanded(child: _buildCaloriesCard(summary.calories, isDark)),
          ],
        ),
        const SizedBox(height: 12),

        // Row 2: Blood Pressure & Weight
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _buildBloodPressureCard(summary.bloodPressure, isDark)),
            const SizedBox(width: 12),
            Expanded(child: _buildWeightCard(summary.weight, isDark)),
          ],
        ),
        const SizedBox(height: 12),

        // Row 3: Sleep Details & Distance Details
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _buildSleepCard(summary.sleep, isDark)),
            const SizedBox(width: 12),
            Expanded(child: _buildDistanceCard(summary.distance, isDark)),
          ],
        ),
      ],
    );
  }

  Widget _buildWorkoutsCard(List<HealthWorkout> workouts, bool isDark) {
    final hasData = workouts.isNotEmpty;
    return _buildBaseCard(
      title: 'WORKOUTS',
      icon: Icons.fitness_center_rounded,
      iconColor: const Color(0xFFEC4899),
      isDark: isDark,
      content: hasData
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${workouts.length} session${workouts.length == 1 ? '' : 's'}',
                  style: TextStyle(
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  workouts.first.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: isDark ? Colors.white54 : const Color(0xFF64748B),
                    fontSize: 11,
                  ),
                ),
              ],
            )
          : _buildUnavailablePlaceholder('No workouts logged today', isDark),
      source: 'Health Connect',
    );
  }

  Widget _buildCaloriesCard(HealthCalories cal, bool isDark) {
    final hasActive = cal.available && cal.activeCalories != null;
    final hasTotal = cal.available && cal.totalCalories != null;

    return _buildBaseCard(
      title: 'CALORIES',
      icon: Icons.local_fire_department_rounded,
      iconColor: const Color(0xFFF97316),
      isDark: isDark,
      content: (hasActive || hasTotal)
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (hasActive) ...[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        cal.activeCalories!.toLocaleString(),
                        style: TextStyle(
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Text('active kcal', style: TextStyle(color: Color(0xFFF97316), fontSize: 11)),
                    ],
                  ),
                ],
                if (hasTotal) ...[
                  const SizedBox(height: 3),
                  Text(
                    '${cal.totalCalories!.toLocaleString()} total kcal',
                    style: TextStyle(
                      color: isDark ? Colors.white54 : const Color(0xFF64748B),
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            )
          : _buildUnavailablePlaceholder('No calorie records', isDark),
      source: cal.source,
    );
  }

  Widget _buildBloodPressureCard(HealthBloodPressure bp, bool isDark) {
    final hasData = bp.available && bp.formatted.isNotEmpty;

    return _buildBaseCard(
      title: 'BLOOD PRESSURE',
      icon: Icons.speed_rounded,
      iconColor: const Color(0xFFA855F7),
      isDark: isDark,
      content: hasData
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  bp.formatted,
                  style: TextStyle(
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Systolic / Diastolic',
                  style: TextStyle(
                    color: isDark ? Colors.white54 : const Color(0xFF64748B),
                    fontSize: 11,
                  ),
                ),
              ],
            )
          : _buildUnavailablePlaceholder('No BP records', isDark),
      source: bp.source,
      freshness: bp.timestamp != null ? _formatTimeAgo(bp.timestamp!) : null,
    );
  }

  Widget _buildWeightCard(HealthWeight weight, bool isDark) {
    final hasData = weight.available && weight.weightKg != null;

    return _buildBaseCard(
      title: 'WEIGHT',
      icon: Icons.scale_rounded,
      iconColor: const Color(0xFF8B5CF6),
      isDark: isDark,
      content: hasData
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  weight.formatted,
                  style: TextStyle(
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  weight.timestamp != null ? _formatTimeAgo(weight.timestamp!) : 'Latest measurement',
                  style: TextStyle(
                    color: isDark ? Colors.white54 : const Color(0xFF64748B),
                    fontSize: 11,
                  ),
                ),
              ],
            )
          : _buildUnavailablePlaceholder('No weight recorded', isDark),
      source: weight.source,
    );
  }

  Widget _buildSleepCard(HealthSleep sleep, bool isDark) {
    final hasData = sleep.available && sleep.formattedDuration.isNotEmpty;

    return _buildBaseCard(
      title: 'SLEEP DETAILS',
      icon: Icons.bedtime_rounded,
      iconColor: const Color(0xFF6366F1),
      isDark: isDark,
      content: hasData
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  sleep.formattedDuration,
                  style: TextStyle(
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Target: ${sleep.targetMinutes ~/ 60}h (${sleep.progressPercent}%)',
                  style: TextStyle(
                    color: isDark ? Colors.white54 : const Color(0xFF64748B),
                    fontSize: 11,
                  ),
                ),
              ],
            )
          : _buildUnavailablePlaceholder('No sleep data', isDark),
      source: sleep.source,
    );
  }

  Widget _buildDistanceCard(HealthDistance dist, bool isDark) {
    final hasData = dist.available && dist.kilometers != null;

    return _buildBaseCard(
      title: 'DISTANCE DETAILS',
      icon: Icons.straighten_rounded,
      iconColor: const Color(0xFF14B8A6),
      isDark: isDark,
      content: hasData
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dist.formatted,
                  style: TextStyle(
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (dist.meters != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    '${dist.meters!.toLocaleString()} meters',
                    style: TextStyle(
                      color: isDark ? Colors.white54 : const Color(0xFF64748B),
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            )
          : _buildUnavailablePlaceholder('No distance logged', isDark),
      source: dist.source,
    );
  }

  Widget _buildBaseCard({
    required String title,
    required IconData icon,
    required Color iconColor,
    required Widget content,
    required bool isDark,
    String source = 'Health Connect',
    String? freshness,
  }) {
    return JarvisGlassCard(
      glowColor: iconColor,
      borderRadius: 18,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 15, color: iconColor),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: isDark ? Colors.white54 : const Color(0xFF64748B),
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          content,
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  source,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: isDark ? Colors.white30 : const Color(0xFF94A3B8),
                    fontSize: 9,
                  ),
                ),
              ),
              if (freshness != null)
                Text(
                  freshness,
                  style: TextStyle(
                    color: isDark ? Colors.white30 : const Color(0xFF94A3B8),
                    fontSize: 9,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildUnavailablePlaceholder(String message, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text(
        message,
        style: TextStyle(
          color: isDark ? Colors.white38 : const Color(0xFF94A3B8),
          fontSize: 12,
          fontStyle: FontStyle.italic,
        ),
      ),
    );
  }

  // ==========================================
  // ACTION CARD: Start a Workout
  // ==========================================
  Widget _buildStartWorkoutActionCard(bool isDark) {
    return GestureDetector(
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: isDark ? const Color(0xFF0F172A) : Colors.white,
            content: Row(
              children: [
                const Icon(Icons.fitness_center_rounded, color: Color(0xFF00E5FF), size: 18),
                const SizedBox(width: 8),
                Text(
                  'Say "Hey Jarvis, start a workout" or log in Health Connect',
                  style: TextStyle(
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: JarvisColors.cyan.withOpacity(0.3)),
            ),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0F1A30) : const Color(0xFFF0F9FF),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isDark ? JarvisColors.cyan.withOpacity(0.3) : const Color(0xFFBAE6FD),
          ),
          boxShadow: [
            BoxShadow(
              color: JarvisColors.cyan.withOpacity(isDark ? 0.1 : 0.05),
              blurRadius: 16,
              spreadRadius: -2,
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: JarvisColors.cyan.withOpacity(0.15),
              ),
              child: const Icon(Icons.directions_run_rounded, color: JarvisColors.cyan, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Start a Workout',
                    style: TextStyle(
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Track your activities with Jarvis',
                    style: TextStyle(
                      color: isDark ? Colors.white54 : const Color(0xFF64748B),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              color: isDark ? Colors.white54 : const Color(0xFF64748B),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // PERMISSION BANNER
  // ==========================================
  Widget _buildPermissionBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1712),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.amber.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.security_rounded, color: Colors.amber, size: 24),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Health Connect Access',
                  style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 2),
                Text(
                  'Grant permissions to read steps, heart rate, sleep, and vitals.',
                  style: TextStyle(color: Colors.white70, fontSize: 11),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () => widget.controller.requestPermissions(),
            style: TextButton.styleFrom(
              backgroundColor: Colors.amber.withOpacity(0.2),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text(
              'Connect',
              style: TextStyle(color: Colors.amber, fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  void _showGoalSettingsDialog() {
    final currentGoals = widget.controller.goals;
    final stepsController = TextEditingController(text: currentGoals.stepsGoal.toString());
    final calController = TextEditingController(text: currentGoals.activeCaloriesGoal.toString());
    final sleepController = TextEditingController(text: (currentGoals.sleepGoalMinutes ~/ 60).toString());

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: const Color(0xFF0D1527),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: AppColors.primary.withOpacity(0.3)),
          ),
          title: const Text('Wellness Goals', style: TextStyle(color: Colors.white)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildGoalTextField('Daily Steps Target', stepsController, 'steps'),
                const SizedBox(height: 12),
                _buildGoalTextField('Active Calories Target', calController, 'kcal'),
                const SizedBox(height: 12),
                _buildGoalTextField('Sleep Target (Hours)', sleepController, 'hours'),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Colors.white60)),
            ),
            ElevatedButton(
              onPressed: () {
                final steps = int.tryParse(stepsController.text) ?? currentGoals.stepsGoal;
                final cal = int.tryParse(calController.text) ?? currentGoals.activeCaloriesGoal;
                final sleepHours = int.tryParse(sleepController.text) ?? (currentGoals.sleepGoalMinutes ~/ 60);

                widget.controller.updateGoals(
                  currentGoals.copyWith(
                    stepsGoal: steps,
                    activeCaloriesGoal: cal,
                    sleepGoalMinutes: sleepHours * 60,
                  ),
                );
                Navigator.pop(ctx);
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              child: const Text('Save', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  Widget _buildGoalTextField(String label, TextEditingController ctrl, String suffix) {
    return TextField(
      controller: ctrl,
      keyboardType: TextInputType.number,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white60, fontSize: 12),
        suffixText: suffix,
        suffixStyle: const TextStyle(color: AppColors.primary, fontSize: 12),
        filled: true,
        fillColor: const Color(0xFF141F36),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      ),
    );
  }
}
