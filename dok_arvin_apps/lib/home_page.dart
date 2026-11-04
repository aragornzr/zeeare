import 'dart:async';
import 'access_gate.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'app_theme.dart';
import 'rhu_page.dart';
import 'tourism_page.dart';
import 'attendance_page.dart';
import 'settings_page.dart';
import 'admin_console.dart';
import 'department_updates.dart';
import 'admin_api.dart';

class _HomeContent extends StatefulWidget {
  const _HomeContent({
    super.key,
    this.auth,
    required this.claims,
    required this.uid,
    required this.refreshAccess,
    required this.request,
  });
  final FirebaseAuth? auth;
  final Map<String, dynamic> claims;
  final String uid;
  final VoidCallback refreshAccess;
  final AdminRequest request;

  @override
  State<_HomeContent> createState() => _HomeContentState();
}

class _HomeContentState extends State<_HomeContent> {
  FirebaseAuth? get auth => widget.auth;
  Map<String, dynamic> get claims => widget.claims;
  String get uid => widget.uid;
  VoidCallback get refreshAccess => widget.refreshAccess;
  AdminRequest get request => widget.request;
  bool _showWelcome = true;
  Timer? _welcomeTimer;

  @override
  void initState() {
    super.initState();
    _welcomeTimer = Timer(const Duration(seconds: 20), () {
      if (mounted) setState(() => _showWelcome = false);
    });
  }

  @override
  void dispose() {
    _welcomeTimer?.cancel();
    super.dispose();
  }

  bool get isSuper => uid == superAdminUid && claims['role'] == 'superadmin';
  bool get manager => isSuper || claims['role'] == 'admin';
  String get roleLabel => isSuper
      ? 'Super Admin'
      : manager
      ? 'Department Admin'
      : 'Regular user';

  static const _services = [
    (
      name: 'RHU',
      detail: 'Patient care & pharmacy',
      icon: Icons.health_and_safety_outlined,
      color: AppColors.teal,
      ready: true,
    ),
    (
      name: 'Tourism',
      detail: 'Visitors & local tourism',
      icon: Icons.explore_outlined,
      color: Color(0xFF4276AA),
      ready: true,
    ),
    (
      name: 'Attendance',
      detail: 'Daily attendance records',
      icon: Icons.fact_check_outlined,
      color: Color(0xFF7762AE),
      ready: true,
    ),
    (
      name: 'MSWD',
      detail: 'Community & social care',
      icon: Icons.volunteer_activism_outlined,
      color: Color(0xFFBD6A55),
      ready: false,
    ),
    (
      name: 'Treasurer',
      detail: 'Municipal finance',
      icon: Icons.account_balance_outlined,
      color: AppColors.amber,
      ready: false,
    ),
    (
      name: 'HRMO',
      detail: 'People & personnel',
      icon: Icons.groups_outlined,
      color: Color(0xFF5472A0),
      ready: false,
    ),
    (
      name: 'MAO',
      detail: 'Agriculture services',
      icon: Icons.eco_outlined,
      color: Color(0xFF4D8354),
      ready: false,
    ),
    (
      name: 'Engineering',
      detail: 'Projects & infrastructure',
      icon: Icons.engineering_outlined,
      color: Color(0xFF9A7041),
      ready: false,
    ),
  ];

  void _openSettings(BuildContext context) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => SettingsPage(auth: auth)));
  }

  void _open(BuildContext context, String name) {
    final page = switch (name) {
      'RHU' => const RhuPage(),
      'Tourism' => const TourismPage(),
      'Attendance' => AttendancePage(auth: auth),
      _ => null,
    };
    if (page != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) =>
              AccessGate(section: name.toLowerCase(), auth: auth, child: page),
        ),
      );
    } else {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text('$name is coming soon.')));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.canvas,
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1080),
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Row(
                children: [
                  Tooltip(
                    message: 'Open Settings',
                    child: Semantics(
                      button: true,
                      label: 'San Antonio Municipal Services settings',
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => _openSettings(context),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.teal,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Icon(
                            Icons.location_city_rounded,
                            color: Colors.white,
                            size: 26,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'SAN ANTONIO',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 17,
                            letterSpacing: 1,
                            color: AppColors.navy,
                          ),
                        ),
                        const Text(
                          'Municipal services',
                          style: TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          roleLabel,
                          style: const TextStyle(
                            color: AppColors.teal,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (auth?.currentUser?.displayName != null)
                          Text(
                            auth!.currentUser!.displayName!,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.muted,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () => _openSettings(context),
                  icon: const Icon(Icons.settings_outlined, size: 18),
                  label: const Text('Settings / Sign out'),
                ),
              ),
              const SizedBox(height: 12),
              DepartmentUpdates(
                key: ValueKey('updates-$uid'),
                uid: uid,
                claims: claims,
                request: request,
              ),
              const SizedBox(height: 18),
              if (manager)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: FilledButton.icon(
                    icon: const Icon(Icons.admin_panel_settings_outlined),
                    label: Text(
                      isSuper ? 'Super Admin tools' : 'Department Admin tools',
                    ),
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => AccessGate(
                          section: 'apps',
                          auth: auth,
                          child: const SizedBox.shrink(),
                          authorizedBuilder:
                              (context, currentClaims, currentUid, refresh) =>
                                  AdminConsole(
                                    uid: currentUid,
                                    claims: currentClaims,
                                    request: request,
                                  ),
                        ),
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 28),
              const Text(
                'Choose a service',
                style: TextStyle(
                  fontSize: 21,
                  fontWeight: FontWeight.w800,
                  color: AppColors.navy,
                ),
              ),
              const SizedBox(height: 5),
              const Text(
                'Connect with the work that matters.',
                style: TextStyle(color: AppColors.muted, fontSize: 13),
              ),
              const SizedBox(height: 18),
              if (!_services.any(
                (service) => hasSectionAccess(
                  claims,
                  service.name.toLowerCase(),
                  uid: uid,
                ),
              ))
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Text(
                    'No service menus have been assigned to your account yet. Ask your administrator to assign your services.',
                  ),
                ),
              TextButton.icon(
                onPressed: refreshAccess,
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh menu access'),
              ),
              LayoutBuilder(
                builder: (context, constraints) {
                  final columns = constraints.maxWidth > 850
                      ? 4
                      : constraints.maxWidth > 550
                      ? 3
                      : constraints.maxWidth < 310
                      ? 1
                      : 2;
                  final width =
                      (constraints.maxWidth - (columns - 1) * 14) / columns;
                  return Wrap(
                    spacing: 14,
                    runSpacing: 14,
                    children: [
                      for (final service in _services.where(
                        (service) => hasSectionAccess(
                          claims,
                          service.name.toLowerCase(),
                          uid: uid,
                        ),
                      ))
                        SizedBox(
                          width: width,
                          child: ServiceCard(
                            title: service.name,
                            subtitle: service.detail,
                            icon: service.icon,
                            color: service.color,
                            badge: service.ready
                                ? 'Open service'
                                : 'Coming soon',
                            onTap: () => _open(context, service.name),
                          ),
                        ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 26),
              if (_showWelcome) ...[
                const SectionHero(
                  eyebrow: 'Your daily workspace',
                  title: 'Good service.\nStronger community.',
                  description:
                      'Your municipal tools, together in one place. Choose a service to get started.',
                  icon: Icons.waving_hand_outlined,
                ),
                const SizedBox(height: 18),
              ],
              const Text(
                'Built for a better San Antonio',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class HomePage extends StatelessWidget {
  const HomePage({super.key, this.auth, this.request = requestAdmin});
  final FirebaseAuth? auth;
  final AdminRequest request;
  @override
  Widget build(BuildContext context) => AccessGate(
    section: 'apps',
    auth: auth,
    child: const SizedBox.shrink(),
    authorizedBuilder: (context, claims, uid, refresh) => _HomeContent(
      key: ValueKey(uid),
      auth: auth,
      claims: claims,
      uid: uid,
      refreshAccess: refresh,
      request: request,
    ),
  );
}
