import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../controller/workflow_controller.dart';
import '../widgets/action_center_header.dart';
import '../widgets/pending_confirmation_card.dart';
import '../widgets/appointment_action_card.dart';
import '../widgets/medication_action_card.dart';
import '../widgets/calendar_conflict_card.dart';

/// Futuristic JARVIS Action Center Screen.
/// Manages pending cryptographic approvals, doctor visit briefings, schedule conflicts, and medication reviews.
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
      builder: (ctx) => const Center(child: CircularProgressIndicator(color: JarvisColors.cyan)),
    );

    final res = await _controller.prepareVisitBriefing(appointmentId);
    if (context.mounted) Navigator.of(context, rootNavigator: true).pop();

    if (context.mounted && res != null) {
      showModalBottomSheet(
        context: context,
        backgroundColor: JarvisColors.surfaceElevated,
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
                  const Icon(Icons.description, color: JarvisColors.cyan, size: 24),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Doctor Visit Briefing Package',
                      style: JarvisTypography.titleMedium,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: JarvisColors.textSecondary),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const Divider(color: JarvisColors.border),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: JarvisColors.cyan.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: JarvisColors.cyan.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          'Briefing ID: ${res['briefingId'] ?? 'N/A'}\nStatus: READY for Consultation',
                          style: JarvisTypography.monospace.copyWith(color: JarvisColors.cyan, fontSize: 12),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        '1-Page Briefing Contents:',
                        style: JarvisTypography.titleSmall,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        res['briefing'] != null ? res['briefing'].toString() : 'Briefing data compiled successfully.',
                        style: JarvisTypography.bodyMedium.copyWith(color: JarvisColors.textSecondary),
                      ),
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: JarvisColors.indigo.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          res['disclaimer']?.toString() ?? 'Non-diagnostic informational summary.',
                          style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textDisabled, fontSize: 11),
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
        backgroundColor: JarvisColors.surfaceElevated,
        title: Text('Record Visit Follow-up', style: JarvisTypography.titleMedium),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: instructionsController,
                style: JarvisTypography.bodyMedium,
                decoration: const InputDecoration(
                  labelText: 'Doctor Instructions (as stated)',
                  labelStyle: TextStyle(color: JarvisColors.textSecondary),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: JarvisColors.border)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: followUpDateController,
                style: JarvisTypography.bodyMedium,
                decoration: const InputDecoration(
                  labelText: 'Follow-up Date (YYYY-MM-DD)',
                  labelStyle: TextStyle(color: JarvisColors.textSecondary),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: JarvisColors.border)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: testsController,
                style: JarvisTypography.bodyMedium,
                decoration: const InputDecoration(
                  labelText: 'Ordered Lab Tests (comma-separated)',
                  labelStyle: TextStyle(color: JarvisColors.textSecondary),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: JarvisColors.border)),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: JarvisColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final payload = {
                if (instructionsController.text.isNotEmpty) 'doctorInstructions': instructionsController.text,
                if (followUpDateController.text.isNotEmpty) 'followUpDate': followUpDateController.text,
                if (testsController.text.isNotEmpty)
                  'testsOrdered': testsController.text.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList(),
              };
              final res = await _controller.completeAppointment(appointmentId, payload);
              if (context.mounted && res != null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Appointment completed and follow-ups created!'),
                    backgroundColor: JarvisColors.surfaceElevated,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: JarvisColors.cyan, foregroundColor: Colors.black87),
            child: const Text('Save Follow-ups', style: TextStyle(fontWeight: FontWeight.bold)),
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
        backgroundColor: JarvisColors.surfaceElevated,
        title: Text('Plan Doctor Appointment', style: JarvisTypography.titleMedium),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleController,
                style: JarvisTypography.bodyMedium,
                decoration: const InputDecoration(
                  labelText: 'Appointment Title *',
                  labelStyle: TextStyle(color: JarvisColors.textSecondary),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: JarvisColors.border)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: doctorController,
                style: JarvisTypography.bodyMedium,
                decoration: const InputDecoration(
                  labelText: 'Doctor / Specialist Name',
                  labelStyle: TextStyle(color: JarvisColors.textSecondary),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: JarvisColors.border)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: dateController,
                style: JarvisTypography.bodyMedium,
                decoration: const InputDecoration(
                  labelText: 'Scheduled Date (YYYY-MM-DD) *',
                  labelStyle: TextStyle(color: JarvisColors.textSecondary),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: JarvisColors.border)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: locationController,
                style: JarvisTypography.bodyMedium,
                decoration: const InputDecoration(
                  labelText: 'Location / Clinic Room',
                  labelStyle: TextStyle(color: JarvisColors.textSecondary),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: JarvisColors.border)),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: JarvisColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () async {
              if (titleController.text.isEmpty || dateController.text.isEmpty) return;
              Navigator.pop(ctx);
              await _controller.loadActionCenter();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Appointment planned on JARVIS timeline.'),
                    backgroundColor: JarvisColors.surfaceElevated,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: JarvisColors.cyan, foregroundColor: Colors.black87),
            child: const Text('Create', style: TextStyle(fontWeight: FontWeight.bold)),
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
                Text('ATTENTION & CONSENT HUB', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
                Text('JARVIS Action Center', style: JarvisTypography.titleMedium),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh, color: JarvisColors.cyan),
                tooltip: 'Sync Actions',
                onPressed: () => _controller.loadActionCenter(),
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
              tabs: [
                Tab(text: 'Pending Approvals (${_controller.pendingActions.length})'),
                Tab(text: 'Appointments (${_controller.appointments.length})'),
                Tab(text: 'Calendar Events (${_controller.calendarEvents.length})'),
                const Tab(text: 'Medication Safety'),
              ],
            ),
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _showNewAppointmentDialog(context),
            backgroundColor: JarvisColors.cyan,
            foregroundColor: Colors.black87,
            icon: const Icon(Icons.add),
            label: const Text('Plan Appointment', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          body: _controller.isLoading && overview == null
              ? const Center(child: CircularProgressIndicator(color: JarvisColors.cyan))
              : RefreshIndicator(
                  onRefresh: () => _controller.loadActionCenter(),
                  color: JarvisColors.cyan,
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
                              // 1. Pending Confirmations
                              _controller.pendingActions.isEmpty
                                  ? Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(Icons.verified_user_outlined, size: 54, color: JarvisColors.emerald.withValues(alpha: 0.5)),
                                          const SizedBox(height: 12),
                                          Text('All autonomous actions verified.', style: JarvisTypography.bodyLarge),
                                          Text('No high-risk operations awaiting consent.', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
                                        ],
                                      ),
                                    )
                                  : ListView.builder(
                                      itemCount: _controller.pendingActions.length,
                                      itemBuilder: (ctx, i) => PendingConfirmationCard(
                                        action: _controller.pendingActions[i],
                                        onConfirm: () => _controller.confirmAction(_controller.pendingActions[i].id),
                                        onDismiss: () => _controller.dismissAction(_controller.pendingActions[i].id),
                                      ),
                                    ),

                              // 2. Appointments
                              _controller.appointments.isEmpty
                                  ? Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(Icons.calendar_today_outlined, size: 54, color: JarvisColors.textDisabled),
                                          const SizedBox(height: 12),
                                          Text('No upcoming appointments scheduled.', style: JarvisTypography.bodyLarge),
                                        ],
                                      ),
                                    )
                                  : ListView.builder(
                                      itemCount: _controller.appointments.length,
                                      itemBuilder: (ctx, i) => AppointmentActionCard(
                                        appointment: _controller.appointments[i],
                                        onPrepareBriefing: () => _showPrepareBriefingDialog(context, _controller.appointments[i].id),
                                        onCompleteVisit: () => _showCompleteVisitDialog(context, _controller.appointments[i].id),
                                      ),
                                    ),

                              // 3. Calendar Events & Conflicts
                              _controller.calendarEvents.isEmpty
                                  ? Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(Icons.event_available_outlined, size: 54, color: JarvisColors.textDisabled),
                                          const SizedBox(height: 12),
                                          Text('No calendar conflicts detected today.', style: JarvisTypography.bodyLarge),
                                        ],
                                      ),
                                    )
                                  : ListView.builder(
                                      itemCount: _controller.calendarEvents.length,
                                      itemBuilder: (ctx, i) => CalendarConflictCard(
                                        event: _controller.calendarEvents[i],
                                      ),
                                    ),

                              // 4. Medication Actions
                              overview?.medicationWorkflow == null
                                  ? Center(
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(Icons.medication_outlined, size: 54, color: JarvisColors.textDisabled),
                                          const SizedBox(height: 12),
                                          Text('Medication schedules synchronized.', style: JarvisTypography.bodyLarge),
                                        ],
                                      ),
                                    )
                                  : ListView(
                                      children: [
                                        MedicationActionCard(overview: overview!.medicationWorkflow!),
                                      ],
                                    ),
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
}
