import '../../../services/local_storage_service.dart';

class ScreenCareService {
  final LocalStorageService localStorageService;

  ScreenCareService({required this.localStorageService});

  bool isScreenCareEnabled() {
    return localStorageService.screenCareEnabled;
  }

  Future<void> setScreenCareEnabled(bool enabled) async {
    localStorageService.screenCareEnabled = enabled;
  }
}
