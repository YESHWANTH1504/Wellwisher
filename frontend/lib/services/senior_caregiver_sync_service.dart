import 'package:flutter/foundation.dart';

class SeniorActivityLog {
  final String id;
  final String title;
  final String category; // 'medicine', 'meal', 'walk', 'sos', 'voice_memo'
  final String timestamp;
  final bool isUrgent;
  final String memberName;

  SeniorActivityLog({
    required this.id,
    required this.title,
    required this.category,
    required this.timestamp,
    this.isUrgent = false,
    this.memberName = 'Mom (Sarah)',
  });
}

class SeniorCaregiverSyncService extends ChangeNotifier {
  static final SeniorCaregiverSyncService _instance = SeniorCaregiverSyncService._internal();
  factory SeniorCaregiverSyncService() => _instance;
  SeniorCaregiverSyncService._internal();

  final List<SeniorActivityLog> _activityFeed = [
    SeniorActivityLog(
      id: 'act_1',
      title: 'Mom had Breakfast & Morning BP Medicine 🥣💊',
      category: 'medicine',
      timestamp: 'Today, 08:05 AM',
      isUrgent: false,
    ),
    SeniorActivityLog(
      id: 'act_2',
      title: 'Family Voice Memo from Rahul (Son) played on Mom\'s phone 🎙️❤️',
      category: 'voice_memo',
      timestamp: 'Today, 08:00 AM',
      isUrgent: false,
    ),
    SeniorActivityLog(
      id: 'act_3',
      title: 'Mom completed 15-min Gentle Garden Walk 🚶‍♀️🌿',
      category: 'walk',
      timestamp: 'Yesterday, 05:45 PM',
      isUrgent: false,
    ),
    SeniorActivityLog(
      id: 'act_4',
      title: 'Mom logged Dinner & Night Routine 🍽️🌙',
      category: 'meal',
      timestamp: 'Yesterday, 08:00 PM',
      isUrgent: false,
    ),
  ];

  List<SeniorActivityLog> get activityFeed => List.unmodifiable(_activityFeed);

  int get unreadCount => _activityFeed.where((a) => a.isUrgent).length;

  void logSeniorActivity({
    required String title,
    required String category,
    bool isUrgent = false,
    String memberName = 'Mom (Sarah)',
  }) {
    final newLog = SeniorActivityLog(
      id: 'act_${DateTime.now().millisecondsSinceEpoch}',
      title: title,
      category: category,
      timestamp: 'Just now',
      isUrgent: isUrgent,
      memberName: memberName,
    );
    _activityFeed.insert(0, newLog);
    notifyListeners();
  }

  void triggerSosAlert(String details) {
    logSeniorActivity(
      title: '🚨 EMERGENCY SOS TRIGGERED BY MOM: $details',
      category: 'sos',
      isUrgent: true,
    );
  }
}
