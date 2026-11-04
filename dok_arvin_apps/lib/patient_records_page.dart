import 'access_gate.dart';
import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import 'patient_store.dart';

String checkupLabel(BuildContext context, DateTime value) {
  final local = value.toLocal();
  return '${MaterialLocalizations.of(context).formatMediumDate(local)} · '
      '${TimeOfDay.fromDateTime(local).format(context)}';
}

class _PatientRecordsPageContent extends StatefulWidget {
  const _PatientRecordsPageContent({this.store});
  final PatientStore? store;

  @override
  State<_PatientRecordsPageContent> createState() =>
      __PatientRecordsPageContentState();
}

class __PatientRecordsPageContentState extends State<_PatientRecordsPageContent>
    with WidgetsBindingObserver {
  late final PatientStore _store;
  StreamSubscription<User?>? _auth;
  Timer? _timer;
  List<PatientRecord> _records = [];
  bool _loading = true;
  bool _syncing = false;
  String? _error;
  String _search = '';
  int _filter = 0;
  int _loadVersion = 0;

  @override
  void initState() {
    super.initState();
    _store = widget.store ?? PatientStore();
    WidgetsBinding.instance.addObserver(this);
    if (widget.store == null) {
      _auth = FirebaseAuth.instance.authStateChanges().listen((_) {
        if (!mounted) return;
        setState(() {
          _records = [];
          _error = null;
        });
        unawaited(_load());
      });
    }
    unawaited(_load().then((_) => _sync()));
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _sync());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_sync());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    _auth?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final version = ++_loadVersion;
    final uid = _store.userId;
    try {
      final records = await _store.records();
      if (!mounted || version != _loadVersion || uid != _store.userId) return;
      setState(() {
        _records = records;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || version != _loadVersion) return;
      setState(() {
        _loading = false;
        _error =
            'Could not load device records. Check device storage and retry.';
      });
    }
  }

  Future<void> _sync() async {
    if (!mounted || _syncing) return;
    final uid = _store.userId;
    setState(() {
      _syncing = true;
      _error = null;
    });
    await _store.sync();
    if (!mounted) return;
    setState(() {
      _syncing = false;
      _error = uid == _store.userId ? _store.syncError : null;
    });
    await _load();
  }

  Future<void> _add([PatientRecord? previous]) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => PatientVisitForm(store: _store, previous: previous),
      ),
    );
    if (saved != true || !mounted) return;
    await _load();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Checkup saved on this device.')),
    );
    unawaited(_sync());
  }

  void _details(PatientRecord record) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) => SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              record.patientName,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            Text('Patient ID: ${record.patientNumber}'),
            Text('Doctor: ${record.doctorName}'),
            Text('Checked: ${checkupLabel(context, record.checkedAt)}'),
            Text(
              record.uploaded
                  ? 'Saved on device and Firebase'
                  : 'Saved on device · Pending upload',
            ),
            const SizedBox(height: 16),
            const Text(
              'Visit notes',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            Text(record.notes.isEmpty ? 'No notes recorded.' : record.notes),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () {
                Navigator.pop(sheetContext);
                _add(record);
              },
              icon: const Icon(Icons.add),
              label: const Text('Record another checkup'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final query = _search.toLowerCase().trim();
    final visible = _records.where((record) {
      if (_filter == 1 && record.uploaded) return false;
      if (_filter == 2 && !record.uploaded) return false;
      return '${record.patientName} ${record.patientNumber} ${record.doctorName}'
          .toLowerCase()
          .contains(query);
    }).toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Patient Record System')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _store.userId == null ? null : () => _add(),
        icon: const Icon(Icons.add),
        label: const Text('New checkup'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Save visits offline. Sync to upload visits and download your previous Firebase records.',
                ),
                const SizedBox(height: 12),
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Search patient, ID, or doctor',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (value) => setState(() => _search = value),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final entry in [
                      'On this device',
                      'Pending upload',
                      'Firebase',
                    ].asMap().entries)
                      ChoiceChip(
                        label: Text(entry.value),
                        selected: _filter == entry.key,
                        onSelected: (_) => setState(() => _filter = entry.key),
                      ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${visible.length} checkup${visible.length == 1 ? '' : 's'}',
                      ),
                    ),
                    TextButton.icon(
                      onPressed: _syncing ? null : _sync,
                      icon: _syncing
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.sync),
                      label: Text(_syncing ? 'Syncing…' : 'Sync now'),
                    ),
                  ],
                ),
                if (_filter == 2)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 8),
                    child: Text(
                      'Previously synced records, also available offline. Sync now checks for updates.',
                    ),
                  ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: () async {
                      await _load();
                      await _sync();
                    },
                    child: ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                      itemCount: visible.isEmpty ? 1 : visible.length,
                      itemBuilder: (context, index) {
                        if (visible.isEmpty) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 48),
                            child: Text(
                              _store.userId == null
                                  ? 'Sign in to access patient records.'
                                  : query.isNotEmpty
                                  ? 'No matching checkups.'
                                  : _filter == 1
                                  ? 'No pending uploads.'
                                  : _filter == 2
                                  ? 'No Firebase records downloaded yet. Tap Sync now.'
                                  : 'No checkups saved yet. Tap New checkup.',
                              textAlign: TextAlign.center,
                            ),
                          );
                        }
                        final record = visible[index];
                        return Card(
                          child: ListTile(
                            isThreeLine: true,
                            title: Text(
                              '${record.patientName} · ${record.patientNumber}',
                            ),
                            subtitle: Text(
                              'Doctor: ${record.doctorName}\n${checkupLabel(context, record.checkedAt)}',
                            ),
                            trailing: Tooltip(
                              message: record.uploaded
                                  ? 'Saved to Firebase'
                                  : 'Pending upload',
                              child: Icon(
                                record.uploaded
                                    ? Icons.cloud_done_outlined
                                    : Icons.cloud_upload_outlined,
                              ),
                            ),
                            onTap: () => _details(record),
                          ),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class PatientVisitForm extends StatefulWidget {
  const PatientVisitForm({super.key, required this.store, this.previous});
  final PatientStore store;
  final PatientRecord? previous;

  @override
  State<PatientVisitForm> createState() => _PatientVisitFormState();
}

class _PatientVisitFormState extends State<PatientVisitForm> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _number, _name;
  final _doctor = TextEditingController();
  final _notes = TextEditingController();
  DateTime _checkedAt = DateTime.now();
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _number = TextEditingController(text: widget.previous?.patientNumber);
    _name = TextEditingController(text: widget.previous?.patientName);
  }

  @override
  void dispose() {
    for (final controller in [_number, _name, _doctor, _notes]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _date() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _checkedAt,
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (date == null || !mounted) return;
    setState(
      () => _checkedAt = DateTime(
        date.year,
        date.month,
        date.day,
        _checkedAt.hour,
        _checkedAt.minute,
      ),
    );
  }

  Future<void> _time() async {
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_checkedAt),
    );
    if (time == null || !mounted) return;
    setState(
      () => _checkedAt = DateTime(
        _checkedAt.year,
        _checkedAt.month,
        _checkedAt.day,
        time.hour,
        time.minute,
      ),
    );
  }

  Future<void> _save() async {
    if (_saving || !_form.currentState!.validate()) return;
    if (_checkedAt.isAfter(DateTime.now())) {
      setState(() => _error = 'The checkup cannot be in the future.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.store.save(
        patientNumber: _number.text,
        patientName: _name.text,
        doctorName: _doctor.text,
        checkedAt: _checkedAt,
        notes: _notes.text,
      );
      if (mounted) Navigator.pop(context, true);
    } catch (_) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error =
              'Could not save. Check device storage and that you are signed in, then retry.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Record patient checkup')),
    body: Form(
      key: _form,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Use the same patient ID for every visit to keep their history easy to find.',
          ),
          const SizedBox(height: 16),
          for (final field in [
            (controller: _number, label: 'Patient ID', max: 80),
            (controller: _name, label: 'Patient full name', max: 160),
            (
              controller: _doctor,
              label: 'Doctor who checked the patient',
              max: 160,
            ),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: TextFormField(
                controller: field.controller,
                enabled: !_saving,
                maxLength: field.max,
                decoration: InputDecoration(
                  labelText: field.label,
                  border: const OutlineInputBorder(),
                ),
                validator: (value) => value == null || value.trim().isEmpty
                    ? '${field.label} is required.'
                    : null,
              ),
            ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.calendar_month),
            title: const Text('Date checked'),
            subtitle: Text(
              MaterialLocalizations.of(context).formatMediumDate(_checkedAt),
            ),
            trailing: const Icon(Icons.edit_outlined),
            onTap: _saving ? null : _date,
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.schedule),
            title: const Text('Time checked'),
            subtitle: Text(TimeOfDay.fromDateTime(_checkedAt).format(context)),
            trailing: const Icon(Icons.edit_outlined),
            onTap: _saving ? null : _time,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _notes,
            enabled: !_saving,
            maxLines: 4,
            maxLength: 4000,
            decoration: const InputDecoration(
              labelText: 'Visit notes (optional)',
              border: OutlineInputBorder(),
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          FilledButton.icon(
            onPressed: _saving ? null : _save,
            icon: const Icon(Icons.save_outlined),
            label: Text(_saving ? 'Saving…' : 'Save checkup'),
          ),
        ],
      ),
    ),
  );
}

class PatientRecordsPage extends StatelessWidget {
  const PatientRecordsPage({super.key, this.store, this.auth});
  final PatientStore? store;
  final FirebaseAuth? auth;
  @override
  Widget build(BuildContext context) => AccessGate(
    section: 'patients',
    auth: auth,
    child: _PatientRecordsPageContent(store: store),
  );
}
