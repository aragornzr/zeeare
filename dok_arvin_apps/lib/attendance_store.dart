import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';

class AttendancePerson {
  const AttendancePerson({
    required this.id,
    required this.name,
    required this.employeeId,
    required this.enrolledAt,
    this.accountUid,
    this.faces = const [],
  });
  final String id, name, employeeId;
  final String? accountUid;
  final DateTime enrolledAt;
  final List<List<double>> faces;
  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'employeeId': employeeId,
    'accountUid': accountUid,
    'enrolledAt': enrolledAt.toIso8601String(),
    'faces': faces,
  };
  factory AttendancePerson.fromJson(Map<String, dynamic> json) =>
      AttendancePerson(
        id: json['id'],
        name: json['name'],
        employeeId: json['employeeId'],
        accountUid: json['accountUid'],
        enrolledAt: DateTime.parse(json['enrolledAt']),
        faces: (json['faces'] as List)
            .map((e) => (e as List).map((v) => (v as num).toDouble()).toList())
            .toList(),
      );
}

class AttendanceEvent {
  const AttendanceEvent({
    required this.id,
    required this.personId,
    required this.personName,
    required this.employeeId,
    required this.action,
    required this.time,
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.method,
    required this.operatorUid,
    required this.locationTime,
    required this.offsetMinutes,
    this.similarity,
    this.ownerUid,
    this.device = const {},
  });
  final String id,
      personId,
      personName,
      employeeId,
      action,
      method,
      operatorUid;
  final DateTime time, locationTime;
  final double latitude, longitude, accuracy;
  final int offsetMinutes;
  final double? similarity;
  final String? ownerUid;
  final Map<String, String> device;
  Map<String, dynamic> toJson() => {
    'id': id,
    'personId': personId,
    'personName': personName,
    'employeeId': employeeId,
    'action': action,
    'time': time.toUtc().toIso8601String(),
    'latitude': latitude,
    'longitude': longitude,
    'accuracy': accuracy,
    'method': method,
    'operatorUid': operatorUid,
    'locationTime': locationTime.toUtc().toIso8601String(),
    'offsetMinutes': offsetMinutes,
    'similarity': similarity,
    'ownerUid': ownerUid,
    'device': device,
  };
  factory AttendanceEvent.fromJson(Map<String, dynamic> j) => AttendanceEvent(
    id: j['id'],
    personId: j['personId'],
    personName: j['personName'],
    employeeId: j['employeeId'],
    action: j['action'],
    time: DateTime.parse(j['time']),
    latitude: (j['latitude'] as num).toDouble(),
    longitude: (j['longitude'] as num).toDouble(),
    accuracy: (j['accuracy'] as num).toDouble(),
    method: j['method'],
    operatorUid: j['operatorUid'],
    locationTime: DateTime.parse(j['locationTime']),
    offsetMinutes: j['offsetMinutes'],
    similarity: (j['similarity'] as num?)?.toDouble(),
    ownerUid: j['ownerUid'],
    device: Map<String, String>.from(j['device'] ?? {}),
  );
}

double faceSimilarity(List<double> a, List<double> b) {
  if (a.isEmpty || a.length != b.length) return -1;
  double dot = 0, aa = 0, bb = 0;
  for (var i = 0; i < a.length; i++) {
    if (!a[i].isFinite || !b[i].isFinite) return -1;
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  final score = aa == 0 || bb == 0 ? -1.0 : dot / sqrt(aa * bb);
  return score.isFinite ? score.clamp(-1.0, 1.0) : -1;
}

class FaceMatch {
  const FaceMatch(this.person, this.score);
  final AttendancePerson person;
  final double score;
}

FaceMatch? matchAttendanceFace(
  List<double> probe,
  List<AttendancePerson> people, {
  double threshold = .72,
  double margin = .10,
}) {
  final ranked =
      people
          .where((p) => p.faces.isNotEmpty)
          .map(
            (p) => FaceMatch(
              p,
              p.faces.map((v) => faceSimilarity(probe, v)).reduce(max),
            ),
          )
          .toList()
        ..sort((a, b) => b.score.compareTo(a.score));
  if (ranked.isEmpty || ranked.first.score < threshold) return null;
  if (ranked.length > 1 && ranked.first.score - ranked[1].score < margin) {
    return null;
  }
  return ranked.first;
}

/// One encrypted file per signed-in operator. Enrollment never crosses accounts.
class AttendanceStore {
  AttendanceStore(this.operatorUid, {this.readOverride, this.writeOverride});
  final String operatorUid;
  final Future<String?> Function()? readOverride;
  final Future<void> Function(String)? writeOverride;
  final List<AttendancePerson> _people = [];
  final List<AttendanceEvent> _events = [];
  final Set<String> _uploaded = {};
  bool isUploaded(String id) => _uploaded.contains(id);
  List<AttendancePerson> get people => List.unmodifiable(_people);
  List<AttendanceEvent> get events => List.unmodifiable(_events);
  Future<void> _queue = Future.value();
  bool _loaded = false;
  final _cipher = AesGcm.with256bits();
  static const _secure = FlutterSecureStorage();
  String get _scope => base64Url.encode(utf8.encode(operatorUid));

  Future<T> _locked<T>(Future<T> Function() fn) {
    final future = _queue.then((_) => fn());
    _queue = future.then<void>((_) {}, onError: (Object _, StackTrace _) {});
    return future;
  }

  Future<File> _file() async {
    final root = await getApplicationSupportDirectory();
    final dir = await Directory(
      '${root.path}/attendance',
    ).create(recursive: true);
    return File('${dir.path}/$_scope.enc');
  }

  Future<SecretKey> _key({required bool create}) async {
    final stored = await _secure.read(key: 'attendance_key_$_scope');
    if (stored != null) return SecretKey(base64Decode(stored));
    if (!create) {
      throw StateError(
        'Attendance encryption key is unavailable. Existing records have not been changed.',
      );
    }
    final key = await _cipher.newSecretKey();
    await _secure.write(
      key: 'attendance_key_$_scope',
      value: base64Encode(await key.extractBytes()),
    );
    return key;
  }

  Future<void> load() => _locked(() async {
    if (_loaded) return;
    String? plain;
    if (readOverride != null) {
      plain = await readOverride!();
    } else {
      final file = await _file();
      if (await file.exists()) {
        final j = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
        final bytes = await _cipher.decrypt(
          SecretBox(
            base64Decode(j['ciphertext']),
            nonce: base64Decode(j['nonce']),
            mac: Mac(base64Decode(j['mac'])),
          ),
          secretKey: await _key(create: false),
        );
        plain = utf8.decode(bytes);
      }
    }
    if (plain != null) {
      final json = jsonDecode(plain) as Map<String, dynamic>;
      if (json['version'] != 1) {
        throw StateError('Unsupported attendance records version.');
      }
      final people = (json['people'] as List)
          .map((j) => AttendancePerson.fromJson(j))
          .toList();
      final events = (json['events'] as List)
          .map((j) => AttendanceEvent.fromJson(j))
          .toList();
      _people.addAll(people);
      _events.addAll(events);
      _uploaded.addAll(List<String>.from(json['uploaded'] ?? []));
    }
    _loaded = true;
  });
  Future<void> _save(
    List<AttendancePerson> people,
    List<AttendanceEvent> events,
  ) async {
    final plain = jsonEncode({
      'version': 1,
      'people': people.map((p) => p.toJson()).toList(),
      'events': events.map((e) => e.toJson()).toList(),
      'uploaded': _uploaded.toList(),
    });
    if (writeOverride != null) {
      await writeOverride!(plain);
      return;
    }
    final box = await _cipher.encrypt(
      utf8.encode(plain),
      secretKey: await _key(create: true),
    );
    final file = await _file();
    final temp = File('${file.path}.tmp');
    await temp.writeAsString(
      jsonEncode({
        'nonce': base64Encode(box.nonce),
        'mac': base64Encode(box.mac.bytes),
        'ciphertext': base64Encode(box.cipherText),
      }),
      flush: true,
    );
    await temp.rename(file.path);
  }

  Future<void> enroll(AttendancePerson person) => _locked(() async {
    if (!_loaded) throw StateError('Load attendance records first.');
    if (person.name.trim().isEmpty || person.employeeId.trim().isEmpty) {
      throw StateError('Enter a name and employee ID.');
    }
    if (_people.any(
      (p) =>
          p.id == person.id ||
          p.employeeId.toLowerCase() == person.employeeId.toLowerCase() ||
          (person.accountUid != null && p.accountUid == person.accountUid),
    )) {
      throw StateError('This employee is already enrolled.');
    }
    if (person.faces.any((v) => v.length != 192 || v.any((x) => !x.isFinite))) {
      throw StateError('Invalid face enrollment.');
    }
    final next = [..._people, person];
    await _save(next, _events);
    _people.add(person);
  });
  Future<void> markUploaded(String id) => _locked(() async {
    _uploaded.add(id);
    try {
      await _save(_people, _events);
    } catch (_) {
      _uploaded.remove(id);
      rethrow;
    }
  });
  Future<AttendancePerson> linkAccount(String personId, String accountUid) =>
      _locked(() async {
        if (!_loaded ||
            _people.any(
              (p) => p.id != personId && p.accountUid == accountUid,
            )) {
          throw StateError('This account is already enrolled on this device.');
        }
        final index = _people.indexWhere((p) => p.id == personId);
        if (index < 0) throw StateError('Employee profile not found.');
        final old = _people[index];
        final linked = AttendancePerson(
          id: old.id,
          name: old.name,
          employeeId: old.employeeId,
          enrolledAt: old.enrolledAt,
          faces: old.faces,
          accountUid: accountUid,
        );
        final next = [..._people];
        next[index] = linked;
        await _save(next, _events);
        _people[index] = linked;
        return linked;
      });
  String nextAction(String personId) =>
      _events.where((e) => e.personId == personId).lastOrNull?.action == 'in'
      ? 'out'
      : 'in';
  Future<void> record(AttendanceEvent event, {String? expectedAction}) =>
      _locked(() async {
        if (!_loaded || !_people.any((p) => p.id == event.personId)) {
          throw StateError('Enroll this employee first.');
        }
        if (event.operatorUid != operatorUid ||
            event.action != (expectedAction ?? nextAction(event.personId))) {
          throw StateError('Attendance changed. Please scan again.');
        }
        if (!event.latitude.isFinite ||
            event.latitude.abs() > 90 ||
            !event.longitude.isFinite ||
            event.longitude.abs() > 180 ||
            !event.accuracy.isFinite ||
            event.accuracy < 0 ||
            event.accuracy > 100 ||
            event.time.difference(event.locationTime).abs() >
                const Duration(seconds: 30)) {
          throw StateError('A fresh, accurate location is required.');
        }
        final last = _events
            .where((e) => e.personId == event.personId)
            .lastOrNull;
        if (last != null &&
            event.time.difference(last.time) < const Duration(minutes: 1)) {
          throw StateError(
            'Please wait one minute before recording another attendance event.',
          );
        }
        final next = [..._events, event];
        await _save(_people, next);
        _events.add(event);
      });
}
