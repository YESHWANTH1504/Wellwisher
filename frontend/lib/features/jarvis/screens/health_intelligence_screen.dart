import 'package:flutter/material.dart';
import '../controller/health_intelligence_controller.dart';
import '../widgets/health_overview_card.dart';
import '../widgets/health_trend_card.dart';
import '../widgets/health_alert_card.dart';
import '../widgets/medication_conflict_card.dart';
import '../widgets/doctor_question_card.dart';
import 'doctor_briefing_screen.dart';

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
      appBar: AppBar(
        title: const Text('Autonomous Health Center'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Intelligence',
            onPressed: () => _controller.loadAllData(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(icon: Icon(Icons.trending_up, size: 18), text: 'Biomarkers'),
            Tab(icon: Icon(Icons.notifications_active_outlined, size: 18), text: 'Alerts'),
            Tab(icon: Icon(Icons.medication_outlined, size: 18), text: 'Med Review'),
            Tab(icon: Icon(Icons.description_outlined, size: 18), text: 'Briefings'),
          ],
        ),
      ),
      body: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          if (_controller.isLoading && _controller.overview == null) {
            return const Center(child: CircularProgressIndicator());
          }

          if (_controller.errorMessage != null && _controller.overview == null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: Colors.red),
                    const SizedBox(height: 12),
                    Text('Error: ${_controller.errorMessage}'),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () => _controller.loadAllData(),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          return TabBarView(
            controller: _tabController,
            children: [
              // Tab 1: Biomarker Trends & Overview
              RefreshIndicator(
                onRefresh: () => _controller.loadAllData(),
                child: ListView(
                  padding: const EdgeInsets.all(14),
                  children: [
                    if (_controller.overview != null)
                      HealthOverviewCard(
                        overview: _controller.overview!,
                        onPrepareDoctorVisit: _generateBriefing,
                      ),
                    const SizedBox(height: 16),
                    const Text(
                      'Biomarker Trajectories',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    if (_controller.trends.isEmpty)
                      _buildEmptyState(
                        icon: Icons.show_chart,
                        title: 'No Trends Available Yet',
                        subtitle: 'Upload two or more clinical reports to compute mathematical biomarker trajectories.',
                      )
                    else
                      ..._controller.trends.map((t) => HealthTrendCard(trend: t)),
                  ],
                ),
              ),

              // Tab 2: Health Alerts
              RefreshIndicator(
                onRefresh: () => _controller.loadAllData(),
                child: ListView(
                  padding: const EdgeInsets.all(14),
                  children: [
                    const Text(
                      'Proactive Health Observations',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    if (_controller.alerts.isEmpty)
                      _buildEmptyState(
                        icon: Icons.check_circle_outline,
                        title: 'No Active Health Alerts',
                        subtitle: 'All tracked biomarker patterns are within standard consistency parameters.',
                      )
                    else
                      ..._controller.alerts.map((a) => HealthAlertCard(
                            alert: a,
                            onDismiss: () => _controller.dismissAlert(a.id),
                          )),
                  ],
                ),
              ),

              // Tab 3: Medication Reconciliation
              RefreshIndicator(
                onRefresh: () => _controller.loadAllData(),
                child: ListView(
                  padding: const EdgeInsets.all(14),
                  children: [
                    const Text(
                      'Medication Reconciliation Points',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Items identified for clinician review during your next consultation.',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                    ),
                    const SizedBox(height: 10),
                    if (_controller.medicationReconciliation == null ||
                        _controller.medicationReconciliation!.potentialConcerns.isEmpty)
                      _buildEmptyState(
                        icon: Icons.check_circle_outline,
                        title: 'No Medication Review Items',
                        subtitle: 'Your active schedule aligns with extracted prescription records.',
                      )
                    else
                      ..._controller.medicationReconciliation!.potentialConcerns
                          .map((c) => MedicationConflictCard(concern: c)),
                  ],
                ),
              ),

              // Tab 4: Doctor Briefings & Questions
              RefreshIndicator(
                onRefresh: () => _controller.loadAllData(),
                child: ListView(
                  padding: const EdgeInsets.all(14),
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Doctor Visit Preparation',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        ElevatedButton.icon(
                          onPressed: _generateBriefing,
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('New Briefing'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.teal.shade700,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (_controller.overview?.doctorQuestions.isNotEmpty ?? false) ...[
                      const Text(
                        'Questions to Ask Your Healthcare Provider',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.blueGrey),
                      ),
                      const SizedBox(height: 8),
                      ..._controller.overview!.doctorQuestions
                          .asMap()
                          .entries
                          .map((entry) => DoctorQuestionCard(question: entry.value, index: entry.key + 1)),
                      const SizedBox(height: 16),
                    ],
                    const Text(
                      'Saved Briefings',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    if (_controller.briefings.isEmpty)
                      _buildEmptyState(
                        icon: Icons.description_outlined,
                        title: 'No Saved Briefings',
                        subtitle: 'Tap "New Briefing" to compile a 1-page health summary for your clinician.',
                      )
                    else
                      ..._controller.briefings.map((b) => Card(
                            elevation: 1,
                            margin: const EdgeInsets.symmetric(vertical: 4),
                            child: ListTile(
                              leading: const CircleAvatar(
                                backgroundColor: Colors.teal,
                                child: Icon(Icons.assignment_outlined, color: Colors.white, size: 20),
                              ),
                              title: Text('Briefing: ${b.generatedAt.split('T')[0]}'),
                              subtitle: Text('Status: ${b.status} | ${b.sourceDocumentIds.length} Source Records'),
                              trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => DoctorBriefingScreen(briefing: b)),
                                );
                              },
                            ),
                          )),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Icon(icon, size: 40, color: Colors.grey.shade500),
          const SizedBox(height: 10),
          Text(
            title,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }
}
