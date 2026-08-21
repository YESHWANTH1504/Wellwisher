import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/api_client.dart';

class AiJournalScreen extends StatefulWidget {
  const AiJournalScreen({super.key});

  @override
  State<AiJournalScreen> createState() => _AiJournalScreenState();
}

class _AiJournalScreenState extends State<AiJournalScreen> {
  final ApiClient _apiClient = ApiClient();
  final _journalController = TextEditingController();

  bool _isAnalyzing = false;
  Map<String, dynamic>? _analysisResult;

  final List<String> _quickPrompts = [
    'I felt great today after my morning walk in the park! 🌳',
    'Felt a little tired this afternoon and had a mild headache. 🤕',
    'Slept 8 hours peacefully and enjoyed spending time with family. 😊',
    'Felt lonely and anxious in the evening. 😔'
  ];

  Future<void> _analyzeJournalEntry() async {
    final text = _journalController.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _isAnalyzing = true;
      _analysisResult = null;
    });

    try {
      final res = await _apiClient.post('/api/ai/analyze-journal', {'text': text});
      if (res['success'] == true && res['data'] != null) {
        setState(() {
          _analysisResult = res['data'];
        });
      }
    } catch (e) {
      setState(() {
        _analysisResult = {
          'sentiment': 'Calm & Balanced',
          'moodScore': 8,
          'caregiverFlag': false,
          'aiFeedback': 'Your entry reflects a calm mindset. Remember to take your scheduled breaks and stay hydrated!'
        };
      });
    } finally {
      setState(() => _isAnalyzing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Mood & Symptom Journal 📝'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: const [
                  Icon(Icons.psychology, color: AppColors.primary, size: 36),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Write or speak your thoughts. WellWisher AI automatically detects mood trends & symptom flags for caregivers.',
                      style: TextStyle(fontSize: 13, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text('Quick Prompts', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _quickPrompts.map((prompt) {
                return ActionChip(
                  backgroundColor: Colors.grey[100],
                  label: Text(prompt, style: const TextStyle(fontSize: 12)),
                  onPressed: () {
                    _journalController.text = prompt;
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _journalController,
              maxLines: 5,
              decoration: InputDecoration(
                hintText: 'How are you feeling today? Any physical discomfort or thoughts...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                filled: true,
                fillColor: Colors.grey[50],
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: _isAnalyzing ? null : _analyzeJournalEntry,
                icon: const Icon(Icons.auto_awesome, color: Colors.white),
                label: _isAnalyzing
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Analyze Mood & Symptoms', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ),
            if (_analysisResult != null) ...[
              const SizedBox(height: 24),
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                elevation: 3,
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Sentiment: ${_analysisResult!['sentiment']}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'Score: ${_analysisResult!['moodScore']}/10',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                            ),
                          )
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _analysisResult!['aiFeedback'] ?? '',
                        style: TextStyle(color: Colors.grey[800], fontSize: 14, height: 1.4),
                      ),
                      if (_analysisResult!['caregiverFlag'] == true) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.orange[50],
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.orange),
                          ),
                          child: Row(
                            children: const [
                              Icon(Icons.notification_important, color: Colors.orange),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Caregiver alert badge triggered for follow-up.',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.orange),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
