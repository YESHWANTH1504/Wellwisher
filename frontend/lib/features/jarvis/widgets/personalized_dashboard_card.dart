import 'package:flutter/material.dart';
import '../models/personalization_models.dart';

class PersonalizedDashboardCard extends StatelessWidget {
  final PersonalProfileModel profile;
  final VoidCallback? onManageMemories;

  const PersonalizedDashboardCard({
    super.key,
    required this.profile,
    this.onManageMemories,
  });

  @override
  Widget build(BuildContext context) {
    final workoutHabit = profile.habits['preferredWorkoutTime']?['value'] ?? 'Evening';
    final focusHabit = profile.habits['preferredFocusHours']?['value'] ?? 'Morning';

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF818CF8).withValues(alpha: 0.3), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF6366F1).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.psychology_outlined, color: Color(0xFF818CF8), size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Personal Intelligence Profile',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
              if (onManageMemories != null)
                TextButton(
                  onPressed: onManageMemories,
                  child: const Text('Manage', style: TextStyle(color: Color(0xFF818CF8), fontSize: 12, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildHabitChip('Workout Habit', workoutHabit, Icons.fitness_center),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildHabitChip('Focus Window', focusHabit, Icons.lightbulb_outline),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHabitChip(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: Colors.white54, size: 14),
              const SizedBox(width: 4),
              Text(label, style: const TextStyle(color: Colors.white54, fontSize: 11)),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
