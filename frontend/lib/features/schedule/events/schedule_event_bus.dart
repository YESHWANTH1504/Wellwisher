import 'dart:async';

/// Source of the schedule mutation
enum ScheduleChangeSource {
  voice,
  ui,
  backendReconciliation,
  reminderExecution,
  reminder,
  sync,
  externalMutation
}

/// Action performed on the authoritative schedule
enum ScheduleActionType {
  create,
  update,
  delete,
  refresh
}

/// Event broadcast across the application whenever the authoritative schedule changes
class ScheduleChangeEvent {
  final ScheduleActionType action;
  final String? entityId;
  final DateTime? date;
  final String? dateStr;
  final ScheduleChangeSource source;
  final Map<String, dynamic>? metadata;

  const ScheduleChangeEvent({
    required this.action,
    required this.source,
    this.entityId,
    this.date,
    this.dateStr,
    this.metadata,
  });

  @override
  String toString() =>
      'ScheduleChangeEvent(action: $action, source: $source, entityId: $entityId, dateStr: $dateStr)';
}

/// Central Broadcast Event Bus for Schedule Mutations
class ScheduleEventBus {
  static final ScheduleEventBus _instance = ScheduleEventBus._internal();
  factory ScheduleEventBus() => _instance;
  ScheduleEventBus._internal();

  final _controller = StreamController<ScheduleChangeEvent>.broadcast();

  Stream<ScheduleChangeEvent> get stream => _controller.stream;

  void publish(ScheduleChangeEvent event) {
    _controller.add(event);
  }

  void publishMutation({
    required ScheduleActionType action,
    required ScheduleChangeSource source,
    String? entityId,
    DateTime? date,
    String? dateStr,
    Map<String, dynamic>? metadata,
  }) {
    publish(
      ScheduleChangeEvent(
        action: action,
        source: source,
        entityId: entityId,
        date: date,
        dateStr: dateStr,
        metadata: metadata,
      ),
    );
  }
}
