import 'auth_access_fake.dart';
import 'dart:async';

import 'package:dok_arvin_apps/home_page.dart';
import 'package:dok_arvin_apps/onboarding_screen.dart';
import 'package:dok_arvin_apps/login_page.dart';
import 'package:dok_arvin_apps/remembered_login.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class _Credential extends Fake implements UserCredential {}

class _Auth extends AccessTestAuth {
  final result = Completer<UserCredential>();
  int calls = 0;
  String? email;
  String? password;
  String? resetEmail;
  final resetResult = Completer<void>();

  @override
  Future<void> sendPasswordResetEmail({
    required String email,
    ActionCodeSettings? actionCodeSettings,
  }) {
    resetEmail = email;
    return resetResult.future;
  }

  @override
  Future<UserCredential> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) {
    calls++;
    this.email = email;
    this.password = password;
    return result.future;
  }
}

Future<void> _fillLogin(WidgetTester tester, _Auth auth) async {
  await tester.pumpWidget(MaterialApp(home: LoginPage(auth: auth)));
  await tester.pumpAndSettle();
  await tester.enterText(find.byType(TextField).first, ' user@example.com ');
  await tester.enterText(find.byType(TextField).last, ' password ');
  await tester.ensureVisible(find.byType(ElevatedButton));
  await tester.tap(find.byType(ElevatedButton));
  await tester.pump();
}

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  testWidgets('sign in remains usable at narrow widths and enlarged text', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(320, 740));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(useMaterial3: true),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(1.6)),
          child: child!,
        ),
        home: LoginPage(auth: _Auth()),
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, 'private password');
    await tester.ensureVisible(find.byTooltip('Show password'));
    await tester.tap(find.byTooltip('Show password'));
    await tester.pump();
    expect(
      tester.widget<TextField>(find.byType(TextField).last).obscureText,
      false,
    );
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byTooltip('Hide password'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Hide password'));
    await tester.pump();
    expect(
      tester.widget<TextField>(find.byType(TextField).last).obscureText,
      true,
    );
    await tester.ensureVisible(find.byType(ElevatedButton));
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'password reset uses trimmed email and permits retry after failure',
    (tester) async {
      final auth = _Auth();
      await tester.pumpWidget(MaterialApp(home: LoginPage(auth: auth)));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byType(TextField).first,
        ' donalyn.rafanan@gmail.com ',
      );
      await tester.ensureVisible(find.text('Forgot password?'));
      await tester.tap(find.text('Forgot password?'));
      await tester.pump();
      expect(auth.resetEmail, 'donalyn.rafanan@gmail.com');
      expect(
        tester.widget<ElevatedButton>(find.byType(ElevatedButton)).onPressed,
        isNull,
      );
      auth.resetResult.completeError(
        FirebaseAuthException(code: 'network-request-failed'),
      );
      await tester.pumpAndSettle();
      expect(
        find.text('Check your internet connection and try again.'),
        findsOneWidget,
      );
      expect(
        tester.widget<ElevatedButton>(find.byType(ElevatedButton)).onPressed,
        isNotNull,
      );
    },
  );

  testWidgets('password reset confirms request without signing in', (
    tester,
  ) async {
    final auth = _Auth();
    await tester.pumpWidget(MaterialApp(home: LoginPage(auth: auth)));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextField).first,
      'donalyn.rafanan@gmail.com',
    );
    await tester.ensureVisible(find.text('Forgot password?'));
    await tester.tap(find.text('Forgot password?'));
    auth.resetResult.complete();
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Check your inbox and spam folder.'),
      findsOneWidget,
    );
    expect(auth.calls, 0);
    expect(find.byType(LoginPage), findsOneWidget);
  });
  testWidgets('empty credentials show feedback without calling Firebase', (
    tester,
  ) async {
    final auth = _Auth();
    await tester.pumpWidget(MaterialApp(home: LoginPage(auth: auth)));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byType(ElevatedButton));
    await tester.tap(find.byType(ElevatedButton));
    await tester.pump();
    expect(find.text('Enter your email and password.'), findsOneWidget);
    expect(auth.calls, 0);
  });

  testWidgets('sign in shows progress and opens intro 1 before the main menu', (
    tester,
  ) async {
    final auth = _Auth();
    await _fillLogin(tester, auth);
    expect(auth.calls, 1);
    expect(auth.email, 'user@example.com');
    expect(auth.password, ' password ');
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(
      tester.widget<ElevatedButton>(find.byType(ElevatedButton)).onPressed,
      isNull,
    );
    auth.result.complete(_Credential());
    await tester.pumpAndSettle();
    expect(find.byType(OnboardingScreen), findsOneWidget);
    expect(find.byType(HomePage), findsNothing);
    expect(find.byType(LoginPage), findsNothing);
  });

  testWidgets('Firebase failure shows feedback and enables retry', (
    tester,
  ) async {
    final auth = _Auth();
    await _fillLogin(tester, auth);
    auth.result.completeError(
      FirebaseAuthException(
        code: 'invalid-credential',
        message: 'Incorrect email or password.',
      ),
    );
    await tester.pumpAndSettle();
    expect(
      find.text(
        'Incorrect email or password. Use Forgot password? to reset your password.',
      ),
      findsOneWidget,
    );
    expect(find.byType(LoginPage), findsOneWidget);
    expect(
      tester.widget<ElevatedButton>(find.byType(ElevatedButton)).onPressed,
      isNotNull,
    );
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'Remember password saves only after successful login and restores masked credentials',
    (tester) async {
      final auth = _Auth();
      const store = RememberedLoginStore();
      await tester.pumpWidget(MaterialApp(home: LoginPage(auth: auth)));
      await tester.pumpAndSettle();
      expect(
        tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
        false,
      );
      await tester.enterText(
        find.byType(TextField).first,
        ' user@example.com ',
      );
      await tester.enterText(find.byType(TextField).last, ' secret password ');
      await tester.ensureVisible(find.byType(CheckboxListTile));
      await tester.tap(find.byType(CheckboxListTile));
      await tester.pump();
      expect(await store.read(), isNull);
      await tester.ensureVisible(find.byType(ElevatedButton));
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();
      expect(await store.read(), isNull);
      auth.result.complete(_Credential());
      await tester.pumpAndSettle();
      expect(await store.read(), (
        email: 'user@example.com',
        password: ' secret password ',
      ));
      await tester.pumpWidget(const SizedBox());
      await tester.pumpWidget(MaterialApp(home: LoginPage(auth: _Auth())));
      await tester.pumpAndSettle();
      final fields = tester
          .widgetList<TextField>(find.byType(TextField))
          .toList();
      expect(fields.first.controller!.text, 'user@example.com');
      expect(fields.last.controller!.text, ' secret password ');
      expect(fields.last.obscureText, true);
      expect(
        tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
        true,
      );
    },
  );
  testWidgets(
    'unchecking removes only the saved login and unchecked sign-in does not save a password',
    (tester) async {
      const store = RememberedLoginStore();
      await store.save('saved@example.com', 'old-password');
      const vault = FlutterSecureStorage();
      await vault.write(key: 'attendance_key', value: 'preserve-key');
      final auth = _Auth();
      await tester.pumpWidget(MaterialApp(home: LoginPage(auth: auth)));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byType(CheckboxListTile));
      await tester.tap(find.byType(CheckboxListTile));
      await tester.pumpAndSettle();
      expect(await store.read(), isNull);
      expect(await vault.read(key: 'attendance_key'), 'preserve-key');
      await tester.ensureVisible(find.byType(ElevatedButton));
      await tester.tap(find.byType(ElevatedButton));
      auth.result.complete(_Credential());
      await tester.pumpAndSettle();
      expect(await store.read(), isNull);
    },
  );
  testWidgets('failed remembered sign-in never saves the attempted password', (
    tester,
  ) async {
    final auth = _Auth();
    await tester.pumpWidget(MaterialApp(home: LoginPage(auth: auth)));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'user@example.com');
    await tester.enterText(find.byType(TextField).last, 'wrong-password');
    await tester.ensureVisible(find.byType(CheckboxListTile));
    await tester.tap(find.byType(CheckboxListTile));
    await tester.pump();
    await tester.ensureVisible(find.byType(ElevatedButton));
    await tester.tap(find.byType(ElevatedButton));
    auth.result.completeError(
      FirebaseAuthException(code: 'invalid-credential'),
    );
    await tester.pumpAndSettle();
    expect(await const RememberedLoginStore().read(), isNull);
    expect(find.byType(LoginPage), findsOneWidget);
  });
}
