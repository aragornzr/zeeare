import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:path_provider/path_provider.dart';

class PatientRecord {
  const PatientRecord({
    required this.id,
    required this.ownerId,
    required this.patientNumber,
    required this.patientName,
    required this.doctorName,
    required this.checkedAt,
    required this.createdAt,
    this.notes = '',
    this.uploaded = false,
  });

  final String id, ownerId, patientNumber, patientName, doctorName, notes;
  final DateTime checkedAt, createdAt;
  final bool uploaded;

  PatientRecord synced() => PatientRecord(
    id: id,
    ownerId: ownerId,
    patientNumber: patientNumber,
    patientName: patientName,
    doctorName: doctorName,
    checkedAt: checkedAt,
    createdAt: createdAt,
    notes: notes,
    uploaded: true,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'ownerId': ownerId,
    'patientNumber': patientNumber,
    'patientName': patientName,
    'doctorName': doctorName,
    'notes': notes,
    'checkedAt': checkedAt.toUtc().toIso8601String(),
    'createdAt': createdAt.toUtc().toIso8601String(),
    'uploaded': uploaded,
  };

  factory PatientRecord.fromJson(Map<String, dynamic> data) => PatientRecord(
    id: data['id'] as String,
    ownerId: data['ownerId'] as String,
    patientNumber: data['patientNumber'] as String,
    patientName: data['patientName'] as String,
    doctorName: data['doctorName'] as String,
    checkedAt: DateTime.parse(data['checkedAt'] as String),
    createdAt: DateTime.parse(data['createdAt'] as String),
    notes: data['notes'] as String? ?? '',
    uploaded: data['uploaded'] == true,
  );

  factory PatientRecord.fromCloud(String id, Map<String, dynamic> data) {
    return PatientRecord.fromJson({
      ...data,
      'id': id,
      'uploaded': true,
      'checkedAt': (data['checkedAt'] as Timestamp).toDate().toIso8601String(),
      'createdAt': (data['createdAt'] as Timestamp).toDate().toIso8601String(),
    });
  }

  Map<String, dynamic> toCloud() => {
    'ownerId': ownerId,
    'patientNumber': patientNumber,
    'patientName': patientName,
    'doctorName': doctorName,
    'notes': notes,
    'checkedAt': Timestamp.fromDate(checkedAt),
    'createdAt': Timestamp.fromDate(createdAt),
    'uploadedAt': FieldValue.serverTimestamp(),
  };
}

/// Local files form a durable, account-scoped database and upload queue.
/// Visits are append-only; retries reuse the same Firestore document ID.
class PatientStore {
  PatientStore({
    String? Function()? userId,
    Future<Directory> Function(String)? directory,
    Future<void> Function(PatientRecord)? upload,
    Future<List<PatientRecord>> Function(String)? download,
    String Function()? newId,
  }) : _userId = userId ?? (() => FirebaseAuth.instance.currentUser?.uid),
       _directoryOverride = directory,
       _uploadOverride = upload,
       _downloadOverride = download,
       _newId =
           newId ??
           (() => FirebaseFirestore.instance
               .collection('patient_records')
               .doc()
               .id);

  final String? Function() _userId;
  final Future<Directory> Function(String)? _directoryOverride;
  final Future<void> Function(PatientRecord)? _uploadOverride;
  final Future<List<PatientRecord>> Function(String)? _downloadOverride;
  final String Function() _newId;
  bool syncing = false;
  String? syncError;

  String? get userId => _userId();
  void _checkUser(String uid) {
    if (_userId() != uid) throw StateError('Please sign in again.');
  }

  Future<Directory> _directory(String uid) async {
    if (_directoryOverride != null) return _directoryOverride(uid);
    final root = await getApplicationDocumentsDirectory();
    final key = base64Url.encode(utf8.encode(uid));
    return Directory('${root.path}/rhu/patients/$key').create(recursive: true);
  }

  File _file(Directory directory, String id) =>
      File('${directory.path}/${base64Url.encode(utf8.encode(id))}.json');

  Future<void> _write(Directory directory, PatientRecord record) async {
    final file = _file(directory, record.id);
    final temporary = File('${file.path}.tmp');
    await temporary.writeAsString(jsonEncode(record.toJson()), flush: true);
    await temporary.rename(file.path);
  }

  Future<List<PatientRecord>> records() async {
    final uid = _userId();
    if (uid == null) return [];
    final directory = await _directory(uid);
    final result = <PatientRecord>[];
    await for (final file in directory.list()) {
      if (file is File && file.path.endsWith('.json')) {
        final record = PatientRecord.fromJson(
          jsonDecode(await file.readAsString()) as Map<String, dynamic>,
        );
        if (record.ownerId == uid) result.add(record);
      }
    }
    if (_userId() != uid) return [];
    result.sort((a, b) => b.checkedAt.compareTo(a.checkedAt));
    return result;
  }

  Future<void> save({
    required String patientNumber,
    required String patientName,
    required String doctorName,
    required DateTime checkedAt,
    String notes = '',
  }) async {
    final uid = _userId();
    if (uid == null) throw StateError('Please sign in before saving.');
    if (patientNumber.trim().isEmpty ||
        patientNumber.trim().length > 80 ||
        patientName.trim().isEmpty ||
        patientName.trim().length > 160 ||
        doctorName.trim().isEmpty ||
        doctorName.trim().length > 160 ||
        notes.trim().length > 4000 ||
        checkedAt.isAfter(DateTime.now())) {
      throw ArgumentError(
        'Enter a patient ID, name, doctor, and a past or current checkup time.',
      );
    }
    final directory = await _directory(uid);
    _checkUser(uid);
    await _write(
      directory,
      PatientRecord(
        id: _newId(),
        ownerId: uid,
        patientNumber: patientNumber.trim(),
        patientName: patientName.trim(),
        doctorName: doctorName.trim(),
        checkedAt: checkedAt.toUtc(),
        createdAt: DateTime.now().toUtc(),
        notes: notes.trim(),
      ),
    );
  }

  Future<List<PatientRecord>> _download(String uid) async {
    if (_downloadOverride != null) return _downloadOverride(uid);
    final records = <PatientRecord>[];
    final query = FirebaseFirestore.instance
        .collection('patient_records')
        .where('ownerId', isEqualTo: uid)
        .orderBy(FieldPath.documentId)
        .limit(100);
    QueryDocumentSnapshot<Map<String, dynamic>>? last;
    while (true) {
      _checkUser(uid);
      final page = await (last == null ? query : query.startAfterDocument(last))
          .get(const GetOptions(source: Source.server))
          .timeout(const Duration(seconds: 20));
      for (final document in page.docs) {
        records.add(PatientRecord.fromCloud(document.id, document.data()));
      }
      if (page.docs.length < 100) break;
      last = page.docs.last;
    }
    return records;
  }

  Future<void> sync() async {
    final uid = _userId();
    if (uid == null || syncing) return;
    syncing = true;
    syncError = null;
    try {
      final directory = await _directory(uid);
      // Download first so an upload failure does not hide previously uploaded visits.
      try {
        final cloud = await _download(uid);
        _checkUser(uid);
        for (final record in cloud) {
          _checkUser(uid);
          if (record.ownerId != uid) continue;
          final file = _file(directory, record.id);
          if (await file.exists()) {
            final local = PatientRecord.fromJson(
              jsonDecode(await file.readAsString()) as Map<String, dynamic>,
            );
            // Never replace a pending local visit with a stale cloud version.
            if (!local.uploaded) continue;
          }
          await _write(directory, record.synced());
        }
      } catch (error) {
        syncError = describeError(error);
      }
      _checkUser(uid);
      final pending = await records();
      for (final record in pending.where((record) => !record.uploaded)) {
        _checkUser(uid);
        try {
          if (_uploadOverride != null) {
            await _uploadOverride(record);
          } else {
            await FirebaseFirestore.instance
                .collection('patient_records')
                .doc(record.id)
                .set(record.toCloud())
                .timeout(const Duration(seconds: 20));
          }
          _checkUser(uid);
          await _write(directory, record.synced());
        } catch (error) {
          syncError = describeError(error);
          break; // Preserve the queue; do not wait once per record while offline.
        }
      }
    } catch (error) {
      syncError = describeError(error);
    } finally {
      syncing = false;
    }
  }

  static String describeError(Object error) {
    if (error is FirebaseException && error.code == 'permission-denied') {
      return 'Firebase access was denied. Your device records are still available. Check your account and patient record permissions.';
    }
    if (error is TimeoutException ||
        error is SocketException ||
        error is FirebaseException && error.code == 'unavailable') {
      return 'Firebase is unreachable. Device records remain available; retry Sync now when online.';
    }
    if (error is FileSystemException || error is FormatException) {
      return 'Could not read or write device records. Check device storage and retry.';
    }
    return 'Could not sync patient records. Device records are kept. Please retry or check Firebase configuration.';
  }
}
