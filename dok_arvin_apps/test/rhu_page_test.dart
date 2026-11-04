import 'auth_access_fake.dart';
import 'package:dok_arvin_apps/home_page.dart';
import 'package:dok_arvin_apps/patient_records_page.dart';
import 'package:dok_arvin_apps/patient_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('RHU opens both system entries from the home menu', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(home: HomePage(auth: AccessTestAuth())),
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('RHU'));
    await tester.tap(find.text('RHU'));
    await tester.pumpAndSettle();
    expect(find.text('Patient Record System'), findsOneWidget);
    expect(find.text('Pharmacy System'), findsOneWidget);
  });

  testWidgets(
    'checkup form validates patient and doctor and saves selected visit data',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(900, 1400));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final store = _FormStore();
      await tester.pumpWidget(
        MaterialApp(home: PatientVisitForm(store: store)),
      );
      await tester.ensureVisible(find.text('Save checkup'));
      await tester.tap(find.text('Save checkup'));
      await tester.pumpAndSettle();
      expect(find.text('Patient ID is required.'), findsOneWidget);
      expect(
        find.text('Doctor who checked the patient is required.'),
        findsOneWidget,
      );
      final fields = find.byType(TextFormField);
      await tester.enterText(fields.at(0), 'RHU-001');
      await tester.enterText(fields.at(1), 'Ana Santos');
      await tester.enterText(fields.at(2), 'Dr. Cruz');
      await tester.enterText(fields.at(3), 'Follow-up');
      await tester.ensureVisible(find.text('Save checkup'));
      await tester.tap(find.text('Save checkup'));
      expect(store.saved?['patientName'], 'Ana Santos');
      expect(store.saved?['doctorName'], 'Dr. Cruz');
      expect(store.saved?['notes'], 'Follow-up');
      expect(store.saved?['checkedAt'], isA<DateTime>());
      await tester.pumpAndSettle();
    },
  );
}

class _FormStore extends PatientStore {
  Map<String, dynamic>? saved;

  @override
  Future<void> save({
    required String patientNumber,
    required String patientName,
    required String doctorName,
    required DateTime checkedAt,
    String notes = '',
  }) async {
    saved = {
      'patientNumber': patientNumber,
      'patientName': patientName,
      'doctorName': doctorName,
      'checkedAt': checkedAt,
      'notes': notes,
    };
  }
}
