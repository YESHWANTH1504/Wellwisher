import 'package:flutter/material.dart';
import '../models/workflow_models.dart';

class AppointmentActionCard extends StatelessWidget {
  final AppointmentItem appointment;
  final VoidCallback? onPrepareBriefing;
  final VoidCallback? onCompleteVisit;

  const AppointmentActionCard({
    super.key,
    required this.appointment,
    this.onPrepareBriefing,
    this.onCompleteVisit,
  });

  @override
  Widget build(BuildContext context) {
    final isCompleted = appointment.status == 'COMPLETED';
    final statusColor = isCompleted
        ? Colors.greenAccent
        : (appointment.status == 'CONFIRMED' ? Colors.cyanAccent : Colors.orangeAccent);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withAlpha(20)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.cyanAccent.withAlpha(25),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.local_hospital_outlined, color: Colors.cyanAccent, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      appointment.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (appointment.doctorName != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        'Provider: Dr. ${appointment.doctorName}',
                        style: const TextStyle(color: Colors.cyanAccent, fontSize: 12),
                      ),
                    ],
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(30),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  appointment.status,
                  style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.schedule, color: Colors.white60, size: 14),
              const SizedBox(width: 6),
              Text(
                appointment.scheduledAt.replaceAll('T', ' ').replaceAll('Z', ''),
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
              if (appointment.location != null) ...[
                const SizedBox(width: 12),
                const Icon(Icons.place, color: Colors.white60, size: 14),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    appointment.location!,
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ],
          ),
          if (appointment.notes != null && appointment.notes!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              appointment.notes!,
              style: const TextStyle(color: Colors.white60, fontSize: 12, fontStyle: FontStyle.italic),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (!isCompleted && onPrepareBriefing != null) ...[
                OutlinedButton.icon(
                  onPressed: onPrepareBriefing,
                  icon: const Icon(Icons.description_outlined, size: 14),
                  label: const Text('Prepare Briefing', style: TextStyle(fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.cyanAccent,
                    side: const BorderSide(color: Colors.cyanAccent),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              if (!isCompleted && onCompleteVisit != null) ...[
                ElevatedButton.icon(
                  onPressed: onCompleteVisit,
                  icon: const Icon(Icons.task_alt, size: 14),
                  label: const Text('Record Visit Follow-up', style: TextStyle(fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.tealAccent,
                    foregroundColor: Colors.black87,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
              if (isCompleted) ...[
                const Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.greenAccent, size: 14),
                    SizedBox(width: 4),
                    Text('Completed', style: TextStyle(color: Colors.greenAccent, fontSize: 12)),
                  ],
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
