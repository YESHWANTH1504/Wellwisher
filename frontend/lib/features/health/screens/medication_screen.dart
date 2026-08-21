import 'package:flutter/material.dart';
import '../../../services/api_client.dart';

class MedicationScreen extends StatefulWidget {
  const MedicationScreen({super.key});

  @override
  State<MedicationScreen> createState() => _MedicationScreenState();
}

class _MedicationScreenState extends State<MedicationScreen> {
  List<dynamic> _medications = [];
  bool _isLoading = true;
  final ApiClient _apiClient = ApiClient();

  @override
  void initState() {
    super.initState();
    _fetchMedications();
  }

  Future<void> _fetchMedications() async {
    setState(() => _isLoading = true);
    try {
      final res = await _apiClient.get('/medications');
      if (res['success'] == true && res['data'] != null) {
        setState(() {
          _medications = res['data'];
        });
      }
    } catch (_) {
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _takePill(int index, int id) async {
    setState(() {
      if (_medications[index]['remaining_pills'] > 0) {
        _medications[index]['remaining_pills'] -= 1;
      }
    });

    try {
      await _apiClient.post('/medications/$id/take', {});
    } catch (_) {}

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Took 1 dose of ${_medications[index]['name']}!'),
          backgroundColor: Colors.teal,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Medication & Supplement Reminders'),
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.teal.shade50,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.teal.shade200),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.medication_rounded, color: Colors.teal, size: 40),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'Medication Schedule',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.teal),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Track dosages and remaining pill counts.',
                                style: TextStyle(fontSize: 12, color: Colors.black87),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  const Text(
                    'Active Prescriptions',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),

                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _medications.length,
                    itemBuilder: (context, index) {
                      final med = _medications[index];
                      final remaining = med['remaining_pills'] ?? 30;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(color: Colors.grey.shade200),
                        ),
                        child: ListTile(
                          leading: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.teal.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.medication_rounded, color: Colors.teal),
                          ),
                          title: Text(
                            med['name'] ?? 'Medication',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                          subtitle: Text(
                            '${med['dosage']} at ${med['schedule_time']}\nPills left: $remaining',
                            style: TextStyle(fontSize: 12, color: remaining < 5 ? Colors.red : Colors.grey[700]),
                          ),
                          trailing: ElevatedButton.icon(
                            onPressed: remaining == 0 ? null : () => _takePill(index, med['id']),
                            icon: const Icon(Icons.check, size: 16),
                            label: const Text('Take'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.teal,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
    );
  }
}
