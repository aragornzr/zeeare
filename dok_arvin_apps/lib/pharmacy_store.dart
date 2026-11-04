import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:path_provider/path_provider.dart';

class Medicine {
  const Medicine({
    required this.id,
    required this.ownerId,
    required this.name,
    required this.strength,
    required this.quantity,
    required this.revision,
    required this.createdAt,
    required this.updatedAt,
    this.uploaded = false,
  });
  final String id, ownerId, name, strength, revision;
  final int quantity;
  final DateTime createdAt, updatedAt;
  final bool uploaded;

  Medicine synced() => Medicine(
    id: id,
    ownerId: ownerId,
    name: name,
    strength: strength,
    quantity: quantity,
    revision: revision,
    createdAt: createdAt,
    updatedAt: updatedAt,
    uploaded: true,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'ownerId': ownerId,
    'name': name,
    'strength': strength,
    'quantity': quantity,
    'revision': revision,
    'uploaded': uploaded,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
  };
  factory Medicine.fromJson(Map<String, dynamic> data) => Medicine(
    id: data['id'] as String,
    ownerId: data['ownerId'] as String,
    name: data['name'] as String,
    strength: data['strength'] as String,
    quantity: data['quantity'] as int,
    revision: data['revision'] as String,
    createdAt: DateTime.parse(data['createdAt'] as String),
    updatedAt: DateTime.parse(data['updatedAt'] as String),
    uploaded: data['uploaded'] == true,
  );
  Map<String, dynamic> toCloud() => {
    'ownerId': ownerId,
    'name': name,
    'strength': strength,
    'quantity': quantity,
    'revision': revision,
    'createdAt': Timestamp.fromDate(createdAt),
    'updatedAt': Timestamp.fromDate(updatedAt),
    'uploadedAt': FieldValue.serverTimestamp(),
  };
  factory Medicine.fromCloud(
    String id,
    Map<String, dynamic> data,
  ) => Medicine.fromJson({
    ...data,
    'id': id,
    'uploaded': true,
    'createdAt': (data['createdAt'] as Timestamp).toDate().toIso8601String(),
    'updatedAt': (data['updatedAt'] as Timestamp).toDate().toIso8601String(),
  });
}

class PharmacyStore {
  PharmacyStore({
    String? Function()? userId,
    Future<Directory> Function(String)? directory,
    Future<void> Function(Medicine)? upload,
    Future<List<Medicine>> Function(String)? download,
    String Function()? newId,
  }) : _userId = userId ?? (() => FirebaseAuth.instance.currentUser?.uid),
       _directoryOverride = directory,
       _uploadOverride = upload,
       _downloadOverride = download,
       _newId =
           newId ??
           (() => FirebaseFirestore.instance
               .collection('pharmacy_inventory')
               .doc()
               .id);

  static final instance = PharmacyStore();
  final String? Function() _userId;
  final Future<Directory> Function(String)? _directoryOverride;
  final Future<void> Function(Medicine)? _uploadOverride;
  final Future<List<Medicine>> Function(String)? _downloadOverride;
  final String Function() _newId;
  Future<void> _diskQueue = Future.value();
  Future<void>? _syncFuture;
  String? syncError;
  String? get userId => _userId();

  // Serialize disk mutations, but never hold this queue during a network request.
  Future<T> _locked<T>(Future<T> Function() operation) {
    final result = _diskQueue.then((_) => operation());
    _diskQueue = result.then<void>(
      (_) {},
      onError: (Object _, StackTrace _) {},
    );
    return result;
  }

  void _checkUser(String uid) {
    if (uid != _userId()) throw StateError('Your signed-in account changed.');
  }

  Future<Directory> _directory(String uid) async {
    if (_directoryOverride != null) return _directoryOverride(uid);
    final root = await getApplicationDocumentsDirectory();
    return Directory(
      '${root.path}/rhu/pharmacy/${base64Url.encode(utf8.encode(uid))}',
    ).create(recursive: true);
  }

  Future<void> _write(Directory directory, List<Medicine> items) async {
    final file = File('${directory.path}/inventory.json');
    final temporary = File('${file.path}.tmp');
    await temporary.writeAsString(
      jsonEncode(items.map((item) => item.toJson()).toList()),
      flush: true,
    );
    await temporary.rename(file.path);
  }

  Future<List<Medicine>> _read(String uid, Directory directory) async {
    final file = File('${directory.path}/inventory.json');
    if (!await file.exists()) return [];
    final raw = (jsonDecode(await file.readAsString()) as List)
        .cast<Map<String, dynamic>>();
    final legacy = raw.any((item) => !item.containsKey('id'));
    final items = raw.map((item) {
      if (item.containsKey('id')) return Medicine.fromJson(item);
      final date = DateTime.parse(item['updatedAt'] as String);
      return Medicine(
        id: _newId(),
        ownerId: uid,
        name: item['name'] as String,
        strength: item['strength'] as String,
        quantity: item['quantity'] as int,
        revision: _newId(),
        createdAt: date,
        updatedAt: date,
      );
    }).toList();
    if (legacy) {
      final backup = File('${directory.path}/inventory.legacy-backup.json');
      if (!await backup.exists()) await file.copy(backup.path);
      await _write(
        directory,
        items,
      ); // Persist stable IDs before the first upload.
    }
    return items.where((item) => item.ownerId == uid).toList();
  }

  Future<List<Medicine>> records() => _locked(() async {
    final uid = userId;
    if (uid == null) return [];
    final items = await _read(uid, await _directory(uid));
    if (userId != uid) return [];
    items.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    return items;
  });

  Future<void> save({
    Medicine? previous,
    required String name,
    required String strength,
    required int quantity,
  }) => _locked(() async {
    final uid = userId;
    if (uid == null) throw StateError('Sign in to save inventory.');
    if (name.trim().isEmpty ||
        name.trim().length > 160 ||
        strength.trim().length > 100 ||
        quantity < 0 ||
        quantity > 1000000) {
      throw ArgumentError('Enter a medicine name and a valid stock quantity.');
    }
    if (previous != null && previous.ownerId != uid) {
      throw StateError('Account changed.');
    }
    final directory = await _directory(uid);
    final items = await _read(uid, directory);
    _checkUser(uid);
    final index = previous == null
        ? -1
        : items.indexWhere((item) => item.id == previous.id);
    if (previous != null &&
        (index == -1 || items[index].revision != previous.revision)) {
      throw StateError(
        'This medicine changed. Reopen it before updating stock.',
      );
    }
    final now = DateTime.now().toUtc();
    final item = Medicine(
      id: previous?.id ?? _newId(),
      ownerId: uid,
      name: name.trim(),
      strength: strength.trim(),
      quantity: quantity,
      revision: _newId(),
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    );
    if (index == -1) {
      items.add(item);
    } else {
      items[index] = item;
    }
    await _write(directory, items);
  });

  Future<List<Medicine>> _download(String uid) async {
    if (_downloadOverride != null) return _downloadOverride(uid);
    final query = FirebaseFirestore.instance
        .collection('pharmacy_inventory')
        .where('ownerId', isEqualTo: uid)
        .orderBy(FieldPath.documentId)
        .limit(100);
    QueryDocumentSnapshot<Map<String, dynamic>>? last;
    final result = <Medicine>[];
    while (true) {
      _checkUser(uid);
      final page = await (last == null ? query : query.startAfterDocument(last))
          .get(const GetOptions(source: Source.server))
          .timeout(const Duration(seconds: 20));
      result.addAll(
        page.docs.map((doc) => Medicine.fromCloud(doc.id, doc.data())),
      );
      if (page.docs.length < 100) return result;
      last = page.docs.last;
    }
  }

  Future<void> sync() =>
      _syncFuture ??= _sync().whenComplete(() => _syncFuture = null);
  Future<void> _sync() async {
    final uid = userId;
    if (uid == null) return;
    syncError = null;
    try {
      final directory = await _directory(uid);
      final pending = await records();
      for (final item in pending.where((item) => !item.uploaded)) {
        _checkUser(uid);
        try {
          if (_uploadOverride != null) {
            await _uploadOverride(item);
          } else {
            await FirebaseFirestore.instance
                .collection('pharmacy_inventory')
                .doc(item.id)
                .set(item.toCloud())
                .timeout(const Duration(seconds: 20));
          }
          await _locked(() async {
            _checkUser(uid);
            final items = await _read(uid, directory);
            final index = items.indexWhere((current) => current.id == item.id);
            // An edit made during the upload must remain pending.
            if (index != -1 && items[index].revision == item.revision) {
              items[index] = items[index].synced();
              await _write(directory, items);
            }
          });
        } catch (error) {
          syncError = describeError(error);
          break;
        }
      }
      _checkUser(uid);
      final cloud = await _download(uid);
      await _locked(() async {
        _checkUser(uid);
        final items = await _read(uid, directory);
        final merged = {for (final item in items) item.id: item};
        for (final item in cloud) {
          if (item.ownerId != uid || merged[item.id]?.uploaded == false) {
            continue;
          }
          merged[item.id] = item.synced();
        }
        await _write(directory, merged.values.toList());
      });
    } catch (error) {
      syncError = describeError(error);
    }
  }

  static String describeError(Object error) {
    if (error is FirebaseException && error.code == 'permission-denied') {
      return 'Cloud access is not enabled for this account. Inventory is safe on this device. Ask your administrator to check pharmacy permissions.';
    }
    if (error is StateError) return error.message.toString();
    return 'Could not sync with Firebase. Your inventory is kept on this device. Retry when connected.';
  }
}
