import 'package:flutter/material.dart';
import '../services/screen_care_service.dart';

class ScreenCareController extends ChangeNotifier {
  final ScreenCareService service;
  bool _isEnabled = false;

  ScreenCareController({required this.service}) {
    _isEnabled = service.isScreenCareEnabled();
  }

  bool get isEnabled => _isEnabled;

  Future<void> toggleScreenCare(bool value) async {
    _isEnabled = value;
    await service.setScreenCareEnabled(value);
    notifyListeners();
  }
}
