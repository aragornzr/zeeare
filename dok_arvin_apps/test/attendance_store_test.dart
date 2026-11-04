import 'dart:convert';
import 'package:dok_arvin_apps/attendance_store.dart';
import 'package:flutter_test/flutter_test.dart';

List<double> vector(int index) =>
    List.generate(192, (i) => i == index ? 1.0 : 0.0);
AttendancePerson person(String id, {List<List<double>>? faces}) =>
    AttendancePerson(
      id: id,
      name: 'Employee $id',
      employeeId: id,
      enrolledAt: DateTime.utc(2026, 10, 12),
      faces: faces ?? [vector(0)],
    );
AttendanceEvent event({
  String id = 'event',
  String action = 'in',
  DateTime? time,
  DateTime? locationTime,
  double accuracy = 10,
  String uid = 'operator',
}) {
  final at = time ?? DateTime.utc(2026, 10, 12, 8);
  return AttendanceEvent(
    id: id,
    personId: 'A',
    personName: 'Employee A',
    employeeId: 'A',
    action: action,
    time: at,
    latitude: 14.5,
    longitude: 121,
    accuracy: accuracy,
    method: 'local_face',
    operatorUid: uid,
    locationTime: locationTime ?? at,
    offsetMinutes: 480,
    similarity: .9,
  );
}

void main() {
  test(
    'face matching rejects unknown, ambiguous, zero and non-finite vectors',
    () {
      final people = [
        person('A'),
        person('B', faces: [vector(1)]),
      ];
      expect(matchAttendanceFace(vector(0), people)?.person.id, 'A');
      expect(matchAttendanceFace(vector(2), people), isNull);
      expect(
        matchAttendanceFace(vector(0), [person('A'), person('B')]),
        isNull,
      );
      expect(matchAttendanceFace(List.filled(192, 0), people), isNull);
      expect(matchAttendanceFace(List.filled(192, double.nan), people), isNull);
    },
  );

  test(
    'persisted attendance reopens with identity, time and location intact',
    () async {
      String? disk;
      final store = AttendanceStore(
        'operator',
        readOverride: () async => disk,
        writeOverride: (value) async => disk = value,
      );
      await store.load();
      await store.enroll(person('A'));
      await store.record(event());
      final reopened = AttendanceStore(
        'operator',
        readOverride: () async => disk,
      );
      await reopened.load();
      expect(reopened.people.single.employeeId, 'A');
      expect(reopened.events.single.longitude, 121);
      expect(reopened.events.single.offsetMinutes, 480);
      expect(reopened.events.single.time, event().time);
      expect(reopened.nextAction('A'), 'out');
      expect((jsonDecode(disk!) as Map)['version'], 1);
    },
  );

  test(
    'invalid sequence, rapid duplicate, stale GPS and wrong operator never save',
    () async {
      final store = AttendanceStore(
        'operator',
        readOverride: () async => null,
        writeOverride: (_) async {},
      );
      await store.load();
      await store.enroll(person('A'));
      await expectLater(store.record(event(action: 'out')), throwsStateError);
      await expectLater(store.record(event(accuracy: 101)), throwsStateError);
      await expectLater(
        store.record(event(locationTime: DateTime.utc(2026, 10, 12, 7))),
        throwsStateError,
      );
      await expectLater(store.record(event(uid: 'other')), throwsStateError);
      expect(store.events, isEmpty);
      await store.record(event());
      await expectLater(store.record(event(id: 'duplicate')), throwsStateError);
      await expectLater(
        store.record(
          event(
            action: 'out',
            time: event().time.add(const Duration(seconds: 30)),
          ),
        ),
        throwsStateError,
      );
      await store.record(
        event(
          id: 'out',
          action: 'out',
          time: event().time.add(const Duration(hours: 8)),
        ),
      );
      expect(store.events.length, 2);
      expect(store.nextAction('A'), 'in');
    },
  );

  test(
    'failed disk write preserves in-memory state and supports retry',
    () async {
      bool fail = false;
      final store = AttendanceStore(
        'operator',
        readOverride: () async => null,
        writeOverride: (_) async {
          if (fail) throw StateError('Disk full');
        },
      );
      await store.load();
      await store.enroll(person('A'));
      fail = true;
      await expectLater(store.record(event()), throwsStateError);
      expect(store.events, isEmpty);
      expect(store.nextAction('A'), 'in');
      fail = false;
      await store.record(event());
      expect(store.events.length, 1);
    },
  );

  test('simultaneous clock-ins cannot append duplicates', () async {
    final store = AttendanceStore(
      'operator',
      readOverride: () async => null,
      writeOverride: (_) async {},
    );
    await store.load();
    await store.enroll(person('A'));
    final first = store.record(event());
    final second = store.record(event(id: 'second'));
    await expectLater(second, throwsStateError);
    await first;
    expect(store.events.length, 1);
  });

  test(
    'duplicate employee ID and account binding cannot be enrolled',
    () async {
      final store = AttendanceStore(
        'operator',
        readOverride: () async => null,
        writeOverride: (_) async {},
      );
      await store.load();
      await store.enroll(person('A'));
      await expectLater(store.enroll(person('A')), throwsStateError);
      await store.enroll(
        AttendancePerson(
          id: 'self',
          name: 'Me',
          employeeId: 'SELF',
          accountUid: 'operator',
          enrolledAt: DateTime.now(),
        ),
      );
      await expectLater(
        store.enroll(
          AttendancePerson(
            id: 'other',
            name: 'Other',
            employeeId: 'OTHER',
            accountUid: 'operator',
            enrolledAt: DateTime.now(),
          ),
        ),
        throwsStateError,
      );
    },
  );

  test('corrupted existing records do not get silently replaced', () async {
    var writes = 0;
    final store = AttendanceStore(
      'operator',
      readOverride: () async => '{broken',
      writeOverride: (_) async => writes++,
    );
    await expectLater(store.load(), throwsFormatException);
    await expectLater(store.enroll(person('A')), throwsStateError);
    expect(writes, 0);
  });
  test(
    'device evidence, employee linkage and upload acknowledgements survive reopening',
    () async {
      String? saved;
      final store = AttendanceStore(
        'operator',
        readOverride: () async => saved,
        writeOverride: (value) async {
          saved = value;
        },
      );
      await store.load();
      await store.enroll(person('A'));
      final linked = await store.linkAccount('A', 'employee-account');
      expect(linked.faces, isNotEmpty);
      expect(linked.accountUid, 'employee-account');
      final attendance = AttendanceEvent.fromJson({
        ...event().toJson(),
        'ownerUid': 'employee-account',
        'device': {
          'platform': 'android',
          'manufacturer': 'Maker',
          'model': 'Phone',
          'osVersion': '16',
        },
      });
      await store.record(attendance);
      await store.markUploaded(attendance.id);
      final reopened = AttendanceStore(
        'operator',
        readOverride: () async => saved,
        writeOverride: (_) async {},
      );
      await reopened.load();
      expect(reopened.events.single.ownerUid, 'employee-account');
      expect(reopened.events.single.device['osVersion'], '16');
      expect(reopened.isUploaded(attendance.id), true);
      expect(reopened.people.single.faces, linked.faces);
    },
  );

  test(
    'failed upload acknowledgement persistence keeps attendance pending',
    () async {
      var fail = false;
      final store = AttendanceStore(
        'operator',
        readOverride: () async => null,
        writeOverride: (_) async {
          if (fail) throw StateError('Disk unavailable');
        },
      );
      await store.load();
      await store.enroll(person('A'));
      await store.record(event());
      fail = true;
      await expectLater(store.markUploaded('event'), throwsStateError);
      expect(store.isUploaded('event'), false);
      expect(store.events, hasLength(1));
    },
  );
}
