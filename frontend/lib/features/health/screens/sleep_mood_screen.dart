import 'package:flutter/material.dart';
import '../../../services/api_client.dart';

class SleepMoodScreen extends StatefulWidget {
  const SleepMoodScreen({super.key});

  @override
  State<SleepMoodScreen> createState() => _SleepMoodScreenState();
}

class _SleepMoodScreenState extends State<SleepMoodScreen> {
  double _sleepHours = 7.5;
  String _selectedMood = 'Energetic';
  TimeOfDay _bedtime = const TimeOfDay(hour: 23, minute: 0);
  TimeOfDay _wakeTime = const TimeOfDay(hour: 6, minute: 30);
  bool _isLoading = false;

  final ApiClient _apiClient = ApiClient();
  final List<Map<String, String>> _moods = [
    {'name': 'Energetic', 'emoji': '⚡'},
    {'name': 'Happy', 'emoji': '😄'},
    {'name': 'Neutral', 'emoji': '😐'},
    {'name': 'Tired', 'emoji': '🥱'},
  ];

  Future<void> _saveLog() async {
    setState(() => _isLoading = true);

    try {
      await _apiClient.post('/sleep-mood', {
        'sleepHours': _sleepHours,
        'bedtime': _formatTimeOfDay(_bedtime),
        'wakeTime': _formatTimeOfDay(_wakeTime),
        'moodRating': _selectedMood,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sleep & Mood entry logged!'),
            backgroundColor: Colors.indigo,
          ),
        );
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatTimeOfDay(TimeOfDay time) {
    final hour = time.hourOfPeriod == 0 ? 12 : time.hourOfPeriod;
    final minute = time.minute.toString().padLeft(2, '0');
    final period = time.period == DayPeriod.am ? 'AM' : 'PM';
    return '${hour.toString().padLeft(2, '0')}:$minute $period';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sleep & Mood Tracker'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Sleep Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Colors.indigo, Colors.deepPurple],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  const Icon(Icons.bedtime_rounded, color: Colors.white, size: 48),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Sleep Quality Insight',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Restful sleep improves screen care recovery & focus.',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Sleep Duration Slider
            Text('Sleep Duration: ${_sleepHours.toStringAsFixed(1)} hours', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Slider(
              value: _sleepHours,
              min: 3.0,
              max: 12.0,
              divisions: 18,
              label: '${_sleepHours.toStringAsFixed(1)} hrs',
              activeColor: Colors.indigo,
              onChanged: (val) => setState(() => _sleepHours = val),
            ),

            const SizedBox(height: 20),

            // Bedtime & Wake Time pickers
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () async {
                      final picked = await showTimePicker(context: context, initialTime: _bedtime);
                      if (picked != null) setState(() => _bedtime = picked);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Bedtime', style: TextStyle(color: Colors.grey, fontSize: 12)),
                          const SizedBox(height: 4),
                          Text(_formatTimeOfDay(_bedtime), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: () async {
                      final picked = await showTimePicker(context: context, initialTime: _wakeTime);
                      if (picked != null) setState(() => _wakeTime = picked);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Wake Time', style: TextStyle(color: Colors.grey, fontSize: 12)),
                          const SizedBox(height: 4),
                          Text(_formatTimeOfDay(_wakeTime), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 28),

            // Mood Rating Selection
            Text('Morning Mood Rating', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: _moods.map((m) {
                final isSelected = _selectedMood == m['name'];
                return InkWell(
                  onTap: () => setState(() => _selectedMood = m['name']!),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: isSelected ? Colors.indigo.withValues(alpha: 0.15) : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: isSelected ? Colors.indigo : Colors.grey.shade300),
                    ),
                    child: Column(
                      children: [
                        Text(m['emoji']!, style: const TextStyle(fontSize: 28)),
                        const SizedBox(height: 6),
                        Text(m['name']!, style: TextStyle(fontSize: 12, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 32),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _saveLog,
                icon: const Icon(Icons.save_rounded, color: Colors.white),
                label: const Text('Save Sleep & Mood Log', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.indigo,
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
