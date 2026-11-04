import 'package:dok_arvin_apps/app_theme.dart';
import 'package:dok_arvin_apps/attendance_page.dart';
import 'package:dok_arvin_apps/attendance_store.dart';
import 'package:dok_arvin_apps/attendance_device_service.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'auth_access_fake.dart';

class _User extends AccessTestUser {
  _User(super.claims);
  @override
  String? get displayName => 'Attendance Employee';
  @override
  String? get email => 'employee@example.com';
}

class _Auth extends AccessTestAuth {
  _Auth(Map<String, dynamic> claims) : employee = _User(claims);
  final _User employee;
  @override
  User? get currentUser => employee;
  @override
  Stream<User?> authStateChanges() => const Stream.empty();
}

class _Device extends AttendanceDeviceService {
  _Device({this.cancel = false});
  final bool cancel;
  int locationCalls = 0;
  @override
  Future<void> authenticate() async {
    if (cancel) {
      throw StateError(
        'Biometric verification was cancelled. Attendance was not recorded.',
      );
    }
  }

  @override
  Future<Position> location() async {
    locationCalls++;
    return Position(
      latitude: 14.5,
      longitude: 121,
      timestamp: DateTime.now(),
      accuracy: 5,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    );
  }
}

void main() {
  for (final cancelled in [true, false]) {
    testWidgets(
      cancelled
          ? 'cancelled biometrics saves no attendance'
          : 'verified attendance saves identity and GPS after confirmation',
      (tester) async {
        final auth = _Auth({
          'role': 'regular',
          'approved': true,
          'departments': ['attendance'],
          'access': {'apps': true, 'attendance': true},
        });
        final device = _Device(cancel: cancelled);
        final store = AttendanceStore(
          'test-user',
          readOverride: () async => null,
          writeOverride: (_) async {},
        );
        await store.load();
        await store.enroll(
          AttendancePerson(
            id: 'self',
            name: 'Attendance Employee',
            employeeId: 'E1',
            accountUid: 'test-user',
            enrolledAt: DateTime.now(),
          ),
        );
        await tester.pumpWidget(
          MaterialApp(
            theme: buildAppTheme(),
            home: AttendancePage(auth: auth, store: store, device: device),
          ),
        );
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(find.text('Verify & time in'), 250);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Verify & time in'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 400));
        if (cancelled) {
          expect(store.events, isEmpty);
          expect(device.locationCalls, 0);
        } else {
          expect(store.events, isEmpty);
          await tester.tap(find.text('Confirm'));
          await tester.pumpAndSettle();
          expect(store.events.single.personId, 'self');
          expect(store.events.single.latitude, 14.5);
          expect(store.events.single.action, 'in');
        }
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
      },
      variant: TargetPlatformVariant({TargetPlatform.android}),
    );
  }
  testWidgets(
    'attendance fits narrow screens and regular users cannot run a shared kiosk',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(320, 900));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final auth = _Auth({
        'role': 'regular',
        'approved': true,
        'departments': ['attendance'],
        'access': {'apps': true, 'attendance': true},
      });
      final store = AttendanceStore(
        'test-user',
        readOverride: () async => null,
        writeOverride: (_) async {},
      );
      await tester.pumpWidget(
        MaterialApp(
          theme: buildAppTheme(),
          home: AttendancePage(auth: auth, store: store),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Enroll my profile'), 250);
      await tester.pumpAndSettle();
      expect(find.text('Enroll my profile'), findsOneWidget);
      await tester.ensureVisible(find.text('Shared'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Shared'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Enroll employee face'), 250);
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<OutlinedButton>(
              find.ancestor(
                of: find.text('Enroll employee face'),
                matching: find.byType(OutlinedButton),
              ),
            )
            .onPressed,
        isNull,
      );
      expect(tester.takeException(), isNull);
      await tester.ensureVisible(find.text('Records'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Records'));
      await tester.pumpAndSettle();
      expect(
        find.text('No attendance recorded on this device yet.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
