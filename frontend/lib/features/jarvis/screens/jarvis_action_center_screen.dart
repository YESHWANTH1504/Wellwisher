import 'package:flutter/material.dart';
import '../controller/workflow_controller.dart';
import '../models/workflow_models.dart';
import '../widgets/action_center_header.dart';
import '../widgets/pending_confirmation_card.dart';
import '../widgets/appointment_action_card.dart';
import '../widgets/medication_action_card.dart';
import '../widgets/calendar_conflict_card.dart';

class JarvisActionCenterScreen extends StatefulWidget {
  final WorkflowController? controller;

  const JarvisActionCenterScreen({super.key, this.controller});

  @override
  State<JarvisActionCenterScreen> createState() => _JarvisActionCenterScreenState();
}

class _JarvisActionCenterScreenState extends State<JarvisActionCenterScreen> with SingleTickerProviderStateMixin {
  late final WorkflowController _controller;
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _controller = widget.controller ?? WorkflowController();
    _tabController = TabController(length: 4, vsync: this);
    _controller.loadActionCenter();
  }

  @override
  void dispose() {
    _tabController.dispose();
    if (widget.controller == null) {
      _controller.dispose();
    }
    super.dispose();
  }

  void _showPrepareBriefingDialog(BuildContext context, String appointmentId) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => const Center(child: CircularProgressIndicator(color: Colors.cyanAccent)),
    );

    final res = await _controller.prepareVisitBriefing(appointmentId);
    if (context.mounted) Navigator.of(context, rootNavigator: true).pop();

    if (context.mounted && res != null) {
      showModalBottomSheet(
        context: context,
        backgroundColor: const Color(0xFF0F172A),
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (ctx) => Container(
          height: MediaQuery.of(context).size.height * 0.75,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.description, color: Colors.cyanAccent, size: 24),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Doctor Visit Briefing Package',
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white60),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const Divider(color: Colors.white24),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.cyan.withAlpha(25),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          'Briefing ID: ${res['briefingId'] ?? 'N/A'}\nStatus: READY for Consultation',
                          style: const TextStyle(color: Colors.cyanAccent, fontSize: 13),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        '1-Page Briefing Contents:',
                        style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        res['briefing'] != null ? res['briefing'].toString() : 'Briefing data compiled successfully.',
                        style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
                      ),
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withAlpha(10),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          res['disclaimer']?.toString() ?? 'Non-diagnostic informational summary.',
                          style: const TextStyle(color: Colors.white38, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }
  }

  void _showCompleteVisitDialog(BuildContext context, String appointmentId) {
    final instructionsController = TextEditingController();
    final followUpDateController = TextEditingController();
    final testsController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Record Visit Follow-up', style: TextStyle(color: Colors.white)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: instructionsController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Doctor Instructions (as stated)',
                  labelStyle: TextStyle(color: Colors.white70),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white38)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: followUpDateController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Follow-up Date (YYYY-MM-DD)',
                  labelStyle: TextStyle(color: Colors.white70),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white38)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: testsController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Requested Tests (comma separated)',
                  labelStyle: TextStyle(color: Colors.white70),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white38)),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final tests = testsController.text.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
              await _controller.completeAppointment(appointmentId, {
                'doctorInstructions': instructionsController.text,
                'followUpDate': followUpDateController.text.isNotEmpty ? followUpDateController.text : null,
                'testsRequested': tests
              });
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Appointment completed and follow-ups created!')),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.tealAccent, foregroundColor: Colors.black87),
            child: const Text('Save Follow-ups'),
          ),
        ],
      ),
    );
  }

  void _showNewAppointmentDialog(BuildContext context) {
    final titleController = TextEditingController();
    final doctorController = TextEditingController();
    final dateController = TextEditingController(text: DateTime.now().add(const Duration(days: 3)).toIso8601String().split('T')[0]);
    final locationController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Plan Doctor Appointment', style: TextStyle(color: Colors.white)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Appointment Title *',
                  labelStyle: TextStyle(color: Colors.white70),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white38)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: doctorController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Doctor / Specialist Name',
                  labelStyle: TextStyle(color: Colors.white70),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white38)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: dateController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Scheduled Date (YYYY-MM-DD) *',
                  labelStyle: TextStyle(color: Colors.white70),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white38)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: locationController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Location / Clinic Room',
                  labelStyle: TextStyle(color: Colors.white70),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white38)),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton(
            onPressed: () async {
              if (titleController.text.isEmpty || dateController.text.isEmpty) return;
              Navigator.pop(ctx);
              await _controller.loadActionCenter();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Appointment planned successfully!')),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.cyanAccent, foregroundColor: Colors.black87),
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _controller,
      builder: (context, _) {
        final overview = _controller.overview;

        return Scaffold(
          backgroundColor: const Color(0xFF0F172A),
          appBar: AppBar(
            backgroundColor: const Color(0xFF0F172A),
            elevation: 0,
            title: const Text('JARVIS Action Center', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh, color: Colors.white70),
                onPressed: () => _controller.loadActionCenter(),
              ),
            ],
            bottom: TabBar(
              controller: _tabController,
              indicatorColor: Colors.cyanAccent,
              labelColor: Colors.cyanAccent,
              unselectedLabelColor: Colors.white60,
              isScrollable: true,
              tabs: [
                Tab(text: 'Pending (${_controller.pendingActions.length})'),
                Tab(text: 'Appts (${_controller.appointments.length})'),
                Tab(text: 'Calendar (${_controller.calendarEvents.length})'),
                const Tab(text: 'Medication'),
              ],
            ),
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _showNewAppointmentDialog(context),
            backgroundColor: Colors.cyanAccent,
            foregroundColor: Colors.black87,
            icon: const Icon(Icons.add),
            label: const Text('Plan Appointment'),
          ),
          body: _controller.isLoading && overview == null
              ? const Center(child: CircularProgressIndicator(color: Colors.cyanAccent))
              : RefreshIndicator(
                  onRefresh: () => _controller.loadActionCenter(),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Column(
                      children: [
                        ActionCenterHeader(
                          upcomingAppointments: overview?.upcomingAppointmentsCount ?? _controller.appointments.length,
                          pendingApprovals: overview?.pendingActionsCount ?? _controller.pendingActions.length,
                          calendarEvents: overview?.todayCalendarEventsCount ?? _controller.calendarEvents.length,
                          medicationConcerns: overview?.medicationConcernsCount ?? 0,
                        ),
                        const SizedBox(height: 16),
                        Expanded(
                          child: TabBarView(
                            controller: _tabController,
                            children: [
                              // Tab 1: Pending Actions
                              _buildPendingTab(_controller),
                              // Tab 2: Appointments
                              _buildAppointmentsTab(_controller),
                              // Tab 3: Calendar
                              _buildCalendarTab(_controller),
                              // Tab 4: Medication Overview
                              _buildMedicationTab(_controller),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
        );
      },
    );
  }

  Widget _buildPendingTab(WorkflowController controller) {
    if (controller.pendingActions.isEmpty) {
      return const Center(
        child: Text(
          'No pending actions requiring confirmation.',
          style: TextStyle(color: Colors.white60, fontSize: 14),
        ),
      );
    }

    return ListView.builder(
      itemCount: controller.pendingActions.length,
      itemBuilder: (ctx, index) {
        final action = controller.pendingActions[index];
        return PendingConfirmationCard(
          action: action,
          onConfirm: () => controller.confirmAction(action.id),
          onDismiss: () => controller.dismissAction(action.id),
        );
      },
    );
  }

  Widget _buildAppointmentsTab(WorkflowController controller) {
    if (controller.appointments.isEmpty) {
      return const Center(
        child: Text(
          'No upcoming doctor appointments recorded.',
          style: TextStyle(color: Colors.white60, fontSize: 14),
        ),
      );
    }

    return ListView.builder(
      itemCount: controller.appointments.length,
      itemBuilder: (ctx, index) {
        final apt = controller.appointments[index];
        return AppointmentActionCard(
          appointment: apt,
          onPrepareBriefing: () => _showPrepareBriefingDialog(context, apt.id),
          onCompleteVisit: () => _showCompleteVisitDialog(context, apt.id),
        );
      },
    );
  }

  Widget _buildCalendarTab(WorkflowController controller) {
    if (controller.calendarEvents.isEmpty) {
      return const Center(
        child: Text(
          'No calendar events scheduled for today.',
          style: TextStyle(color: Colors.white60, fontSize: 14),
        ),
      );
    }

    return ListView.builder(
      itemCount: controller.calendarEvents.length,
      itemBuilder: (ctx, index) {
        final ev = controller.calendarEvents[index];
        return CalendarConflictCard(event: ev);
      },
    );
  }

  Widget _buildMedicationTab(WorkflowController controller) {
    final medOverview = controller.overview?.medicationWorkflow;
    if (medOverview == null) {
      return const Center(
        child: Text(
          'Medication routine coverage analysis loaded.',
          style: TextStyle(color: Colors.white60, fontSize: 14),
        ),
      );
    }

    return SingleChildScrollView(
      child: MedicationActionCard(overview: medOverview),
    );
  }
}
