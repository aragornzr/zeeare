import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'tourism_fee.dart';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

/// Durable local records are the upload queue; cloud IDs stay stable on retry.
class TourismStore extends ChangeNotifier {
  TourismStore._();

  @visibleForTesting
  TourismStore.testing({
    required String Function() userId,
    required Future<Directory> Function(String) directory,
    required Future<void> Function(Map<String, dynamic>) upload,
    required String Function() newId,
  }) {
    _userId = userId;
    _localDirectory = directory;
    _uploadOverride = upload;
    _newId = newId;
  }

  String? Function() _userId = () => FirebaseAuth.instance.currentUser?.uid;
  Future<Directory> Function(String)? _localDirectory;
  Future<void> Function(Map<String, dynamic>)? _uploadOverride;
  String Function() _newId = () =>
      FirebaseFirestore.instance.collection('tourism_records').doc().id;
  static final instance = TourismStore._();
  bool syncing = false;
  String? syncError;
  Timer? _timer;

  void start() {
    if (_timer != null || kIsWeb) return;
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => sync());
    FirebaseAuth.instance.authStateChanges().listen((_) => sync());
    unawaited(sync());
  }

  Future<Directory> _directory(String uid) async {
    if (_localDirectory != null) return _localDirectory!(uid);
    final root = await getApplicationDocumentsDirectory();
    return Directory('${root.path}/tourism/$uid').create(recursive: true);
  }

  Future<List<Map<String, dynamic>>> records() async {
    final uid = _userId();
    if (uid == null) return [];
    final directory = await _directory(uid);
    final result = <Map<String, dynamic>>[];
    await for (final file in directory.list()) {
      if (file is File && file.path.endsWith('.json')) {
        result.add(
          jsonDecode(await file.readAsString()) as Map<String, dynamic>,
        );
      }
    }
    result.sort(
      (a, b) => (b['createdAt'] as String).compareTo(a['createdAt'] as String),
    );
    return result;
  }

  Future<void> _write(Directory directory, Map<String, dynamic> record) async {
    final file = File('${directory.path}/${record['id']}.json');
    final temporary = File('${file.path}.tmp');
    await temporary.writeAsString(jsonEncode(record), flush: true);
    await temporary.rename(file.path);
  }

  Future<void> save(
    String name,
    String plate,
    XFile? tourist,
    XFile? vehicle, {
    String? destination,
    double? fee,
    String? company,
    int? touristCount,
    TourismFeeRate? feeRate,
  }) async {
    if ((touristCount == null) != (feeRate == null)) {
      throw ArgumentError(
        'Tourist count and declared rate must be supplied together',
      );
    }
    if (company != null && company.trim().length > 200) {
      throw ArgumentError(
        'Company / group must contain at most 200 characters',
      );
    }
    final totalCentavos = feeRate?.totalCentavos(touristCount!);
    if (totalCentavos != null) fee = totalCentavos / 100;
    if (fee != null && (!fee.isFinite || fee < 0)) {
      throw ArgumentError.value(fee, 'fee', 'Must be finite and nonnegative');
    }
    final uid = _userId();
    if (uid == null) throw StateError('Please sign in before saving.');
    final directory = await _directory(uid);
    final id = _newId();
    final record = <String, dynamic>{
      'id': id,
      'ownerId': uid,
      'name': name.trim(),
      'plateNumber': plate.trim().toUpperCase(),
      if (destination != null) 'destination': destination.trim(),
      'fee': ?fee,
      if (company != null) 'company': company.trim(),
      if (feeRate != null) ...{
        'touristCount': touristCount,
        'feeRateId': feeRate.id,
        'feePerPersonCentavos': feeRate.perPersonCentavos,
        'feeTotalCentavos': totalCentavos,
      },
      'createdAt': DateTime.now().toUtc().toIso8601String(),
      'uploaded': false,
    };
    for (final entry in {
      'touristPhoto': tourist,
      'vehiclePhoto': vehicle,
    }.entries) {
      if (entry.value != null) {
        final path = '${directory.path}/${id}_${entry.key}.jpg';
        await entry.value!.saveTo(path);
        record[entry.key] = path;
      }
    }
    // Publish the queue entry only after both photos are safely on disk.
    await _write(directory, record);
    notifyListeners();
    unawaited(sync());
  }

  @visibleForTesting
  static String describeSyncError(Object error) {
    const saved = 'Saved on this device. ';
    if (error is FirebaseException) {
      final code = '${error.plugin}/${error.code}';
      switch (error.code) {
        case 'object-not-found':
        case 'bucket-not-found':
        case 'no-default-bucket':
        case 'project-not-found':
          return '${saved}Photo storage is unavailable. Check the Firebase Storage bucket configuration. ($code)';
        case 'permission-denied':
        case 'unauthorized':
          return '${saved}Firebase denied access. Check the tourism security rules and that Firestore is enabled. ($code)';
        case 'unauthenticated':
          return '${saved}Please sign in again to upload. ($code)';
        case 'quota-exceeded':
          return '${saved}Firebase storage quota exceeded. Check the project billing and quota. ($code)';
        default:
          return '${saved}Upload failed ($code). Try Sync now; if it continues, check the Firebase project setup.';
      }
    }
    if (error is TimeoutException || error is SocketException) {
      return '${saved}Firebase could not be reached. Check your connection and try Sync now.';
    }
    if (error is FileSystemException) {
      return '${saved}A local photo could not be read. Check device storage and try again.';
    }
    return '${saved}Upload failed. Please try Sync now.';
  }

  Future<void> sync() async {
    final uid = _userId();
    if (syncing || uid == null || kIsWeb) return;
    syncing = true;
    syncError = null;
    notifyListeners();
    try {
      final directory = await _directory(uid);
      final pending = await records();
      for (final record in pending) {
        if (_userId() != uid) break;
        if (record['uploaded'] == true) continue;
        try {
          if (_uploadOverride != null) {
            await _uploadOverride!(record);
          } else {
            final photos = <String, String>{};
            for (final key in ['touristPhoto', 'vehiclePhoto']) {
              if (record[key] != null) {
                final path = 'tourism/$uid/${record['id']}/$key.jpg';
                final task = FirebaseStorage.instance
                    .ref(path)
                    .putFile(
                      File(record[key] as String),
                      SettableMetadata(contentType: 'image/jpeg'),
                    );
                try {
                  await task.timeout(const Duration(seconds: 60));
                } on TimeoutException {
                  await task.cancel();
                  rethrow;
                }
                photos[key] = path;
              }
            }
            await FirebaseFirestore.instance
                .collection('tourism_records')
                .doc(record['id'] as String)
                .set({
                  'ownerId': uid,
                  'name': record['name'],
                  'plateNumber': record['plateNumber'],
                  if (record.containsKey('destination'))
                    'destination': record['destination'],
                  if (record.containsKey('fee')) 'fee': record['fee'],
                  for (final key in [
                    'company',
                    'touristCount',
                    'feeRateId',
                    'feePerPersonCentavos',
                    'feeTotalCentavos',
                  ])
                    if (record.containsKey(key)) key: record[key],
                  'createdAt': Timestamp.fromDate(
                    DateTime.parse(record['createdAt'] as String),
                  ),
                  'uploadedAt': FieldValue.serverTimestamp(),
                  'photos': photos,
                })
                .timeout(const Duration(seconds: 20));
          }
          record.remove('syncError');
          record['uploaded'] = true;
          await _write(directory, record);
          notifyListeners();
        } catch (error) {
          syncError = describeSyncError(error);
          record['uploaded'] = false;
          record['syncError'] = syncError;
          await _write(directory, record);
          notifyListeners();
        }
      }
    } catch (_) {
      syncError = 'Could not read device records. Please try again.';
    } finally {
      syncing = false;
      notifyListeners();
    }
  }
}
