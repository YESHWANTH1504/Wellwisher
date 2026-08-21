import 'package:flutter/material.dart';
import '../../../core/routes/app_routes.dart';
import '../../health/widgets/hydration_tracker_widget.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = theme.colorScheme.primary;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Responsive Header Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Good Morning 👋',
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Let\'s make today healthy & productive!',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: isDark ? Colors.grey.shade400 : Colors.grey[600],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: () {
                      Navigator.pushNamed(context, AppRoutes.profile);
                    },
                    borderRadius: BorderRadius.circular(24),
                    child: CircleAvatar(
                      radius: 22,
                      backgroundColor: primaryColor.withValues(alpha: 0.15),
                      child: Icon(Icons.person, color: primaryColor),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Senior Voice Assistant Prominent Banner Card
              InkWell(
                onTap: () {
                  Navigator.pushNamed(context, AppRoutes.voiceCompanion);
                },
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Colors.orangeAccent, Colors.deepOrange],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.orangeAccent.withValues(alpha: 0.4),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.record_voice_over_rounded,
                          color: Colors.deepOrange,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              '👴 Senior Voice Assistant 🎙️',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Spoken reminders & hands-free voice confirmations for routines!',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 16),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Streak & Summary Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [primaryColor, primaryColor.withBlue(220)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: primaryColor.withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            '🔥 5 Day Streak!',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'You completed 80% of your daily routines yesterday. Keep up the momentum!',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.emoji_events_rounded,
                        color: Colors.white,
                        size: 30,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // Hydration Tracker Widget
              const HydrationTrackerWidget(),

              const SizedBox(height: 20),

              // Smart Caregiver & Health Suite
              Text(
                'Smart Health & Caregiver Suite 🌟',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _FeatureChip(
                      icon: Icons.monitor_heart,
                      label: 'Health Vitals',
                      color: Colors.redAccent,
                      onTap: () => Navigator.pushNamed(context, AppRoutes.vitals),
                    ),
                    _FeatureChip(
                      icon: Icons.qr_code_scanner,
                      label: 'Rx Pill Scanner',
                      color: Colors.teal,
                      onTap: () => Navigator.pushNamed(context, AppRoutes.ocrScanner),
                    ),
                    _FeatureChip(
                      icon: Icons.family_restroom,
                      label: 'Caregiver Hub',
                      color: Colors.purple,
                      onTap: () => Navigator.pushNamed(context, AppRoutes.caregiverHub),
                    ),
                    _FeatureChip(
                      icon: Icons.psychology,
                      label: 'Brain Games',
                      color: Colors.amber[800]!,
                      onTap: () => Navigator.pushNamed(context, AppRoutes.cognitiveGame),
                    ),
                    _FeatureChip(
                      icon: Icons.edit_note,
                      label: 'AI Journal',
                      color: Colors.blueAccent,
                      onTap: () => Navigator.pushNamed(context, AppRoutes.aiJournal),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Quick Actions Grid
              Text(
                'Quick Wellness Actions',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _QuickActionCard(
                      icon: Icons.bedtime_rounded,
                      title: 'Sleep & Mood',
                      subtitle: 'Log sleep quality',
                      color: Colors.indigo,
                      onTap: () {
                        Navigator.pushNamed(context, AppRoutes.sleepMood);
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _QuickActionCard(
                      icon: Icons.medication_rounded,
                      title: 'Medications',
                      subtitle: 'Pills & Reminders',
                      color: Colors.teal,
                      onTap: () {
                        Navigator.pushNamed(context, AppRoutes.medications);
                      },
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Today's Routine Preview Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Today\'s Highlights',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      Navigator.pushNamed(context, AppRoutes.mainShell);
                    },
                    child: const Text('View All'),
                  ),
                ],
              ),

              const SizedBox(height: 6),

              // Routine Preview Cards
              const _RoutinePreviewItem(
                title: 'Morning Water & Stretch',
                time: '08:00 AM',
                categoryIcon: Icons.fitness_center_rounded,
                categoryColor: Colors.orange,
                isCompleted: true,
              ),
              const _RoutinePreviewItem(
                title: 'Healthy Breakfast',
                time: '08:30 AM',
                categoryIcon: Icons.restaurant_rounded,
                categoryColor: Colors.green,
                isCompleted: true,
              ),
              const _RoutinePreviewItem(
                title: 'Screen Break & Rest',
                time: '11:00 AM',
                categoryIcon: Icons.screen_search_desktop_rounded,
                categoryColor: Colors.purple,
                isCompleted: false,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeatureChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _FeatureChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(right: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: isDark ? 0.2 : 0.1),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withValues(alpha: isDark ? 0.45 : 0.3)),
          ),
          child: Row(
            children: [
              Icon(icon, color: isDark ? color.withValues(alpha: 0.9) : color, size: 20),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: isDark ? Colors.white : color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: isDark ? 0.18 : 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: isDark ? 0.35 : 0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: isDark ? color.withValues(alpha: 0.9) : color, size: 26),
            const SizedBox(height: 10),
            Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: isDark ? Colors.white : Colors.black87,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 11,
                color: isDark ? Colors.grey.shade400 : Colors.grey[600],
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class _RoutinePreviewItem extends StatelessWidget {
  final String title;
  final String time;
  final IconData categoryIcon;
  final Color categoryColor;
  final bool isCompleted;

  const _RoutinePreviewItem({
    required this.title,
    required this.time,
    required this.categoryIcon,
    required this.categoryColor,
    required this.isCompleted,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      color: theme.cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: isDark ? Colors.white12 : Colors.grey.shade200),
      ),
      child: ListTile(
        dense: true,
        leading: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: categoryColor.withValues(alpha: isDark ? 0.25 : 0.15),
            shape: BoxShape.circle,
          ),
          child: Icon(categoryIcon, color: categoryColor, size: 18),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 13,
            decoration: isCompleted ? TextDecoration.lineThrough : null,
            color: isCompleted ? (isDark ? Colors.grey.shade500 : Colors.grey) : (isDark ? Colors.white : Colors.black87),
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          time,
          style: TextStyle(fontSize: 11, color: isDark ? Colors.grey.shade400 : Colors.grey[600]),
        ),
        trailing: Icon(
          isCompleted ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
          color: isCompleted ? Colors.green : (isDark ? Colors.grey.shade600 : Colors.grey),
          size: 20,
        ),
      ),
    );
  }
}
