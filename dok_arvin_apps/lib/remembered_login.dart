import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Only this device's login entry is changed; feature encryption keys are kept.
class RememberedLoginStore {
  const RememberedLoginStore();
  static const key = 'remembered_login_v1';
  static const _storage = FlutterSecureStorage(
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.unlocked_this_device,
    ),
    mOptions: MacOsOptions(
      accessibility: KeychainAccessibility.unlocked_this_device,
    ),
  );

  Future<({String email, String password})?> read() async {
    final value = await _storage.read(key: key);
    if (value == null) return null;
    final data = jsonDecode(value);
    if (data is! Map ||
        data['email'] is! String ||
        data['password'] is! String ||
        (data['email'] as String).isEmpty ||
        (data['password'] as String).isEmpty) {
      throw const FormatException('Invalid saved login');
    }
    return (
      email: data['email'] as String,
      password: data['password'] as String,
    );
  }

  Future<void> save(String email, String password) => _storage.write(
    key: key,
    value: jsonEncode({'email': email, 'password': password}),
  );
  Future<void> clear() => _storage.delete(key: key);
}
