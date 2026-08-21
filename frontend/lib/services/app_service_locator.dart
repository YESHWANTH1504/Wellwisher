import 'api_client.dart';
import 'local_storage_service.dart';
import 'schedule_service.dart';
import '../features/schedule/repositories/schedule_repository.dart';
import '../features/schedule/controller/schedule_controller.dart';
import '../features/screen_care/services/screen_care_service.dart';
import '../features/screen_care/controller/screen_care_controller.dart';

import 'notification_service.dart';
import 'hydration_service.dart';

class AppServiceLocator {
  static final AppServiceLocator _instance = AppServiceLocator._internal();
  factory AppServiceLocator() => _instance;
  AppServiceLocator._internal();

  LocalStorageService? _localStorageService;
  ApiClient? _apiClient;
  ScheduleService? _scheduleService;
  ScheduleRepository? _scheduleRepository;
  ScreenCareService? _screenCareService;
  ScreenCareController? _screenCareController;
  ScheduleController? _scheduleController;
  HydrationService? _hydrationService;

  Future<void> init() async {
    _localStorageService ??= LocalStorageService();
    await _localStorageService!.init();

    _hydrationService ??= HydrationService();
    await _hydrationService!.init();

    _apiClient ??= ApiClient();
    _scheduleService ??= ScheduleService(apiClient: _apiClient!);
    _scheduleRepository ??= ScheduleRepository(scheduleService: _scheduleService!);
    await _scheduleRepository!.init();

    _screenCareService ??= ScreenCareService(localStorageService: _localStorageService!);
    _screenCareController ??= ScreenCareController(service: _screenCareService!);
    _scheduleController ??= ScheduleController(
      repository: _scheduleRepository!,
      screenCareController: _screenCareController!,
    );

    await NotificationService().init();
  }

  HydrationService get hydrationService => _hydrationService ??= HydrationService();
  LocalStorageService get localStorage => _localStorageService ??= LocalStorageService();
  ScreenCareController get screenCareController {
    if (_screenCareController == null) {
      _localStorageService ??= LocalStorageService();
      _screenCareService ??= ScreenCareService(localStorageService: _localStorageService!);
      _screenCareController = ScreenCareController(service: _screenCareService!);
    }
    return _screenCareController!;
  }

  ScheduleRepository get scheduleRepository {
    if (_scheduleRepository == null) {
      _apiClient ??= ApiClient();
      _scheduleService ??= ScheduleService(apiClient: _apiClient!);
      _scheduleRepository = ScheduleRepository(scheduleService: _scheduleService!);
    }
    return _scheduleRepository!;
  }

  ScheduleController get scheduleController {
    if (_scheduleController == null) {
      _scheduleController = ScheduleController(
        repository: scheduleRepository,
        screenCareController: screenCareController,
      );
    }
    return _scheduleController!;
  }
}
