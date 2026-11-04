import 'access_gate.dart';
import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'app_theme.dart';
import 'pharmacy_store.dart';

class _PharmacyPageContent extends StatefulWidget {
  const _PharmacyPageContent({this.store});
  final PharmacyStore? store;
  @override
  State<_PharmacyPageContent> createState() => __PharmacyPageContentState();
}

class __PharmacyPageContentState extends State<_PharmacyPageContent>
    with WidgetsBindingObserver {
  late final PharmacyStore _store;
  List<Medicine> _items = [];
  StreamSubscription<User?>? _auth;
  Timer? _timer;
  String? _error;
  bool _loading = true, _syncing = false, _saving = false;
  String _search = '';
  int _loadVersion = 0;

  @override
  void initState() {
    super.initState();
    _store = widget.store ?? PharmacyStore.instance;
    WidgetsBinding.instance.addObserver(this);
    if (widget.store == null) {
      _auth = FirebaseAuth.instance.authStateChanges().listen((_) {
        if (!mounted) return;
        setState(() {
          _items = [];
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
    _timer?.cancel();
    _auth?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _load() async {
    final version = ++_loadVersion;
    final uid = _store.userId;
    try {
      final items = await _store.records();
      if (!mounted || version != _loadVersion || uid != _store.userId) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (_) {
      if (mounted && version == _loadVersion) {
        setState(() {
          _loading = false;
          _error = 'Could not load inventory. Check device storage and retry.';
        });
      }
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

  Future<void> _edit([Medicine? previous]) async {
    final uid = _store.userId;
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) =>
            _MedicineForm(store: _store, previous: previous, ownerId: uid),
      ),
    );
    if (result != true || !mounted || _store.userId != uid) return;
    setState(() => _saving = true);
    await _load();
    if (!mounted) return;
    setState(() => _saving = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Medicine saved on this device.')),
    );
    unawaited(_sync());
  }

  @override
  Widget build(BuildContext context) {
    final query = _search.trim().toLowerCase();
    final visible = _items
        .where(
          (item) =>
              '${item.name} ${item.strength}'.toLowerCase().contains(query),
        )
        .toList();
    final pending = _items.where((item) => !item.uploaded).length;
    return Scaffold(
      appBar: AppBar(title: const Text('Pharmacy System')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _loading || _saving || _store.userId == null
            ? null
            : () => _edit(),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add medicine'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 900),
          child: RefreshIndicator(
            onRefresh: () async {
              await _load();
              await _sync();
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 110),
              children: [
                SectionHero(
                  eyebrow: 'RHU · Pharmacy',
                  title: 'Stock, in sight.',
                  description:
                      'Manage your medicines with a local copy and Firebase backup.',
                  icon: Icons.medication_outlined,
                  child: Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      _Metric(label: 'Medicines', value: '${_items.length}'),
                      _Metric(
                        label: 'Out of stock',
                        value:
                            '${_items.where((item) => item.quantity == 0).length}',
                      ),
                      _Metric(label: 'Pending sync', value: '$pending'),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Icon(
                          pending == 0
                              ? Icons.cloud_done_outlined
                              : Icons.cloud_upload_outlined,
                          color: AppColors.teal,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _syncing
                                    ? 'Checking Firebase…'
                                    : pending > 0
                                    ? '$pending update${pending == 1 ? '' : 's'} to upload'
                                    : 'Device inventory ready',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.navy,
                                ),
                              ),
                              const Text(
                                'Saved locally • Sync for cloud updates',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.muted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          tooltip: 'Sync now',
                          onPressed: _syncing ? null : _sync,
                          icon: _syncing
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.sync),
                        ),
                      ],
                    ),
                  ),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                        height: 1.4,
                      ),
                    ),
                  ),
                const SizedBox(height: 24),
                const Text(
                  'Medicine inventory',
                  style: TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w800,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  onChanged: (value) => setState(() => _search = value),
                  decoration: const InputDecoration(
                    hintText: 'Search name or strength',
                    prefixIcon: Icon(Icons.search_rounded),
                  ),
                ),
                const SizedBox(height: 16),
                if (_loading)
                  const Center(child: CircularProgressIndicator())
                else if (visible.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(28),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.medication_outlined,
                          size: 44,
                          color: AppColors.teal,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          query.isEmpty
                              ? 'Your inventory starts here'
                              : 'No matching medicines',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 17,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          query.isEmpty
                              ? 'Add a medicine or sync inventory saved to your account.'
                              : 'Try a different name or strength.',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.muted),
                        ),
                      ],
                    ),
                  )
                else
                  for (final item in visible)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Card(
                        child: InkWell(
                          borderRadius: BorderRadius.circular(22),
                          onTap: () => _edit(item),
                          child: Padding(
                            padding: const EdgeInsets.all(18),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppColors.mint,
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: const Icon(
                                    Icons.medication_outlined,
                                    color: AppColors.teal,
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.name,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 16,
                                          color: AppColors.navy,
                                        ),
                                      ),
                                      if (item.strength.isNotEmpty)
                                        Text(
                                          item.strength,
                                          style: const TextStyle(
                                            color: AppColors.muted,
                                            fontSize: 12,
                                          ),
                                        ),
                                      const SizedBox(height: 7),
                                      Text(
                                        item.uploaded
                                            ? 'Saved to Firebase'
                                            : 'On device · Pending sync',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: item.uploaded
                                              ? AppColors.teal
                                              : AppColors.amber,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Column(
                                  children: [
                                    Text(
                                      '${item.quantity}',
                                      style: TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.w800,
                                        color: item.quantity == 0
                                            ? AppColors.amber
                                            : AppColors.navy,
                                      ),
                                    ),
                                    const Text(
                                      'units',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: AppColors.muted,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label, value;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: .09),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 23,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(
          label,
          style: const TextStyle(color: Color(0xFFD4E7EB), fontSize: 11),
        ),
      ],
    ),
  );
}

class _MedicineForm extends StatefulWidget {
  const _MedicineForm({
    required this.store,
    required this.previous,
    required this.ownerId,
  });
  final PharmacyStore store;
  final Medicine? previous;
  final String? ownerId;
  @override
  State<_MedicineForm> createState() => _MedicineFormState();
}

class _MedicineFormState extends State<_MedicineForm> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name, _strength, _quantity;
  bool _saving = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.previous?.name);
    _strength = TextEditingController(text: widget.previous?.strength);
    _quantity = TextEditingController(
      text: '${widget.previous?.quantity ?? 0}',
    );
  }

  @override
  void dispose() {
    _name.dispose();
    _strength.dispose();
    _quantity.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving || !_form.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      if (widget.ownerId == null || widget.store.userId != widget.ownerId) {
        throw StateError(
          'Your account changed. Reopen the pharmacy before saving.',
        );
      }
      await widget.store.save(
        previous: widget.previous,
        name: _name.text,
        strength: _strength.text,
        quantity: int.parse(_quantity.text),
      );
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = error is StateError
              ? error.message.toString()
              : 'Could not save. Check device storage and retry.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.previous == null ? 'Add medicine' : 'Update medicine'),
    ),
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600),
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Text(
                'Medicine details',
                style: TextStyle(
                  fontSize: 25,
                  fontWeight: FontWeight.w800,
                  color: AppColors.navy,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Changes save on this device first, ready to sync when you connect.',
                style: TextStyle(color: AppColors.muted, height: 1.5),
              ),
              const SizedBox(height: 26),
              TextFormField(
                controller: _name,
                enabled: !_saving,
                maxLength: 160,
                decoration: const InputDecoration(labelText: 'Medicine name'),
                validator: (value) => value == null || value.trim().isEmpty
                    ? 'Enter a medicine name.'
                    : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _strength,
                enabled: !_saving,
                maxLength: 100,
                decoration: const InputDecoration(
                  labelText: 'Strength / form',
                  hintText: 'e.g. 500 mg tablet',
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _quantity,
                enabled: !_saving,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Units in stock'),
                validator: (value) {
                  final number = int.tryParse(value ?? '');
                  return number == null || number < 0 || number > 1000000
                      ? 'Enter a whole number from 0 to 1,000,000.'
                      : null;
                },
              ),
              const SizedBox(height: 24),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(
                    _error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ),
              FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: const Icon(Icons.save_outlined),
                label: Text(_saving ? 'Saving…' : 'Save medicine'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class PharmacyPage extends StatelessWidget {
  const PharmacyPage({super.key, this.store, this.auth});
  final PharmacyStore? store;
  final FirebaseAuth? auth;
  @override
  Widget build(BuildContext context) => AccessGate(
    section: 'pharmacy',
    auth: auth,
    child: _PharmacyPageContent(store: store),
  );
}
