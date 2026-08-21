import 'package:flutter/material.dart';
import '../../../core/routes/app_routes.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/voice_assistant_service.dart';
import '../../../main.dart';

class PortalScreen extends StatelessWidget {
  const PortalScreen({super.key});

  void _quickAccessWorker(BuildContext context) {
    final storage = LocalStorageService();
    storage.userRole = 'worker';
    storage.jwtToken = 'demo_worker_token_${DateTime.now().millisecondsSinceEpoch}';
    MyApp.reloadTheme(context);
    Navigator.pushNamedAndRemoveUntil(context, AppRoutes.workerDashboard, (route) => false);
  }

  void _quickAccessSenior(BuildContext context) {
    final storage = LocalStorageService();
    storage.userRole = 'senior';
    storage.jwtToken = 'demo_senior_token_${DateTime.now().millisecondsSinceEpoch}';
    MyApp.reloadTheme(context);
    VoiceAssistantService.speak(
      'வணக்கம் அம்மா! முதியோர் நல்வாழ்வு பகுதிக்கு வரவேற்கிறோம்!',
      langCode: storage.selectedLanguage,
    );
    Navigator.pushNamedAndRemoveUntil(context, AppRoutes.seniorDashboard, (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 768;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F2027), Color(0xFF203A43), Color(0xFF2C5364)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 900),
                child: Column(
                  children: [
                    // Brand Header
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.12),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white24, width: 1.5),
                      ),
                      child: const Icon(
                        Icons.health_and_safety_rounded,
                        color: Colors.tealAccent,
                        size: 42,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'WellWisher',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Select your specialized portal to get started',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.8),
                      ),
                    ),
                    // JARVIS AI Voice Companion Card
                    Container(
                      margin: const EdgeInsets.only(bottom: 20),
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF818CF8).withValues(alpha: 0.5), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF6366F1).withValues(alpha: 0.25),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF6366F1).withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.auto_awesome, color: Color(0xFF818CF8), size: 28),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text(
                                  'JARVIS AI Companion',
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                                SizedBox(height: 3),
                                Text(
                                  'Voice-first assistant for scheduling, wellness & routines',
                                  style: TextStyle(color: Colors.white70, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                          ElevatedButton.icon(
                            onPressed: () => Navigator.pushNamed(context, AppRoutes.jarvis),
                            icon: const Icon(Icons.mic, size: 18),
                            label: const Text('Open'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF6366F1),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Role Cards (Responsive Row on Desktop, Column on Mobile)
                    if (isDesktop)
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: _buildWorkerCard(context)),
                          const SizedBox(width: 20),
                          Expanded(child: _buildSeniorCard(context)),
                        ],
                      )
                    else ...[
                      _buildWorkerCard(context),
                      const SizedBox(height: 20),
                      _buildSeniorCard(context),
                    ],

                    const SizedBox(height: 24),
                    Text(
                      'Seamlessly switch profiles or log out anytime in settings',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withOpacity(0.6),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWorkerCard(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withOpacity(0.9),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.tealAccent.withOpacity(0.4), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.teal.withOpacity(0.2),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      padding: const EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.teal.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.tealAccent.withOpacity(0.5)),
                ),
                child: const Icon(
                  Icons.business_center_rounded,
                  color: Colors.tealAccent,
                  size: 28,
                ),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Worker / Employee',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      'Productivity & Workplace Wellness',
                      style: TextStyle(fontSize: 12, color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: Colors.white24),
          const SizedBox(height: 12),

          _buildFeatureRow(Icons.timer_outlined, '20-20-20 Screen Care & Eye Rest'),
          _buildFeatureRow(Icons.water_drop_outlined, '20-Min Hydration Interval Alerts'),
          _buildFeatureRow(Icons.task_alt_rounded, 'Productivity Schedule & Focus Blocks'),
          _buildFeatureRow(Icons.mood_rounded, 'Sleep & Daily Work Mood Logging'),

          const SizedBox(height: 20),

          // Worker Login Button
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pushNamed(context, AppRoutes.workerLogin);
            },
            icon: const Icon(Icons.login_rounded),
            label: const Text('Worker Login / Sign In', style: TextStyle(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.teal,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 2,
            ),
          ),
          const SizedBox(height: 10),

          // Worker Register / Quick Demo
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.pushNamed(
                      context,
                      AppRoutes.workerLogin,
                      arguments: {'isSignUp': true},
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.tealAccent,
                    side: const BorderSide(color: Colors.tealAccent),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Register', style: TextStyle(fontSize: 12)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextButton.icon(
                  onPressed: () => _quickAccessWorker(context),
                  icon: const Icon(Icons.flash_on_rounded, size: 16, color: Colors.amberAccent),
                  label: const Text('Demo Enter', style: TextStyle(fontSize: 12, color: Colors.amberAccent)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSeniorCard(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF2A1B3D).withOpacity(0.9),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.purpleAccent.withOpacity(0.4), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.purple.withOpacity(0.25),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      padding: const EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.purple.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.purpleAccent.withOpacity(0.6)),
                ),
                child: const Icon(
                  Icons.elderly_rounded,
                  color: Colors.purpleAccent,
                  size: 30,
                ),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Senior Citizen Care',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      'Health, Medication & Loving Voice',
                      style: TextStyle(fontSize: 12, color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: Colors.white24),
          const SizedBox(height: 12),

          _buildFeatureRow(Icons.record_voice_over_rounded, 'Amma Voice Assistant 🎙️ (Speech Alerts)'),
          _buildFeatureRow(Icons.medication_rounded, 'Medication & Pill Timetable Reminders'),
          _buildFeatureRow(Icons.monitor_heart_rounded, 'Health Vitals (BP, Sugar, Heart Rate)'),
          _buildFeatureRow(Icons.sos_rounded, 'Emergency SOS & Family Caregiver Hub'),

          const SizedBox(height: 20),

          // Senior Login Button
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pushNamed(context, AppRoutes.seniorLogin);
            },
            icon: const Icon(Icons.record_voice_over_rounded),
            label: const Text('Senior Login / Sign In 👵', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.purple.shade700,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 3,
            ),
          ),
          const SizedBox(height: 10),

          // Senior Register / Quick Demo
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.pushNamed(
                      context,
                      AppRoutes.seniorLogin,
                      arguments: {'isSignUp': true},
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.purpleAccent,
                    side: const BorderSide(color: Colors.purpleAccent),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Register Senior', style: TextStyle(fontSize: 12)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextButton.icon(
                  onPressed: () => _quickAccessSenior(context),
                  icon: const Icon(Icons.flash_on_rounded, size: 16, color: Colors.amberAccent),
                  label: const Text('Demo Enter', style: TextStyle(fontSize: 12, color: Colors.amberAccent)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Colors.white70),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 12, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}
