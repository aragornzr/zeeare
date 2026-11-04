import 'dart:convert';
import 'package:flutter/material.dart';
import 'access_gate.dart';
import 'admin_api.dart';
import 'intro_admin_page.dart';
import 'tourism_destinations.dart';

class AdminConsole extends StatefulWidget {
  const AdminConsole({
    super.key,
    required this.uid,
    required this.claims,
    this.request = requestAdmin,
  });
  final String uid;
  final Map<String, dynamic> claims;
  final AdminRequest request;
  @override
  State<AdminConsole> createState() => _AdminConsoleState();
}

class _AdminConsoleState extends State<AdminConsole> {
  List<Map<String, dynamic>> users = [];
  String? cursor, error;
  bool busy = false;
  int generation = 0;
  bool get isSuper =>
      widget.uid == superAdminUid && widget.claims['role'] == 'superadmin';
  bool get manager => isSuper || widget.claims['role'] == 'admin';
  bool get tourism =>
      isSuper || hasSectionAccess(widget.claims, 'tourism', uid: widget.uid);
  @override
  void initState() {
    super.initState();
    if (manager) load();
  }

  @override
  void didUpdateWidget(covariant AdminConsole old) {
    super.didUpdateWidget(old);
    if (old.uid != widget.uid ||
        old.claims.toString() != widget.claims.toString()) {
      generation++;
      users = [];
      cursor = null;
      if (manager) load();
    }
  }

  Future<void> load({bool append = false}) async {
    final epoch = ++generation;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data = await widget.request('listDashboardUsers', {
        if (append && cursor != null) 'pageToken': cursor,
      });
      if (!mounted || epoch != generation) return;
      setState(() {
        users = [
          if (append) ...users,
          ...(data['users'] as List).map((u) => Map<String, dynamic>.from(u)),
        ];
        cursor = data['pageToken'] as String?;
      });
    } catch (e) {
      if (mounted && epoch == generation) setState(() => error = adminError(e));
    } finally {
      if (mounted && epoch == generation) setState(() => busy = false);
    }
  }

  Future<void> edit([Map<String, dynamic>? user]) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => AdminUserEditor(
          user: user,
          actorUid: widget.uid,
          claims: widget.claims,
          request: widget.request,
        ),
      ),
    );
    if (saved == true && mounted) load();
  }

  void history(Map<String, dynamic> user) => Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => AccountHistoryPage(user: user, request: widget.request),
    ),
  );
  @override
  void dispose() {
    generation++;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(isSuper ? 'Super Admin tools' : 'Department Admin tools'),
    ),
    body: !manager
        ? const Center(child: Text('Administrator access is required.'))
        : RefreshIndicator(
            onRefresh: () => load(),
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  isSuper
                      ? 'Manage all departments and accounts'
                      : 'Manage regular users in your assigned departments',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    FilledButton.icon(
                      onPressed: busy ? null : () => edit(),
                      icon: const Icon(Icons.person_add),
                      label: const Text('Add user'),
                    ),
                    OutlinedButton(
                      onPressed: () => history({
                        'uid': widget.uid,
                        'username': 'My activity',
                      }),
                      child: const Text('My activity history'),
                    ),
                    if (isSuper)
                      OutlinedButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                IntroAdminPage(request: widget.request),
                          ),
                        ),
                        child: const Text('Intro pages & global notices'),
                      ),
                    if (tourism)
                      OutlinedButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => TourismDestinationsPage(
                              request: widget.request,
                            ),
                          ),
                        ),
                        child: const Text('Destinations & resorts'),
                      ),
                    if (tourism)
                      OutlinedButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                TourismAdminPage(request: widget.request),
                          ),
                        ),
                        child: const Text('Tourism fees & reports'),
                      ),
                  ],
                ),
                if (busy) const LinearProgressIndicator(),
                if (error != null)
                  Text(
                    error!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                for (final user in users)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${user['username']} · ${user['role'] == 'admin'
                                ? 'Department Admin'
                                : user['role'] == 'superadmin'
                                ? 'Super Admin'
                                : 'Regular user'}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          Text(
                            '${user['email']}\n${(user['departments'] as List).map((d) => departmentNames[d] ?? d).join(', ')} · ${user['disabled'] == true
                                ? 'Disabled'
                                : user['approved'] == true
                                ? 'Approved'
                                : 'Pending approval'}',
                          ),
                          Wrap(
                            spacing: 10,
                            children: [
                              TextButton(
                                onPressed: () => edit(user),
                                child: const Text('Edit account'),
                              ),
                              TextButton(
                                onPressed: () => history(user),
                                child: const Text('History & device logins'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                if (!busy && users.isEmpty && error == null)
                  const Text('No eligible accounts found.'),
                if (cursor != null)
                  TextButton(
                    onPressed: busy ? null : () => load(append: true),
                    child: const Text('Load more users'),
                  ),
                TextButton(
                  onPressed: busy ? null : () => load(),
                  child: const Text('Refresh users'),
                ),
              ],
            ),
          ),
  );
}

class AdminUserEditor extends StatefulWidget {
  const AdminUserEditor({
    super.key,
    this.user,
    required this.actorUid,
    required this.claims,
    required this.request,
  });
  final Map<String, dynamic>? user;
  final String actorUid;
  final Map<String, dynamic> claims;
  final AdminRequest request;
  @override
  State<AdminUserEditor> createState() => _AdminUserEditorState();
}

class _AdminUserEditorState extends State<AdminUserEditor> {
  final form = GlobalKey<FormState>();
  late final TextEditingController name, email, password;
  late String role;
  late Set<String> departments;
  late Map<String, bool> access;
  late bool approved, disabled;
  bool busy = false;
  String? error;
  bool get isSuper =>
      widget.actorUid == superAdminUid && widget.claims['role'] == 'superadmin';
  bool get protected => widget.user?['protected'] == true;
  List<String> get allowedDepartments => isSuper
      ? departmentNames.keys.toList()
      : List<String>.from(widget.claims['departments'] as List? ?? []);
  @override
  void initState() {
    super.initState();
    final u = widget.user;
    name = TextEditingController(text: u?['username'] as String? ?? '');
    email = TextEditingController(text: u?['email'] as String? ?? '');
    password = TextEditingController();
    role = u?['role'] as String? ?? 'regular';
    departments = Set<String>.from(u?['departments'] as List? ?? []);
    access = {
      for (final key in accessNames.keys)
        key: (u?['assignedAccess'] as Map?)?[key] == true,
    };
    approved = u?['approved'] == true;
    disabled = u?['disabled'] == true;
  }

  bool canGrant(String section) {
    if (isSuper) return true;
    return hasSectionAccess(widget.claims, section, uid: widget.actorUid);
  }

  String? sectionDepartment(String section) =>
      ['patients', 'pharmacy'].contains(section)
      ? 'rhu'
      : departmentNames.containsKey(section)
      ? section
      : null;
  void normalize() {
    if (role == 'regular' && departments.length > 1) {
      departments = {departments.first};
    }
    for (final section in access.keys) {
      final d = sectionDepartment(section);
      if (d != null && !departments.contains(d) || !canGrant(section)) {
        access[section] = false;
      }
    }
  }

  Future<void> save() async {
    if (busy || !form.currentState!.validate()) return;
    if (!protected && (approved || role == 'admin') && departments.isEmpty) {
      setState(() => error = 'Assign a department first.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.request(
        widget.user == null ? 'createDashboardUser' : 'updateDashboardUser',
        {
          'username': name.text.trim(),
          'email': email.text.trim(),
          'role': role,
          'approved': approved,
          'disabled': disabled,
          'departments': departments.toList(),
          'access': access,
          if (password.text.isNotEmpty) 'password': password.text,
          if (widget.user != null) 'uid': widget.user!['uid'],
        },
      );
      password.clear();
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      password.clear();
      if (mounted) setState(() => error = adminError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    name.dispose();
    email.dispose();
    password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.user == null ? 'Add user' : 'Edit account'),
    ),
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextFormField(
            controller: name,
            enabled: !busy,
            maxLength: 80,
            decoration: const InputDecoration(labelText: 'Username'),
            validator: (v) =>
                v == null || v.trim().isEmpty ? 'Enter a username' : null,
          ),
          TextFormField(
            controller: email,
            enabled: !busy,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Sign-in email'),
            validator: (v) =>
                v == null ||
                    !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim())
                ? 'Enter a valid email'
                : null,
          ),
          TextFormField(
            controller: password,
            enabled: !busy,
            obscureText: true,
            maxLength: 128,
            decoration: InputDecoration(
              labelText: widget.user == null
                  ? 'Password'
                  : 'New password (leave blank to keep current)',
            ),
            validator: (v) =>
                ((widget.user == null || v!.isNotEmpty) && (v?.length ?? 0) < 8)
                ? 'Use at least 8 characters'
                : null,
          ),
          if (isSuper)
            DropdownButtonFormField<String>(
              initialValue: role,
              decoration: const InputDecoration(labelText: 'Role'),
              items: [
                const DropdownMenuItem(
                  value: 'regular',
                  child: Text('Regular user'),
                ),
                const DropdownMenuItem(
                  value: 'admin',
                  child: Text('Department Admin'),
                ),
                if (protected)
                  const DropdownMenuItem(
                    value: 'superadmin',
                    child: Text('Super Admin (protected)'),
                  ),
              ],
              onChanged: busy || protected
                  ? null
                  : (value) => setState(() {
                      role = value!;
                      normalize();
                    }),
            ),
          const SizedBox(height: 16),
          const Text(
            'Assigned departments',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          for (final d in allowedDepartments)
            CheckboxListTile(
              title: Text(departmentNames[d]!),
              value: departments.contains(d),
              onChanged: busy || protected || !isSuper && widget.user != null
                  ? null
                  : (value) => setState(() {
                      if (value == true) {
                        if (role == 'regular') departments.clear();
                        departments.add(d);
                      } else {
                        departments.remove(d);
                      }
                      normalize();
                    }),
            ),
          SwitchListTile(
            title: const Text('Approve account access'),
            value: approved,
            onChanged: busy || protected
                ? null
                : (v) => setState(() => approved = v),
          ),
          if (isSuper && role == 'admin')
            OutlinedButton(
              onPressed: busy || departments.isEmpty
                  ? null
                  : () => setState(() {
                      approved = true;
                      access = {
                        for (final s in accessNames.keys)
                          s:
                              ['apps', 'dashboard'].contains(s) ||
                              departments.contains(sectionDepartment(s)),
                      };
                    }),
              child: const Text('Apply approved department admin access'),
            ),
          const Text(
            'Allowed access',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          for (final section in accessNames.keys)
            CheckboxListTile(
              title: Text(accessNames[section]!),
              value: access[section],
              onChanged:
                  busy ||
                      protected ||
                      !canGrant(section) ||
                      sectionDepartment(section) != null &&
                          !departments.contains(sectionDepartment(section))
                  ? null
                  : (v) => setState(() => access[section] = v!),
            ),
          SwitchListTile(
            title: const Text('Disable account'),
            value: disabled,
            onChanged: busy || protected
                ? null
                : (v) => setState(() => disabled = v),
          ),
          if (error != null)
            Text(
              error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          FilledButton(
            onPressed: busy ? null : save,
            child: Text(busy ? 'Saving…' : 'Save account'),
          ),
        ],
      ),
    ),
  );
}

class AccountHistoryPage extends StatefulWidget {
  const AccountHistoryPage({
    super.key,
    required this.user,
    required this.request,
  });
  final Map<String, dynamic> user;
  final AdminRequest request;
  @override
  State<AccountHistoryPage> createState() => _AccountHistoryPageState();
}

class _AccountHistoryPageState extends State<AccountHistoryPage> {
  List<Map<String, dynamic>> events = [];
  String? cursor, error;
  bool busy = false;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load({bool append = false}) async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await widget.request('listAccountHistory', {
        'uid': widget.user['uid'],
        if (append && cursor != null) 'cursor': cursor,
      });
      if (mounted) {
        setState(() {
          events = [
            if (append) ...events,
            ...(result['events'] as List).map(
              (v) => Map<String, dynamic>.from(v),
            ),
          ];
          cursor = result['cursor'] as String?;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          events = [];
          error = adminError(e);
        });
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Account history & logins')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('${widget.user['username'] ?? ''}\n${widget.user['email'] ?? ''}'),
        const Text(
          'Philippine time. Device details are client-reported; older clients may not report them.',
        ),
        if (busy) const LinearProgressIndicator(),
        if (error != null) Text(error!),
        for (final event in events)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${const {'login': 'Signed in', 'registered': 'Registered', 'account_created': 'Account created', 'account_updated': 'Account changed', 'tourism_destination_changed': 'Tourism destination changed', 'tourism_destination_delegated': 'Destination management delegation', 'tourism_fee_changed': 'Tourism fee changed', 'attendance_corrected': 'Attendance corrected', 'intro_page_updated': 'Intro page updated', 'intro_notice_published': 'Intro notice published', 'department_message_sent': 'Department message sent', 'department_announcement_published': 'Department announcement published'}[event['type']] ?? event['type']} · ${philippineTime(event['occurredAt'])}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '${event['actorEmail'] ?? event['actorUid']} · ${event['status']}',
                  ),
                  if (event['type'] == 'login')
                    Text(
                      event['device'] is Map
                          ? (event['device'] as Map).values
                                .where((v) => v.toString().isNotEmpty)
                                .join(' · ')
                          : 'Device not reported',
                    ),
                  for (final change in event['changes'] as List? ?? [])
                    Text(
                      change['field'] == 'password'
                          ? 'Password changed (value never stored)'
                          : '${change['field']}: ${jsonEncode(change['before'])} → ${jsonEncode(change['after'])}',
                    ),
                ],
              ),
            ),
          ),
        if (!busy && events.isEmpty && error == null)
          const Text('No accessible history on this page.'),
        TextButton(
          onPressed: busy ? null : () => load(),
          child: const Text('Refresh history'),
        ),
        if (cursor != null)
          TextButton(
            onPressed: busy ? null : () => load(append: true),
            child: const Text('Load older records'),
          ),
      ],
    ),
  );
}

class TourismAdminPage extends StatefulWidget {
  const TourismAdminPage({super.key, required this.request});
  final AdminRequest request;
  @override
  State<TourismAdminPage> createState() => _TourismAdminPageState();
}

class _TourismAdminPageState extends State<TourismAdminPage> {
  final rate = TextEditingController(), search = TextEditingController();
  String? error, rateStatus;
  bool busy = false;
  int generation = 0;
  String period = 'day';
  DateTime selected = DateTime.now().toUtc().add(const Duration(hours: 8));
  List<Map<String, dynamic>> records = [];
  @override
  void initState() {
    super.initState();
    loadFee();
    report();
  }

  String day(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  Future<void> loadFee() async {
    try {
      final data = await widget.request('getTourismFee', {});
      if (mounted) {
        setState(() {
          final value = (data['rate'] as Map?)?['feePerPersonCentavos'];
          rate.text = value == null
              ? ''
              : ((value as num) / 100).toStringAsFixed(2);
          rateStatus = value == null
              ? 'No fee declared'
              : 'Current fee: ₱${rate.text}';
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = adminError(e));
    }
  }

  Future<void> saveFee() async {
    final text = rate.text.trim();
    if (!RegExp(r'^\d+(\.\d{1,2})?$').hasMatch(text)) {
      setState(() => error = 'Enter pesos with up to two decimal places.');
      return;
    }
    final parts = text.split('.');
    final amount =
        int.parse(parts[0]) * 100 +
        (parts.length == 2 ? int.parse(parts[1].padRight(2, '0')) : 0);
    if (amount > 100000000) {
      setState(() => error = 'The maximum fee is ₱1,000,000.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.request('setTourismFee', {'feePerPersonCentavos': amount});
      if (mounted) {
        setState(
          () => rateStatus = 'Fee saved: ₱${(amount / 100).toStringAsFixed(2)}',
        );
      }
    } catch (e) {
      if (mounted) setState(() => error = adminError(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> report() async {
    final epoch = ++generation;
    setState(() {
      busy = true;
      error = null;
      records = [];
    });
    final date = DateTime(selected.year, selected.month, selected.day);
    final from = period == 'month'
        ? DateTime(date.year, date.month)
        : period == 'week'
        ? date.subtract(Duration(days: date.weekday - 1))
        : date;
    final to = period == 'month'
        ? DateTime(date.year, date.month + 1, 0)
        : period == 'week'
        ? from.add(const Duration(days: 6))
        : date;
    try {
      final rows = <Map<String, dynamic>>[];
      String? cursor;
      do {
        final data = await widget.request('listTourismRecords', {
          'from': day(from),
          'to': day(to),
          'cursor': ?cursor,
        });
        if (!mounted || epoch != generation) return;
        rows.addAll(
          (data['records'] as List).map((v) => Map<String, dynamic>.from(v)),
        );
        cursor = data['cursor'] as String?;
      } while (cursor != null);
      if (mounted && epoch == generation) setState(() => records = rows);
    } catch (e) {
      if (mounted && epoch == generation) setState(() => error = adminError(e));
    } finally {
      if (mounted && epoch == generation) setState(() => busy = false);
    }
  }

  num? fee(Map<String, dynamic> r) => r['feeTotalCentavos'] is num
      ? (r['feeTotalCentavos'] as num) / 100
      : r['fee'] as num?;
  @override
  void dispose() {
    generation++;
    rate.dispose();
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rows = records
        .where(
          (r) => ['name', 'company', 'destination', 'plateNumber'].any(
            (key) => (r[key] ?? '').toString().toLowerCase().contains(
              search.text.toLowerCase(),
            ),
          ),
        )
        .toList();
    final tourists = rows.fold<int>(
      0,
      (sum, r) =>
          sum + (r['touristCount'] is int ? r['touristCount'] as int : 0),
    );
    final total = rows.fold<num>(0, (sum, r) => sum + (fee(r) ?? 0));
    final days = <String, num>{};
    for (final r in rows) {
      final date = DateTime.tryParse(r['createdAt']?.toString() ?? '');
      if (date != null) {
        final key = day(date.toUtc().add(const Duration(hours: 8)));
        days[key] = (days[key] ?? 0) + (fee(r) ?? 0);
      }
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Tourism fees & reports')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Fee per tourist',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          Text(rateStatus ?? 'Loading rate…'),
          TextField(
            controller: rate,
            enabled: !busy,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Fee in pesos'),
          ),
          Wrap(
            spacing: 10,
            children: [
              FilledButton(
                onPressed: busy ? null : saveFee,
                child: const Text('Save Tourism fee'),
              ),
              TextButton(
                onPressed: busy ? null : loadFee,
                child: const Text('Refresh rate'),
              ),
            ],
          ),
          const Divider(),
          DropdownButtonFormField<String>(
            initialValue: period,
            items: [
              for (final p in ['day', 'week', 'month'])
                DropdownMenuItem(value: p, child: Text(p)),
            ],
            onChanged: busy
                ? null
                : (v) {
                    setState(() => period = v!);
                    report();
                  },
            decoration: const InputDecoration(labelText: 'Report period'),
          ),
          TextButton(
            onPressed: busy
                ? null
                : () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: selected,
                      firstDate: DateTime(2000),
                      lastDate: DateTime(2100),
                    );
                    if (date != null && mounted) {
                      setState(() => selected = date);
                      report();
                    }
                  },
            child: Text('Date: ${day(selected)} · PHT'),
          ),
          TextField(
            controller: search,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'Search visitor, group, destination or plate',
            ),
          ),
          if (busy) const LinearProgressIndicator(),
          if (error != null) Text(error!),
          Text(
            '${rows.length} registrations · $tourists recorded tourists · ₱${total.toStringAsFixed(2)} recorded fees',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          const Text(
            'Recorded fees are not verified payments. Missing legacy counts/fees are excluded from those totals.',
          ),
          if (period != 'day')
            for (final key in days.keys.toList()..sort())
              Text('$key · ₱${days[key]!.toStringAsFixed(2)}'),
          for (final r in rows)
            Card(
              child: ListTile(
                title: Text(
                  '${r['name'] ?? 'Unnamed visitor'} · ${r['company'] ?? ''}',
                ),
                subtitle: Text(
                  '${r['touristCount'] ?? 'Count not recorded'} tourists · ${fee(r) == null ? 'Fee not recorded' : '₱${fee(r)!.toStringAsFixed(2)}'}',
                ),
                onTap: () => showDialog<void>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: Text(r['name']?.toString() ?? 'Visitor details'),
                    content: SingleChildScrollView(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          for (final field in {
                            'name': 'Visitor',
                            'company': 'Company / group',
                            'destination': 'Destination',
                            'plateNumber': 'Plate number',
                            'touristCount': 'Tourist count',
                            'ownerId': 'Recorded by (account ID)',
                          }.entries)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Text(
                                '${field.value}: ${r[field.key] ?? 'Not recorded'}',
                              ),
                            ),
                          Text('Registered: ${philippineTime(r['createdAt'])}'),
                          Text(
                            'Recorded fee: ${fee(r) == null ? 'Not recorded' : '₱${fee(r)!.toStringAsFixed(2)}'}',
                          ),
                        ],
                      ),
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
          TextButton(
            onPressed: busy ? null : report,
            child: const Text('Refresh report'),
          ),
        ],
      ),
    );
  }
}
