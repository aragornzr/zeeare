import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Device-local read markers contain message IDs only, never message content.
class CommunicationReads {
  const CommunicationReads();
  static const _storage = FlutterSecureStorage();
  String _key(String uid) =>
      'communication_reads_v1_${base64Url.encode(utf8.encode(uid))}';
  Future<Set<String>> read(String uid) async {
    final raw = await _storage.read(key: _key(uid));
    if (raw == null) return {};
    final values = jsonDecode(raw);
    if (values is! List) throw const FormatException('Invalid read markers');
    return values.whereType<String>().toSet();
  }

  Future<void> save(String uid, Set<String> ids) =>
      _storage.write(key: _key(uid), value: jsonEncode(ids.toList()));
}
