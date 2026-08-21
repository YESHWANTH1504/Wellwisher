import 'package:flutter/material.dart';
import '../../../services/pdf_report_service.dart';

class StatisticsScreen extends StatelessWidget {
  const StatisticsScreen({super.key});

  void _exportPdfReport(BuildContext context) async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Generating Monthly Wellness PDF Report...')),
    );

    await PdfReportService.generateAndPrintWellnessReport(
      userName: 'WellWisher User',
      completedRoutines: 42,
      totalRoutines: 51,
      hydrationTotalMl: 2250,
      screenCareBreaks: 14,
      avgSleepHours: 7.8,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    final isDark = theme.brightness == Brightness.dark;
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final completionPercentages = [0.85, 0.90, 0.75, 1.0, 0.80, 0.60, 0.70];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Routine Analytics'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf_rounded),
            tooltip: 'Export PDF Report',
            onPressed: () => _exportPdfReport(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Overall Stats Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: primaryColor.withValues(alpha: isDark ? 0.15 : 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: primaryColor.withValues(alpha: isDark ? 0.3 : 0.2)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _StatBadge(title: 'Weekly Avg', value: '82%', color: primaryColor),
                  _StatBadge(title: 'Routines Done', value: '42', color: Colors.green),
                  _StatBadge(title: 'Streak', value: '5 Days', color: Colors.orange),
                ],
              ),
            ),

            const SizedBox(height: 28),

            Text(
              'Weekly Completion',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            // Bar Chart Widget (with safe height and overflow prevention)
            Container(
              height: 215,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? Colors.white12 : Colors.grey.shade200),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: List.generate(7, (index) {
                  final pct = completionPercentages[index];
                  return Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        '${(pct * 100).toInt()}%',
                        style: TextStyle(fontSize: 10, color: isDark ? Colors.white60 : Colors.grey),
                      ),
                      const SizedBox(height: 6),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 500),
                        width: 22,
                        height: 105 * pct,
                        decoration: BoxDecoration(
                          color: index == 3 ? primaryColor : primaryColor.withValues(alpha: isDark ? 0.5 : 0.4),
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        days[index],
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: index == 3 ? FontWeight.bold : FontWeight.normal,
                          color: index == 3 ? primaryColor : (isDark ? Colors.white : Colors.black87),
                        ),
                      ),
                    ],
                  );
                }),
              ),
            ),

            const SizedBox(height: 28),

            Text(
              'Screen Care Insights',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),

            const _InsightTile(
              icon: Icons.visibility_outlined,
              title: 'Eye Rest Breaks Taken',
              value: '14 Breaks Today',
              color: Colors.blueAccent,
            ),
            const _InsightTile(
              icon: Icons.timer_outlined,
              title: 'Active Screen Time',
              value: '4h 15m (Limit: 8h)',
              color: Colors.teal,
            ),

            const SizedBox(height: 28),

            // Download PDF Wellness Report Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _exportPdfReport(context),
                icon: const Icon(Icons.picture_as_pdf_rounded, color: Colors.white),
                label: const Text(
                  'Download Monthly PDF Wellness Report',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.redAccent.shade700,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatBadge extends StatelessWidget {
  final String title;
  final String value;
  final Color color;

  const _StatBadge({required this.title, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color),
        ),
        const SizedBox(height: 4),
        Text(
          title,
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
      ],
    );
  }
}

class _InsightTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final Color color;

  const _InsightTile({
    required this.icon,
    required this.title,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: isDark ? Colors.white12 : Colors.grey.shade200),
      ),
      child: ListTile(
        leading: Icon(icon, color: color),
        title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        subtitle: Text(value, style: TextStyle(fontSize: 13, color: isDark ? Colors.white70 : Colors.grey[700])),
      ),
    );
  }
}
