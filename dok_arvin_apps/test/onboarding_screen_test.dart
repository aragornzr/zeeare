import 'package:dok_arvin_apps/home_page.dart';
import 'package:dok_arvin_apps/onboarding_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'auth_access_fake.dart';

void main() {
  testWidgets(
    'intro advances through saved pages and opens the authorized main menu',
    (tester) async {
      Future<Map<String, dynamic>> request(
        String name,
        Map<String, dynamic> data,
      ) async => {
        'pages': [
          for (var i = 1; i <= 3; i++)
            {
              'page': 'page$i',
              'title': 'Intro $i',
              'text': 'Municipal services',
              'imageUrl': '',
              'version': 0,
            },
        ],
        'items': [],
        'cursor': null,
      };
      await tester.pumpWidget(
        MaterialApp(
          home: OnboardingScreen(auth: AccessTestAuth(), request: request),
        ),
      );
      await tester.pumpAndSettle();
      for (var i = 0; i < 2; i++) {
        await tester.ensureVisible(find.text('Next').first);
        await tester.tap(find.text('Next').first);
        await tester.pumpAndSettle();
      }
      await tester.ensureVisible(find.text('Main menu'));
      await tester.tap(find.text('Main menu'));
      await tester.pumpAndSettle();
      expect(find.byType(HomePage), findsOneWidget);
      expect(find.byType(OnboardingScreen), findsNothing);
      expect(find.text('Choose a service'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
