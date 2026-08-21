import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/app_service_locator.dart';
import '../models/schedule_model.dart';

class EditRoutineScreen extends StatefulWidget {
  final ScheduleItem item;

  const EditRoutineScreen({super.key, required this.item});

  @override
  State<EditRoutineScreen> createState() => _EditRoutineScreenState();
}

class _EditRoutineScreenState extends State<EditRoutineScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;

  late TimeOfDay _selectedTime;
  late ActivityCategory _selectedCategory;
  late ActivityStatus _selectedStatus;
  late bool _reminderEnabled;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.item.title);
    _descriptionController = TextEditingController(text: widget.item.description);
    _selectedCategory = widget.item.category;
    _selectedStatus = widget.item.status;
    _reminderEnabled = widget.item.reminderEnabled;
    _selectedTime = _parseTimeOfDay(widget.item.time);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  TimeOfDay _parseTimeOfDay(String timeStr) {
    try {
      final clean = timeStr.replaceAll(RegExp(r'[^\d:APMapm\s]'), '').trim();
      final parts = clean.split(RegExp(r'\s+'));
      final hm = parts[0].split(':');
      int hour = int.parse(hm[0]);
      final int minute = int.parse(hm[1]);
      final isPm = parts.length > 1 && parts[1].toUpperCase() == 'PM';
      
      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour == 12) hour = 0;
      
      return TimeOfDay(hour: hour, minute: minute);
    } catch (_) {
      return const TimeOfDay(hour: 9, minute: 0);
    }
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
      
      final localizations = MaterialLocalizations.of(context);
      final formattedTime = localizations.formatTimeOfDay(
        _selectedTime,
        alwaysUse24HourFormat: false,
      );

      final updatedItem = widget.item.copyWith(
        title: _titleController.text,
        description: _descriptionController.text,
        time: formattedTime,
        category: _selectedCategory,
        status: _selectedStatus,
        reminderEnabled: _reminderEnabled,
        updatedAt: DateTime.now(),
      );

      controller.updateRoutine(updatedItem);
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Routine updated successfully!')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Edit Routine',
          style: TextStyle(fontWeight: FontWeight.bold),
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
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.description_rounded),
              ),
              validator: (val) =>
                  val == null || val.isEmpty ? 'Please enter a description' : null,
            ),
            const SizedBox(height: 24),

            // Category Dropdown
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
            const SizedBox(height: 20),

            // Status Dropdown
            DropdownButtonFormField<ActivityStatus>(
              value: _selectedStatus,
              decoration: InputDecoration(
                labelText: 'Status',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.check_circle_outline_rounded),
              ),
              items: ActivityStatus.values.map((stat) {
                return DropdownMenuItem<ActivityStatus>(
                  value: stat,
                  child: Row(
                    children: [
                      Icon(Icons.lens, color: stat.color, size: 12),
                      const SizedBox(width: 8),
                      Text(stat.displayName),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (stat) {
                if (stat != null) {
                  setState(() {
                    _selectedStatus = stat;
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
              ),
              child: const Text(
                'Save Changes',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
