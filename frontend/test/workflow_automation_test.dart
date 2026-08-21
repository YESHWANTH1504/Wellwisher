import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/models/workflow_models.dart';
import 'package:wellwisher/features/jarvis/widgets/action_center_header.dart';
import 'package:wellwisher/features/jarvis/widgets/pending_confirmation_card.dart';
import 'package:wellwisher/features/jarvis/widgets/appointment_action_card.dart';
import 'package:wellwisher/features/jarvis/widgets/medication_action_card.dart';
import 'package:wellwisher/features/jarvis/widgets/calendar_conflict_card.dart';

void main() {
  group('Phase 10: Workflow Automation Flutter Models & Widgets Tests', () {
    test('1. Parses AppointmentItem correctly from JSON', () {
      final json = {
        'id': 'apt_101',
        'title': 'Cardiology Consultation',
        'provider': 'Metro Heart Hospital',
        'appointment_type': 'Cardiology',
        'scheduled_at': '2026-09-10T10:30:00Z',
        'location': 'Room 402',
        'status': 'CONFIRMED',
        'doctor_name': 'Dr. Banner',
        'notes': 'Check ECG and blood pressure',
        'briefing_id': 'brf_501',
        'created_at': '2026-08-20T12:00:00Z'
      };

      final item = AppointmentItem.fromJson(json);
      expect(item.id, 'apt_101');
      expect(item.title, 'Cardiology Consultation');
      expect(item.provider, 'Metro Heart Hospital');
      expect(item.status, 'CONFIRMED');
      expect(item.doctorName, 'Dr. Banner');
      expect(item.briefingId, 'brf_501');
    });

    test('2. Parses WorkflowActionItem correctly from JSON', () {
      final json = {
        'id': 'act_201',
        'action_type': 'SCHEDULE_LAB_TEST',
        'title': 'Book Lipid Profile Follow-up',
        'description': 'Doctor requested fasting lipid test within 14 days.',
        'priority': 'HIGH',
        'status': 'PENDING',
        'requires_confirmation': true,
        'payload': {'tests': ['Lipid Profile', 'HbA1c']}
      };

      final action = WorkflowActionItem.fromJson(json);
      expect(action.id, 'act_201');
      expect(action.actionType, 'SCHEDULE_LAB_TEST');
      expect(action.requiresConfirmation, true);
      expect(action.payload['tests'], contains('Lipid Profile'));
    });

    test('3. Parses CalendarEventItem and CalendarSlotItem correctly', () {
      final calJson = {
        'id': 'cal_301',
        'title': 'Team Sync & Standup',
        'startTime': '09:00 AM',
        'endTime': '09:30 AM',
        'date': '2026-08-21',
        'calendarType': 'GOOGLE',
        'isAllDay': false
      };

      final event = CalendarEventItem.fromJson(calJson);
      expect(event.id, 'cal_301');
      expect(event.calendarType, 'GOOGLE');
      expect(event.startTime, '09:00 AM');

      final slotJson = {
        'date': '2026-08-21',
        'startTime': '11:00 AM',
        'endTime': '12:00 PM',
        'durationMinutes': 60
      };

      final slot = CalendarSlotItem.fromJson(slotJson);
      expect(slot.durationMinutes, 60);
      expect(slot.startTime, '11:00 AM');
    });

    test('4. Parses MedicationWorkflowOverview with safety disclaimer', () {
      final json = {
        'coverage': [{'name': 'Metformin', 'hasReminder': true}],
        'missingRoutines': ['Atorvastatin 20mg'],
        'reconciliationConcerns': ['Dose timing conflict between morning and evening medications'],
        'disclaimer': 'Informational workflow coordinator. JARVIS never modifies prescriptions.'
      };

      final overview = MedicationWorkflowOverview.fromJson(json);
      expect(overview.missingRoutines.length, 1);
      expect(overview.reconciliationConcerns.length, 1);
      expect(overview.disclaimer, contains('never modifies prescriptions'));
    });

    testWidgets('5. Renders ActionCenterHeader with stats and safety banner', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ActionCenterHeader(
              upcomingAppointments: 3,
              pendingApprovals: 2,
              calendarEvents: 5,
              medicationConcerns: 1,
            ),
          ),
        ),
      );

      expect(find.text('JARVIS ACTION CENTER'), findsOneWidget);
      expect(find.text('3 Appts'), findsOneWidget);
      expect(find.text('2 Pending'), findsOneWidget);
      expect(find.text('1 Meds'), findsOneWidget);
      expect(find.byIcon(Icons.shield_outlined), findsOneWidget);
    });

    testWidgets('6. Renders PendingConfirmationCard and triggers confirm/dismiss callbacks', (tester) async {
      bool confirmed = false;
      bool dismissed = false;

      final action = WorkflowActionItem(
        id: 'act_99',
        actionType: 'CREATE_CALENDAR_EVENT',
        title: 'Add Cardiology Follow-up to Google Calendar',
        description: 'Schedule event on September 15, 2026 at 10:00 AM',
        priority: 'HIGH',
        status: 'PENDING',
        requiresConfirmation: true,
        payload: {},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PendingConfirmationCard(
              action: action,
              onConfirm: () => confirmed = true,
              onDismiss: () => dismissed = true,
            ),
          ),
        ),
      );

      expect(find.text('Add Cardiology Follow-up to Google Calendar'), findsOneWidget);
      expect(find.text('Confirm Action'), findsOneWidget);
      expect(find.text('Dismiss'), findsOneWidget);

      await tester.tap(find.text('Confirm Action'));
      expect(confirmed, true);

      await tester.tap(find.text('Dismiss'));
      expect(dismissed, true);
    });

    testWidgets('7. Renders AppointmentActionCard with provider and prepare briefing button', (tester) async {
      bool prepared = false;

      final apt = AppointmentItem(
        id: 'apt_55',
        title: 'Neurology Consultation',
        doctorName: 'Dr. Strange',
        scheduledAt: '2026-09-22 14:00',
        location: 'Sanctum Medical Wing',
        status: 'PLANNED',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppointmentActionCard(
              appointment: apt,
              onPrepareBriefing: () => prepared = true,
            ),
          ),
        ),
      );

      expect(find.text('Neurology Consultation'), findsOneWidget);
      expect(find.text('Provider: Dr. Dr. Strange'), findsOneWidget);
      expect(find.text('Prepare Briefing'), findsOneWidget);

      await tester.tap(find.text('Prepare Briefing'));
      expect(prepared, true);
    });

    testWidgets('8. Renders MedicationActionCard with gaps and safety notices', (tester) async {
      final overview = MedicationWorkflowOverview(
        coverage: [],
        missingRoutines: ['Atorvastatin 20mg'],
        reconciliationConcerns: ['Doctor review advised for timing'],
        disclaimer: 'Informational only. Prescriptions are immutable.',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MedicationActionCard(overview: overview),
          ),
        ),
      );

      expect(find.text('Medication Routine Coverage'), findsOneWidget);
      expect(find.textContaining('1 active medication(s) not currently linked'), findsOneWidget);
      expect(find.textContaining('1 medication review item(s)'), findsOneWidget);
      expect(find.text('Informational only. Prescriptions are immutable.'), findsOneWidget);
    });

    testWidgets('9. Renders CalendarConflictCard with time details and provider badge', (tester) async {
      final event = CalendarEventItem(
        id: 'cal_9',
        title: 'Client Demo & Roadmap Review',
        startTime: '02:00 PM',
        endTime: '03:00 PM',
        date: '2026-08-21',
        calendarType: 'OUTLOOK',
        isAllDay: false,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CalendarConflictCard(event: event),
          ),
        ),
      );

      expect(find.text('Client Demo & Roadmap Review'), findsOneWidget);
      expect(find.text('2026-08-21 • 02:00 PM - 03:00 PM'), findsOneWidget);
      expect(find.text('OUTLOOK'), findsOneWidget);
    });
  });
}
