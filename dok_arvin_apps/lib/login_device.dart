import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Device make/model and OS only; no serial number or device identifier.
class LoginDevice {
  static const channel = MethodChannel('san_antonio/login_device');

  static String _clean(String value) {
    final cleaned = value.replaceAll(RegExp(r'[\x00-\x1f]'), '');
    return cleaned.length > 120 ? cleaned.substring(0, 120) : cleaned;
  }

  static Future<Map<String, String>> read() async {
    final platform = kIsWeb ? 'web' : defaultTargetPlatform.name;
    final fallback = <String, String>{
      'platform': platform == 'iOS'
          ? 'ios'
          : platform == 'macOS'
          ? 'macos'
          : platform,
      'manufacturer': '',
      'model': kIsWeb ? 'Web browser' : 'Device details unavailable',
      'osVersion': '',
    };
    if (kIsWeb) return fallback;
    try {
      final result = await channel
          .invokeMapMethod<String, String>('getDeviceInfo')
          .timeout(const Duration(seconds: 3));
      if (result != null) {
        return {
          for (final key in fallback.keys)
            key: _clean(result[key] ?? fallback[key]!),
        };
      }
    } catch (_) {
      // Login recording still works on unsupported or older native clients.
    }
    return fallback;
  }
}
