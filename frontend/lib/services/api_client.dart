import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../core/config/app_config.dart';
import '../core/routes/app_routes.dart';
import 'local_storage_service.dart';

class ApiClient {
  static String get baseUrl => AppConfig.baseUrl;
  static String get fallbackUrl => AppConfig.fallbackUrl;

  static const Duration defaultTimeout = Duration(seconds: 10);
  static const Duration aiTimeout = Duration(seconds: 25);

  final LocalStorageService _storage = LocalStorageService();

  Map<String, String> get _headers {
    final token = _storage.jwtToken;
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Uri _buildUri(String base, String path) {
    return AppConfig.buildUri(base, path);
  }

  Duration _getTimeoutForPath(String path) {
    if (path.contains('/ai/')) {
      return aiTimeout;
    }
    return defaultTimeout;
  }

  // Perform GET request
  Future<Map<String, dynamic>> get(String path) async {
    final uri = _buildUri(baseUrl, path);
    final timeout = _getTimeoutForPath(path);
    try {
      if (kDebugMode) print('API GET Request: $uri');
      final response = await http.get(uri, headers: _headers).timeout(timeout);
      return _handleResponse(response, path: path);
    } catch (e) {
      try {
        final fallbackUri = _buildUri(fallbackUrl, path);
        final response = await http.get(fallbackUri, headers: _headers).timeout(timeout);
        return _handleResponse(response, path: path);
      } catch (_) {
        if (kDebugMode) print('API GET fallback for $path. Operating in instant local mode.');
        return {'success': false, 'data': [], 'error': e.toString()};
      }
    }
  }

  // Perform POST request
  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final uri = _buildUri(baseUrl, path);
    final timeout = _getTimeoutForPath(path);
    try {
      if (kDebugMode) print('API POST Request: $uri');
      final response = await http
          .post(uri, headers: _headers, body: jsonEncode(body))
          .timeout(timeout);
      return _handleResponse(response, path: path);
    } catch (e) {
      try {
        final fallbackUri = _buildUri(fallbackUrl, path);
        final response = await http
          .post(fallbackUri, headers: _headers, body: jsonEncode(body))
          .timeout(timeout);
        return _handleResponse(response, path: path);
      } catch (_) {
        if (kDebugMode) print('API POST fallback for $path.');
        return {'success': false, 'data': body, 'error': e.toString()};
      }
    }
  }

  // Perform PUT request
  Future<Map<String, dynamic>> put(String path, Map<String, dynamic> body) async {
    final uri = _buildUri(baseUrl, path);
    final timeout = _getTimeoutForPath(path);
    try {
      if (kDebugMode) print('API PUT Request: $uri');
      final response = await http
          .put(uri, headers: _headers, body: jsonEncode(body))
          .timeout(timeout);
      return _handleResponse(response, path: path);
    } catch (e) {
      try {
        final fallbackUri = _buildUri(fallbackUrl, path);
        final response = await http
          .put(fallbackUri, headers: _headers, body: jsonEncode(body))
          .timeout(timeout);
        return _handleResponse(response, path: path);
      } catch (_) {
        if (kDebugMode) print('API PUT fallback for $path.');
        return {'success': false, 'data': body, 'error': e.toString()};
      }
    }
  }

  // Perform DELETE request
  Future<Map<String, dynamic>> delete(String path) async {
    final uri = _buildUri(baseUrl, path);
    final timeout = _getTimeoutForPath(path);
    try {
      if (kDebugMode) print('API DELETE Request: $uri');
      final response = await http.delete(uri, headers: _headers).timeout(timeout);
      return _handleResponse(response, path: path);
    } catch (e) {
      try {
        final fallbackUri = _buildUri(fallbackUrl, path);
        final response = await http.delete(fallbackUri, headers: _headers).timeout(timeout);
        return _handleResponse(response, path: path);
      } catch (_) {
        if (kDebugMode) print('API DELETE fallback for $path.');
        return {'success': false, 'error': e.toString()};
      }
    }
  }

  Map<String, dynamic> _handleResponse(http.Response response, {String? path}) {
    if (response.statusCode == 401 && !(path != null && path.contains('/auth/'))) {
      if (kDebugMode) print('API 401 Unauthorized: Session token expired or invalid.');
      _storage.logout();
      try {
        AppRoutes.navigatorKey.currentState?.pushNamedAndRemoveUntil(AppRoutes.login, (route) => false);
      } catch (_) {}
    }
    try {
      final body = jsonDecode(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return body is Map<String, dynamic> ? body : {'success': true, 'data': body};
      } else {
        return {
          'success': false,
          'message': body['message'] ?? 'HTTP Error ${response.statusCode}',
          'data': body
        };
      }
    } catch (_) {
      return {'success': response.statusCode >= 200 && response.statusCode < 300};
    }
  }
}
