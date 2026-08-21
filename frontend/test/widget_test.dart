import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/schedule/models/schedule_model.dart';

void main() {
  test('Schedule item model test', () {
    final item = ScheduleItem(
      id: 'test_1',
      title: 'Water Break',
      description: 'Drink water',
      time: '11:00 AM',
      category: ActivityCategory.waterReminder,
      status: ActivityStatus.upcoming,
      date: DateTime.now(),
      reminderEnabled: true,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    expect(item.title, 'Water Break');
    expect(item.category, ActivityCategory.waterReminder);
  });
}
