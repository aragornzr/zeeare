import 'dart:async';
import 'package:flutter/material.dart';
import 'access_gate.dart';
import 'admin_api.dart';
import 'communication_reads.dart';

class DepartmentUpdates extends StatefulWidget {
  const DepartmentUpdates({
    super.key,
    required this.uid,
    required this.claims,
    this.request = requestAdmin,
  });
  final String uid;
  final Map<String, dynamic> claims;
  final AdminRequest request;
  @override
  State<DepartmentUpdates> createState() => _DepartmentUpdatesState();
}

class _DepartmentUpdatesState extends State<DepartmentUpdates> {
  String? department, recipient, cursor, error;
  String kind = 'announcements';
  bool loading = false, sending = false, expanded = false;
  bool _readsReady = false;
  int _scanGeneration = 0;
  Set<String> _readIds = {};
  final Map<String, List<Map<String, dynamic>>> _latest = {};
  final _reads = const CommunicationReads();

  String? _readKey(String dept, String feed, Map<String, dynamic> item) =>
      item['id'] is String ? '$dept/$feed/${item['id']}' : null;
  bool _unread(String dept, String feed, Map<String, dynamic> item) =>
      feed != 'sent' &&
      item['authorUid'] != widget.uid &&
      !_readIds.contains(_readKey(dept, feed, item));
  bool _hasUnread(String dept, String feed) =>
      (_latest['$dept/$feed'] ?? []).any((item) => _unread(dept, feed, item));
  bool get _anyUnread => departments.any(
    (dept) => _hasUnread(dept, 'announcements') || _hasUnread(dept, 'inboxes'),
  );

  Future<void> _initializeReads() async {
    final owner = widget.uid;
    try {
      final ids = await _reads.read(owner);
      if (!mounted || owner != widget.uid) return;
      _readIds = ids;
    } catch (_) {
      // Reading remains available when the device vault is unavailable.
    }
    if (!mounted || owner != widget.uid) return;
    setState(() => _readsReady = true);
    unawaited(load());
    unawaited(_scan());
  }

  Future<void> _scan() async {
    final version = ++_scanGeneration;
    final owner = widget.uid;
    final results = await Future.wait([
      for (final dept in departments)
        for (final feed in ['announcements', 'inboxes'])
          if (dept != department || feed != kind)
            () async {
              try {
                final data = await widget.request('listDepartmentUpdates', {
                  'department': dept,
                  'kind': feed,
                });
                return MapEntry(
                  '$dept/$feed',
                  (data['items'] as List)
                      .map((v) => Map<String, dynamic>.from(v))
                      .toList(),
                );
              } catch (_) {
                return null;
              }
            }(),
    ]);
    if (!mounted || owner != widget.uid || version != _scanGeneration) return;
    setState(() {
      for (final result in results) {
        if (result != null) _latest[result.key] = result.value;
      }
    });
  }

  Future<void> _markRead() async {
    if (loading || sending || !_readsReady || department == null) return;
    final owner = widget.uid;
    final next = {..._readIds};
    for (final item in items) {
      final key = _readKey(department!, kind, item);
      if (key != null) next.add(key);
    }
    setState(() => sending = true);
    try {
      await _reads.save(owner, next);
      if (!mounted || owner != widget.uid) return;
      setState(() {
        _readIds = next;
        expanded = false;
      });
    } catch (_) {
      if (mounted && owner == widget.uid) {
        setState(() => error = 'Could not save read status. Please try again.');
      }
    } finally {
      if (mounted && owner == widget.uid) setState(() => sending = false);
    }
  }

  int generation = 0;
  List<Map<String, dynamic>> items = [], users = [];
  final text = TextEditingController();
  Timer? timer;
  bool get manager =>
      widget.uid == superAdminUid && widget.claims['role'] == 'superadmin' ||
      widget.claims['role'] == 'admin';
  List<String> get departments =>
      widget.uid == superAdminUid && widget.claims['role'] == 'superadmin'
      ? departmentNames.keys.toList()
      : departmentNames.keys
            .where(
              (key) =>
                  (widget.claims['departments'] as List? ?? []).contains(key),
            )
            .toList();

  @override
  void initState() {
    super.initState();
    department = departments.firstOrNull;
    _initializeReads();
    timer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (!loading && !sending) {
        load();
        _scan();
      }
    });
  }

  @override
  void didUpdateWidget(covariant DepartmentUpdates oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.uid != widget.uid ||
        oldWidget.claims.toString() != widget.claims.toString()) {
      generation++;
      _scanGeneration++;
      _readIds = {};
      _latest.clear();
      _readsReady = false;
      expanded = false;
      items = [];
      users = [];
      recipient = null;
      text.clear();
      department = departments.firstOrNull;
      kind = 'announcements';
      _initializeReads();
    }
  }

  Future<void> load({bool append = false}) async {
    if (department == null) return;
    final epoch = ++generation;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await widget.request('listDepartmentUpdates', {
        'department': department,
        'kind': kind,
        if (append && cursor != null) 'cursor': cursor,
      });
      if (!mounted || epoch != generation) return;
      setState(() {
        items = [
          if (append) ...items,
          ...(data['items'] as List).map((v) => Map<String, dynamic>.from(v)),
        ];
        cursor = data['cursor'] as String?;
        if (kind != 'sent') _latest['$department/$kind'] = items;
      });
    } catch (e) {
      if (mounted && epoch == generation) {
        setState(() {
          items = [];
          cursor = null;
          error = adminError(e);
        });
      }
    } finally {
      if (mounted && epoch == generation) setState(() => loading = false);
    }
  }

  Future<void> recipients() async {
    final epoch = generation;
    try {
      final result = <Map<String, dynamic>>[];
      String? page;
      do {
        final data = await widget.request('listDashboardUsers', {
          'pageToken': ?page,
        });
        result.addAll(
          (data['users'] as List).map((v) => Map<String, dynamic>.from(v)),
        );
        page = data['pageToken'] as String?;
      } while (page != null);
      if (!mounted || epoch != generation) return;
      setState(
        () => users = result
            .where(
              (u) =>
                  (u['departments'] as List).contains(department) &&
                  u['disabled'] != true,
            )
            .toList(),
      );
    } catch (e) {
      if (mounted && epoch == generation) setState(() => error = adminError(e));
    }
  }

  Future<void> send() async {
    if (sending || text.text.trim().isEmpty || department == null) return;
    final epoch = generation;
    setState(() {
      sending = true;
      error = null;
    });
    try {
      await widget.request('publishDepartmentUpdate', {
        'department': department,
        'text': text.text.trim(),
        if (recipient != null) 'recipientUid': recipient,
      });
      if (!mounted || epoch != generation) return;
      text.clear();
      setState(() => kind = recipient == null ? 'announcements' : 'sent');
      await load();
    } catch (e) {
      if (mounted && epoch == generation) setState(() => error = adminError(e));
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  void dispose() {
    generation++;
    _scanGeneration++;
    timer?.cancel();
    text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (departments.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          child: ListTile(
            leading: Icon(
              _anyUnread
                  ? Icons.mark_email_unread_outlined
                  : Icons.forum_outlined,
            ),
            title: const Text(
              'Announcement/Messages',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            subtitle: Text(
              _anyUnread
                  ? 'Unread updates available'
                  : 'Open department updates',
            ),
            trailing: Icon(expanded ? Icons.expand_less : Icons.expand_more),
            onTap: () => setState(() => expanded = !expanded),
          ),
        ),
        if (expanded) _expandedContent(context),
      ],
    );
  }

  Widget _expandedContent(BuildContext context) {
    if (departments.isEmpty) return const SizedBox.shrink();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Department announcements & messages',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            const Text(
              'Announcements are visible to your department. Personal messages are visible only to the sender and recipient.',
            ),
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              isExpanded: true,
              initialValue: department,
              key: ValueKey('dept-$department'),
              decoration: const InputDecoration(labelText: 'Department'),
              items: departments
                  .map(
                    (d) => DropdownMenuItem(
                      value: d,
                      child: Text(
                        '${departmentNames[d]}${_hasUnread(d, 'announcements') || _hasUnread(d, 'inboxes') ? ' • New' : ''}',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  )
                  .toList(),
              onChanged: sending
                  ? null
                  : (d) {
                      setState(() {
                        department = d;
                        users = [];
                        recipient = null;
                        items = [];
                      });
                      load();
                    },
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final entry in {
                  'announcements': 'Announcements',
                  'inboxes': 'My inbox',
                  if (manager) 'sent': 'Sent messages',
                }.entries)
                  ChoiceChip(
                    label: Text(
                      '${entry.value}${_hasUnread(department!, entry.key) ? ' • New' : ''}',
                    ),
                    selected: kind == entry.key,
                    onSelected: loading || sending
                        ? null
                        : (_) {
                            setState(() => kind = entry.key);
                            load();
                          },
                  ),
              ],
            ),
            if (manager)
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                title: const Text('Write an announcement or message'),
                children: [
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    key: ValueKey(
                      'recipient-$department-$recipient-${users.length}',
                    ),
                    initialValue: recipient ?? '',
                    decoration: const InputDecoration(labelText: 'Audience'),
                    items: [
                      const DropdownMenuItem(
                        value: '',
                        child: Text(
                          'Everyone in this department',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      for (final u in users)
                        DropdownMenuItem(
                          value: u['uid'] as String,
                          child: Text(
                            '${u['username']} · ${u['email']}',
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                    onChanged: sending
                        ? null
                        : (value) => setState(
                            () => recipient = value == '' ? null : value,
                          ),
                  ),
                  TextButton(
                    onPressed: sending ? null : recipients,
                    child: const Text('Load department recipients'),
                  ),
                  TextField(
                    controller: text,
                    maxLength: 3000,
                    maxLines: 4,
                    enabled: !sending,
                    decoration: const InputDecoration(
                      alignLabelWithHint: true,
                      labelText: 'Announcement or message',
                      hintText: 'Write your update here…',
                    ),
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton(
                      onPressed: sending ? null : send,
                      child: Text(
                        sending
                            ? 'Sending…'
                            : recipient == null
                            ? 'Publish announcement'
                            : 'Send message',
                      ),
                    ),
                  ),
                ],
              ),
            if (error != null)
              Text(
                error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            if (loading) const LinearProgressIndicator(),
            if (!loading && items.isEmpty && error == null)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text('No updates yet.'),
              ),
            if (items.isNotEmpty)
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 240),
                child: ListView(
                  shrinkWrap: true,
                  primary: false,
                  children: [
                    for (final item in items)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_unread(department!, kind, item))
                              const Text(
                                'Unread',
                                style: TextStyle(fontWeight: FontWeight.w700),
                              ),
                            Text(
                              item['text'] as String,
                              style: const TextStyle(fontSize: 15),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${item['authorName']} · ${philippineTime(item['createdAt'])}${kind == 'sent' ? ' · To ${item['recipientName']}' : ''}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                            const Divider(),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (kind != 'sent' && items.isNotEmpty)
                  TextButton.icon(
                    onPressed: loading || sending || !_readsReady
                        ? null
                        : _markRead,
                    icon: const Icon(Icons.done_all),
                    label: const Text('Mark as read & close'),
                  ),
                TextButton.icon(
                  onPressed: loading || sending ? null : () => load(),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Refresh updates'),
                ),
                if (cursor != null)
                  TextButton(
                    onPressed: loading || sending
                        ? null
                        : () => load(append: true),
                    child: const Text('Load older'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
