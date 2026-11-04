import 'dart:async';
import 'package:dok_arvin_apps/home_page.dart';
import 'package:dok_arvin_apps/login_page.dart';
import 'package:dok_arvin_apps/settings_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'auth_access_fake.dart';

class _SignOutAuth extends AccessTestAuth {
  final result = Completer<void>();
  int calls = 0;
  @override
  Future<void> signOut() {
    calls++;
    return result.future;
  }
}

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  testWidgets('logo and link below branding both open Settings', (
    tester,
  ) async {
    for (final logo in [true, false]) {
      await tester.pumpWidget(
        MaterialApp(home: HomePage(auth: AccessTestAuth())),
      );
      await tester.pumpAndSettle();
      final target = logo
          ? find.byTooltip('Open Settings')
          : find.text('Settings / Sign out');
      await tester.ensureVisible(target);
      await tester.tap(target);
      await tester.pumpAndSettle();
      expect(find.byType(SettingsPage), findsOneWidget);
      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Sign out'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    }
  });
  testWidgets(
    'successful sign-out returns to login and removes authenticated navigation history',
    (tester) async {
      final auth = _SignOutAuth();
      await tester.pumpWidget(MaterialApp(home: HomePage(auth: auth)));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Open Settings'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sign out'));
      await tester.pump();
      expect(auth.calls, 1);
      expect(find.text('Signing out…'), findsOneWidget);
      expect(tester.widget<ListTile>(find.byType(ListTile)).onTap, isNull);
      auth.result.complete();
      await tester.pumpAndSettle();
      expect(find.byType(LoginPage), findsOneWidget);
      expect(find.byType(HomePage), findsNothing);
      expect(find.byType(SettingsPage), findsNothing);
      expect(
        Navigator.of(tester.element(find.byType(LoginPage))).canPop(),
        isFalse,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets('failed sign-out stays in Settings and permits retry', (
    tester,
  ) async {
    final auth = _SignOutAuth();
    await tester.pumpWidget(MaterialApp(home: SettingsPage(auth: auth)));
    await tester.tap(find.text('Sign out'));
    await tester.pump();
    auth.result.completeError(Exception('offline'));
    await tester.pumpAndSettle();
    expect(find.byType(SettingsPage), findsOneWidget);
    expect(find.byType(LoginPage), findsNothing);
    expect(find.text('Could not sign out. Please try again.'), findsOneWidget);
    expect(tester.widget<ListTile>(find.byType(ListTile)).onTap, isNotNull);
  });
}
