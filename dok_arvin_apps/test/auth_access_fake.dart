import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';

class AccessTestUser extends Fake implements User {
  AccessTestUser(this.claims, {this.userId = 'test-user'});
  final String userId;
  final Map<String, dynamic> claims;
  @override
  String get uid => userId;
  @override
  String? get displayName => 'Test user';
  @override
  Future<IdTokenResult> getIdTokenResult([bool forceRefresh = false]) async =>
      AccessTestToken(claims);
}

class AccessTestAuth extends Fake implements FirebaseAuth {
  AccessTestAuth({Map<String, dynamic>? claims, String uid = 'test-user'})
    : user = AccessTestUser(
        claims ??
            {
              'role': 'admin',
              'approved': true,
              'departments': ['rhu', 'tourism', 'attendance'],
              'access': {
                'apps': true,
                'rhu': true,
                'patients': true,
                'pharmacy': true,
                'tourism': true,
                'attendance': true,
              },
            },
        userId: uid,
      );
  final User user;
  @override
  User? get currentUser => user;
  @override
  Stream<User?> idTokenChanges() => const Stream.empty();
}

class AccessTestToken extends Fake implements IdTokenResult {
  AccessTestToken(this.claims);
  @override
  final Map<String, dynamic> claims;
}
