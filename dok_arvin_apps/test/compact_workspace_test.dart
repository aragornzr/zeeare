import 'package:dok_arvin_apps/department_updates.dart';
import 'package:dok_arvin_apps/home_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'auth_access_fake.dart';

const claims = <String, dynamic>{
  'role': 'regular',
  'approved': true,
  'departments': ['tourism'],
  'access': {'apps': true, 'tourism': true},
};
Future<Map<String, dynamic>> updates(
  String name,
  Map<String, dynamic> data,
) async => {
  'items': [
    {
      'id': data['kind'] == 'inboxes' ? 'personal-1' : 'notice-1',
      'text': 'Private department content',
      'authorUid': 'admin',
      'authorName': 'Administrator',
      'createdAt': '2026-10-27T00:00:00Z',
    },
  ],
  'cursor': null,
};
Widget panel(String uid) => MaterialApp(
  home: Scaffold(
    body: SingleChildScrollView(
      child: DepartmentUpdates(uid: uid, claims: claims, request: updates),
    ),
  ),
);
void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  testWidgets(
    'read updates collapse and persist without hiding a personal unread message',
    (tester) async {
      await tester.pumpWidget(panel('worker'));
      await tester.pumpAndSettle();
      expect(find.text('Private department content'), findsNothing);
      expect(find.text('Unread updates available'), findsOneWidget);
      await tester.tap(find.text('Announcement/Messages'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Mark as read & close'));
      await tester.tap(find.text('Mark as read & close'));
      await tester.pumpAndSettle();
      expect(find.text('Private department content'), findsNothing);
      expect(find.text('Unread updates available'), findsOneWidget);
      await tester.tap(find.text('Announcement/Messages'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('My inbox • New'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Mark as read & close'));
      await tester.tap(find.text('Mark as read & close'));
      await tester.pumpAndSettle();
      expect(find.text('Unread updates available'), findsNothing);
      final saved = await const FlutterSecureStorage().readAll();
      expect(saved.values.join(), contains('notice-1'));
      expect(
        saved.values.join(),
        isNot(contains('Private department content')),
      );
      await tester.pumpWidget(const SizedBox());
      await tester.pumpWidget(panel('worker'));
      await tester.pumpAndSettle();
      expect(find.text('Unread updates available'), findsNothing);
      await tester.pumpWidget(const SizedBox());
      await tester.pumpWidget(panel('another-worker'));
      await tester.pumpAndSettle();
      expect(find.text('Unread updates available'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets('new arrivals become unread after previous updates were read', (
    tester,
  ) async {
    var id = 'notice-1';
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: DepartmentUpdates(
              uid: 'worker',
              claims: claims,
              request: (name, data) async => {
                'items': data['kind'] == 'inboxes'
                    ? []
                    : [
                        {
                          'id': id,
                          'text': 'Latest announcement',
                          'authorUid': 'admin',
                          'authorName': 'Admin',
                          'createdAt': '2026-10-27T00:00:00Z',
                        },
                      ],
                'cursor': null,
              },
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Announcement/Messages'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Mark as read & close'));
    await tester.tap(find.text('Mark as read & close'));
    await tester.pumpAndSettle();
    expect(find.text('Unread updates available'), findsNothing);
    id = 'notice-2';
    await tester.pump(const Duration(minutes: 1));
    await tester.pumpAndSettle();
    expect(find.text('Unread updates available'), findsOneWidget);
    expect(find.text('Latest announcement'), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets(
    'updates sit below settings and welcome disappears after 20 seconds across refreshes',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(800, 1500));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(
            auth: AccessTestAuth(claims: claims),
            request: (name, data) async => {'items': [], 'cursor': null},
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        tester.getTopLeft(find.text('Announcement/Messages')).dy,
        greaterThan(tester.getTopLeft(find.text('Settings / Sign out')).dy),
      );
      expect(find.text('Your daily workspace'.toUpperCase()), findsOneWidget);
      await tester.pump(const Duration(seconds: 18));
      await tester.tap(find.text('Refresh menu access'));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 2));
      await tester.pumpAndSettle();
      expect(find.text('Your daily workspace'.toUpperCase()), findsNothing);
      expect(find.text('Good service.\nStronger community.'), findsNothing);
      expect(find.text('Announcement/Messages'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
