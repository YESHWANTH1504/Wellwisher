class LocalStorageService {
  static final LocalStorageService _instance = LocalStorageService._internal();
  factory LocalStorageService() => _instance;
  LocalStorageService._internal();

  final Map<String, dynamic> _storage = {};

  Future<void> init() async {
    await Future.delayed(const Duration(milliseconds: 50));
    if (!_storage.containsKey('screenCareEnabled')) {
      _storage['screenCareEnabled'] = false;
    }
  }

  String? get jwtToken => _storage['jwtToken'] as String?;
  set jwtToken(String? value) => _storage['jwtToken'] = value;

  String? get userId => _storage['userId'] as String?;
  set userId(String? value) => _storage['userId'] = value;

  bool get screenCareEnabled => _storage['screenCareEnabled'] as bool? ?? false;
  set screenCareEnabled(bool value) => _storage['screenCareEnabled'] = value;

  bool get isDarkMode => _storage['isDarkMode'] as bool? ?? false;
  set isDarkMode(bool value) => _storage['isDarkMode'] = value;

  String get userRole => _storage['userRole'] as String? ?? 'senior';
  set userRole(String value) {
    _storage['userRole'] = value;
    _storage['isSeniorMode'] = (value == 'senior');
    if (value == 'worker') {
      _storage['voicePopupsEnabled'] = false;
      _storage['autoSpeakPopups'] = false;
    } else {
      _storage['voicePopupsEnabled'] = true;
      _storage['autoSpeakPopups'] = true;
    }
  }

  bool get isSeniorCitizen => userRole == 'senior';
  bool get isNormalWorker => userRole == 'worker';

  bool get isSeniorMode => _storage['isSeniorMode'] as bool? ?? (userRole == 'senior');
  set isSeniorMode(bool value) {
    _storage['isSeniorMode'] = value;
    _storage['userRole'] = value ? 'senior' : 'worker';
  }

  String get colorTheme => _storage['colorTheme'] as String? ?? 'blue';
  set colorTheme(String value) => _storage['colorTheme'] = value;

  bool get soundEnabled => _storage['soundEnabled'] as bool? ?? true;
  set soundEnabled(bool value) => _storage['soundEnabled'] = value;

  String get selectedLanguage => _storage['selectedLanguage'] as String? ?? 'ta-IN';
  set selectedLanguage(String value) => _storage['selectedLanguage'] = value;

  bool get voicePopupsEnabled => _storage['voicePopupsEnabled'] as bool? ?? true;
  set voicePopupsEnabled(bool value) => _storage['voicePopupsEnabled'] = value;

  bool get autoSpeakPopups => _storage['autoSpeakPopups'] as bool? ?? true;
  set autoSpeakPopups(bool value) => _storage['autoSpeakPopups'] = value;

  String get selectedVoiceGender => _storage['selectedVoiceGender'] as String? ?? 'female';
  set selectedVoiceGender(String value) => _storage['selectedVoiceGender'] = value;

  bool get familyVoiceModeEnabled => _storage['familyVoiceModeEnabled'] as bool? ?? true;
  set familyVoiceModeEnabled(bool value) => _storage['familyVoiceModeEnabled'] = value;

  bool get workerCaregiverLinkEnabled => _storage['workerCaregiverLinkEnabled'] as bool? ?? true;
  set workerCaregiverLinkEnabled(bool value) => _storage['workerCaregiverLinkEnabled'] = value;

  String get linkedSeniorName => _storage['linkedSeniorName'] as String? ?? 'Mom (Sarah)';
  set linkedSeniorName(String value) => _storage['linkedSeniorName'] = value;

  String get linkedSeniorCode => _storage['linkedSeniorCode'] as String? ?? 'SENIOR-SARAH-9876';
  set linkedSeniorCode(String value) => _storage['linkedSeniorCode'] = value;

  bool get isLoggedIn => jwtToken != null;

  int get hydrationPortionMl => _storage['hydrationPortionMl'] as int? ?? 150;
  set hydrationPortionMl(int value) => _storage['hydrationPortionMl'] = value;

  int get hydrationGoalMl => _storage['hydrationGoalMl'] as int? ?? 2500;
  set hydrationGoalMl(int value) => _storage['hydrationGoalMl'] = value;

  int get dailyHydrationTotalMl => _storage['dailyHydrationTotalMl'] as int? ?? 1250;
  set dailyHydrationTotalMl(int value) => _storage['dailyHydrationTotalMl'] = value;

  String? get hydrationLastLogDate => _storage['hydrationLastLogDate'] as String?;
  set hydrationLastLogDate(String? value) => _storage['hydrationLastLogDate'] = value;

  String? get hydrationCelebratedDate => _storage['hydrationCelebratedDate'] as String?;
  set hydrationCelebratedDate(String? value) => _storage['hydrationCelebratedDate'] = value;

  void clear() {
    _storage.clear();
  }
}
