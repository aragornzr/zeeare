import 'dart:async';

import 'package:dok_arvin_apps/main.dart';
import 'package:dok_arvin_apps/login_page.dart';
import 'package:dok_arvin_apps/onboarding_screen.dart';
import 'package:dok_arvin_apps/home_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'auth_access_fake.dart';

Future<Map<String, dynamic>> content(
  String name,
  Map<String, dynamic> data,
) async => {
  'pages': [
    {
      'page': 'page1',
      'title': 'First intro',
      'text': 'Welcome',
      'imageUrl': '',
      'version': 0,
    },
    {
      'page': 'page2',
      'title': 'Second intro',
      'text': 'Services',
      'imageUrl': '',
      'version': 0,
    },
  ],
  'items': [],
  'cursor': null,
  'pageToken': null,
  'users': [],
};
void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  testWidgets('launch shows login before intro pages and main menu', (
    tester,
  ) async {
    await tester.pumpWidget(const SAZAPPS());
    await tester.pumpAndSettle();
    expect(find.byType(LoginPage), findsOneWidget);
    expect(find.byType(OnboardingScreen), findsNothing);
    expect(find.byType(HomePage), findsNothing);
  });
  testWidgets('forward action waits for content and follows long text', (
    tester,
  ) async {
    final ready = Completer<Map<String, dynamic>>();
    await tester.pumpWidget(
      MaterialApp(
        home: OnboardingScreen(
          auth: AccessTestAuth(),
          request: (name, data) =>
              name == 'getIntroPages' ? ready.future : content(name, data),
        ),
      ),
    );
    await tester.pump();
    expect(find.text('Next'), findsNothing);
    final response = await content('getIntroPages', {});
    (response['pages'] as List).first['text'] = List.filled(
      80,
      'Read the municipal services information.',
    ).join('\n');
    ready.complete(response);
    await tester.pumpAndSettle();
    expect(find.text('Next').hitTestable(), findsNothing);
    await tester.drag(find.byType(PageView), const Offset(-600, 0));
    await tester.pumpAndSettle();
    expect(find.text('First intro'), findsOneWidget);
    await tester.ensureVisible(find.text('Next'));
    expect(find.text('Next').hitTestable(), findsOneWidget);
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    expect(find.text('Second intro'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  testWidgets(
    'authenticated introduction follows pages 1, 2, 3 and then opens main menu',
    (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          home: OnboardingScreen(auth: AccessTestAuth(), request: content),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('First intro').hitTestable(), findsOneWidget);
      expect(find.text('Skip'), findsNothing);
      expect(find.byType(HomePage), findsNothing);
      await tester.ensureVisible(find.text('Next'));
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
      expect(find.text('Second intro'), findsOneWidget);
      await tester.ensureVisible(find.text('Next'));
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
      expect(
        find.text('Your announcement board').hitTestable(),
        findsOneWidget,
      );
      expect(find.text('Main menu'), findsOneWidget);
      expect(find.byType(HomePage), findsNothing);
      await tester.tap(find.text('Back'));
      await tester.pumpAndSettle();
      expect(find.text('Second intro'), findsOneWidget);
      await tester.ensureVisible(find.text('Next'));
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Main menu'));
      await tester.tap(find.text('Main menu'));
      await tester.pumpAndSettle();
      expect(find.byType(HomePage), findsOneWidget);
      expect(find.byType(OnboardingScreen), findsNothing);
      expect(find.byType(LoginPage), findsNothing);
      expect(
        Navigator.of(tester.element(find.byType(HomePage))).canPop(),
        isFalse,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
