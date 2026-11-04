import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'login_page.dart';
import 'intro_notices.dart';

const superAdminUid = 'z9I3AD77p5PWJjsP2Ae27nW7Tze2';
const sectionDepartments = <String, String>{
  'tourism': 'tourism',
  'engineering': 'engineering',
  'rhu': 'rhu',
  'patients': 'rhu',
  'pharmacy': 'rhu',
  'mswd': 'mswd',
  'treasurer': 'treasurer',
  'hrmo': 'hrmo',
  'mao': 'mao',
  'attendance': 'attendance',
};

bool hasSectionAccess(
  Map<String, dynamic> claims,
  String section, {
  String? uid,
}) {
  if (uid == superAdminUid && claims['role'] == 'superadmin') return true;
  if (claims['approved'] != true) return false;
  final departments = claims['departments'];
  final access = claims['access'];
  final department = section == 'attendance'
      ? null
      : sectionDepartments[section];
  return departments is List &&
      departments.any(sectionDepartments.containsValue) &&
      (department == null || departments.contains(department)) &&
      access is Map &&
      access[section] == true;
}

String accessDeniedReason(Map<String, dynamic> claims, String section) {
  if (claims['approved'] != true) {
    return 'Account approval is off. Ask your administrator to enable Approve account access.';
  }
  final departments = claims['departments'];
  if (departments is! List ||
      !departments.any(sectionDepartments.containsValue)) {
    return 'No department is assigned. Ask your administrator to assign your department.';
  }
  final access = claims['access'];
  if (access is! Map || access['apps'] != true) {
    return 'Mobile app access is off. Ask your administrator to enable Mobile app access.';
  }
  if (section != 'apps') {
    return 'This service is not enabled for your assigned department. Ask your administrator to review your service access.';
  }
  return 'Your account needs approval and assigned department access. Ask your department administrator to review it.';
}

/// Only mounts a feature after checking permissions issued by Firebase Auth.
/// Records on disk are left untouched when access is denied or revoked.
class AccessGate extends StatefulWidget {
  const AccessGate({
    super.key,
    required this.section,
    required this.child,
    this.auth,
    this.authorizedBuilder,
  });
  final FirebaseAuth? auth;
  FirebaseAuth get resolvedAuth => auth ?? FirebaseAuth.instance;
  final String section;
  final Widget child;
  final Widget Function(
    BuildContext,
    Map<String, dynamic>,
    String,
    VoidCallback,
  )?
  authorizedBuilder;

  @override
  State<AccessGate> createState() => _AccessGateState();
}

class _AccessGateState extends State<AccessGate> with WidgetsBindingObserver {
  StreamSubscription<User?>? _subscription;
  Timer? _timer;
  bool? _allowed;
  bool _checking = false;
  bool _backgrounded = false;
  bool _privacyCovered = false;
  int _generation = 0;
  String? _sessionUid;
  bool _signingOut = false;
  String? _refreshStatus;
  String _denialReason = 'Checking your account access…';
  Map<String, dynamic> _claims = {};
  String? _uid;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _sessionUid = widget.resolvedAuth.currentUser?.uid;
    _subscription = widget.resolvedAuth.idTokenChanges().listen((user) {
      if (!mounted) return;
      if (user?.uid != _sessionUid) {
        _generation++;
        setState(() {
          _sessionUid = user?.uid;
          _allowed = null;
          _checking = false;
          _claims = {};
          _uid = null;
        });
      }
      _check();
    });
    _timer = Timer.periodic(const Duration(minutes: 1), (_) => _check());
    _check();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      _generation++;
      setState(() {
        _backgrounded = true;
        _privacyCovered = true;
        _checking = false;
      });
    } else if (state == AppLifecycleState.resumed && _backgrounded) {
      _backgrounded = false;
      _check();
    }
  }

  Future<void> _check({bool manual = false}) async {
    if (!mounted || _checking || _signingOut || _backgrounded) return;
    final generation = ++_generation;
    if (mounted) {
      setState(() {
        _checking = true;
        if (manual) _refreshStatus = 'Checking your access…';
      });
    }
    bool allowed = false;
    Map<String, dynamic> verifiedClaims = {};
    String? verifiedUid;
    bool failed = false;
    String denialReason = 'Your session has ended. Sign out and sign in again.';
    try {
      final user = widget.resolvedAuth.currentUser;
      if (user != null) {
        final token = await user
            .getIdTokenResult(true)
            .timeout(const Duration(seconds: 20));
        final claims = token.claims ?? <String, dynamic>{};
        denialReason = accessDeniedReason(claims, widget.section);
        allowed =
            widget.resolvedAuth.currentUser?.uid == user.uid &&
            hasSectionAccess(claims, 'apps', uid: user.uid) &&
            hasSectionAccess(claims, widget.section, uid: user.uid);
        if (allowed) {
          verifiedClaims = Map<String, dynamic>.from(claims);
          verifiedUid = user.uid;
        }
      }
    } catch (_) {
      allowed = false;
      failed = true;
      denialReason =
          'Could not verify account access. Check your connection and refresh access, or sign out and sign in again.';
    }
    if (mounted && !_signingOut && generation == _generation) {
      setState(() {
        _checking = false;
        _privacyCovered = false;
        _denialReason = denialReason;
        if (manual) {
          _refreshStatus = failed
              ? 'Could not refresh access. Check your connection and try again.'
              : 'Access checked. Your account still needs approval and assigned access.';
        }
        _allowed = allowed;
        _claims = verifiedClaims;
        _uid = verifiedUid;
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _generation++;
    _subscription?.cancel();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_allowed == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_allowed == true) {
      final content =
          widget.authorizedBuilder?.call(
            context,
            _claims,
            _uid!,
            () => _check(),
          ) ??
          widget.child;
      // Keep drafts mounted while covering the app until access is rechecked.
      return Stack(
        fit: StackFit.expand,
        children: [
          Offstage(offstage: _privacyCovered, child: content),
          if (_privacyCovered)
            const Scaffold(body: Center(child: CircularProgressIndicator())),
        ],
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Access required')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.lock_outline, size: 48),
              const SizedBox(height: 16),
              Text(
                '$_denialReason Your saved records remain on this device.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => Scaffold(
                      appBar: AppBar(
                        title: const Text('Announcements & instructions'),
                      ),
                      body: SingleChildScrollView(
                        child: IntroNoticesPanel(
                          userId: widget.resolvedAuth.currentUser?.uid,
                        ),
                      ),
                    ),
                  ),
                ),
                child: const Text('Announcements & instructions'),
              ),
              TextButton(
                onPressed: _checking || _signingOut
                    ? null
                    : () => _check(manual: true),
                child: Text(
                  _checking ? 'Refreshing access…' : 'Refresh access',
                ),
              ),
              if (_refreshStatus != null)
                Text(_refreshStatus!, textAlign: TextAlign.center),
              TextButton(
                onPressed: _signingOut
                    ? null
                    : () async {
                        setState(() => _signingOut = true);
                        try {
                          await widget.resolvedAuth.signOut();
                          if (context.mounted) {
                            Navigator.of(context).pushAndRemoveUntil(
                              MaterialPageRoute<void>(
                                builder: (_) => LoginPage(auth: widget.auth),
                              ),
                              (_) => false,
                            );
                          }
                        } catch (_) {
                          if (context.mounted) {
                            setState(() => _signingOut = false);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Could not sign out. Please try again.',
                                ),
                              ),
                            );
                          }
                        }
                      },
                child: Text(_signingOut ? 'Signing out…' : 'Sign out'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
