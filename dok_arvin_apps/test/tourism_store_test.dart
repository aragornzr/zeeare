import 'dart:io';
import 'package:firebase_core/firebase_core.dart';

import 'package:dok_arvin_apps/tourism_store.dart';
import 'package:dok_arvin_apps/tourism_fee.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

void main() {
  test(
    'persists Firebase failure and clears it after retry succeeds',
    () async {
      final root = await Directory.systemTemp.createTemp('tourism_error_test');
      addTearDown(() => root.delete(recursive: true));
      var failUpload = true;
      final store = TourismStore.testing(
        userId: () => 'user1',
        directory: (_) async => root,
        newId: () => 'record1',
        upload: (_) async {
          if (failUpload) {
            throw FirebaseException(
              plugin: 'firebase_storage',
              code: 'object-not-found',
            );
          }
        },
      );
      await store.save('Tourist', '', null, null);
      while (store.syncing) {
        await Future<void>.delayed(Duration.zero);
      }
      final failed = (await store.records()).single;
      expect(failed['uploaded'], false);
      expect(
        failed['syncError'],
        contains('firebase_storage/object-not-found'),
      );
      expect(failed['syncError'], contains('bucket configuration'));
      failUpload = false;
      await store.sync();
      final uploaded = (await store.records()).single;
      expect(uploaded['uploaded'], true);
      expect(uploaded.containsKey('syncError'), false);
      expect(store.syncError, isNull);
    },
  );
  test(
    'offline save persists photos and retries the same record after restart',
    () async {
      final root = await Directory.systemTemp.createTemp('tourism_test');
      addTearDown(() => root.delete(recursive: true));
      final source = File('${root.path}/camera.jpg');
      await source.writeAsBytes([1, 2, 3]);
      Future<Directory> directory(String uid) =>
          Directory('${root.path}/$uid').create(recursive: true);
      final offline = TourismStore.testing(
        userId: () => 'user1',
        directory: directory,
        newId: () => 'stable-id',
        upload: (_) async => throw const SocketException('offline'),
      );
      await offline.save(
        '  Ana Cruz ',
        ' abc 123 ',
        XFile(source.path),
        null,
        destination: '  Beach Resort  ',
        fee: 150.50,
      );
      while (offline.syncing) {
        await Future<void>.delayed(Duration.zero);
      }
      await source.delete();
      final records = await offline.records();
      expect(records.single['name'], 'Ana Cruz');
      expect(records.single['plateNumber'], 'ABC 123');
      expect(records.single['destination'], 'Beach Resort');
      expect(records.single['fee'], 150.50);
      expect(records.single['uploaded'], false);
      expect(DateTime.parse(records.single['createdAt'] as String).isUtc, true);
      expect(
        await File(records.single['touristPhoto'] as String).readAsBytes(),
        [1, 2, 3],
      );
      final uploaded = <String>[];
      final restarted = TourismStore.testing(
        userId: () => 'user1',
        directory: directory,
        newId: () => 'unused',
        upload: (record) async {
          uploaded.add(record['id'] as String);
          expect(record['destination'], 'Beach Resort');
          expect(record['fee'], 150.50);
        },
      );
      await restarted.sync();
      await restarted.sync();
      expect(uploaded, ['stable-id']);
      expect((await restarted.records()).single['uploaded'], true);
      final other = TourismStore.testing(
        userId: () => 'user2',
        directory: directory,
        newId: () => 'unused',
        upload: (_) async => fail('Must not upload another user’s record'),
      );
      expect(await other.records(), isEmpty);
      await other.sync();
    },
  );
  test(
    'group company, count and original rate survive offline retries and rate changes',
    () async {
      final root = await Directory.systemTemp.createTemp('tourism_group_test');
      addTearDown(() => root.delete(recursive: true));
      final offline = TourismStore.testing(
        userId: () => 'worker',
        directory: (_) async => root,
        newId: () => 'group1',
        upload: (_) async => throw const SocketException('offline'),
      );
      await offline.save(
        'Ana',
        '',
        null,
        null,
        company: '  Company A  ',
        touristCount: 3,
        feeRate: const TourismFeeRate(
          id: 'original-rate',
          perPersonCentavos: 15050,
        ),
      );
      while (offline.syncing) {
        await Future<void>.delayed(Duration.zero);
      }
      final record = (await offline.records()).single;
      expect(record['company'], 'Company A');
      expect(record['touristCount'], 3);
      expect(record['fee'], 451.50);
      expect(record['feeTotalCentavos'], 45150);
      expect(record['feeRateId'], 'original-rate');
      final restarted = TourismStore.testing(
        userId: () => 'worker',
        directory: (_) async => root,
        newId: () => 'unused',
        upload: (value) async {
          expect(value['feeRateId'], 'original-rate');
          expect(value['feePerPersonCentavos'], 15050);
          expect(value['fee'], 451.50);
        },
      );
      await restarted.sync();
      expect((await restarted.records()).single['uploaded'], true);
    },
  );
  test('invalid groups do not create queue records', () async {
    final root = await Directory.systemTemp.createTemp(
      'tourism_invalid_group_test',
    );
    addTearDown(() => root.delete(recursive: true));
    final store = TourismStore.testing(
      userId: () => 'worker',
      directory: (_) async => root,
      newId: () => 'invalid',
      upload: (_) async {},
    );
    await expectLater(
      store.save(
        'Ana',
        '',
        null,
        null,
        touristCount: 0,
        feeRate: const TourismFeeRate(id: 'rate', perPersonCentavos: 50),
      ),
      throwsArgumentError,
    );
    await expectLater(
      store.save('Ana', '', null, null, touristCount: 3),
      throwsArgumentError,
    );
    expect(await store.records(), isEmpty);
  });
}
