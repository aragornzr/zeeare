import 'auth_access_fake.dart';
import 'package:dok_arvin_apps/app_theme.dart';
import 'package:dok_arvin_apps/access_gate.dart';
import 'package:dok_arvin_apps/home_page.dart';
import 'package:dok_arvin_apps/pharmacy_page.dart';
import 'package:dok_arvin_apps/pharmacy_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class _PreviewStore extends PharmacyStore {
  @override
  String? get userId => 'staff';
  @override
  Future<void> sync() async {}
  @override
  Future<List<Medicine>> records() async => [
    Medicine(
      id: '1',
      ownerId: 'staff',
      name: 'Paracetamol',
      strength: '500 mg tablet',
      quantity: 24,
      revision: '1',
      createdAt: DateTime(2026),
      updatedAt: DateTime(2026),
      uploaded: true,
    ),
  ];
}

void main() {
  testWidgets(
    'menu is immediately available and works at narrow and wide widths',
    (tester) async {
      for (final width in [320.0, 1100.0]) {
        await tester.binding.setSurfaceSize(Size(width, 900));
        await tester.pumpWidget(
          MaterialApp(
            theme: buildAppTheme(),
            home: HomePage(auth: AccessTestAuth()),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Choose a service'), findsOneWidget);
        await tester.ensureVisible(find.text('RHU'));
        await tester.tap(find.text('RHU'));
        await tester.pumpAndSettle();
        expect(find.text('Patient Record System'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
      }
      await tester.binding.setSurfaceSize(null);
    },
  );
  testWidgets(
    'pharmacy displays synced inventory and search on a narrow screen',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(320, 1000));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(
        MaterialApp(
          theme: buildAppTheme(),
          home: PharmacyPage(store: _PreviewStore(), auth: AccessTestAuth()),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Paracetamol'), findsOneWidget);
      expect(find.text('Saved to Firebase'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'does not exist');
      await tester.pumpAndSettle();
      expect(find.text('No matching medicines'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'Tourism user sees only their assigned menu after Firebase permissions load',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(
            auth: AccessTestAuth(
              claims: {
                'approved': true,
                'departments': ['tourism'],
                'access': {'apps': true, 'tourism': true, 'rhu': true},
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Tourism'), findsOneWidget);
      for (final label in [
        'RHU',
        'Attendance',
        'MSWD',
        'Treasurer',
        'HRMO',
        'MAO',
        'Engineering',
      ]) {
        expect(find.text(label), findsNothing);
      }
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'menu updates when assigned sections change and refresh is pressed',
    (tester) async {
      final claims = <String, dynamic>{
        'approved': true,
        'departments': ['tourism'],
        'access': {'apps': true, 'tourism': true},
      };
      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(auth: AccessTestAuth(claims: claims)),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Tourism'), findsOneWidget);
      claims['departments'] = ['rhu'];
      claims['access'] = {'apps': true, 'rhu': true};
      await tester.ensureVisible(find.text('Refresh menu access'));
      await tester.tap(find.text('Refresh menu access'));
      await tester.pumpAndSettle();
      expect(find.text('Tourism'), findsNothing);
      expect(find.widgetWithText(ServiceCard, 'RHU'), findsOneWidget);
      claims['approved'] = false;
      await tester.tap(find.text('Refresh menu access'));
      await tester.pumpAndSettle();
      expect(find.byType(ServiceCard), findsNothing);
      expect(find.text('Access required'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'empty assignments show no menus and protected super admin sees all services',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(
            auth: AccessTestAuth(
              claims: {
                'approved': true,
                'departments': ['tourism'],
                'access': {'apps': true},
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(ServiceCard), findsNothing);
      expect(
        find.textContaining('No service menus have been assigned'),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpWidget(
        MaterialApp(
          home: HomePage(
            auth: AccessTestAuth(
              uid: superAdminUid,
              claims: {'role': 'superadmin'},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(ServiceCard), findsNWidgets(8));
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'successful Auth without approval or app access cannot display service menus',
    (tester) async {
      for (final claims in [
        {
          'approved': false,
          'departments': ['tourism'],
          'access': {'apps': true, 'tourism': true},
        },
        {
          'approved': true,
          'departments': ['tourism'],
          'access': {'tourism': true},
        },
        {'role': 'superadmin'},
      ]) {
        await tester.pumpWidget(
          MaterialApp(
            home: HomePage(auth: AccessTestAuth(claims: claims)),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.byType(ServiceCard), findsNothing);
        expect(find.text('Access required'), findsOneWidget);
        await tester.pumpWidget(const SizedBox.shrink());
      }
    },
  );
}
