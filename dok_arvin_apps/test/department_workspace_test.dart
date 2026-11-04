import 'package:dok_arvin_apps/admin_api.dart';
import 'package:dok_arvin_apps/admin_console.dart';
import 'package:dok_arvin_apps/department_updates.dart';
import 'package:dok_arvin_apps/home_page.dart';
import 'package:dok_arvin_apps/intro_notices.dart';
import 'package:dok_arvin_apps/access_gate.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'auth_access_fake.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dok_arvin_apps/app_theme.dart';

const adminClaims = <String, dynamic>{
  'role': 'admin',
  'approved': true,
  'departments': ['tourism'],
  'access': {'apps': true, 'tourism': true, 'dashboard': true},
};
Future<Map<String, dynamic>> emptyRequest(
  String name,
  Map<String, dynamic> data,
) async => {
  'items': [],
  'users': [],
  'events': [],
  'cursor': null,
  'pageToken': null,
};
void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  testWidgets('department composer fits a narrow screen with large text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(1.3)),
          child: child!,
        ),
        home: Scaffold(
          body: SingleChildScrollView(
            child: DepartmentUpdates(
              uid: superAdminUid,
              claims: {...adminClaims, 'role': 'superadmin'},
              request: emptyRequest,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Announcement/Messages'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Write an announcement or message'));
    await tester.tap(find.text('Write an announcement or message'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  testWidgets(
    'home identifies each role and reserves admin tools for managers',
    (tester) async {
      for (final role in ['regular', 'admin', 'superadmin']) {
        final claims = {...adminClaims, 'role': role};
        final uid = role == 'superadmin' ? superAdminUid : 'worker';
        await tester.pumpWidget(
          MaterialApp(
            home: HomePage(
              key: ValueKey(role),
              auth: AccessTestAuth(claims: claims, uid: uid),
              request: emptyRequest,
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.byType(IntroNoticesPanel), findsNothing);
        expect(
          find.text(
            role == 'superadmin'
                ? 'Super Admin'
                : role == 'admin'
                ? 'Department Admin'
                : 'Regular user',
          ),
          findsOneWidget,
        );
        expect(
          find.text(
            role == 'superadmin'
                ? 'Super Admin tools'
                : 'Department Admin tools',
          ),
          role == 'regular' ? findsNothing : findsOneWidget,
        );
      }
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'regular workers read announcements and inbox without publishing controls',
    (tester) async {
      final calls = <Map<String, dynamic>>[];
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: DepartmentUpdates(
                uid: 'worker',
                claims: {...adminClaims, 'role': 'regular'},
                request: (name, data) async {
                  calls.add(data);
                  return {
                    'items': [
                      {
                        'text': 'Department notice',
                        'authorName': 'Admin',
                        'createdAt': '2026-10-24T00:00:00Z',
                      },
                    ],
                    'cursor': null,
                  };
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Department notice'), findsNothing);
      await tester.tap(find.text('Announcement/Messages'));
      await tester.pumpAndSettle();
      expect(find.text('Department notice'), findsOneWidget);
      expect(find.text('Write an announcement or message'), findsNothing);
      await tester.tap(find.textContaining('My inbox'));
      await tester.pumpAndSettle();
      expect(calls.last['kind'], 'inboxes');
      expect(calls.last['department'], 'tourism');
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'admin publishes a department announcement through the secured endpoint',
    (tester) async {
      final calls = <String>[];
      Map<String, dynamic>? sent;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: DepartmentUpdates(
                uid: 'admin',
                claims: adminClaims,
                request: (name, data) async {
                  calls.add(name);
                  if (name == 'publishDepartmentUpdate') sent = data;
                  return {'items': [], 'cursor': null};
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Announcement/Messages'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Write an announcement or message'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byType(TextField),
        'Tomorrow’s department meeting is at 9 AM.',
      );
      await tester.ensureVisible(find.text('Publish announcement'));
      await tester.tap(find.text('Publish announcement'));
      await tester.pumpAndSettle();
      expect(sent?['department'], 'tourism');
      expect(sent?['text'], 'Tomorrow’s department meeting is at 9 AM.');
      expect(sent?.containsKey('recipientUid'), false);
      expect(calls.contains('publishDepartmentUpdate'), true);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'department admin editor keeps worker role and existing department locked',
    (tester) async {
      final user = {
        'uid': 'worker',
        'username': 'Worker',
        'email': 'worker@example.com',
        'role': 'regular',
        'departments': ['tourism'],
        'approved': false,
        'disabled': false,
        'protected': false,
        'assignedAccess': {'apps': true, 'tourism': true},
      };
      Map<String, dynamic>? saved;
      await tester.pumpWidget(
        MaterialApp(
          home: AdminUserEditor(
            user: user,
            actorUid: 'admin',
            claims: adminClaims,
            request: (name, data) async {
              saved = data;
              return {};
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(DropdownButtonFormField<String>), findsNothing);
      final department = find.widgetWithText(CheckboxListTile, 'Tourism').first;
      expect((tester.widget(department) as CheckboxListTile).onChanged, isNull);
      await tester.scrollUntilVisible(
        find.text('Approve account access'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Approve account access'));
      await tester.pump();
      await tester.scrollUntilVisible(
        find.text('Save account'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Save account'));
      await tester.pumpAndSettle();
      expect(saved?['role'], 'regular');
      expect(saved?['departments'], ['tourism']);
      expect(saved?['approved'], true);
      expect(saved?.containsKey('password'), false);
    },
  );
  test('Philippine login time is independent of host timezone', () {
    expect(philippineTime('2026-10-24T00:00:00Z'), '2026-10-24 08:00:00 PHT');
  });
  testWidgets(
    'Tourism admin report loads every page and excludes missing legacy counts',
    (tester) async {
      final pages = <Map<String, dynamic>>[];
      await tester.pumpWidget(
        MaterialApp(
          home: TourismAdminPage(
            request: (name, data) async {
              if (name == 'getTourismFee') {
                return {
                  'rate': {'feePerPersonCentavos': 550},
                };
              }
              pages.add(data);
              return data['cursor'] == null
                  ? {
                      'records': [
                        {
                          'name': 'Group',
                          'touristCount': 2,
                          'feeTotalCentavos': 550,
                        },
                      ],
                      'cursor': 'older',
                    }
                  : {
                      'records': [
                        {'name': 'Legacy', 'fee': 20},
                      ],
                      'cursor': null,
                    };
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text(
          '2 registrations · 2 recorded tourists · ₱25.50 recorded fees',
        ),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(pages.length, 2);
      expect(pages.last['cursor'], 'older');
      expect(
        find.text(
          '2 registrations · 2 recorded tourists · ₱25.50 recorded fees',
        ),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets('private messages require selecting a department recipient', (
    tester,
  ) async {
    Map<String, dynamic>? sent;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: DepartmentUpdates(
              uid: 'admin',
              claims: adminClaims,
              request: (name, data) async {
                if (name == 'listDashboardUsers') {
                  return {
                    'users': [
                      {
                        'uid': 'worker',
                        'username': 'Worker',
                        'email': 'worker@example.com',
                        'departments': ['tourism'],
                        'disabled': false,
                      },
                    ],
                    'pageToken': null,
                  };
                }
                if (name == 'publishDepartmentUpdate') sent = data;
                return {'items': [], 'cursor': null};
              },
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Announcement/Messages'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Write an announcement or message'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Load department recipients'));
    await tester.tap(find.text('Load department recipients'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<String>).last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Worker · worker@example.com').last);
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byType(TextField),
      'Please check your assigned visitor register.',
    );
    await tester.ensureVisible(find.text('Send message'));
    await tester.tap(find.text('Send message'));
    await tester.pumpAndSettle();
    expect(sent?['recipientUid'], 'worker');
    expect(sent?['department'], 'tourism');
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
