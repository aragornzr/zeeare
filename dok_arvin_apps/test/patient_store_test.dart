import 'dart:async';
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:dok_arvin_apps/patient_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Directory root;
  late String? uid;
  late Map<String, PatientRecord> cloud;
  var online = false;
  var nextId = 0;
  late List<String> uploads;

  Future<Directory> directory(String user) =>
      Directory('${root.path}/$user').create(recursive: true);
  PatientStore store() => PatientStore(
    userId: () => uid,
    directory: directory,
    newId: () => 'visit-${nextId++}',
    upload: (record) async {
      if (!online) throw const SocketException('offline');
      uploads.add(record.id);
      cloud[record.id] = record.synced();
    },
    download: (user) async {
      if (!online) throw const SocketException('offline');
      return cloud.values.where((record) => record.ownerId == user).toList();
    },
  );
  Future<void> save(PatientStore repository, {String doctor = 'Dr. Cruz'}) =>
      repository.save(
        patientNumber: ' RHU-001 ',
        patientName: ' Ana Santos ',
        doctorName: doctor,
        checkedAt: DateTime.utc(2026, 1, 1, 5, 30),
        notes: ' Follow-up visit ',
      );

  setUp(() async {
    root = await Directory.systemTemp.createTemp('rhu_patient_test');
    uid = 'staff-a';
    cloud = {};
    online = false;
    nextId = 0;
    uploads = [];
  });
  tearDown(() => root.delete(recursive: true));

  test(
    'offline checkup persists across restart; retry uploads one stable ID',
    () async {
      final first = store();
      await save(first);
      await first.sync();
      expect(first.syncError, contains('unreachable'));
      final restarted = store();
      final local = (await restarted.records()).single;
      expect(local.patientName, 'Ana Santos');
      expect(local.patientNumber, 'RHU-001');
      expect(local.doctorName, 'Dr. Cruz');
      expect(local.checkedAt, DateTime.utc(2026, 1, 1, 5, 30));
      expect(local.notes, 'Follow-up visit');
      expect(local.uploaded, false);
      online = true;
      await restarted.sync();
      await restarted.sync();
      expect(uploads, ['visit-0']);
      expect(cloud.length, 1);
      expect((await restarted.records()).single.uploaded, true);
      expect(restarted.syncError, isNull);
    },
  );

  test(
    'previous Firebase visits download and survive restart without internet',
    () async {
      cloud['previous'] = PatientRecord(
        id: 'previous',
        ownerId: 'staff-a',
        patientNumber: 'RHU-002',
        patientName: 'Previous patient',
        doctorName: 'Dr. Reyes',
        checkedAt: DateTime.utc(2025, 12, 1),
        createdAt: DateTime.utc(2025, 12, 1),
        uploaded: true,
      );
      online = true;
      await store().sync();
      online = false;
      final restarted = store();
      await restarted.sync();
      expect((await restarted.records()).single.id, 'previous');
      expect((await restarted.records()).single.uploaded, true);
      expect(uploads, isEmpty);
    },
  );

  test(
    'separate checkups preserve patient history and sort by checkup time',
    () async {
      final repository = store();
      await save(repository);
      await repository.save(
        patientNumber: 'RHU-001',
        patientName: 'Ana Santos',
        doctorName: 'Dr. Reyes',
        checkedAt: DateTime.utc(2026, 2, 1),
      );
      final visits = await repository.records();
      expect(visits.length, 2);
      expect(visits.first.doctorName, 'Dr. Reyes');
      expect(visits.last.doctorName, 'Dr. Cruz');
      expect(visits.map((visit) => visit.id).toSet().length, 2);
    },
  );

  test('account switch cannot read or upload another account queue', () async {
    final repository = store();
    await save(repository);
    uid = 'staff-b';
    online = true;
    expect(await repository.records(), isEmpty);
    await repository.sync();
    expect(uploads, isEmpty);
    uid = null;
    expect(await repository.records(), isEmpty);
    await expectLater(save(repository), throwsStateError);
    uid = 'staff-a';
    expect((await repository.records()).single.uploaded, false);
  });

  test(
    'account change during download does not cache another user data',
    () async {
      final download = Completer<List<PatientRecord>>();
      final repository = PatientStore(
        userId: () => uid,
        directory: directory,
        newId: () => 'visit',
        upload: (_) async => fail('Must not upload'),
        download: (_) => download.future,
      );
      final syncing = repository.sync();
      await Future<void>.delayed(Duration.zero);
      uid = 'staff-b';
      download.complete([
        PatientRecord(
          id: 'other',
          ownerId: 'staff-a',
          patientNumber: '1',
          patientName: 'Other',
          doctorName: 'Doctor',
          checkedAt: DateTime.utc(2026),
          createdAt: DateTime.utc(2026),
        ),
      ]);
      await syncing;
      expect(await repository.records(), isEmpty);
      uid = 'staff-a';
      expect(await repository.records(), isEmpty);
    },
  );

  test(
    'pending local visit survives stale cloud download and failed upload',
    () async {
      final repository = store();
      await save(repository);
      final local = (await repository.records()).single;
      final denied = PatientStore(
        userId: () => uid,
        directory: directory,
        download: (_) async => [
          PatientRecord(
            id: local.id,
            ownerId: local.ownerId,
            patientNumber: local.patientNumber,
            patientName: 'Stale name',
            doctorName: 'Stale doctor',
            checkedAt: local.checkedAt,
            createdAt: local.createdAt,
            uploaded: true,
          ),
        ],
        upload: (_) async => throw FirebaseException(
          plugin: 'cloud_firestore',
          code: 'permission-denied',
        ),
      );
      await denied.sync();
      final preserved = (await denied.records()).single;
      expect(preserved.patientName, 'Ana Santos');
      expect(preserved.uploaded, false);
      expect(denied.syncError, contains('denied'));
    },
  );

  test('invalid checkups never enter the local queue', () async {
    final repository = store();
    await expectLater(
      repository.save(
        patientNumber: '',
        patientName: 'Patient',
        doctorName: 'Doctor',
        checkedAt: DateTime.utc(2026),
      ),
      throwsArgumentError,
    );
    await expectLater(
      repository.save(
        patientNumber: '1',
        patientName: 'Patient',
        doctorName: 'Doctor',
        checkedAt: DateTime.now().add(const Duration(days: 1)),
      ),
      throwsArgumentError,
    );
    expect(await repository.records(), isEmpty);
  });

  test('Firestore timestamps convert to persisted UTC instants', () {
    final date = DateTime.utc(2026, 1, 1, 5, 30);
    final record = PatientRecord.fromCloud('cloud-id', {
      'ownerId': 'staff-a',
      'patientNumber': 'RHU-001',
      'patientName': 'Ana',
      'doctorName': 'Dr. Cruz',
      'checkedAt': Timestamp.fromDate(date),
      'createdAt': Timestamp.fromDate(date),
    });
    expect(record.checkedAt.toUtc(), date);
    expect(record.uploaded, true);
    expect(PatientRecord.fromJson(record.toJson()).checkedAt, date);
  });
}
