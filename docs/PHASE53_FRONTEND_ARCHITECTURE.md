# Phase 53: Frontend Architecture — JARVIS Command Center

## 1. UI Hierarchy and Interaction Paradigm
The WellWisher Flutter frontend (`frontend/lib`) has been reorganized around the **JARVIS Command Center**:
- **Root Screen**: `JarvisHomeScreen` (`frontend/lib/features/jarvis/screens/jarvis_home_screen.dart`).
- **Core Visual Engine**: `JarvisCore` (`frontend/lib/features/jarvis/widgets/jarvis_core.dart`) provides high-fidelity hardware-accelerated animated representations of current cognitive states.
- **Dynamic Interaction Stream**:
  - `JarvisConversationCard`: Renders speech turns with distinct typography.
  - `ExecutionStepChips`: Dynamically renders tool execution progress (e.g. `[1/1] create_schedule -> OK`).
  - `ConfirmationCard`: In-line interactive confirmation cards for destructive or irreversible actions.
- **Voice Control Deck**: Floating, responsive bottom deck supporting one-touch barge-in, keyboard text input switch, and memory inspection.

## 2. Model & State Binding
`JarvisHomeController` provides reactive state management:
```dart
class JarvisHomeController extends ChangeNotifier {
  JarvisState _currentState = JarvisState.idle;
  final List<JarvisChatMessage> _messages = [];
  bool _isListening = false;
  bool _isSpeaking = false;
  ...
}
```
State updates trigger smooth transitions across color palettes, pulse rates, particle rotations, and waveform vibrations without frame drops.

## 3. Responsive Layout Adaptations
- **Mobile (< 768px)**: Centralized vertical stack with prominent AI Core and collapsible drawer for system tools.
- **Tablet / Desktop (>= 768px)**: 3-column command layout with real-time telemetry, execution timeline, and cognitive memory feeds flanking the central core.
