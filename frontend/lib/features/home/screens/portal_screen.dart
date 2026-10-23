import 'package:flutter/material.dart';
import '../../../core/routes/app_routes.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/voice_assistant_service.dart';
import '../../../main.dart';
import '../../jarvis/core/jarvis_colors.dart';
import '../../jarvis/core/jarvis_typography.dart';
import '../../jarvis/models/jarvis_models.dart';
import '../../jarvis/widgets/jarvis_core.dart';
import '../../jarvis/screens/jarvis_settings_screen.dart';

/// The futuristic JARVIS OS Gateway & Initialization Deck.
class PortalScreen extends StatelessWidget {
  const PortalScreen({super.key});

  void _launchJarvisCommandHub(BuildContext context) {
    final storage = LocalStorageService();
    storage.userRole = 'worker';
    storage.jwtToken = 'demo_jarvis_token_${DateTime.now().millisecondsSinceEpoch}';
    MyApp.reloadTheme(context);
    Navigator.pushNamedAndRemoveUntil(context, AppRoutes.jarvis, (route) => false);
  }

  void _quickAccessWorker(BuildContext context) {
    final storage = LocalStorageService();
    storage.userRole = 'worker';
    storage.jwtToken = 'demo_worker_token_${DateTime.now().millisecondsSinceEpoch}';
    MyApp.reloadTheme(context);
    Navigator.pushNamedAndRemoveUntil(context, AppRoutes.jarvis, (route) => false);
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
    return Scaffold(
      backgroundColor: JarvisColors.background,
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -0.3),
            radius: 1.2,
            colors: [
              Color(0xFF0F1B38),
              JarvisColors.background,
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 860),
                child: Column(
                  children: [
                    // System Status Telemetry
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: JarvisColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: JarvisColors.borderSubtle),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: JarvisColors.cyan,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: JarvisColors.cyan,
                                  blurRadius: 6,
                                  spreadRadius: 1,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'JARVIS OS 2.5 • NEURAL CORE ONLINE',
                            style: JarvisTypography.telemetry.copyWith(fontSize: 10),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Central Holographic Animated Core
                    const JarvisCore(
                      state: JarvisState.idle,
                      size: 140,
                      showLabel: false,
                    ),

                    const SizedBox(height: 18),

                    // Title
                    ShaderMask(
                      shaderCallback: (bounds) => const LinearGradient(
                        colors: [Colors.white, JarvisColors.cyan],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ).createShader(bounds),
                      child: const Text(
                        'WellWisher JARVIS',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          letterSpacing: 1.1,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Your Autonomous Personal Health & Life Operating System',
                      textAlign: TextAlign.center,
                      style: JarvisTypography.bodyMedium.copyWith(
                        color: JarvisColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 28),

                    // Primary Hero Card: Launch JARVIS AI Command Center
                    InkWell(
                      onTap: () => _launchJarvisCommandHub(context),
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF0F223D), Color(0xFF141F36)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: JarvisColors.cyan.withValues(alpha: 0.6),
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: JarvisColors.cyan.withValues(alpha: 0.15),
                              blurRadius: 24,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: JarvisColors.cyan.withValues(alpha: 0.15),
                                shape: BoxShape.circle,
                                border: Border.all(color: JarvisColors.cyan.withValues(alpha: 0.5)),
                              ),
                              child: const Icon(
                                Icons.auto_awesome,
                                color: JarvisColors.cyan,
                                size: 28,
                              ),
                            ),
                            const SizedBox(width: 18),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        'Launch JARVIS AI Command Hub',
                                        style: JarvisTypography.h2.copyWith(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: JarvisColors.cyan,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          'PRIMARY',
                                          style: JarvisTypography.telemetry.copyWith(
                                            color: JarvisColors.background,
                                            fontSize: 9,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Intelligent life timeline, conversational AI orchestrator, document vision, and daily briefing.',
                                    style: JarvisTypography.bodySmall.copyWith(
                                      color: JarvisColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(
                              Icons.arrow_forward_ios_rounded,
                              color: JarvisColors.cyan,
                              size: 18,
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Two Specialized Operational Protocols
                    Row(
                      children: [
                        // Senior Citizen Guardian Protocol Pod
                        Expanded(
                          child: InkWell(
                            onTap: () => _quickAccessSenior(context),
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                color: JarvisColors.surfaceElevated,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: JarvisColors.purple.withValues(alpha: 0.4),
                                  width: 1.2,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: JarvisColors.purple.withValues(alpha: 0.15),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(Icons.elderly_rounded, color: JarvisColors.purple, size: 22),
                                      ),
                                      const Spacer(),
                                      const Icon(Icons.mic, color: JarvisColors.purple, size: 16),
                                    ],
                                  ),
                                  const SizedBox(height: 14),
                                  Text(
                                    'Senior Guardian Protocol',
                                    style: JarvisTypography.h3.copyWith(color: Colors.white),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Voice assistant in Tamil/Hindi, large vitals telemetry, emergency SOS, and family bridge.',
                                    style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary),
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Text(
                                        'Open Guardian Mode',
                                        style: JarvisTypography.telemetry.copyWith(color: JarvisColors.purple, fontSize: 10),
                                      ),
                                      const SizedBox(width: 4),
                                      const Icon(Icons.arrow_forward, size: 12, color: JarvisColors.purple),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(width: 16),

                        // Executive Work-Life Protocol Pod
                        Expanded(
                          child: InkWell(
                            onTap: () => _quickAccessWorker(context),
                            borderRadius: BorderRadius.circular(20),
                            child: Container(
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                color: JarvisColors.surfaceElevated,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: JarvisColors.indigo.withValues(alpha: 0.4),
                                  width: 1.2,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: JarvisColors.indigo.withValues(alpha: 0.15),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(Icons.business_center_rounded, color: JarvisColors.indigo, size: 22),
                                      ),
                                      const Spacer(),
                                      const Icon(Icons.speed_rounded, color: JarvisColors.indigo, size: 16),
                                    ],
                                  ),
                                  const SizedBox(height: 14),
                                  Text(
                                    'Executive Desk Protocol',
                                    style: JarvisTypography.h3.copyWith(color: Colors.white),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Work-life balancing, parent health telemetry, focus windows, and doctor briefings.',
                                    style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary),
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Text(
                                        'Open Executive Mode',
                                        style: JarvisTypography.telemetry.copyWith(color: JarvisColors.indigo, fontSize: 10),
                                      ),
                                      const SizedBox(width: 4),
                                      const Icon(Icons.arrow_forward, size: 12, color: JarvisColors.indigo),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Quick AI Subsystem Navigation
                    Wrap(
                      spacing: 12,
                      runSpacing: 10,
                      alignment: WrapAlignment.center,
                      children: [
                        _buildSubsystemChip(
                          icon: Icons.bolt,
                          label: 'Action Center',
                          onTap: () => Navigator.pushNamed(context, AppRoutes.jarvisActionCenter),
                        ),
                        _buildSubsystemChip(
                          icon: Icons.monitor_heart_rounded,
                          label: 'Health Trends',
                          onTap: () => Navigator.pushNamed(context, AppRoutes.jarvisHealth),
                        ),
                        _buildSubsystemChip(
                          icon: Icons.find_in_page_rounded,
                          label: 'Document Lab',
                          onTap: () => Navigator.pushNamed(context, AppRoutes.jarvisDocuments),
                        ),
                        _buildSubsystemChip(
                          icon: Icons.tune,
                          label: 'AI Settings',
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const JarvisSettingsScreen()),
                          ),
                        ),
                      ],
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

  Widget _buildSubsystemChip({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: JarvisColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: JarvisColors.borderSubtle),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: JarvisColors.cyan),
            const SizedBox(width: 6),
            Text(
              label,
              style: JarvisTypography.bodySmall.copyWith(
                color: JarvisColors.textPrimary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
