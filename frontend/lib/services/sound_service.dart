import 'package:flutter/foundation.dart';

class SoundService {
  static bool soundEnabled = true;

  static void playChime() {
    if (!soundEnabled) return;
    if (kDebugMode) {
      print('🔊 [Sound Cue] Play completion chime!');
    }
  }

  static void playWaterDrop() {
    if (!soundEnabled) return;
    if (kDebugMode) {
      print('💧 [Sound Cue] Play water drop sound!');
    }
  }

  static void playEyeBreakSound() {
    if (!soundEnabled) return;
    if (kDebugMode) {
      print('👀 [Sound Cue] Play eye break chime!');
    }
  }
}
