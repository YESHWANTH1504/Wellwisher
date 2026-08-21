class AppointmentItem {
  final String id;
  final String title;
  final String? provider;
  final String? appointmentType;
  final String scheduledAt;
  final String? location;
  final String status;
  final String? doctorName;
  final String? notes;
  final String? briefingId;
  final String? createdAt;

  AppointmentItem({
    required this.id,
    required this.title,
    this.provider,
    this.appointmentType,
    required this.scheduledAt,
    this.location,
    required this.status,
    this.doctorName,
    this.notes,
    this.briefingId,
    this.createdAt,
  });

  factory AppointmentItem.fromJson(Map<String, dynamic> json) {
    return AppointmentItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      provider: json['provider']?.toString(),
      appointmentType: json['appointment_type']?.toString() ?? json['appointmentType']?.toString(),
      scheduledAt: json['scheduled_at']?.toString() ?? json['scheduledAt']?.toString() ?? '',
      location: json['location']?.toString(),
      status: json['status']?.toString() ?? 'PLANNED',
      doctorName: json['doctor_name']?.toString() ?? json['doctorName']?.toString(),
      notes: json['notes']?.toString(),
      briefingId: json['briefing_id']?.toString() ?? json['briefingId']?.toString(),
      createdAt: json['created_at']?.toString() ?? json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'provider': provider,
      'appointmentType': appointmentType,
      'scheduledAt': scheduledAt,
      'location': location,
      'status': status,
      'doctorName': doctorName,
      'notes': notes,
      'briefingId': briefingId,
      'createdAt': createdAt,
    };
  }
}

class WorkflowActionItem {
  final String id;
  final String actionType;
  final String title;
  final String description;
  final String priority;
  final String status;
  final bool requiresConfirmation;
  final Map<String, dynamic> payload;
  final String? confirmedAt;
  final String? createdAt;

  WorkflowActionItem({
    required this.id,
    required this.actionType,
    required this.title,
    required this.description,
    required this.priority,
    required this.status,
    required this.requiresConfirmation,
    required this.payload,
    this.confirmedAt,
    this.createdAt,
  });

  factory WorkflowActionItem.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic> parsedPayload = {};
    if (json['payload'] is Map) {
      parsedPayload = Map<String, dynamic>.from(json['payload'] as Map);
    }

    return WorkflowActionItem(
      id: json['id']?.toString() ?? '',
      actionType: json['action_type']?.toString() ?? json['actionType']?.toString() ?? 'OTHER',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      priority: json['priority']?.toString() ?? 'MEDIUM',
      status: json['status']?.toString() ?? 'PENDING',
      requiresConfirmation: json['requires_confirmation'] == 1 || json['requires_confirmation'] == true || json['requiresConfirmation'] == true,
      payload: parsedPayload,
      confirmedAt: json['confirmed_at']?.toString() ?? json['confirmedAt']?.toString(),
      createdAt: json['created_at']?.toString() ?? json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'actionType': actionType,
      'title': title,
      'description': description,
      'priority': priority,
      'status': status,
      'requiresConfirmation': requiresConfirmation,
      'payload': payload,
      'confirmedAt': confirmedAt,
      'createdAt': createdAt,
    };
  }
}

class CalendarEventItem {
  final String id;
  final String title;
  final String startTime;
  final String endTime;
  final String date;
  final String? description;
  final String? location;
  final String calendarType;
  final bool isAllDay;

  CalendarEventItem({
    required this.id,
    required this.title,
    required this.startTime,
    required this.endTime,
    required this.date,
    this.description,
    this.location,
    required this.calendarType,
    required this.isAllDay,
  });

  factory CalendarEventItem.fromJson(Map<String, dynamic> json) {
    return CalendarEventItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      startTime: json['startTime']?.toString() ?? '',
      endTime: json['endTime']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      description: json['description']?.toString(),
      location: json['location']?.toString(),
      calendarType: json['calendarType']?.toString() ?? 'DEVICE',
      isAllDay: json['isAllDay'] == true || json['isAllDay'] == 1,
    );
  }
}

class CalendarSlotItem {
  final String date;
  final String startTime;
  final String endTime;
  final int durationMinutes;

  CalendarSlotItem({
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.durationMinutes,
  });

  factory CalendarSlotItem.fromJson(Map<String, dynamic> json) {
    return CalendarSlotItem(
      date: json['date']?.toString() ?? '',
      startTime: json['startTime']?.toString() ?? '',
      endTime: json['endTime']?.toString() ?? '',
      durationMinutes: json['durationMinutes'] is int ? json['durationMinutes'] : (int.tryParse(json['durationMinutes']?.toString() ?? '0') ?? 0),
    );
  }
}

class MedicationWorkflowOverview {
  final List<dynamic> coverage;
  final List<dynamic> missingRoutines;
  final List<dynamic> reconciliationConcerns;
  final String disclaimer;

  MedicationWorkflowOverview({
    required this.coverage,
    required this.missingRoutines,
    required this.reconciliationConcerns,
    required this.disclaimer,
  });

  factory MedicationWorkflowOverview.fromJson(Map<String, dynamic> json) {
    return MedicationWorkflowOverview(
      coverage: json['coverage'] is List ? json['coverage'] as List : [],
      missingRoutines: json['missingRoutines'] is List ? json['missingRoutines'] as List : [],
      reconciliationConcerns: json['reconciliationConcerns'] is List ? json['reconciliationConcerns'] as List : [],
      disclaimer: json['disclaimer']?.toString() ?? 'Informational workflow only.',
    );
  }
}

class WorkflowOverview {
  final int upcomingAppointmentsCount;
  final int pendingActionsCount;
  final int todayCalendarEventsCount;
  final int medicationConcernsCount;
  final List<AppointmentItem> upcomingAppointments;
  final List<WorkflowActionItem> pendingActions;
  final List<CalendarEventItem> todayCalendarEvents;
  final MedicationWorkflowOverview? medicationWorkflow;
  final String disclaimer;

  WorkflowOverview({
    required this.upcomingAppointmentsCount,
    required this.pendingActionsCount,
    required this.todayCalendarEventsCount,
    required this.medicationConcernsCount,
    required this.upcomingAppointments,
    required this.pendingActions,
    required this.todayCalendarEvents,
    this.medicationWorkflow,
    required this.disclaimer,
  });

  factory WorkflowOverview.fromJson(Map<String, dynamic> json) {
    final appointmentsRaw = json['upcomingAppointments'] is List ? json['upcomingAppointments'] as List : [];
    final actionsRaw = json['pendingActions'] is List ? json['pendingActions'] as List : [];
    final eventsRaw = json['todayCalendarEvents'] is List ? json['todayCalendarEvents'] as List : [];

    return WorkflowOverview(
      upcomingAppointmentsCount: json['upcomingAppointmentsCount'] is int ? json['upcomingAppointmentsCount'] : 0,
      pendingActionsCount: json['pendingActionsCount'] is int ? json['pendingActionsCount'] : 0,
      todayCalendarEventsCount: json['todayCalendarEventsCount'] is int ? json['todayCalendarEventsCount'] : 0,
      medicationConcernsCount: json['medicationConcernsCount'] is int ? json['medicationConcernsCount'] : 0,
      upcomingAppointments: appointmentsRaw.map((e) => AppointmentItem.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
      pendingActions: actionsRaw.map((e) => WorkflowActionItem.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
      todayCalendarEvents: eventsRaw.map((e) => CalendarEventItem.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
      medicationWorkflow: json['medicationWorkflow'] != null ? MedicationWorkflowOverview.fromJson(Map<String, dynamic>.from(json['medicationWorkflow'] as Map)) : null,
      disclaimer: json['disclaimer']?.toString() ?? 'Informational workflow coordinator.',
    );
  }
}
