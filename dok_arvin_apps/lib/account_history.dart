import 'dart:async';
import 'login_device.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Retries after network failures and deduplicates by Firebase's auth_time.
/// The backend validates the token and never receives a password.
class AccountHistory {
  static String? _recordedSession;
  static bool _busy = false;

  static void start() {
    FirebaseAuth.instance.authStateChanges().listen((_) => _record());
    Timer.periodic(const Duration(minutes: 1), (_) => _record());
  }

  static Future<void> _record() async {
    if (_busy) return;
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    _busy = true;
    try {
      final token = await user.getIdTokenResult();
      final session = '${user.uid}:${token.claims?['auth_time']}';
      if (session == _recordedSession) return;
      await FirebaseFunctions.instanceFor(region: 'asia-southeast1')
          .httpsCallable('recordAccountLogin')
          .call<void>({'source': 'mobile', 'device': await LoginDevice.read()});
      _recordedSession = session;
    } catch (_) {
      // History failures must not discard local feature records or block Auth.
      // Retry while the app remains running, or on its next authenticated launch.
    } finally {
      _busy = false;
    }
  }
}
