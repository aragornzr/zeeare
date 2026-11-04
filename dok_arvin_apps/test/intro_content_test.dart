import 'package:dok_arvin_apps/intro_admin_page.dart';
import 'package:dok_arvin_apps/intro_notices.dart';
import 'package:dok_arvin_apps/intro_screen/intro_page_1.dart';
import 'package:dok_arvin_apps/intro_screen/intro_page_2.dart';
import 'package:dok_arvin_apps/admin_console.dart';
import 'package:dok_arvin_apps/access_gate.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Future<Map<String, dynamic>> fixture(
  String name,
  Map<String, dynamic> data,
) async => {
  'pages': [
    {
      'page': 'page1',
      'title': 'Welcome from San Antonio',
      'text': 'Our town, our community',
      'imageUrl': '',
      'version': 4,
    },
    {
      'page': 'page2',
      'title': 'Explore municipal services',
      'text': 'Services for everyone',
      'imageUrl': '',
      'version': 2,
    },
  ],
  'items': [
    {
      'text': data['audience'] == 'mine'
          ? 'Private instruction for you'
          : 'Announcement for all',
      'kind': data['audience'] == 'mine' ? 'instruction' : 'announcement',
      'authorName': 'Super Admin',
      'createdAt': '2026-10-24T00:00:00Z',
    },
  ],
  'users': [],
  'cursor': null,
  'pageToken': null,
};
void main() {
  testWidgets('intro pages 1 and 2 display saved titles and text', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: IntroPage1(request: fixture)),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Welcome from San Antonio'), findsOneWidget);
    expect(find.text('Our town, our community'), findsOneWidget);
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: IntroPage2(request: fixture)),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Explore municipal services'), findsOneWidget);
  });
  testWidgets(
    'personal notices require sign-in and are cleared when user changes',
    (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: IntroNoticesPanel(userId: 'worker', request: fixture),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('For me'));
      await tester.pumpAndSettle();
      expect(find.text('Private instruction for you'), findsOneWidget);
      expect(find.text('Instruction'), findsOneWidget);
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: IntroNoticesPanel(request: fixture),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Private instruction for you'), findsNothing);
      expect(find.text('Announcement for all'), findsOneWidget);
      final chip = tester.widget<ChoiceChip>(
        find.widgetWithText(ChoiceChip, 'For me'),
      );
      expect(chip.onSelected, isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'intro management entry appears only for the protected super admin',
    (tester) async {
      for (final root in [false, true]) {
        await tester.pumpWidget(
          MaterialApp(
            home: AdminConsole(
              key: ValueKey(root),
              uid: root ? superAdminUid : 'admin',
              claims: {
                'role': root ? 'superadmin' : 'admin',
                'approved': true,
                'departments': ['tourism'],
                'access': {'apps': true, 'tourism': true},
              },
              request: fixture,
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          find.text('Intro pages & global notices'),
          root ? findsOneWidget : findsNothing,
        );
      }
    },
  );
  testWidgets(
    'page editing submits the loaded version without arbitrary image URLs',
    (tester) async {
      Map<String, dynamic>? saved;
      await tester.pumpWidget(
        MaterialApp(
          home: IntroAdminPage(
            request: (name, data) async {
              if (name == 'saveIntroPage') saved = data;
              return fixture(name, data);
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, 'A new welcome');
      await tester.scrollUntilVisible(
        find.text('Save intro page'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Save intro page'));
      await tester.pumpAndSettle();
      expect(saved?['title'], 'A new welcome');
      expect(saved?['page'], 'page1');
      expect(saved?['version'], 4);
      expect(saved?.containsKey('imageUrl'), false);
    },
  );
  testWidgets(
    'page 3 editor supports private text instructions to registered recipients',
    (tester) async {
      Map<String, dynamic>? sent;
      await tester.pumpWidget(
        MaterialApp(
          home: IntroAdminPage(
            request: (name, data) async {
              if (name == 'listDashboardUsers') {
                return {
                  'users': [
                    {
                      'uid': 'worker',
                      'username': 'Worker',
                      'email': 'worker@example.com',
                      'disabled': false,
                    },
                  ],
                  'pageToken': null,
                };
              }
              if (name == 'publishIntroNotice') sent = data;
              return fixture(name, data);
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byType(DropdownButtonFormField<String>).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Intro page 3 · Notices').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Load registered recipients'));
      await tester.pumpAndSettle();
      await tester.tap(find.byType(DropdownButtonFormField<String>).at(1));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Worker · worker@example.com').last);
      await tester.pumpAndSettle();
      await tester.tap(find.byType(DropdownButtonFormField<String>).at(2));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Command / instruction').last);
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byType(TextField),
        'Please report to your department office.',
      );
      await tester.scrollUntilVisible(
        find.text('Publish / send notice'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Publish / send notice'));
      await tester.pumpAndSettle();
      expect(sent?['kind'], 'instruction');
      expect(sent?['recipientUid'], 'worker');
      expect(sent?['text'], 'Please report to your department office.');
    },
  );
}
