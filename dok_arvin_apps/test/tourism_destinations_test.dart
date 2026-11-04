import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dok_arvin_apps/tourism_destinations.dart';

Map<String, dynamic> catalog({bool edit = false, bool delegate = false}) => {
  'version': 2,
  'canEdit': edit,
  'canDelegate': delegate,
  'destinations': [
    {'id': 'bay', 'name': 'Bay Resort', 'active': true},
    {'id': 'old', 'name': 'Closed resort', 'active': false},
  ],
};
void main() {
  testWidgets(
    'picker searches active destinations and keeps manual destinations available',
    (tester) async {
      final controller = TextEditingController();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Form(
              child: TourismDestinationField(
                controller: controller,
                request: (name, data) async => catalog(),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Choose saved destination'));
      await tester.pumpAndSettle();
      expect(find.text('Bay Resort'), findsOneWidget);
      expect(find.text('Closed resort'), findsNothing);
      await tester.enterText(find.byType(TextField).last, 'bay');
      await tester.tap(find.text('Bay Resort'));
      await tester.pumpAndSettle();
      expect(controller.text, 'Bay Resort');
      await tester.enterText(find.byType(TextFormField), 'Another destination');
      expect(controller.text, 'Another destination');
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
    },
  );
  testWidgets('offline list failure preserves the draft destination', (
    tester,
  ) async {
    final controller = TextEditingController(
      text: 'Locally entered destination',
    );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TourismDestinationField(
            controller: controller,
            request: (name, data) async => throw Exception('offline'),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(controller.text, 'Locally entered destination');
    expect(
      find.text('Saved list unavailable. You can still enter a destination.'),
      findsOneWidget,
    );
    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
  });
  testWidgets(
    'delegated editor saves versioned changes and retains a conflicting draft',
    (tester) async {
      Map<String, dynamic>? saved;
      await tester.pumpWidget(
        MaterialApp(
          home: TourismDestinationsPage(
            request: (name, data) async {
              if (name == 'saveTourismDestination') {
                saved = data;
                throw Exception('conflict');
              }
              return catalog(edit: true);
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Delegate destination management'), findsNothing);
      await tester.enterText(find.byType(TextField), 'New resort');
      await tester.tap(find.text('Save destination'));
      await tester.pumpAndSettle();
      expect(saved?['version'], 2);
      expect(saved?['name'], 'New resort');
      expect(find.text('New resort'), findsOneWidget);
      expect(saved?.containsKey('id'), false);
    },
  );
  testWidgets('admin delegates to Tourism personnel on a narrow screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 1100);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final calls = <String>[];
    Map<String, dynamic>? delegation;
    Future<Map<String, dynamic>> request(
      String name,
      Map<String, dynamic> data,
    ) async {
      calls.add(name);
      if (name == 'listTourismDestinationPersonnel') {
        return {
          'users': [
            {
              'uid': 'worker',
              'username': 'Tourism personnel',
              'email': 'personnel@example.com',
              'eligible': true,
              'delegated': false,
            },
          ],
          'pageToken': null,
        };
      }
      if (name == 'setTourismDestinationEditor') {
        delegation = data;
        return {'saved': true};
      }
      return catalog(edit: true, delegate: true);
    }

    await tester.pumpWidget(
      MaterialApp(home: TourismDestinationsPage(request: request)),
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Delegate destination management'));
    await tester.tap(find.text('Delegate destination management'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Load Tourism personnel'));
    await tester.tap(find.text('Load Tourism personnel'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byType(SwitchListTile).last);
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Switch).last);
    await tester.pumpAndSettle();
    expect(delegation?['uid'], 'worker');
    expect(delegation?['enabled'], true);
    expect(tester.takeException(), isNull);
    expect(calls.contains('updateDashboardUser'), false);
  });
}
