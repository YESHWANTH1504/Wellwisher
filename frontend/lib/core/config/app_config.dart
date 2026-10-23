import 'package:flutter/foundation.dart';
import '../../services/local_storage_service.dart';

class AppConfig {
  static const String _defaultWebDevUrl = 'http://localhost:3000/api';
  static const String _defaultMobileDevUrl = 'http://10.100.10.103:3000/api';
  static const String _defaultEmulatorDevUrl = 'http://10.0.2.2:3000/api';

  /// Defined at build time via --dart-define=API_URL=https://...
  static const String envApiUrl = String.fromEnvironment('API_URL', defaultValue: '');

  /// Runtime override in memory
  static String? customBaseUrl;

  /// Central URL Normalization ensuring single valid /api base
  static String normalizeBaseUrl(String input) {
    var clean = input.trim();
    if (clean.isEmpty) return '';

    // Automatically add http:// scheme if user enters IP:PORT or domain without scheme
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://$clean';
    }

    // Strip trailing slashes
    clean = clean.replaceAll(RegExp(r'/+$'), '');

    // Ensure it ends with /api
    if (!clean.endsWith('/api')) {
      clean = '$clean/api';
    }
    return clean;
  }

  /// Safe URI Builder that guarantees no /api/api concatenation
  static Uri buildUri(String base, String path) {
    var b = base.trim().replaceAll(RegExp(r'/+$'), '');
    var p = path.trim();
    if (p.startsWith('/')) p = p.substring(1);

    if (!b.endsWith('/api')) {
      b = '$b/api';
    }

    if (p.startsWith('api/')) {
      p = p.substring(4);
    }
    if (p.startsWith('/')) {
      p = p.substring(1);
    }

    return Uri.parse('$b/$p');
  }

  static String get baseUrl {
    // 1. Persistent custom server configured by user on this device
    final storedCustom = LocalStorageService().customServerUrl;
    if (storedCustom != null && storedCustom.trim().isNotEmpty) {
      return normalizeBaseUrl(storedCustom);
    }

    // 2. In-memory custom URL override
    if (customBaseUrl != null && customBaseUrl!.trim().isNotEmpty) {
      return normalizeBaseUrl(customBaseUrl!);
    }

    // 3. Compile-time environment variable
    if (envApiUrl.isNotEmpty) {
      return normalizeBaseUrl(envApiUrl);
    }

    // 4. Platform defaults
    if (kIsWeb) {
      return (Uri.base.origin.isNotEmpty && !Uri.base.origin.contains('localhost'))
          ? normalizeBaseUrl('${Uri.base.origin}/api')
          : _defaultWebDevUrl;
    }

    return _defaultMobileDevUrl;
  }

  static String get fallbackUrl => _defaultEmulatorDevUrl;
}

