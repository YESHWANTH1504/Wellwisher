import 'package:flutter/foundation.dart';

abstract class IWakeWordService {
  Future<void> start({required VoidCallback onWakeWordDetected});
  Future<void> stop();
  void dispose();
  bool get isListening;
}

/// WakeWordService
/// Extension point for future on-device keyword spotting / wake-word detection.
/// Remains dormant for Phase 5 initial release.
class WakeWordService implements IWakeWordService {
  bool _isListening = false;

  @override
  bool get isListening => _isListening;

  @override
  Future<void> start({required VoidCallback onWakeWordDetected}) async {
    // Disabled in Phase 5 baseline
    _isListening = false;
  }

  @override
  Future<void> stop() async {
    _isListening = false;
  }

  @override
  void dispose() {
    _isListening = false;
  }
}
