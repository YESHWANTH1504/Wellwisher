# WellWisher JARVIS — Workflow Automation Engine

## Overview
The Workflow Automation Engine bridges health intelligence insights, clinical reports, and doctor consultations with daily schedule execution and external calendar providers.

## Key Subsystems
1. **Appointment Workflow Engine (`appointmentWorkflowEngine.js`)**:
   - Manages appointment states (`PLANNED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`).
   - Detects scheduling conflicts across device routines, calendar events, and other consultations.
2. **Doctor Visit Preparation & Follow-Up Engine (`doctorVisitWorkflowEngine.js`)**:
   - Generates structured 1-page health briefings compiling vitals trends, lab observations, and clinician questions.
   - Records post-visit completion notes and autonomously generates pending action items for requested lab tests and follow-up consultations.
3. **Medication Workflow Engine (`medicationWorkflowEngine.js`)**:
   - Evaluates schedule routine coverage for active prescriptions.
   - Highlights review points without mutating clinical prescriptions.
4. **Calendar Integration Layer (`calendarProvider.js`)**:
   - Abstractions for Google Calendar, Microsoft Outlook, and Device Calendar providers.
   - Provides free-slot search and conflict discovery.
5. **Workflow Verifier (`workflowVerifier.js`)**:
   - Ensures zero hallucinated action confirmations.
