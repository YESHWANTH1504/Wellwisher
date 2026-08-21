import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/app_service_locator.dart';
import '../models/schedule_model.dart';

class AddRoutineScreen extends StatefulWidget {
  const AddRoutineScreen({super.key});

  @override
  State<AddRoutineScreen> createState() => _AddRoutineScreenState();
}

class _AddRoutineScreenState extends State<AddRoutineScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  TimeOfDay _selectedTime = const TimeOfDay(hour: 9, minute: 0);
  ActivityCategory _selectedCategory = ActivityCategory.custom;
  bool _reminderEnabled = true;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _selectTime(BuildContext context) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (picked != null && picked != _selectedTime) {
      setState(() {
        _selectedTime = picked;
      });
    }
  }

  void _submitForm() {
    if (_formKey.currentState!.validate()) {
      final controller = AppServiceLocator().scheduleController;
      
      // Format time string (e.g. "09:00 AM")
      final localizations = MaterialLocalizations.of(context);
      final formattedTime = localizations.formatTimeOfDay(
        _selectedTime,
        alwaysUse24HourFormat: false,
      );

      final newItem = ScheduleItem(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        title: _titleController.text,
        description: _descriptionController.text,
        time: formattedTime,
        category: _selectedCategory,
        status: ActivityStatus.upcoming,
        date: controller.selectedDate,
        reminderEnabled: _reminderEnabled,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      controller.addNewRoutine(newItem);
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Add Wellness Routine',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(24.0),
          children: [
            // Title Input
            TextFormField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: 'Activity Title',
                hintText: 'e.g., Drink Water, Stretch, Stand up',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.title_rounded),
              ),
              validator: (val) =>
                  val == null || val.isEmpty ? 'Please enter a title' : null,
            ),
            const SizedBox(height: 20),

            // Description Input
            TextFormField(
              controller: _descriptionController,
              maxLines: 2,
              decoration: InputDecoration(
                labelText: 'Description',
                hintText: 'e.g., Hydrate with one glass of water.',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.description_rounded),
              ),
              validator: (val) =>
                  val == null || val.isEmpty ? 'Please enter a description' : null,
            ),
            const SizedBox(height: 24),

            // Category Selection Dropdown
            DropdownButtonFormField<ActivityCategory>(
              value: _selectedCategory,
              decoration: InputDecoration(
                labelText: 'Category',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.category_rounded),
              ),
              items: ActivityCategory.values.map((cat) {
                return DropdownMenuItem<ActivityCategory>(
                  value: cat,
                  child: Row(
                    children: [
                      Icon(cat.icon, color: cat.color, size: 20),
                      const SizedBox(width: 8),
                      Text(cat.displayName),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (cat) {
                if (cat != null) {
                  setState(() {
                    _selectedCategory = cat;
                  });
                }
              },
            ),
            const SizedBox(height: 24),

            // Time Selector Card
            Card(
              elevation: 0,
              color: Colors.grey.shade50,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: ListTile(
                leading: const Icon(Icons.access_time_filled_rounded, color: AppColors.primary),
                title: const Text('Reminder Time', style: TextStyle(fontWeight: FontWeight.w600)),
                trailing: Text(
                  _selectedTime.format(context),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                onTap: () => _selectTime(context),
              ),
            ),
            const SizedBox(height: 16),

            // Reminder Toggle Switch
            SwitchListTile(
              title: const Text('Enable Reminder Notifications', style: TextStyle(fontWeight: FontWeight.w600)),
              subtitle: const Text('Get notified when it\'s time for this routine'),
              value: _reminderEnabled,
              onChanged: (val) {
                setState(() {
                  _reminderEnabled = val;
                });
              },
              secondary: const Icon(Icons.notifications_active_rounded),
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 40),

            // Submit Button
            ElevatedButton(
              onPressed: _submitForm,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 2,
              ),
              child: const Text(
                'Save Activity',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
