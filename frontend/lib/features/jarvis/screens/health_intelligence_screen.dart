import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../controller/health_intelligence_controller.dart';
import '../widgets/health_overview_card.dart';
import '../widgets/health_trend_card.dart';
import '../widgets/health_alert_card.dart';
import '../widgets/medication_conflict_card.dart';
import '../widgets/doctor_question_card.dart';
import 'doctor_briefing_screen.dart';

/// Futuristic JARVIS Health Intelligence screen.
/// Presents longitudinal biomarker trends, medication reviews, and 1-page clinician briefings
/// while adhering strictly to non-diagnostic safety boundaries.
class HealthIntelligenceScreen extends StatefulWidget {
  final HealthIntelligenceController? controller;

  const HealthIntelligenceScreen({super.key, this.controller});

  @override
  State<HealthIntelligenceScreen> createState() => _HealthIntelligenceScreenState();
}

class _HealthIntelligenceScreenState extends State<HealthIntelligenceScreen> with SingleTickerProviderStateMixin {
  late final HealthIntelligenceController _controller;
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? HealthIntelligenceController();
    _tabController = TabController(length: 4, vsync: this);
    _controller.loadAllData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    if (widget.controller == null) {
      _controller.dispose();
    }
    super.dispose();
  }

  Future<void> _generateBriefing() async {
    final briefing = await _controller.generateDoctorBriefing();
    if (briefing != null && mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => DoctorBriefingScreen(briefing: briefing)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JarvisColors.background,
      appBar: AppBar(
        backgroundColor: JarvisColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: JarvisColors.cyan, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('AUTONOMOUS HEALTH INTELLIGENCE', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
            Text('Autonomous Health Center', style: JarvisTypography.titleMedium),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: JarvisColors.cyan),
            tooltip: 'Sync Biomarkers',
            onPressed: () => _controller.loadAllData(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: JarvisColors.cyan,
          indicatorWeight: 3,
          labelColor: JarvisColors.cyan,
          unselectedLabelColor: JarvisColors.textSecondary,
          labelStyle: JarvisTypography.labelMedium,
          isScrollable: true,
          tabs: const [
            Tab(icon: Icon(Icons.trending_up, size: 18), text: 'Biomarkers'),
            Tab(icon: Icon(Icons.notifications_active_outlined, size: 18), text: 'Alerts'),
            Tab(icon: Icon(Icons.medication_outlined, size: 18), text: 'Med Review'),
            Tab(icon: Icon(Icons.description_outlined, size: 18), text: 'Briefings'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Non-diagnostic clinical safety disclaimer banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: JarvisColors.indigo.withValues(alpha: 0.12),
            child: Row(
              children: [
                const Icon(Icons.info_outline, size: 14, color: JarvisColors.cyan),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Informational only. JARVIS does not diagnose, prescribe, or replace qualified medical professionals.',
                    style: JarvisTypography.bodySmall.copyWith(
                      color: JarvisColors.textSecondary,
                      fontSize: 11,
                    ),
                  ),
                ),
              ],
            ),
          ),

          Expanded(
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) {
                if (_controller.isLoading && _controller.overview == null) {
                  return const Center(child: CircularProgressIndicator(color: JarvisColors.cyan));
                }

                if (_controller.errorMessage != null && _controller.overview == null) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.warning_amber_rounded, size: 48, color: JarvisColors.rose),
                          const SizedBox(height: 12),
                          Text(_controller.errorMessage!, style: JarvisTypography.bodyMedium),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: () => _controller.loadAllData(),
                            style: ElevatedButton.styleFrom(backgroundColor: JarvisColors.cyan),
                            child: const Text('Retry Intelligence Sync', style: TextStyle(color: Colors.black)),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                return TabBarView(
                  controller: _tabController,
                  children: [
                    _buildBiomarkersTab(),
                    _buildAlertsTab(),
                    _buildMedicationsTab(),
                    _buildBriefingsTab(),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBiomarkersTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_controller.overview != null)
          HealthOverviewCard(overview: _controller.overview!),
        const SizedBox(height: 16),
        Text('LONGITUDINAL BIOMARKER TRENDS', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
        const SizedBox(height: 8),
        if (_controller.trends.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: JarvisColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: JarvisColors.border),
            ),
            child: Center(
              child: Text('No extracted biomarker records yet.', style: JarvisTypography.bodyMedium.copyWith(color: JarvisColors.textSecondary)),
            ),
          )
        else
          ..._controller.trends.map((t) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: HealthTrendCard(trend: t),
              )),
      ],
    );
  }

  Widget _buildAlertsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Proactive Health Observations', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.rose)),
        const SizedBox(height: 8),
        if (_controller.alerts.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: JarvisColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: JarvisColors.border),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle_outline, color: JarvisColors.emerald, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Text('All biomarker telemetry is currently within baseline ranges.', style: JarvisTypography.bodyMedium),
                ),
              ],
            ),
          )
        else
          ..._controller.alerts.map((a) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: HealthAlertCard(alert: a),
              )),
      ],
    );
  }

  Widget _buildMedicationsTab() {
    final concerns = _controller.medicationReconciliation?.potentialConcerns ?? [];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Medication Reconciliation Points', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.amber)),
        const SizedBox(height: 8),
        if (concerns.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: JarvisColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: JarvisColors.border),
            ),
            child: Row(
              children: [
                const Icon(Icons.shield_outlined, color: JarvisColors.emerald, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Text('No adverse drug interactions or schedule conflicts detected.', style: JarvisTypography.bodyMedium),
                ),
              ],
            ),
          )
        else
          ...concerns.map((c) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: MedicationConflictCard(concern: c),
              )),
      ],
    );
  }

  Widget _buildBriefingsTab() {
    final questions = _controller.overview?.doctorQuestions ?? [];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: JarvisColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: JarvisColors.cyan.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: JarvisColors.cyan.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.medical_services_outlined, color: JarvisColors.cyan, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text('Doctor Visit Preparation', style: JarvisTypography.titleSmall),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Generate an organized, non-diagnostic synthesis of recent vitals, biomarker differentials, and discussion questions for your next doctor visit.',
                style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary),
              ),
              const SizedBox(height: 14),
              ElevatedButton.icon(
                onPressed: _generateBriefing,
                icon: const Icon(Icons.auto_awesome, size: 16, color: Colors.black),
                label: const Text('Generate Briefing Package', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: JarvisColors.cyan,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text('RECOMMENDED CLINICIAN DISCUSSION POINTS', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.indigo)),
        const SizedBox(height: 8),
        if (questions.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: JarvisColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: JarvisColors.border),
            ),
            child: Text('Questions will appear automatically based on recent biomarker changes.', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
          )
        else
          ...questions.asMap().entries.map((entry) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: DoctorQuestionCard(question: entry.value, index: entry.key + 1),
              )),
      ],
    );
  }
}
