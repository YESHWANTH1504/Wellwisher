import 'package:flutter/material.dart';
import '../../../services/api_client.dart';
import '../../schedule/controller/schedule_controller.dart';
import '../../schedule/models/schedule_model.dart';
import '../../../services/app_service_locator.dart';

class WellWisherAiScreen extends StatefulWidget {
  final ScheduleController? scheduleController;

  const WellWisherAiScreen({super.key, this.scheduleController});

  @override
  State<WellWisherAiScreen> createState() => _WellWisherAiScreenState();
}

class _WellWisherAiScreenState extends State<WellWisherAiScreen> {
  final ApiClient _apiClient = ApiClient();
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  final List<Map<String, String>> _messages = [
    {
      'sender': 'ai',
      'text': 'Hello! I am your WellWisher AI Coach 🤖.\nHow can I help with your workplace focus, daily routine, hydration, stretches, or sleep quality today?'
    }
  ];

  bool _isGenerating = false;

  final List<String> _quickQuestions = [
    '👴 Gentle stretch routine for seniors',
    '😴 Tips for better sleep after screen work',
    '💧 How much water should I drink daily?',
    '👀 How to reduce eye strain quickly?',
    '⚡ How to beat the 3 PM workplace slump?',
    '🧘 5-Minute stress relief breathing',
  ];

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage(String text) async {
    final query = text.trim();
    if (query.isEmpty || _isGenerating) return;

    setState(() {
      _messages.add({'sender': 'user', 'text': query});
      _inputController.clear();
      _isGenerating = true;
    });
    _scrollToBottom();

    String replyText = '';

    try {
      final res = await _apiClient.post('/ai/chat', {
        'message': query,
        'langCode': 'en-US',
      });
      if (res['success'] == true && res['data'] != null && res['data']['reply'] != null) {
        final serverReply = res['data']['reply'].toString().trim();
        if (serverReply.isNotEmpty) {
          replyText = serverReply;
        }
      }
    } catch (_) {}

    // If server didn't provide a reply or was offline/error, generate intelligent on-device coaching advice
    if (replyText.isEmpty) {
      replyText = _generateLocalAiResponse(query);
    }

    if (mounted) {
      setState(() {
        _messages.add({'sender': 'ai', 'text': replyText});
        _isGenerating = false;
      });
      _scrollToBottom();
    }
  }

  String _generateLocalAiResponse(String query) {
    final lower = query.toLowerCase();

    if (lower.contains('stretch') || lower.contains('exercise') || lower.contains('posture') || lower.contains('mobility')) {
      if (lower.contains('senior') || lower.contains('elder') || lower.contains('parent') || lower.contains('mom')) {
        return "👴 **Senior Mobility & Stretch Routine**:\n"
            "1. **Gentle Neck Rolls**: 5 slow circles in each direction.\n"
            "2. **Seated Shoulder Shrugs**: 10 smooth rolls backwards to ease upper back stiffness.\n"
            "3. **Seated Ankle Rotations**: 10 circles per foot to improve leg circulation.\n"
            "4. **Seated Arm Reach**: Inhale and gently reach upward, then exhale downward.\n\n"
            "💡 *Tip: Never bounce or strain. Do these with a glass of warm water!*";
      }
      return "🏃 **Workplace Desk Stretch & Posture Reset**:\n"
          "1. **Chest Opener**: Interlace hands behind your back, pull shoulders back, and hold for 15 seconds.\n"
          "2. **Seated Spinal Twist**: Gently twist your torso to the right for 10s, then to the left.\n"
          "3. **Wrist & Forearm Flex**: Extend arm, gently pull fingers backward for 10s.\n"
          "4. **Standing Hip Stretch**: Stand up and take 20 steps to reactivate blood flow.";
    }

    if (lower.contains('sleep') || lower.contains('bed') || lower.contains('insomnia') || lower.contains('tired') || lower.contains('night')) {
      return "😴 **Sleep Hygiene & Recovery Guide**:\n"
          "• **Screen Sunset**: Turn off laptops and phones 30 minutes before sleep (blue light suppresses melatonin).\n"
          "• **Cool & Dark Room**: Keep bedroom temperature around 20-22°C (68-72°F).\n"
          "• **Herbal Tea**: Sip caffeine-free chamomile or warm milk.\n"
          "• **Consistent Schedule**: Aim for a fixed bedtime (e.g. 10:00 PM) to align your circadian rhythm.";
    }

    if (lower.contains('water') || lower.contains('hydrat') || lower.contains('drink') || lower.contains('glass')) {
      return "💧 **Optimal Daily Hydration Guide**:\n"
          "• **Daily Target**: Aim for **2,000ml to 2,500ml** (8–10 glasses) daily.\n"
          "• **Morning Kickstart**: Drink 1 warm glass (250ml) right after waking up to activate metabolism.\n"
          "• **The 30-Minute Rule**: Drink 1 small glass every 30-45 minutes while working.\n"
          "• **Benefits**: Prevents tension headaches, maintains energy, and boosts mental focus!";
    }

    if (lower.contains('eye') || lower.contains('screen') || lower.contains('strain') || lower.contains('20-20')) {
      return "👀 **20-20-20 Eye Care Protection**:\n"
          "• **Rule**: Every **20 minutes**, look at an object **20 feet (6m) away** for at least **20 seconds**.\n"
          "• **Blinking Exercise**: Consciously blink 10 times slowly to lubricate the cornea.\n"
          "• **Brightness Match**: Match your computer screen brightness to your surrounding room lighting.\n"
          "• **Distance**: Keep your monitor about an arm's length away from your eyes.";
    }

    if (lower.contains('slump') || lower.contains('energy') || lower.contains('focus') || lower.contains('fatigue') || lower.contains('afternoon')) {
      return "⚡ **Beat the 3 PM Workplace Slump**:\n"
          "1. **Hydrate**: Drink a large glass of cold water (dehydration is the #1 cause of afternoon drowsiness).\n"
          "2. **3-Minute Walk**: Step away from your desk and walk in fresh air.\n"
          "3. **Healthy Snack**: Opt for almonds, walnuts, or an apple instead of sugary candy.\n"
          "4. **Deep Breaths**: Take 5 slow, deep belly breaths to oxygenate the brain.";
    }

    if (lower.contains('stress') || lower.contains('breath') || lower.contains('anxious') || lower.contains('calm') || lower.contains('relax')) {
      return "🧘 **4-7-8 Deep Relaxation Breathing**:\n"
          "1. Inhale quietly through your nose for **4 seconds**.\n"
          "2. Hold your breath gently for **7 seconds**.\n"
          "3. Exhale completely through your mouth for **8 seconds**.\n"
          "4. Repeat 4 cycles to lower cortisol and instantly relax your nervous system.";
    }

    if (lower.contains('medicat') || lower.contains('pill') || lower.contains('medicine') || lower.contains('doctor')) {
      return "💊 **Medication & Daily Wellness Advice**:\n"
          "• Always take prescribed medications with a full glass of water.\n"
          "• Enable schedule reminder pop-ups in your WellWisher app so you never miss a dose.\n"
          "• Note: If experiencing sudden chest pain or acute symptoms, please tap Emergency SOS or contact a doctor immediately.";
    }

    if (lower.contains('hi') || lower.contains('hello') || lower.contains('hey') || lower.contains('vanakkam') || lower.contains('namaste')) {
      return "Hello! 👋 I am your WellWisher AI Coach. I'm here to support your daily wellness, ergonomic focus routines, hydration tracking, and senior parent care. How can I help you today?";
    }

    if (lower.contains('thank') || lower.contains('good') || lower.contains('great')) {
      return "You're very welcome! 😊 Staying consistent with small wellness habits makes a huge difference. Let me know whenever you need tips or schedule assistance!";
    }

    return "💡 **WellWisher AI Coach Advice**:\n"
        "To maintain optimal health and daily productivity, keep a balanced rhythm of:\n"
        "• Regular 30-minute hydration breaks (250ml water)\n"
        "• 20-20-20 eye care breaks\n"
        "• Gentle seated stretches every 2 hours\n"
        "• Consistent sleep and meal schedules.\n\n"
        "You can also tap the **Smart Plan Generator** (top right icon) to auto-build a custom routine!";
  }

  void _openPlanGeneratorModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _SmartPlanGeneratorModal(
        onApplyPlan: (List<dynamic> generatedRoutines) async {
          final controller = widget.scheduleController ?? AppServiceLocator().scheduleController;
          final targetDate = controller.selectedDate;

          for (var r in generatedRoutines) {
            final newItem = ScheduleItem(
              id: '${DateTime.now().millisecondsSinceEpoch}_ai_${r['title']}',
              title: r['title'] ?? 'Wellness Routine',
              description: r['description'] ?? '',
              time: r['time'] ?? '09:00 AM',
              category: _parseCategory(r['category']),
              status: ActivityStatus.upcoming,
              date: targetDate,
              reminderEnabled: true,
              createdAt: DateTime.now(),
              updatedAt: DateTime.now(),
            );
            await controller.addNewRoutine(newItem);
          }

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('🎉 AI Generated Plan applied directly to your Schedule!'),
                backgroundColor: Colors.teal,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
      ),
    );
  }

  ActivityCategory _parseCategory(String? catStr) {
    switch (catStr) {
      case 'wakeUp': return ActivityCategory.wakeUp;
      case 'breakfast': return ActivityCategory.breakfast;
      case 'waterReminder': return ActivityCategory.waterReminder;
      case 'eyeCare': return ActivityCategory.eyeCare;
      case 'stretchBreak': return ActivityCategory.stretchBreak;
      case 'office': return ActivityCategory.office;
      case 'meal': return ActivityCategory.meal;
      case 'exercise': return ActivityCategory.exercise;
      case 'sleep': return ActivityCategory.sleep;
      default: return ActivityCategory.custom;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = theme.colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('WellWisher AI Coach 🤖', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.auto_awesome_rounded, color: Colors.amber),
            tooltip: '1-Tap Smart Plan Generator',
            onPressed: _openPlanGeneratorModal,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Smart Plan Generator Prompt Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: isDark ? primaryColor.withValues(alpha: 0.18) : primaryColor.withValues(alpha: 0.08),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome_rounded, color: Colors.amber, size: 24),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Tap "Generate Plan" to auto-schedule Elderly Wellness, Focus, or Fitness routines!',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                  ),
                  ElevatedButton(
                    onPressed: _openPlanGeneratorModal,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Generate', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),

            // Quick Questions Chips with high contrast in both themes
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              child: Row(
                children: _quickQuestions.map((q) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ActionChip(
                      label: Text(
                        q,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.tealAccent.shade100 : const Color(0xFF0F766E),
                        ),
                      ),
                      onPressed: () => _sendMessage(q),
                      backgroundColor: isDark ? const Color(0xFF132D38) : Colors.teal.shade50,
                      side: BorderSide(
                        color: isDark ? Colors.teal.shade600 : Colors.teal.shade200,
                        width: 1.2,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    ),
                  );
                }).toList(),
              ),
            ),

            // Chat Messages Stream
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  final isUser = msg['sender'] == 'user';
                  final aiBubbleBg = isDark ? const Color(0xFF1E293B) : Colors.grey.shade100;

                  return Align(
                    alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.84),
                      decoration: BoxDecoration(
                        color: isUser ? primaryColor : aiBubbleBg,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(16),
                          topRight: const Radius.circular(16),
                          bottomLeft: isUser ? const Radius.circular(16) : const Radius.circular(4),
                          bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(16),
                        ),
                        border: !isUser && isDark ? Border.all(color: Colors.white12) : null,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isUser ? Icons.person_rounded : Icons.smart_toy_rounded,
                                size: 14,
                                color: isUser ? Colors.white70 : (isDark ? Colors.tealAccent : Colors.teal.shade800),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                isUser ? 'You' : 'WellWisher AI',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isUser ? Colors.white70 : (isDark ? Colors.tealAccent : Colors.teal.shade800),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            msg['text']!,
                            style: TextStyle(
                              color: isUser ? Colors.white : (isDark ? Colors.white : Colors.black87),
                              fontSize: 13,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            if (_isGenerating)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  children: [
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'WellWisher AI is thinking...',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? Colors.white70 : Colors.grey.shade600,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ),
              ),

            // Text Input Row
            Container(
              padding: const EdgeInsets.all(12.0),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF131B26) : Colors.white,
                border: Border(
                  top: BorderSide(color: isDark ? Colors.white12 : Colors.grey.shade200),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _inputController,
                      style: TextStyle(fontSize: 13, color: isDark ? Colors.white : Colors.black87),
                      decoration: InputDecoration(
                        hintText: 'Ask WellWisher AI for wellness & routine tips...',
                        hintStyle: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : Colors.grey.shade500),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF1E293B) : Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide(color: isDark ? Colors.white12 : Colors.grey.shade300),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide(color: isDark ? Colors.white12 : Colors.grey.shade300),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      onSubmitted: _sendMessage,
                    ),
                  ),
                  const SizedBox(width: 8),
                  FloatingActionButton.small(
                    onPressed: () => _sendMessage(_inputController.text),
                    backgroundColor: primaryColor,
                    child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SmartPlanGeneratorModal extends StatefulWidget {
  final Function(List<dynamic>) onApplyPlan;

  const _SmartPlanGeneratorModal({required this.onApplyPlan});

  @override
  State<_SmartPlanGeneratorModal> createState() => _SmartPlanGeneratorModalState();
}

class _SmartPlanGeneratorModalState extends State<_SmartPlanGeneratorModal> {
  final ApiClient _apiClient = ApiClient();
  String _selectedPlanType = 'elderly';
  bool _isLoading = false;
  List<dynamic> _previewRoutines = [];

  @override
  void initState() {
    super.initState();
    _fetchPlan('elderly');
  }

  Future<void> _fetchPlan(String planType) async {
    setState(() {
      _selectedPlanType = planType;
      _isLoading = true;
    });

    List<dynamic> routines = [];

    try {
      final res = await _apiClient.post('/ai/generate-plan', {'planType': planType});
      if (res['success'] == true && res['data'] != null && res['data']['routines'] is List) {
        routines = res['data']['routines'];
      }
    } catch (_) {}

    // If offline or remote failed, provide pre-configured smart plans
    if (routines.isEmpty) {
      if (planType == 'elderly') {
        routines = [
          {'title': '🌅 Gentle Morning Stretch & Water', 'time': '07:30 AM', 'category': 'wakeUp', 'description': 'Light seated stretching & 250ml warm water'},
          {'title': '🥣 Breakfast & Morning Medication', 'time': '08:30 AM', 'category': 'breakfast', 'description': 'Healthy breakfast & take prescribed pills'},
          {'title': '🚶 Garden Walk & Fresh Air', 'time': '10:30 AM', 'category': 'exercise', 'description': 'Relaxing 15-minute walk'},
          {'title': '🍲 Nutritious Lunch & Water', 'time': '01:00 PM', 'category': 'meal', 'description': 'Warm lunch & glass of fresh water'},
          {'title': '😴 Afternoon Rest & Nap', 'time': '02:30 PM', 'category': 'sleep', 'description': '45-minute restorative nap'},
          {'title': '🍽️ Light Dinner & Medicine', 'time': '07:30 PM', 'category': 'meal', 'description': 'Nourishing dinner followed by medication'},
          {'title': '🌙 Restful Sleep', 'time': '09:30 PM', 'category': 'sleep', 'description': 'Turn off screens and prepare for deep rest'}
        ];
      } else if (planType == 'focus') {
        routines = [
          {'title': '⏰ Wake Up & Hydrate', 'time': '06:30 AM', 'category': 'wakeUp', 'description': 'Morning glass of water & goal review'},
          {'title': '🍳 Protein Breakfast', 'time': '08:00 AM', 'category': 'breakfast', 'description': 'Fuel your workday focus'},
          {'title': '💻 Deep Work Block 1', 'time': '09:00 AM', 'category': 'office', 'description': '90 mins priority focus without distractions'},
          {'title': '👀 20-20-20 Eye Care Break', 'time': '10:30 AM', 'category': 'eyeCare', 'description': 'Rest eyes for 20 seconds & hydrate'},
          {'title': '🥗 Mindful Lunch Break', 'time': '01:00 PM', 'category': 'meal', 'description': 'Step away from desk for healthy lunch'},
          {'title': '🚶 15-Min Posture Stretch Walk', 'time': '03:30 PM', 'category': 'stretchBreak', 'description': 'Beat afternoon fatigue with walking stretch'},
          {'title': '🏁 End of Workday Unwind', 'time': '06:00 PM', 'category': 'custom', 'description': 'Review completed tasks and log off'}
        ];
      } else {
        routines = [
          {'title': '💧 Morning Hydration', 'time': '07:00 AM', 'category': 'waterReminder', 'description': 'Drink 500ml water to kickstart hydration'},
          {'title': '🏃 30-Min Cardio / Jogging', 'time': '07:30 AM', 'category': 'exercise', 'description': 'Cardiovascular workout & core stretch'},
          {'title': '🍳 Healthy Post-Workout Meal', 'time': '08:30 AM', 'category': 'breakfast', 'description': 'High protein breakfast & smoothie'},
          {'title': '💧 Midday Water Recharge', 'time': '01:30 PM', 'category': 'waterReminder', 'description': 'Drink 250ml water'},
          {'title': '🧘 Evening Meditation & Stretch', 'time': '08:30 PM', 'category': 'stretchBreak', 'description': '10-minute mindful breathing & gentle stretching'}
        ];
      }
    }

    if (mounted) {
      setState(() {
        _previewRoutines = routines;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryColor = theme.colorScheme.primary;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.auto_awesome_rounded, color: Colors.amber, size: 22),
                    const SizedBox(width: 8),
                    Text(
                      'Smart 1-Tap Plan Generator',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: Icon(Icons.close, color: isDark ? Colors.white70 : Colors.black87),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Category Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  ChoiceChip(
                    label: const Text('👴 Elderly Wellness'),
                    selected: _selectedPlanType == 'elderly',
                    selectedColor: primaryColor.withValues(alpha: 0.25),
                    onSelected: (_) => _fetchPlan('elderly'),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('🎯 Focus & Workday'),
                    selected: _selectedPlanType == 'focus',
                    selectedColor: primaryColor.withValues(alpha: 0.25),
                    onSelected: (_) => _fetchPlan('focus'),
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('🏃 Fitness & Energy'),
                    selected: _selectedPlanType == 'fitness',
                    selectedColor: primaryColor.withValues(alpha: 0.25),
                    onSelected: (_) => _fetchPlan('fitness'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            if (_isLoading)
              const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _previewRoutines.length,
                itemBuilder: (context, index) {
                  final r = _previewRoutines[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0F172A) : Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: isDark ? Colors.white12 : Colors.grey.shade200),
                    ),
                    child: ListTile(
                      dense: true,
                      leading: const Icon(Icons.check_circle_rounded, color: Colors.teal, size: 18),
                      title: Text(
                        r['title'],
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                      ),
                      subtitle: Text(
                        '${r['time']} • ${r['description']}',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? Colors.white70 : Colors.black54,
                        ),
                      ),
                    ),
                  );
                },
              ),

            const SizedBox(height: 16),

            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                onPressed: _previewRoutines.isEmpty
                    ? null
                    : () {
                        widget.onApplyPlan(_previewRoutines);
                        Navigator.pop(context);
                      },
                icon: const Icon(Icons.calendar_today_rounded, color: Colors.white, size: 18),
                label: const Text('Apply Plan to Today\'s Schedule', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
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
