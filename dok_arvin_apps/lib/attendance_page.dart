import 'dart:async';
import 'dart:math';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import 'access_gate.dart';
import 'app_theme.dart';
import 'attendance_device_service.dart';
import 'attendance_face_capture.dart';
import 'attendance_store.dart';
import 'attendance_api.dart';
import 'login_device.dart';

class AttendancePage extends StatefulWidget {
  const AttendancePage({
    super.key,
    this.auth,
    this.store,
    this.device,
    this.api,
  });
  final FirebaseAuth? auth;
  final AttendanceStore? store;
  final AttendanceDeviceService? device;
  final AttendanceApi? api;
  @override
  State<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends State<AttendancePage> {
  AttendanceStore? _store;
  late final _device = widget.device ?? AttendanceDeviceService();
  FirebaseAuth get _auth => widget.auth ?? FirebaseAuth.instance;
  String? _uid, _name, _error;
  bool _loading = true, _busy = false, _manager = false;
  int _tab = 0;
  Timer? _syncTimer;
  bool _syncing = false;
  String _syncStatus = '';
  List<Map<String, dynamic>> _cloudRecords = [];
  String? _cloudCursor;
  String? _cloudNextAction;
  late final _api = widget.api ?? AttendanceApi();
  bool get _cloudEnabled => widget.store == null || widget.api != null;
  StreamSubscription<User?>? _subscription;
  bool get _mobile =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);
  AttendancePerson? get _self =>
      _store?.people.where((p) => p.accountUid == _uid).firstOrNull;

  @override
  void initState() {
    super.initState();
    _subscription = _auth.authStateChanges().listen((user) {
      if (_uid != null && user?.uid != _uid && mounted) {
        setState(() {
          _store = null;
          _manager = false;
          _error = 'Your account changed. Reopen Attendance.';
        });
      }
    });
    _load();
    _syncTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_cloudEnabled && mounted && !_busy && !_syncing) _sync();
    });
  }

  Future<void> _checkSession({bool shared = false}) async {
    final user = _auth.currentUser;
    if (user == null || user.uid != _uid) {
      throw StateError('Your account changed. Reopen Attendance.');
    }
    final claims =
        (await user.getIdTokenResult(true)).claims ?? <String, dynamic>{};
    if (!hasSectionAccess(claims, 'apps', uid: user.uid) ||
        !hasSectionAccess(claims, 'attendance', uid: user.uid)) {
      throw StateError('Your account does not have app access.');
    }
    if (shared && !['superadmin', 'admin'].contains(claims['role'])) {
      throw StateError(
        'An administrator must operate or enroll employees on a shared device.',
      );
    }
  }

  Future<void> _load() async {
    try {
      final user = _auth.currentUser;
      if (user == null) throw StateError('Sign in before opening Attendance.');
      _uid = user.uid;
      _name = user.displayName ?? user.email ?? 'Employee';
      await _checkSession();
      final claims =
          (await user.getIdTokenResult()).claims ?? <String, dynamic>{};
      final store = widget.store ?? AttendanceStore(user.uid);
      if (store.operatorUid != user.uid) {
        throw StateError('Attendance records belong to another account.');
      }
      await store.load();
      if (!mounted || _auth.currentUser?.uid != user.uid) {
        return;
      }
      setState(() {
        _store = store;
        _manager = ['superadmin', 'admin'].contains(claims['role']);
      });
      if (_cloudEnabled) await _sync();
    } catch (error) {
      if (mounted) setState(() => _error = _message(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _message(Object error) => error is StateError
      ? error.message.toString()
      : error is FirebaseFunctionsException
      ? error.message ?? 'Attendance sync failed. Retry when online.'
      : 'The operation could not finish. Check device permissions and try again.';

  Future<void> _run(Future<void> Function() fn) async {
    if (_busy || _store == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await fn();
    } catch (error) {
      if (mounted) setState(() => _error = _message(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<List<List<double>>?> _scan() =>
      Navigator.of(context).push<List<List<double>>>(
        MaterialPageRoute(builder: (_) => const AttendanceFaceCapture()),
      );

  Future<void> _enroll(bool shared) => _run(() async {
    await _checkSession(shared: shared);
    if (!mounted) return;
    final employees = <Map<String, dynamic>>[];
    if (shared && _cloudEnabled) {
      String? cursor;
      do {
        final result = await _api.call('listDashboardUsers', {
          'pageToken': ?cursor,
        });
        employees.addAll(
          (result['users'] as List)
              .map((u) => Map<String, dynamic>.from(u))
              .where(
                (u) =>
                    u['approved'] == true &&
                    u['disabled'] != true &&
                    u['role'] == 'regular',
              ),
        );
        cursor = result['pageToken'];
      } while (cursor != null);
      if (!mounted) return;
    }
    final details =
        await showDialog<
          ({String name, String employeeId, String? accountUid})
        >(
          context: context,
          builder: (_) => _EnrollmentDialog(
            initialName: shared ? '' : _name!,
            shared: shared,
            employees: employees,
          ),
        );
    if (details == null || !mounted) return;
    final store = _store!;
    List<List<double>> faces = [];
    if (shared) {
      final samples = await _scan();
      if (samples == null || !mounted) return;
      faces = samples;
      for (final person in store.people) {
        if (person.faces.any(
          (saved) =>
              faces.any((sample) => faceSimilarity(saved, sample) >= .72),
        )) {
          throw StateError(
            'A similar face is already enrolled. Check the employee records before enrolling again.',
          );
        }
      }
    } else {
      await _device.authenticate();
    }
    await _checkSession(shared: shared);
    if (!mounted) return;
    final person = AttendancePerson(
      id: _newId(),
      name: details.name,
      employeeId: details.employeeId,
      enrolledAt: DateTime.now().toUtc(),
      accountUid: shared ? details.accountUid : _uid,
      faces: faces,
    );
    await store.enroll(person);
    if (mounted) {
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${person.name} enrolled on this device.')),
      );
    }
  });

  String _newId() => List.generate(
    16,
    (_) => Random.secure().nextInt(256).toRadixString(16).padLeft(2, '0'),
  ).join();

  Future<void> _clock(bool shared, String action) => _run(() async {
    await _checkSession(shared: shared);
    final store = _store!;
    AttendancePerson? person;
    double? similarity;
    if (shared) {
      if (store.people.every((p) => p.faces.isEmpty)) {
        throw StateError('Enroll an employee face on this device first.');
      }
      if (!mounted) return;
      final samples = await _scan();
      if (samples == null || !mounted) return;
      final first = matchAttendanceFace(samples.first, store.people);
      final second = matchAttendanceFace(samples.last, store.people);
      if (first == null ||
          second == null ||
          first.person.id != second.person.id) {
        throw StateError(
          'No clear match was found in this device’s employee records. No attendance was recorded.',
        );
      }
      person = first.person;
      similarity = min(first.score, second.score);
      if (_cloudEnabled && person.accountUid == null) {
        final employees = <Map<String, dynamic>>[];
        String? cursor;
        do {
          final result = await _api.call('listDashboardUsers', {
            'pageToken': ?cursor,
          });
          employees.addAll(
            (result['users'] as List)
                .map((u) => Map<String, dynamic>.from(u))
                .where(
                  (u) =>
                      u['approved'] == true &&
                      u['disabled'] != true &&
                      u['role'] == 'regular',
                ),
          );
          cursor = result['pageToken'];
        } while (cursor != null);
        if (!mounted) return;
        final selected = await showDialog<String>(
          context: context,
          builder: (context) => SimpleDialog(
            title: Text('Link ${person!.name} to a registered employee'),
            children: [
              for (final employee in employees)
                SimpleDialogOption(
                  onPressed: () =>
                      Navigator.pop(context, employee['uid'] as String),
                  child: Text(employee['username'] ?? employee['email']),
                ),
            ],
          ),
        );
        if (selected == null || !mounted) return;
        person = await store.linkAccount(person.id, selected);
      }
    } else {
      person = _self;
      if (person == null) {
        throw StateError('Enroll your personal attendance profile first.');
      }
      await _device.authenticate();
    }
    final verifiedAt = DateTime.now();
    await _checkSession(shared: shared);
    if ((shared ? store.nextAction(person.id) : _nextPersonalAction()) !=
        action) {
      throw StateError(
        action == 'in'
            ? '${person.name} is already timed in. Choose Time out.'
            : '${person.name} must time in first.',
      );
    }
    final position = await _device.location();
    if (!mounted) return;
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          '${action == 'in' ? 'Time in' : 'Time out'}: ${person!.name}',
        ),
        content: Text(
          'Employee ID: ${person.employeeId}\n${_date(verifiedAt)}\n\nLocation: ${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}\nAccuracy: ±${position.accuracy.toStringAsFixed(0)} m',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
    if (accepted != true || !mounted) return;
    if (DateTime.now().difference(verifiedAt) > const Duration(seconds: 60)) {
      throw StateError('Verification expired. Scan again.');
    }
    await _checkSession(shared: shared);
    final deviceInfo = await LoginDevice.read();
    if (_cloudEnabled && (deviceInfo['osVersion']?.isEmpty ?? true)) {
      throw StateError(
        'Device OS details are unavailable. Reopen the app before recording.',
      );
    }
    await store.record(
      AttendanceEvent(
        id: _newId(),
        personId: person.id,
        personName: person.name,
        employeeId: person.employeeId,
        action: action,
        time: verifiedAt.toUtc(),
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        method: shared ? 'local_face' : 'device_biometric',
        operatorUid: _uid!,
        locationTime: position.timestamp.toUtc(),
        offsetMinutes: verifiedAt.timeZoneOffset.inMinutes,
        similarity: similarity,
        ownerUid: person.accountUid,
        device: deviceInfo,
      ),
      expectedAction: shared ? null : _nextPersonalAction(),
    );
    if (_cloudEnabled) await _sync();
    if (mounted) {
      setState(() => _tab = 2);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${person.name}: ${action == 'in' ? 'time in' : 'time out'} saved.',
          ),
        ),
      );
    }
  });

  String _nextPersonalAction() {
    final store = _store!;
    final hasPending = store.events.any(
      (e) => e.ownerUid == _uid && !store.isUploaded(e.id),
    );
    return !hasPending && _cloudNextAction != null
        ? _cloudNextAction!
        : (_self == null ? 'in' : store.nextAction(_self!.id));
  }

  Future<void> _loadCloud({bool append = false}) async {
    final uid = _uid;
    final result = await _api.call('listAttendance', {
      'scope': 'mine',
      if (append && _cloudCursor != null) 'cursor': _cloudCursor,
    });
    if (!mounted || _auth.currentUser?.uid != uid) return;
    setState(() {
      final rows = (result['records'] as List)
          .map((r) => Map<String, dynamic>.from(r))
          .toList();
      _cloudRecords = append ? [..._cloudRecords, ...rows] : rows;
      _cloudCursor = result['cursor'];
      _cloudNextAction = result['nextAction'];
    });
  }

  Future<void> _sync() async {
    final store = _store;
    if (!_cloudEnabled ||
        store == null ||
        _syncing ||
        _auth.currentUser?.uid != _uid) {
      return;
    }
    setState(() {
      _syncing = true;
      _syncStatus = 'Syncing attendance…';
    });
    try {
      await _checkSession();
      for (final event in store.events) {
        if (event.ownerUid == null || store.isUploaded(event.id)) continue;
        if (_auth.currentUser?.uid != _uid) return;
        await _api.upload(event);
        await store.markUploaded(event.id);
      }
      await _loadCloud();
      if (mounted) {
        setState(
          () => _syncStatus =
              'Attendance synced. Older device-only records remain on this device.',
        );
      }
    } catch (error) {
      if (mounted) {
        setState(
          () =>
              _syncStatus = 'Saved device records retained. ${_message(error)}',
        );
      }
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  String _date(DateTime date) {
    final d = date.toUtc().add(const Duration(hours: 8));
    String two(int n) => n.toString().padLeft(2, '0');
    return '${d.year}-${two(d.month)}-${two(d.day)} ${two(d.hour)}:${two(d.minute)}:${two(d.second)}';
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: Scaffold(
      appBar: AppBar(title: const Text('Attendance')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 900),
                  child: ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      const SectionHero(
                        eyebrow: 'Attendance',
                        title: 'Every arrival. Every departure.',
                        description:
                            'Time in or out using biometrics. Records include date, time, device and OS. Saved records sync for administrator review.',
                        icon: Icons.fact_check_outlined,
                      ),
                      const SizedBox(height: 24),
                      SegmentedButton<int>(
                        showSelectedIcon: false,
                        segments: [
                          ButtonSegment(
                            value: 0,
                            label: Text(
                              MediaQuery.sizeOf(context).width < 420
                                  ? 'Mine'
                                  : 'My device',
                            ),
                          ),
                          ButtonSegment(value: 1, label: const Text('Shared')),
                          ButtonSegment(value: 2, label: const Text('Records')),
                        ],
                        selected: {_tab},
                        onSelectionChanged: _busy
                            ? null
                            : (value) => setState(() => _tab = value.single),
                      ),
                      const SizedBox(height: 24),
                      if (_error != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 20),
                          child: Text(
                            _error!,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.error,
                            ),
                          ),
                        ),
                      if (_cloudEnabled) ...[
                        Text(_syncStatus),
                        TextButton(
                          onPressed: _syncing || _busy ? null : _sync,
                          child: const Text('Sync attendance'),
                        ),
                      ],
                      if (!_mobile)
                        const Text(
                          'Biometric attendance and camera face enrollment are available on Android and iOS.',
                        ),
                      if (_store == null)
                        FilledButton(
                          onPressed: _busy ? null : _load,
                          child: const Text('Reload records'),
                        )
                      else if (_tab == 2) ...[
                        if (_cloudEnabled) ...[
                          const Text('My synced attendance · Philippine time'),
                          for (final row in _cloudRecords)
                            ListTile(
                              title: Text(
                                '${row['action'] == 'in' ? 'Time in' : 'Time out'}${row['voided'] == true ? ' · Voided' : ''}',
                              ),
                              subtitle: Text(
                                '${_date(DateTime.parse(row['time']))}${row['corrected'] == true ? ' · Corrected by administrator' : ''}',
                              ),
                            ),
                          if (_cloudCursor != null)
                            TextButton(
                              onPressed: _syncing
                                  ? null
                                  : () => _loadCloud(append: true),
                              child: const Text('Load older attendance'),
                            ),
                        ],
                        ..._records(),
                      ] else if (_tab == 0)
                        ..._personal()
                      else
                        ..._shared(),
                      if (_busy)
                        const Padding(
                          padding: EdgeInsets.all(24),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                    ],
                  ),
                ),
              ),
            ),
    ),
  );

  List<Widget> _personal() => [
    Text(
      _self?.name ?? 'Set up your attendance profile',
      style: Theme.of(context).textTheme.titleLarge,
    ),
    const SizedBox(height: 12),
    const Text(
      'Use this mode only on your own device. Face ID or fingerprint authentication confirms the device owner for your signed-in account. Any biometric enrolled in device settings may pass.',
    ),
    const SizedBox(height: 20),
    if (_self == null)
      FilledButton.icon(
        onPressed: !_mobile || _busy ? null : () => _enroll(false),
        icon: const Icon(Icons.person_add_outlined),
        label: const Text('Enroll my profile'),
      )
    else ...[
      Text(
        'Employee ID: ${_self!.employeeId} • ${_nextPersonalAction() == 'out' ? 'Currently timed in' : 'Currently timed out'}',
      ),
      const SizedBox(height: 20),
      ..._clockButtons(false, enabled: true),
    ],
    const SizedBox(height: 20),
    TextButton.icon(
      onPressed: _busy ? null : () => Geolocator.openAppSettings(),
      icon: const Icon(Icons.settings_outlined),
      label: const Text('Device permissions'),
    ),
  ];

  List<Widget> _shared() => [
    Text(
      'Shared-device face attendance',
      style: Theme.of(context).textTheme.titleLarge,
    ),
    const SizedBox(height: 12),
    const Text(
      'Scan an employee’s face to compare it with employee faces enrolled on this device. An administrator must be signed in to operate this mode.',
    ),
    const SizedBox(height: 12),
    const Text(
      'The built-in fingerprint sensor cannot identify employees on a shared device. Shared fingerprint attendance needs a compatible external scanner.',
    ),
    const SizedBox(height: 20),
    ..._clockButtons(true, enabled: _manager),
    const SizedBox(height: 16),
    OutlinedButton.icon(
      onPressed: !_mobile || !_manager || _busy ? null : () => _enroll(true),
      icon: const Icon(Icons.person_add_alt),
      label: const Text('Enroll employee face'),
    ),
    const SizedBox(height: 20),
    Text(
      '${_store!.people.where((p) => p.faces.isNotEmpty).length} employee faces enrolled',
    ),
    ..._store!.people
        .where((p) => p.faces.isNotEmpty)
        .map(
          (p) => ListTile(
            leading: const Icon(Icons.person_outline),
            title: Text(p.name),
            subtitle: Text(p.employeeId),
          ),
        ),
  ];

  List<Widget> _clockButtons(bool shared, {required bool enabled}) => [
    FilledButton.icon(
      onPressed: !_mobile || !enabled || _busy
          ? null
          : () => _clock(shared, 'in'),
      icon: const Icon(Icons.login),
      label: const Text('Verify & time in'),
    ),
    const SizedBox(height: 12),
    OutlinedButton.icon(
      onPressed: !_mobile || !enabled || _busy
          ? null
          : () => _clock(shared, 'out'),
      icon: const Icon(Icons.logout),
      label: const Text('Verify & time out'),
    ),
  ];

  List<Widget> _records() => [
    Text(
      'Local attendance records',
      style: Theme.of(context).textTheme.titleLarge,
    ),
    const SizedBox(height: 12),
    if (_store!.events.isEmpty)
      const Padding(
        padding: EdgeInsets.symmetric(vertical: 32),
        child: Text('No attendance recorded on this device yet.'),
      ),
    ..._store!.events
        .where(
          (e) =>
              _manager ||
              e.ownerUid == _uid ||
              _store!.people.any(
                (p) => p.id == e.personId && p.accountUid == _uid,
              ),
        )
        .toList()
        .reversed
        .map(
          (e) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Card(
              child: ListTile(
                isThreeLine: true,
                leading: Icon(
                  e.action == 'in' ? Icons.login : Icons.logout,
                  color: AppColors.teal,
                ),
                title: Text(
                  '${e.personName} • ${e.action == 'in' ? 'Time in' : 'Time out'}',
                ),
                subtitle: Text(
                  _manager
                      ? '${e.employeeId} • ${_date(e.time)}\n${e.device['manufacturer'] ?? ''} ${e.device['model'] ?? 'Device not reported'} • OS ${e.device['osVersion'] ?? 'Not reported'}'
                      : _date(e.time),
                ),
                onTap: !_manager
                    ? null
                    : () => showDialog<void>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: Text(e.personName),
                          content: Text(
                            'Employee ID: ${e.employeeId}\n${e.action == 'in' ? 'Time in' : 'Time out'}: ${_date(e.time)}\nRecorded UTC offset: ${e.offsetMinutes} minutes\n\nLatitude: ${e.latitude}\nLongitude: ${e.longitude}\nAccuracy: ±${e.accuracy.toStringAsFixed(0)} m\nLocation measured: ${_date(e.locationTime)}\nVerification: ${e.method == 'local_face' ? 'Local face match' : 'Device biometrics'}',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text('Close'),
                            ),
                          ],
                        ),
                      ),
              ),
            ),
          ),
        ),
  ];
}

class _EnrollmentDialog extends StatefulWidget {
  const _EnrollmentDialog({
    required this.initialName,
    required this.shared,
    this.employees = const [],
  });
  final String initialName;
  final bool shared;
  final List<Map<String, dynamic>> employees;
  @override
  State<_EnrollmentDialog> createState() => _EnrollmentDialogState();
}

class _EnrollmentDialogState extends State<_EnrollmentDialog> {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.initialName);
  final _employeeId = TextEditingController();
  bool _consent = false;
  String? _accountUid;
  @override
  void dispose() {
    _name.dispose();
    _employeeId.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(widget.shared ? 'Enroll employee face' : 'Enroll my profile'),
    content: SingleChildScrollView(
      child: Form(
        key: _form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (widget.shared)
              DropdownButtonFormField<String>(
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Registered employee account',
                ),
                items: widget.employees
                    .map(
                      (u) => DropdownMenuItem<String>(
                        value: u['uid'],
                        child: Text(
                          u['username'] ?? u['email'],
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() {
                  _accountUid = value;
                  final user = widget.employees.firstWhere(
                    (u) => u['uid'] == value,
                  );
                  _name.text = user['username'] ?? user['email'];
                }),
                validator: (value) => value == null
                    ? 'Select an approved registered employee.'
                    : null,
              ),
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Employee name'),
              validator: (v) => (v?.trim().isEmpty ?? true)
                  ? 'Enter the employee name.'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _employeeId,
              decoration: const InputDecoration(labelText: 'Employee ID'),
              validator: (v) =>
                  (v?.trim().isEmpty ?? true) ? 'Enter the employee ID.' : null,
            ),
            const SizedBox(height: 16),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: _consent,
              onChanged: (value) => setState(() => _consent = value ?? false),
              title: Text(
                widget.shared
                    ? 'The employee agrees to store their face template on this device and sync attendance time/device details for department administrator review.'
                    : 'I agree to save my verified attendance on this device and sync time/device details for department administrator review.',
              ),
            ),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: !_consent
            ? null
            : () {
                if (_form.currentState!.validate()) {
                  Navigator.pop(context, (
                    name: _name.text.trim(),
                    employeeId: _employeeId.text.trim(),
                    accountUid: _accountUid,
                  ));
                }
              },
        child: const Text('Continue'),
      ),
    ],
  );
}
