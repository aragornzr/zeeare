import 'access_gate.dart';
import 'dart:io';
import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'tourism_fee.dart';
import 'tourism_destinations.dart';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'tourism_store.dart';

class _TourismPageContent extends StatefulWidget {
  const _TourismPageContent();

  @override
  State<_TourismPageContent> createState() => __TourismPageContentState();
}

class __TourismPageContentState extends State<_TourismPageContent> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _plate = TextEditingController();
  final _destination = TextEditingController();
  final _company = TextEditingController();
  final _count = TextEditingController(text: '1');
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _rateSubscription;
  TourismFeeRate? _rate;
  bool _rateLoading = true;
  bool _rateFromCache = false;
  String? _rateError;
  final _store = TourismStore.instance;
  XFile? _tourist;
  XFile? _vehicle;
  bool _busy = false;
  bool _saving = false;
  late Future<List<Map<String, dynamic>>> _records;

  @override
  void initState() {
    super.initState();
    _records = kIsWeb ? Future.value([]) : _store.records();
    _store.addListener(_refresh);
    _store.start();
    _rateSubscription = FirebaseFirestore.instance
        .collection('department_settings')
        .doc('tourism')
        .snapshots(includeMetadataChanges: true)
        .listen(
          (document) {
            if (!mounted) return;
            try {
              final data = document.data();
              final rate = data == null ? null : TourismFeeRate.fromData(data);
              setState(() {
                _rate = rate;
                _rateLoading = false;
                _rateFromCache = document.metadata.isFromCache;
                _rateError = rate == null
                    ? 'The Tourism admin must declare a fee in the web dashboard before you save a new record.'
                    : null;
              });
            } catch (_) {
              setState(() {
                _rate = null;
                _rateLoading = false;
                _rateError =
                    'The declared Tourism rate is invalid. Contact your Tourism admin.';
              });
            }
          },
          onError: (Object error) {
            if (mounted) {
              setState(() {
                _rate = null;
                _rateLoading = false;
                _rateError =
                    'Could not load the Tourism fee. Check your connection and account access, then reopen Tourism.';
              });
            }
          },
        );
    if (!kIsWeb && Platform.isAndroid) _recoverPhoto();
  }

  Future<void> _recoverPhoto() async {
    try {
      final lost = await ImagePicker().retrieveLostData();
      if (!mounted || lost.isEmpty) return;
      if (lost.files == null || lost.files!.isEmpty) {
        _message(
          'The interrupted photo could not be recovered. Please take it again.',
        );
        return;
      }
      final tourist = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: const Text('Recovered photo'),
          content: const Text(
            'The app restarted while taking a photo. Choose where this photo belongs, then complete the form.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Tourist'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Vehicle'),
            ),
          ],
        ),
      );
      if (!mounted || tourist == null) return;
      setState(() {
        if (tourist) {
          _tourist = lost.files!.first;
        } else {
          _vehicle = lost.files!.first;
        }
      });
    } catch (_) {
      _message(
        'Could not recover the interrupted photo. Please select it again.',
      );
    }
  }

  void _refresh() {
    if (!mounted) return;
    final records = _store.records();
    setState(() {
      _records = records;
    });
  }

  @override
  void dispose() {
    _store.removeListener(_refresh);
    _name.dispose();
    _plate.dispose();
    _destination.dispose();
    _company.dispose();
    _count.dispose();
    _rateSubscription?.cancel();
    super.dispose();
  }

  void _message(String message) {
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  Future<void> _pick(bool tourist, ImageSource source) async {
    setState(() => _busy = true);
    try {
      final photo = await ImagePicker().pickImage(
        source: source,
        maxWidth: 1600,
        imageQuality: 85,
      );
      if (mounted && photo != null) {
        setState(() {
          if (tourist) {
            _tourist = photo;
          } else {
            _vehicle = photo;
          }
        });
      }
    } catch (_) {
      _message(
        'Could not open photos. Check camera or photo permissions and try again.',
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    final rate = _rate;
    if (rate == null) {
      _message(_rateError ?? 'Wait for the declared Tourism fee to load.');
      return;
    }
    setState(() {
      _busy = true;
      _saving = true;
    });
    try {
      await _store.save(
        _name.text,
        _plate.text,
        _tourist,
        _vehicle,
        destination: _destination.text,
        company: _company.text,
        touristCount: int.parse(_count.text.trim()),
        feeRate: rate,
      );
      if (!mounted) return;
      _name.clear();
      _plate.clear();
      _destination.clear();
      _company.clear();
      _count.text = '1';
      setState(() {
        _tourist = null;
        _vehicle = null;
      });
      _message(
        'Saved on this device. Firebase upload will retry automatically.',
      );
    } catch (_) {
      _message(
        'Could not save on this device. Your form is still here; please try again.',
      );
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _saving = false;
        });
      }
    }
  }

  Widget _feeSummary() {
    final rate = _rate;
    if (rate == null) {
      return Text(
        _rateLoading
            ? 'Loading the Tourism admin’s fee…'
            : _rateError ?? 'No Tourism rate is available.',
      );
    }
    final count = int.tryParse(_count.text.trim());
    final valid = count != null && count >= 1 && count <= 1000;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Fee per tourist: ₱ ${(rate.perPersonCentavos / 100).toStringAsFixed(2)}',
            ),
            const SizedBox(height: 8),
            Text(
              valid
                  ? 'Total fee: ₱ ${(rate.totalCentavos(count) / 100).toStringAsFixed(2)} ($count tourists)'
                  : 'Enter the number of tourists to calculate the total.',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            Text(
              _rateFromCache
                  ? 'Using the last rate received on this device. Connect to receive any admin updates.'
                  : 'Rate declared by the Tourism admin. Saved totals keep this rate.',
            ),
          ],
        ),
      ),
    );
  }

  Widget _photo(String label, bool tourist, XFile? file) => Card(
    child: Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$label (optional)',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          if (file != null) ...[
            const SizedBox(height: 8),
            Image.file(
              File(file.path),
              height: 140,
              errorBuilder: (_, e, s) => const Text('Photo unavailable'),
            ),
            TextButton(
              onPressed: _busy
                  ? null
                  : () => setState(() {
                      if (tourist) {
                        _tourist = null;
                      } else {
                        _vehicle = null;
                      }
                    }),
              child: const Text('Remove'),
            ),
          ],
          Wrap(
            spacing: 8,
            children: [
              if (Platform.isAndroid || Platform.isIOS)
                TextButton.icon(
                  onPressed: _busy
                      ? null
                      : () => _pick(tourist, ImageSource.camera),
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Take picture'),
                ),
              TextButton.icon(
                onPressed: _busy
                    ? null
                    : () => _pick(tourist, ImageSource.gallery),
                icon: const Icon(Icons.photo_library),
                label: const Text('Choose photo'),
              ),
            ],
          ),
        ],
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Tourism')),
    body: kIsWeb
        ? const Center(
            child: Text(
              'Please use the mobile app to save tourism records on your device.',
            ),
          )
        : SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 600),
                child: Form(
                  key: _form,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Tourist registration',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _name,
                        enabled: !_busy,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Tourist name',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty
                            ? 'Enter the tourist name'
                            : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _company,
                        enabled: !_busy,
                        maxLength: 200,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Company / group (optional)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _plate,
                        enabled: !_busy,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(
                          labelText: 'Vehicle plate number (optional)',
                          helperText: 'Leave blank if there is no vehicle.',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TourismDestinationField(
                        controller: _destination,
                        enabled: !_busy,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _count,
                        enabled: !_busy,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Number of tourists',
                          helperText:
                              'Include the named tourist in the total (1–1000).',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (_) => setState(() {}),
                        validator: (value) {
                          final count = int.tryParse(value?.trim() ?? '');
                          return count == null || count < 1 || count > 1000
                              ? 'Enter a whole number from 1 to 1000'
                              : null;
                        },
                      ),
                      const SizedBox(height: 16),
                      _feeSummary(),
                      const SizedBox(height: 12),
                      const Text(
                        'Date and time are recorded automatically when you save.',
                      ),
                      const SizedBox(height: 12),
                      _photo('Tourist photo', true, _tourist),
                      _photo('Vehicle photo', false, _vehicle),
                      const SizedBox(height: 16),
                      FilledButton.icon(
                        onPressed: _busy || _rate == null ? null : _save,
                        icon: const Icon(Icons.save_alt),
                        label: Text(
                          _saving
                              ? 'Saving the info…'
                              : _busy
                              ? 'Please wait…'
                              : 'Pay Now',
                        ),
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'Device records',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          TextButton(
                            onPressed: _store.syncing
                                ? null
                                : () => _store.sync(),
                            child: Text(
                              _store.syncing ? 'Uploading…' : 'Sync now',
                            ),
                          ),
                        ],
                      ),
                      if (_store.syncError != null) Text(_store.syncError!),
                      FutureBuilder<List<Map<String, dynamic>>>(
                        future: _records,
                        builder: (context, snapshot) {
                          if (snapshot.hasError) {
                            return const Text(
                              'Could not load device records. Try again.',
                            );
                          }
                          if (!snapshot.hasData) {
                            return const LinearProgressIndicator();
                          }
                          if (snapshot.data!.isEmpty) {
                            return const Text(
                              'No tourists saved on this device yet.',
                            );
                          }
                          return Column(
                            children: snapshot.data!.map((record) {
                              final date = DateTime.parse(
                                record['createdAt'] as String,
                              ).toLocal();
                              final formatted =
                                  '${MaterialLocalizations.of(context).formatMediumDate(date)} ${MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay.fromDateTime(date))}';
                              return Card(
                                child: ListTile(
                                  title: Text(record['name'] as String),
                                  subtitle: Text(
                                    '${record['plateNumber'] == '' ? 'No vehicle' : record['plateNumber']}\nCompany / group: ${record['company'] == null || record['company'] == '' ? 'Not recorded' : record['company']}\nTourists: ${record['touristCount'] ?? 'Not recorded'}\nRate per tourist: ${record['feePerPersonCentavos'] is int ? '₱ ${((record['feePerPersonCentavos'] as int) / 100).toStringAsFixed(2)}' : 'Not recorded'}\nDestination: ${record['destination'] ?? 'Not recorded'}\nTotal fee: ${record['fee'] is num ? '₱ ${(record['fee'] as num).toStringAsFixed(2)}' : 'Not recorded'}\n$formatted\n${record['uploaded'] == true ? 'Uploaded to Firebase' : (record['syncError'] as String? ?? 'Saved on device • Upload pending')}',
                                  ),
                                  isThreeLine: true,
                                  trailing: Icon(
                                    record['uploaded'] == true
                                        ? Icons.cloud_done
                                        : Icons.cloud_upload_outlined,
                                  ),
                                ),
                              );
                            }).toList(),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
  );
}

class TourismPage extends StatelessWidget {
  const TourismPage({super.key});
  @override
  Widget build(BuildContext context) =>
      AccessGate(section: 'tourism', child: const _TourismPageContent());
}
