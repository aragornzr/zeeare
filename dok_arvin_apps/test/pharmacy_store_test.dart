import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dok_arvin_apps/pharmacy_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Directory root;
  late String? uid;
  late Map<String, Medicine> cloud;
  var sequence = 0;
  var online = false;
  late List<String> uploaded;
  Future<Directory> directory(String user) =>
      Directory('${root.path}/$user').create(recursive: true);
  PharmacyStore store() => PharmacyStore(
    userId: () => uid,
    directory: directory,
    newId: () => 'id-${sequence++}',
    upload: (medicine) async {
      if (!online) throw const SocketException('offline');
      uploaded.add(medicine.id);
      cloud[medicine.id] = medicine.synced();
    },
    download: (user) async {
      if (!online) throw const SocketException('offline');
      return cloud.values.where((item) => item.ownerId == user).toList();
    },
  );
  Future<void> add(PharmacyStore repository) => repository.save(
    name: ' Paracetamol ',
    strength: '500 mg tablet',
    quantity: 25,
  );
  setUp(() async {
    root = await Directory.systemTemp.createTemp('pharmacy_test');
    uid = 'staff-a';
    cloud = {};
    sequence = 0;
    online = false;
    uploaded = [];
  });
  tearDown(() => root.delete(recursive: true));

  test(
    'offline save survives restart and upload retries reuse the same ID',
    () async {
      final first = store();
      await add(first);
      await first.sync();
      expect(first.syncError, isNotNull);
      final restarted = store();
      final record = (await restarted.records()).single;
      expect(record.name, 'Paracetamol');
      expect(record.quantity, 25);
      expect(record.uploaded, false);
      online = true;
      await restarted.sync();
      await restarted.sync();
      expect(uploaded, [record.id]);
      expect(cloud.length, 1);
      expect((await restarted.records()).single.uploaded, true);
    },
  );
  test('legacy inventory migrates once with a backup and stable IDs', () async {
    final dir = await directory(uid!);
    final legacy = [
      {
        'name': 'Amoxicillin',
        'strength': '250 mg capsule',
        'quantity': 12,
        'updatedAt': '2026-01-01T00:00:00.000Z',
      },
    ];
    await File('${dir.path}/inventory.json').writeAsString(jsonEncode(legacy));
    final migrated = (await store().records()).single;
    final reloaded = (await store().records()).single;
    expect(reloaded.id, migrated.id);
    expect(reloaded.quantity, 12);
    expect(reloaded.uploaded, false);
    expect(
      jsonDecode(
        await File('${dir.path}/inventory.legacy-backup.json').readAsString(),
      ),
      legacy,
    );
  });
  test('cloud inventory downloads and remains available offline', () async {
    online = true;
    final source = store();
    await add(source);
    await source.sync();
    await File('${(await directory(uid!)).path}/inventory.json').delete();
    final fresh = store();
    await fresh.sync();
    online = false;
    await fresh.sync();
    expect((await fresh.records()).single.quantity, 25);
    expect((await store().records()).single.uploaded, true);
  });
  test('stock edits sync under the existing medicine ID', () async {
    online = true;
    final repository = store();
    await add(repository);
    await repository.sync();
    final item = (await repository.records()).single;
    await repository.save(
      previous: item,
      name: item.name,
      strength: item.strength,
      quantity: 9,
    );
    expect((await repository.records()).single.uploaded, false);
    await repository.sync();
    expect(cloud.length, 1);
    expect(cloud[item.id]!.quantity, 9);
  });
  test('editing during upload keeps the newer revision pending', () async {
    final started = Completer<void>();
    final release = Completer<void>();
    var count = 0;
    final repository = PharmacyStore(
      userId: () => uid,
      directory: directory,
      newId: () => 'id-${sequence++}',
      upload: (item) async {
        if (count++ == 0) {
          started.complete();
          await release.future;
        }
        cloud[item.id] = item.synced();
      },
      download: (_) async => cloud.values.toList(),
    );
    await add(repository);
    final syncing = repository.sync();
    await started.future;
    final old = (await repository.records()).single;
    await repository.save(
      previous: old,
      name: old.name,
      strength: old.strength,
      quantity: 3,
    );
    release.complete();
    await syncing;
    final newer = (await repository.records()).single;
    expect(newer.quantity, 3);
    expect(newer.uploaded, false);
    await repository.sync();
    expect(cloud[old.id]!.quantity, 3);
    expect((await repository.records()).single.uploaded, true);
  });
  test('stale edit form cannot overwrite a newer local revision', () async {
    final repository = store();
    await add(repository);
    final old = (await repository.records()).single;
    await repository.save(
      previous: old,
      name: old.name,
      strength: old.strength,
      quantity: 2,
    );
    await expectLater(
      repository.save(
        previous: old,
        name: old.name,
        strength: old.strength,
        quantity: 40,
      ),
      throwsStateError,
    );
    expect((await repository.records()).single.quantity, 2);
  });
  test('account isolation and invalid quantities are enforced', () async {
    final repository = store();
    await add(repository);
    final item = (await repository.records()).single;
    uid = 'staff-b';
    online = true;
    expect(await repository.records(), isEmpty);
    await repository.sync();
    expect(uploaded, isEmpty);
    await expectLater(
      repository.save(
        previous: item,
        name: item.name,
        strength: '',
        quantity: 2,
      ),
      throwsStateError,
    );
    await expectLater(
      repository.save(name: 'Medicine', strength: '', quantity: -1),
      throwsArgumentError,
    );
    await expectLater(
      repository.save(name: 'Medicine', strength: '', quantity: 1000001),
      throwsArgumentError,
    );
    uid = null;
    await expectLater(add(repository), throwsStateError);
  });
}
