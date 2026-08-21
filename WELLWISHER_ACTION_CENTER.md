# WellWisher JARVIS — Action Center Frontend Reference

## Features
- **Action Center Header**: Real-time aggregated statistics for planned consultations, pending approvals, calendar syncs, and medication coverage.
- **Pending Approvals Tab**: Cryptographic confirmation cards for high-risk actions (calendar creation, lab tests, routines).
- **Doctor Appointments Tab**: Appointment cards with 1-page Briefing generation modals and Visit Completion dialogs.
- **Calendar Synchronizer Tab**: Synchronized multi-provider schedule events and conflict cards.
- **Medication Routine Tab**: Routine coverage summary and medication review points.

## Architecture
- **Model**: `workflow_models.dart`
- **API Service**: `workflow_api_service.dart`
- **Controller**: `workflow_controller.dart`
- **Widgets**: `action_center_header.dart`, `pending_confirmation_card.dart`, `appointment_action_card.dart`, `medication_action_card.dart`, `calendar_conflict_card.dart`, `workflow_action_card.dart`
- **Screen**: `jarvis_action_center_screen.dart` (Route: `/jarvis/action-center`)
