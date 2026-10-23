import 'package:shared_preferences/shared_preferences.dart';
import '../features/schedule/events/schedule_event_bus.dart';

class LocalStorageService {
  static final LocalStorageService _instance = LocalStorageService._internal();
  factory LocalStorageService() => _instance;
  LocalStorageService._internal();

  final Map<String, dynamic> _storage = {};

  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedFormat = prefs.getString('timeFormat');
      if (savedFormat != null) {
        _storage['timeFormat'] = savedFormat;
      }
      final savedToken = prefs.getString('jwtToken');
      if (savedToken != null && savedToken.trim().isNotEmpty) {
        _storage['jwtToken'] = savedToken.trim();
      }
      final savedUserId = prefs.getString('userId');
      if (savedUserId != null) {
        _storage['userId'] = savedUserId;
      }
      final savedUserName = prefs.getString('userName');
      if (savedUserName != null) {
        _storage['userName'] = savedUserName;
      }
      final savedUserEmail = prefs.getString('userEmail');
      if (savedUserEmail != null) {
        _storage['userEmail'] = savedUserEmail;
      }
      final savedVoice = prefs.getString('selectedVoiceGender');
      if (savedVoice != null) {
        _storage['selectedVoiceGender'] = savedVoice;
      }
      final savedServer = prefs.getString('customServerUrl');
      if (savedServer != null && savedServer.trim().isNotEmpty) {
        _storage['customServerUrl'] = savedServer.trim();
      }
    } catch (_) {}
    if (!_storage.containsKey('screenCareEnabled')) {
      _storage['screenCareEnabled'] = false;
    }
  }

  String get timeFormat => _storage['timeFormat'] as String? ?? '12h';
  set timeFormat(String value) {
    final format = (value == '24h' ? '24h' : '12h');
    _storage['timeFormat'] = format;
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString('timeFormat', format);
    }).catchError((_) {});
    ScheduleEventBus().publishMutation(
      action: ScheduleActionType.refresh,
      source: ScheduleChangeSource.ui,
      metadata: {'timeFormat': format},
    );
  }
  bool get is24HourTime => timeFormat == '24h';

  String? get jwtToken => _storage['jwtToken'] as String?;
  set jwtToken(String? value) {
    _storage['jwtToken'] = value;
    SharedPreferences.getInstance().then((prefs) {
      if (value != null && value.trim().isNotEmpty) {
        prefs.setString('jwtToken', value.trim());
      } else {
        prefs.remove('jwtToken');
      }
    }).catchError((_) {});
  }

  Future<void> saveAuthSession({
    required String token,
    required String userId,
    required String userName,
    required String userEmail,
  }) async {
    _storage['jwtToken'] = token.trim();
    _storage['userId'] = userId;
    _storage['userName'] = userName;
    _storage['userEmail'] = userEmail;

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('jwtToken', token.trim());
      await prefs.setString('userId', userId);
      await prefs.setString('userName', userName);
      await prefs.setString('userEmail', userEmail);
    } catch (_) {}
  }

  String? get userId => _storage['userId'] as String?;
  set userId(String? value) {
    _storage['userId'] = value;
    SharedPreferences.getInstance().then((prefs) {
      if (value != null) {
        prefs.setString('userId', value);
      } else {
        prefs.remove('userId');
      }
    }).catchError((_) {});
  }

  String? get userName => _storage['userName'] as String?;
  set userName(String? value) {
    _storage['userName'] = value;
    SharedPreferences.getInstance().then((prefs) {
      if (value != null) {
        prefs.setString('userName', value);
      } else {
        prefs.remove('userName');
      }
    }).catchError((_) {});
  }

  String? get userEmail => _storage['userEmail'] as String?;
  set userEmail(String? value) {
    _storage['userEmail'] = value;
    SharedPreferences.getInstance().then((prefs) {
      if (value != null) {
        prefs.setString('userEmail', value);
      } else {
        prefs.remove('userEmail');
      }
    }).catchError((_) {});
  }

  String? get customServerUrl => _storage['customServerUrl'] as String?;
  set customServerUrl(String? value) {
    _storage['customServerUrl'] = value;
    SharedPreferences.getInstance().then((prefs) {
      if (value != null && value.trim().isNotEmpty) {
        prefs.setString('customServerUrl', value.trim());
      } else {
        prefs.remove('customServerUrl');
      }
    }).catchError((_) {});
  }

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
  set selectedVoiceGender(String value) {
    _storage['selectedVoiceGender'] = value;
    SharedPreferences.getInstance().then((p) {
      p.setString('selectedVoiceGender', value);
      p.setString('flutter.selectedVoiceGender', value);
    }).catchError((_) {});
  }

  bool get familyVoiceModeEnabled => _storage['familyVoiceModeEnabled'] as bool? ?? true;
  set familyVoiceModeEnabled(bool value) => _storage['familyVoiceModeEnabled'] = value;

  bool get workerCaregiverLinkEnabled => _storage['workerCaregiverLinkEnabled'] as bool? ?? true;
  set workerCaregiverLinkEnabled(bool value) => _storage['workerCaregiverLinkEnabled'] = value;

  String get linkedSeniorName => _storage['linkedSeniorName'] as String? ?? 'Mom (Sarah)';
  set linkedSeniorName(String value) => _storage['linkedSeniorName'] = value;

  String get linkedSeniorCode => _storage['linkedSeniorCode'] as String? ?? 'SENIOR-SARAH-9876';
  set linkedSeniorCode(String value) => _storage['linkedSeniorCode'] = value;

  bool get isLoggedIn => jwtToken != null && jwtToken!.trim().isNotEmpty;

  Future<void> logout() async {
    _storage.remove('jwtToken');
    _storage.remove('userId');
    _storage.remove('userName');
    _storage.remove('userEmail');
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('jwtToken');
      await prefs.remove('userId');
      await prefs.remove('userName');
      await prefs.remove('userEmail');
    } catch (_) {}
  }

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
