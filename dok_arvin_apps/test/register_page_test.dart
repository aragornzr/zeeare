import 'auth_access_fake.dart';
import 'dart:async';

import 'package:dok_arvin_apps/home_page.dart';
import 'package:dok_arvin_apps/onboarding_screen.dart';
import 'package:dok_arvin_apps/login_page.dart';
import 'package:dok_arvin_apps/register_page.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class _User extends Fake implements User {
  String? name;
  bool failProfile = false;
  @override
  Future<void> updateDisplayName(String? displayName) async {
    if (failProfile) {
      throw FirebaseAuthException(code: 'network-request-failed');
    }
    name = displayName;
  }
}

class _Credential extends Fake implements UserCredential {
  _Credential(this.user);
  @override
  final User user;
}

class _Auth extends AccessTestAuth {
  final result = Completer<UserCredential>();
  int calls = 0;
  String? email;
  String? password;
  @override
  Future<UserCredential> createUserWithEmailAndPassword({
    required String email,
    required String password,
  }) {
    calls++;
    this.email = email;
    this.password = password;
    return result.future;
  }
}

Future<void> _open(WidgetTester tester, _Auth auth) async {
  await tester.pumpWidget(MaterialApp(home: LoginPage(auth: auth)));
  await tester.pumpAndSettle();
  await tester.ensureVisible(find.text('Register now'));
  await tester.tap(find.text('Register now'));
  await tester.pumpAndSettle();
  expect(find.byType(RegisterPage), findsOneWidget);
}

Future<void> _fill(
  WidgetTester tester, {
  String email = ' member@example.com ',
  String password = ' password ',
  String confirm = ' password ',
}) async {
  final fields = find.byType(TextFormField);
  await tester.enterText(fields.at(0), ' New Member ');
  await tester.enterText(fields.at(1), email);
  await tester.enterText(fields.at(2), password);
  await tester.enterText(fields.at(3), confirm);
}

Future<void> _submit(
  WidgetTester tester, [
  String label = 'Create account',
]) async {
  await tester.ensureVisible(find.text(label));
  await tester.tap(find.text(label));
  await tester.pump();
}

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  testWidgets('register link opens form and sign in returns to login', (
    tester,
  ) async {
    await _open(tester, _Auth());
    await tester.ensureVisible(find.text('Already a member? Sign in'));
    await tester.tap(find.text('Already a member? Sign in'));
    await tester.pumpAndSettle();
    expect(find.byType(LoginPage), findsOneWidget);
  });

  testWidgets('required fields and invalid entries never call Firebase', (
    tester,
  ) async {
    final auth = _Auth();
    await _open(tester, auth);
    await _submit(tester);
    expect(find.text('Enter your full name.'), findsOneWidget);
    expect(find.text('Confirm your password.'), findsOneWidget);
    await _fill(tester, email: 'bad-email', password: '123', confirm: '456');
    await _submit(tester);
    expect(find.text('Enter a valid email address.'), findsOneWidget);
    expect(find.text('Use at least 8 characters.'), findsOneWidget);
    expect(find.text('Passwords do not match.'), findsOneWidget);
    expect(auth.calls, 0);
  });

  testWidgets(
    'creates account once, saves name and opens intro pages before home',
    (tester) async {
      final auth = _Auth();
      final user = _User();
      await _open(tester, auth);
      await _fill(tester);
      await _submit(tester);
      expect(auth.calls, 1);
      expect(auth.email, 'member@example.com');
      expect(auth.password, ' password ');
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(
        tester
            .widget<ElevatedButton>(find.byType(ElevatedButton).last)
            .onPressed,
        isNull,
      );
      await tester.binding.handlePopRoute();
      await tester.pump();
      expect(find.byType(RegisterPage), findsOneWidget);
      auth.result.complete(_Credential(user));
      await tester.pumpAndSettle();
      expect(user.name, 'New Member');
      expect(find.byType(OnboardingScreen), findsOneWidget);
      expect(find.byType(HomePage), findsNothing);
      expect(find.byType(LoginPage), findsNothing);
      await tester.pump(const Duration(seconds: 5));
      expect(find.text('Choose a service'), findsNothing);
      expect(find.byType(OnboardingScreen), findsOneWidget);
    },
  );

  testWidgets('duplicate email shows actionable error and allows retry', (
    tester,
  ) async {
    final auth = _Auth();
    await _open(tester, auth);
    await _fill(tester);
    await _submit(tester);
    auth.result.completeError(
      FirebaseAuthException(code: 'email-already-in-use'),
    );
    await tester.pumpAndSettle();
    expect(
      find.text(
        'An account already uses this email. Sign in or use another email.',
      ),
      findsOneWidget,
    );
    expect(
      tester.widget<ElevatedButton>(find.byType(ElevatedButton).last).onPressed,
      isNotNull,
    );
    expect(find.byType(RegisterPage), findsOneWidget);
  });

  testWidgets(
    'profile failure retries saving without creating another account',
    (tester) async {
      final auth = _Auth();
      final user = _User()..failProfile = true;
      await _open(tester, auth);
      await _fill(tester);
      await _submit(tester);
      auth.result.complete(_Credential(user));
      await tester.pumpAndSettle();
      expect(find.text('Finish registration'), findsOneWidget);
      user.failProfile = false;
      await _submit(tester, 'Finish registration');
      await tester.pumpAndSettle();
      expect(auth.calls, 1);
      expect(user.name, 'New Member');
      expect(find.byType(OnboardingScreen), findsOneWidget);
      expect(find.byType(HomePage), findsNothing);
      await tester.pump(const Duration(seconds: 5));
    },
  );
}
