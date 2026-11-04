import 'package:dok_arvin_apps/login_device.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  tearDown(() => messenger.setMockMethodCallHandler(LoginDevice.channel, null));
  test('device payload includes only make, model, platform and OS', () async {
    messenger.setMockMethodCallHandler(
      LoginDevice.channel,
      (_) async => {
        'platform': 'android',
        'manufacturer': 'Samsung',
        'model': 'SM-A546E',
        'osVersion': '14',
        'serial': 'must-not-be-sent',
      },
    );
    final result = await LoginDevice.read();
    expect(result, {
      'platform': 'android',
      'manufacturer': 'Samsung',
      'model': 'SM-A546E',
      'osVersion': '14',
    });
  });
  test('missing native reporting does not prevent login logging', () async {
    messenger.setMockMethodCallHandler(
      LoginDevice.channel,
      (_) async => throw MissingPluginException(),
    );
    expect((await LoginDevice.read())['model'], 'Device details unavailable');
  });
  test('untrusted device labels have bounded length', () async {
    messenger.setMockMethodCallHandler(
      LoginDevice.channel,
      (_) async => {'model': 'a' * 200},
    );
    expect((await LoginDevice.read())['model']!.length, 120);
  });
}
