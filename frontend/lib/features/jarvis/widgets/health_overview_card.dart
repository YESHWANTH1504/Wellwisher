import 'package:flutter/material.dart';
import '../models/health_intelligence_models.dart';

class HealthOverviewCard extends StatelessWidget {
  final HealthOverviewModel overview;
  final VoidCallback? onPrepareDoctorVisit;

  const HealthOverviewCard({
    super.key,
    required this.overview,
    this.onPrepareDoctorVisit,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            colors: [Colors.teal.shade900.withValues(alpha: 0.85), Colors.blueGrey.shade900],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.tealAccent.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.analytics_outlined, color: Colors.tealAccent, size: 22),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'Health Intelligence Center',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${overview.documentsCount} Reports',
                    style: const TextStyle(fontSize: 11, color: Colors.white70, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                _buildStatBadge(
                  label: 'Trends',
                  count: overview.trendsCount,
                  icon: Icons.trending_up,
                  color: Colors.cyanAccent,
                ),
                const SizedBox(width: 10),
                _buildStatBadge(
                  label: 'Alerts',
                  count: overview.activeAlertsCount,
                  icon: Icons.notifications_active_outlined,
                  color: overview.activeAlertsCount > 0 ? Colors.amberAccent : Colors.white70,
                ),
                const SizedBox(width: 10),
                _buildStatBadge(
                  label: 'Med Review',
                  count: overview.potentialConcernsCount,
                  icon: Icons.medication_outlined,
                  color: overview.potentialConcernsCount > 0 ? Colors.orangeAccent : Colors.tealAccent,
                ),
              ],
            ),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              onPressed: onPrepareDoctorVisit,
              icon: const Icon(Icons.assignment_outlined, size: 18),
              label: const Text('Generate Doctor Consultation Briefing'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.tealAccent.shade700,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatBadge({
    required String label,
    required int count,
    required IconData icon,
    required Color color,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 4),
            Text(
              count.toString(),
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color),
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 10, color: Colors.white70),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
