import 'package:flutter/material.dart';
import '../../../core/routes/app_routes.dart';
import '../../../services/app_service_locator.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/senior_caregiver_sync_service.dart';
import '../../../services/sound_service.dart';
import '../../../services/voice_notification_service.dart';
import '../../family/widgets/voice_note_composer_sheet.dart';
import '../../health/widgets/hydration_tracker_widget.dart';
import '../../schedule/models/schedule_model.dart';
import '../../schedule/widgets/schedule_item_options_sheet.dart';
import '../../schedule/widgets/voice_schedule_composer_modal.dart';

class WorkerDashboardScreen extends StatefulWidget {
  const WorkerDashboardScreen({super.key});

  @override
  State<WorkerDashboardScreen> createState() => _WorkerDashboardScreenState();
}

class _WorkerDashboardScreenState extends State<WorkerDashboardScreen> {
  final LocalStorageService _storage = LocalStorageService();
  final SeniorCaregiverSyncService _syncService = SeniorCaregiverSyncService();

  void _simulateCallMom() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.phone_in_talk, color: Colors.green),
            SizedBox(width: 10),
            Text('Calling Mom (Sarah)'),
          ],
        ),
        content: const Text('Connecting high-clarity voice call to Mom (+91 98765 43210)...'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('End Call', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showLinkSeniorSheet() {
    final codeController = TextEditingController(text: _storage.linkedSeniorCode);
    final nameController = TextEditingController(text: _storage.linkedSeniorName);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          top: 20, left: 18, right: 18,
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Colors.purple.shade100,
                    radius: 18,
                    child: Icon(Icons.elderly_rounded, color: Colors.purple.shade900, size: 22),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '🔗 Link Senior Parent Profile',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'For working professionals caring for elderly parents',
                          style: TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Text(
                'Enter your senior parent\'s unique WellWisher code (visible in their Senior Portal):',
                style: TextStyle(fontSize: 12, color: Colors.black87),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: codeController,
                decoration: const InputDecoration(
                  labelText: 'Senior Pairing Code',
                  hintText: 'e.g. SENIOR-SARAH-9876',
                  prefixIcon: Icon(Icons.qr_code),
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Parent / Senior Name & Relation',
                  hintText: 'e.g. Mom (Sarah)',
                  prefixIcon: Icon(Icons.person),
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.purple.shade800,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () {
                    setState(() {
                      _storage.workerCaregiverLinkEnabled = true;
                      _storage.linkedSeniorCode = codeController.text.trim();
                      _storage.linkedSeniorName = nameController.text.trim();
                    });
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Linked to ${_storage.linkedSeniorName}! Live caregiver monitor active. ❤️'),
                        backgroundColor: Colors.purple.shade800,
                      ),
                    );
                  },
                  icon: const Icon(Icons.link, color: Colors.white, size: 18),
                  label: const Text('Connect & Enable Caregiver Monitor', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isLinked = _storage.workerCaregiverLinkEnabled;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: isDark ? Colors.teal.shade900.withValues(alpha: 0.4) : Colors.teal.shade100,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                isLinked ? '💼 WORKER & CAREGIVER' : '💼 WORKER MODE',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? Colors.tealAccent : Colors.teal,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Good Day, Professional 👋',
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                        Text(
                          isLinked
                              ? 'Workplace focus, eye care & connected Senior Parent monitor'
                              : 'Maintain high workplace focus, posture & 20-20-20 eye care',
                          style: TextStyle(color: isDark ? Colors.grey.shade400 : Colors.grey[600], fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: () {
                      Navigator.pushNamed(context, AppRoutes.portal);
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white12 : Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.swap_horiz_rounded, size: 16, color: isDark ? Colors.white : Colors.black87),
                          const SizedBox(width: 4),
                          Text('Portals', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Senior Parent Caregiver Monitor (Optional & Linkable)
              if (isLinked)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF4A148C), Color(0xFF6A1B9A)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.purple.withValues(alpha: 0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                CircleAvatar(
                                  backgroundColor: Colors.white,
                                  radius: 18,
                                  child: Icon(Icons.elderly_rounded, color: Colors.purple.shade900, size: 22),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '👵 ${_storage.linkedSeniorName} • Live Link',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13.5,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const Text(
                                        'Connected & Active • Real-time Sync',
                                        style: TextStyle(color: Colors.white70, fontSize: 10),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                padding: const EdgeInsets.all(4),
                                constraints: const BoxConstraints(),
                                icon: const Icon(Icons.phone_in_talk_rounded, color: Colors.greenAccent, size: 22),
                                tooltip: 'Call Mom',
                                onPressed: _simulateCallMom,
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                padding: const EdgeInsets.all(4),
                                constraints: const BoxConstraints(),
                                icon: const Icon(Icons.settings_outlined, color: Colors.white70, size: 20),
                                tooltip: 'Caregiver Settings',
                                onPressed: () {
                                  showModalBottomSheet(
                                    context: context,
                                    shape: const RoundedRectangleBorder(
                                      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                                    ),
                                    builder: (ctx) => Padding(
                                      padding: const EdgeInsets.all(20),
                                      child: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Text('Senior Caregiver Settings', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                          const SizedBox(height: 14),
                                          ListTile(
                                            leading: const Icon(Icons.edit, color: Colors.purple),
                                            title: const Text('Edit Linked Parent Details'),
                                            onTap: () {
                                              Navigator.pop(ctx);
                                              _showLinkSeniorSheet();
                                            },
                                          ),
                                          ListTile(
                                            leading: const Icon(Icons.link_off, color: Colors.red),
                                            title: const Text('Unlink Parent Profile (Worker Solo Mode)'),
                                            onTap: () {
                                              setState(() {
                                                _storage.workerCaregiverLinkEnabled = false;
                                              });
                                              Navigator.pop(ctx);
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                const SnackBar(content: Text('Switched to Solo Worker Mode.')),
                                              );
                                            },
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Live Senior Parent Activity Feed 📋:',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 6),
                            ListenableBuilder(
                              listenable: _syncService,
                              builder: (context, _) {
                                final activities = _syncService.activityFeed.take(2).toList();
                                return Column(
                                  children: activities.map((act) {
                                    return Padding(
                                      padding: const EdgeInsets.only(bottom: 4),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.check_circle_rounded, color: Colors.greenAccent, size: 14),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              '${act.title} (${act.timestamp})',
                                              style: const TextStyle(color: Colors.white, fontSize: 11),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF25D366), // WhatsApp green
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onPressed: () {
                                VoiceNoteComposerSheet.show(context, initialIsScheduled: false);
                              },
                              icon: const Icon(Icons.mic_rounded, size: 16, color: Colors.white),
                              label: const FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text('Send Voice Note', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: Colors.purple.shade900,
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onPressed: () {
                                VoiceNoteComposerSheet.show(context, initialIsScheduled: true);
                              },
                              icon: const Icon(Icons.alarm_on_rounded, size: 16, color: Colors.purple),
                              label: const FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text('Schedule Voice', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                )
              else
                // Optional Caregiver Link Banner for Workers with Elderly Parents
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.purple.shade50,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.purple.shade200),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: Colors.purple.shade100,
                        radius: 20,
                        child: Icon(Icons.family_restroom_rounded, color: Colors.purple.shade800, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '👨‍👩‍👧 Caring for Elderly Parents?',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: Colors.purple.shade900,
                              ),
                            ),
                            Text(
                              'Link your parent\'s WellWisher app to receive live routine & SOS updates.',
                              style: TextStyle(color: Colors.purple.shade700, fontSize: 10),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),
                      ElevatedButton(
                        onPressed: _showLinkSeniorSheet,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.purple.shade800,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('Link Parent', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 16),

              // Screen Care & Eye Rest Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.teal.shade700, Colors.teal.shade900],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.teal.withValues(alpha: 0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.remove_red_eye_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            '👁️ 20-20-20 Eye Care Protection',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Every 20 mins, look at something 20 ft away for 20 seconds. Reduces computer vision syndrome!',
                            style: TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.tune_rounded, color: Colors.white),
                      onPressed: () {
                        Navigator.pushNamed(context, AppRoutes.screenCareSettings);
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // 30-Min Hydration Tracker Widget
              const HydrationTrackerWidget(),

              const SizedBox(height: 16),

              // AI Voice-to-Text Routine Scheduler Hero Banner
              InkWell(
                onTap: () {
                  VoiceScheduleComposerModal.show(
                    context,
                    controller: AppServiceLocator().scheduleController,
                  );
                },
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF6366F1).withValues(alpha: 0.35),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.mic_rounded,
                          color: Colors.white,
                          size: 26,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Flexible(
                                  child: FittedBox(
                                    fit: BoxFit.scaleDown,
                                    alignment: Alignment.centerLeft,
                                    child: Text(
                                      '🎙️ Voice Routine Scheduler',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.amber,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'AI VOICE',
                                    style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: Colors.black87),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            const Text(
                              'Speak naturally: "Set me a reminder for an early morning walk at 6:00 AM"',
                              style: TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white70, size: 16),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 18),

              // Work Wellness Quick Actions Grid
              Text(
                'Workplace Wellness & Focus Actions',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _WorkerActionCard(
                      icon: Icons.bedtime_rounded,
                      title: 'Sleep & Mood',
                      subtitle: 'Log energy & focus',
                      color: Colors.indigo,
                      onTap: () => Navigator.pushNamed(context, AppRoutes.sleepMood),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _WorkerActionCard(
                      icon: Icons.auto_awesome_rounded,
                      title: 'AI Work Coach',
                      subtitle: 'Plan focus routine',
                      color: Colors.teal.shade800,
                      onTap: () => Navigator.pushNamed(context, AppRoutes.aiCoach),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _WorkerActionCard(
                      icon: Icons.bar_chart_rounded,
                      title: 'Productivity Stats',
                      subtitle: 'Streaks & analytics',
                      color: Colors.deepPurple,
                      onTap: () => Navigator.pushNamed(context, AppRoutes.statistics),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _WorkerActionCard(
                      icon: Icons.family_restroom_rounded,
                      title: isLinked ? 'Caregiver Hub' : 'Link Parent',
                      subtitle: isLinked ? 'Mom\'s schedule & feed' : 'Elderly care option',
                      color: Colors.purple.shade700,
                      onTap: () {
                        if (isLinked) {
                          Navigator.pushNamed(context, AppRoutes.caregiverHub);
                        } else {
                          _showLinkSeniorSheet();
                        }
                      },
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Today's Workday Schedule Preview Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Flexible(
                          child: Text(
                            'Today\'s Workday Schedule',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.notifications_active_rounded, color: Color(0xFF16A34A), size: 20),
                          tooltip: 'Live Test Status Bar Pop-Up Notification',
                          onPressed: () {
                            VoiceNotificationService().showLiveTestSheet(context);
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: () {
                      Navigator.pushNamed(context, AppRoutes.schedule);
                    },
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text('Full Schedule'),
                  ),
                ],
              ),

              const SizedBox(height: 6),

              ListenableBuilder(
                listenable: AppServiceLocator().scheduleController,
                builder: (context, _) {
                  final controller = AppServiceLocator().scheduleController;
                  final routines = controller.currentRoutines.take(5).toList();

                  if (routines.isEmpty) {
                    return Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: const Center(
                        child: Text(
                          'No scheduled routines for today.',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ),
                    );
                  }

                  return Column(
                    children: routines.map((item) {
                      final isCompleted = item.status == ActivityStatus.completed;
                      return _WorkerRoutineCard(
                        title: item.title,
                        time: item.time,
                        tag: item.category.displayName,
                        isCompleted: isCompleted,
                        requiresCompletionStatus: item.requiresCompletionStatus,
                        onToggleComplete: item.requiresCompletionStatus
                            ? () async {
                                final newStatus = isCompleted ? ActivityStatus.upcoming : ActivityStatus.completed;
                                await controller.updateRoutine(item.copyWith(status: newStatus));
                                if (newStatus == ActivityStatus.completed) {
                                  SoundService.playChime();
                                }
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        newStatus == ActivityStatus.completed
                                            ? '✅ Completed "${item.title}"!'
                                            : 'Marked "${item.title}" as upcoming',
                                      ),
                                      backgroundColor: newStatus == ActivityStatus.completed
                                          ? const Color(0xFF16A34A)
                                          : Colors.teal.shade800,
                                      duration: const Duration(seconds: 1),
                                      behavior: SnackBarBehavior.floating,
                                    ),
                                  );
                                }
                              }
                            : null,
                        onTap: () {
                          ScheduleItemOptionsSheet.show(context, item, controller);
                        },
                      );
                    }).toList(),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WorkerActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _WorkerActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: theme.cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? Colors.white12 : Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: color.withValues(alpha: isDark ? 0.25 : 0.12),
              radius: 20,
              child: Icon(icon, color: isDark ? color.withValues(alpha: 0.9) : color, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(color: isDark ? Colors.grey.shade400 : Colors.grey[600], fontSize: 10),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
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

class _WorkerRoutineCard extends StatelessWidget {
  final String title;
  final String time;
  final String tag;
  final bool isCompleted;
  final bool requiresCompletionStatus;
  final VoidCallback? onToggleComplete;
  final VoidCallback? onTap;

  const _WorkerRoutineCard({
    required this.title,
    required this.time,
    required this.tag,
    required this.isCompleted,
    this.requiresCompletionStatus = false,
    this.onToggleComplete,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      color: theme.cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: requiresCompletionStatus
              ? (isDark ? Colors.orange.shade400 : Colors.orange.shade300)
              : (isDark ? Colors.white12 : Colors.grey.shade200),
          width: requiresCompletionStatus ? 1.4 : 1.0,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: ListTile(
          dense: true,
          leading: requiresCompletionStatus
              ? IconButton(
                  icon: Icon(
                    isCompleted ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                    color: isCompleted ? const Color(0xFF16A34A) : Colors.orange.shade800,
                  ),
                  onPressed: onToggleComplete,
                  tooltip: isCompleted ? 'Mark Upcoming' : 'Mark Complete',
                )
              : const Padding(
                  padding: EdgeInsets.all(8.0),
                  child: Icon(Icons.notifications_active_outlined, color: Colors.teal, size: 20),
                ),
          title: Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontWeight: requiresCompletionStatus ? FontWeight.bold : FontWeight.w600,
                    fontSize: 13,
                    decoration: isCompleted ? TextDecoration.lineThrough : null,
                    color: isCompleted ? Colors.grey : (isDark ? Colors.white : Colors.black87),
                  ),
                ),
              ),
              if (requiresCompletionStatus)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.amber.shade900.withValues(alpha: 0.4) : Colors.amber.shade100,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '⭐ MAIN',
                    style: TextStyle(
                      fontSize: 8.5,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.amber.shade300 : Colors.amber.shade900,
                    ),
                  ),
                ),
            ],
          ),
          subtitle: Text('$time • $tag', style: TextStyle(fontSize: 11, color: isDark ? Colors.grey.shade400 : Colors.grey.shade700)),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: requiresCompletionStatus
                      ? (isCompleted
                          ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFDCFCE7))
                          : (isDark ? Colors.amber.shade900.withValues(alpha: 0.3) : Colors.amber.shade50))
                      : (isDark ? Colors.white10 : Colors.grey.shade100),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  requiresCompletionStatus
                      ? (isCompleted ? 'Done ✅' : 'Required ⏰')
                      : 'Reminder 🔔',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: requiresCompletionStatus
                        ? (isCompleted ? (isDark ? const Color(0xFF4ADE80) : const Color(0xFF16A34A)) : (isDark ? Colors.amber.shade300 : Colors.amber.shade900))
                        : (isDark ? Colors.grey.shade300 : Colors.grey.shade700),
                  ),
                ),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.more_vert_rounded, size: 16, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}
