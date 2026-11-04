import 'package:flutter/material.dart';
import 'admin_api.dart';

class TourismDestinationsPage extends StatefulWidget {
  const TourismDestinationsPage({super.key, this.request = requestAdmin});
  final AdminRequest request;
  @override
  State<TourismDestinationsPage> createState() =>
      _TourismDestinationsPageState();
}

class _TourismDestinationsPageState extends State<TourismDestinationsPage> {
  final name = TextEditingController();
  List<Map<String, dynamic>> destinations = [], personnel = [];
  int version = 0;
  String? id, error, pageToken;
  bool active = true,
      busy = false,
      loaded = false,
      canEdit = false,
      canDelegate = false;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data = await widget.request('getTourismDestinations', {});
      if (!mounted) return;
      setState(() {
        destinations =
            (data['destinations'] as List)
                .map((v) => Map<String, dynamic>.from(v))
                .toList()
              ..sort(
                (a, b) => (a['name'] as String).toLowerCase().compareTo(
                  (b['name'] as String).toLowerCase(),
                ),
              );
        version = data['version'] as int;
        canEdit = data['canEdit'] == true;
        canDelegate = data['canDelegate'] == true;
        loaded = true;
      });
    } catch (e) {
      if (mounted) setState(() => error = adminError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> save() async {
    if (busy || !loaded || name.text.trim().isEmpty) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.request('saveTourismDestination', {
        'name': name.text.trim(),
        'active': active,
        'version': version,
        if (id != null) 'id': id,
      });
      if (!mounted) return;
      name.clear();
      setState(() {
        id = null;
        active = true;
      });
      await load();
    } catch (e) {
      if (mounted) setState(() => error = adminError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> loadPersonnel({bool append = false}) async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data = await widget.request('listTourismDestinationPersonnel', {
        if (append && pageToken != null) 'pageToken': pageToken,
      });
      if (!mounted) return;
      setState(() {
        personnel = [
          if (append) ...personnel,
          ...(data['users'] as List).map((v) => Map<String, dynamic>.from(v)),
        ];
        pageToken = data['pageToken'] as String?;
      });
    } catch (e) {
      if (mounted) setState(() => error = adminError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> delegate(Map<String, dynamic> user, bool enabled) async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.request('setTourismDestinationEditor', {
        'uid': user['uid'],
        'enabled': enabled,
      });
      if (mounted) setState(() => user['delegated'] = enabled);
    } catch (e) {
      if (mounted) setState(() => error = adminError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Destinations & resorts')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'Saved destinations appear in the Tourism registration form. Inactive entries stay in history and are hidden from new selections.',
        ),
        Wrap(
          spacing: 8,
          children: [
            TextButton.icon(
              onPressed: busy ? null : load,
              icon: const Icon(Icons.refresh),
              label: const Text('Reload list'),
            ),
          ],
        ),
        if (busy) const LinearProgressIndicator(),
        if (error != null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        if (canEdit) ...[
          const SizedBox(height: 16),
          Text(
            id == null ? 'Add destination' : 'Edit destination',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: name,
            enabled: !busy,
            maxLength: 160,
            decoration: const InputDecoration(
              labelText: 'Resort / destination name',
            ),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Available for new registrations'),
            value: active,
            onChanged: busy ? null : (v) => setState(() => active = v),
          ),
          Wrap(
            spacing: 8,
            children: [
              FilledButton(
                onPressed: busy ? null : save,
                child: const Text('Save destination'),
              ),
              if (id != null)
                TextButton(
                  onPressed: busy
                      ? null
                      : () => setState(() {
                          id = null;
                          name.clear();
                          active = true;
                        }),
                  child: const Text('Cancel edit'),
                ),
            ],
          ),
        ],
        if (loaded && destinations.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text(
              'No destinations yet. Ask your Tourism admin to add resorts and usual destinations.',
            ),
          ),
        for (final destination in destinations)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(destination['name'] as String),
            subtitle: Text(
              destination['active'] == true ? 'Available' : 'Inactive',
            ),
            trailing: canEdit
                ? IconButton(
                    tooltip: 'Edit destination',
                    icon: const Icon(Icons.edit_outlined),
                    onPressed: busy
                        ? null
                        : () => setState(() {
                            id = destination['id'] as String;
                            name.text = destination['name'] as String;
                            active = destination['active'] == true;
                          }),
                  )
                : null,
          ),
        if (canDelegate)
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            title: const Text('Delegate destination management'),
            children: [
              const Text(
                'Selected personnel can add, rename and deactivate destinations. Only Tourism admins can delegate. Personnel still need approved Tourism access and app or dashboard access.',
              ),
              TextButton(
                onPressed: busy ? null : loadPersonnel,
                child: const Text('Load Tourism personnel'),
              ),
              for (final user in personnel)
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    (user['username'] as String?)?.isNotEmpty == true
                        ? user['username'] as String
                        : user['email'] as String,
                  ),
                  subtitle: Text(
                    '${user['email']}${user['eligible'] == true ? '' : ' · Tourism access required'}',
                  ),
                  value: user['delegated'] == true,
                  onChanged:
                      busy ||
                          user['eligible'] != true && user['delegated'] != true
                      ? null
                      : (v) => delegate(user, v),
                ),
              if (pageToken != null)
                TextButton(
                  onPressed: busy ? null : () => loadPersonnel(append: true),
                  child: const Text('Load more personnel'),
                ),
            ],
          ),
      ],
    ),
  );
}

class TourismDestinationField extends StatefulWidget {
  const TourismDestinationField({
    super.key,
    required this.controller,
    this.enabled = true,
    this.request = requestAdmin,
  });
  final TextEditingController controller;
  final bool enabled;
  final AdminRequest request;
  @override
  State<TourismDestinationField> createState() =>
      _TourismDestinationFieldState();
}

class _TourismDestinationFieldState extends State<TourismDestinationField> {
  List<String> names = [];
  bool loading = false;
  String? error;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await widget.request('getTourismDestinations', {});
      if (mounted) {
        setState(
          () => names =
              (data['destinations'] as List)
                  .where((d) => d['active'] == true)
                  .map((d) => d['name'] as String)
                  .toList()
                ..sort(),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Saved list unavailable. You can still enter a destination.',
        );
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> choose() async {
    final chosen = await showDialog<String>(
      context: context,
      builder: (context) => _DestinationPicker(names: names),
    );
    if (mounted && chosen != null) widget.controller.text = chosen;
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      TextFormField(
        controller: widget.controller,
        enabled: widget.enabled,
        maxLength: 500,
        textCapitalization: TextCapitalization.words,
        decoration: InputDecoration(
          labelText: 'Destination / intended resort',
          border: const OutlineInputBorder(),
          helperText:
              'Choose from the saved list or enter another destination.',
          helperMaxLines: 3,
          suffixIcon: IconButton(
            tooltip: 'Choose saved destination',
            onPressed: widget.enabled && names.isNotEmpty && !loading
                ? choose
                : null,
            icon: const Icon(Icons.list_alt),
          ),
        ),
        validator: (v) => v == null || v.trim().isEmpty
            ? 'Enter the destination or resort'
            : null,
      ),
      if (loading) const LinearProgressIndicator(),
      if (error != null)
        Text(error!, style: Theme.of(context).textTheme.bodySmall),
      Wrap(
        spacing: 8,
        children: [
          TextButton(
            onPressed: !widget.enabled || loading ? null : load,
            child: const Text('Refresh destinations'),
          ),
          TextButton(
            onPressed: !widget.enabled
                ? null
                : () async {
                    await Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            TourismDestinationsPage(request: widget.request),
                      ),
                    );
                    if (mounted) load();
                  },
            child: const Text('Destinations & resorts'),
          ),
        ],
      ),
    ],
  );
}

class _DestinationPicker extends StatefulWidget {
  const _DestinationPicker({required this.names});
  final List<String> names;
  @override
  State<_DestinationPicker> createState() => _DestinationPickerState();
}

class _DestinationPickerState extends State<_DestinationPicker> {
  String search = '';
  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Choose destination'),
    content: SizedBox(
      width: 400,
      height: 360,
      child: Column(
        children: [
          TextField(
            autofocus: true,
            decoration: const InputDecoration(labelText: 'Search destinations'),
            onChanged: (v) => setState(() => search = v.toLowerCase()),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView(
              children: [
                for (final name in widget.names.where(
                  (n) => n.toLowerCase().contains(search),
                ))
                  ListTile(
                    title: Text(name),
                    onTap: () => Navigator.pop(context, name),
                  ),
              ],
            ),
          ),
        ],
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
    ],
  );
}
