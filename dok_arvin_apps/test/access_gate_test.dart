import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:dok_arvin_apps/access_gate.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'auth_access_fake.dart';

class SignOutTestAuth extends AccessTestAuth {
  SignOutTestAuth() : super(claims: {});
  bool signedOut = false;
  @override
  Future<void> signOut() async {
    signedOut = true;
  }
}

class _DeferredUser extends AccessTestUser {
  _DeferredUser(super.claims);
  Completer<IdTokenResult>? pending;
  @override
  Future<IdTokenResult> getIdTokenResult([bool forceRefresh = false]) =>
      pending?.future ?? super.getIdTokenResult(forceRefresh);
}

class _SwitchingAuth extends Fake implements FirebaseAuth {
  _SwitchingAuth(this.currentUser);
  @override
  User? currentUser;
  final changes = StreamController<User?>.broadcast(sync: true);
  @override
  Stream<User?> idTokenChanges() => changes.stream;
}

void main() {
  testWidgets(
    'background cover preserves drafts and rechecks revoked access on resume',
    (tester) async {
      final user = _DeferredUser({
        'approved': true,
        'departments': ['tourism'],
        'access': {'apps': true, 'tourism': true},
      });
      final auth = _SwitchingAuth(user);
      await tester.pumpWidget(
        MaterialApp(
          home: AccessGate(
            section: 'tourism',
            auth: auth,
            child: const Scaffold(body: TextField()),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'unsaved visitor draft');
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      expect(find.byType(TextField), findsNothing);
      user.pending = Completer<IdTokenResult>();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(
        find.byType(TextField),
        findsNothing,
        reason: 'wait for fresh permissions',
      );
      user.pending!.complete(AccessTestToken(user.claims));
      await tester.pumpAndSettle();
      expect(find.text('unsaved visitor draft'), findsOneWidget);
      user.pending = null;
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      user.claims['approved'] = false;
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(find.byType(TextField), findsNothing);
      expect(find.text('Access required'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      await auth.changes.close();
    },
  );

  testWidgets(
    'account switch hides private content and ignores the previous pending check',
    (tester) async {
      final first = _DeferredUser({
        'approved': true,
        'departments': ['tourism'],
        'access': {'apps': true, 'tourism': true},
      });
      final auth = _SwitchingAuth(first);
      await tester.pumpWidget(
        MaterialApp(
          home: AccessGate(
            section: 'tourism',
            auth: auth,
            child: const Text('private feature'),
          ),
        ),
      );
      await tester.pumpAndSettle();
      first.pending = Completer<IdTokenResult>();
      auth.changes.add(first);
      await tester.pump();
      auth.currentUser = AccessTestUser({}, userId: 'second-user');
      auth.changes.add(auth.currentUser);
      await tester.pumpAndSettle();
      expect(find.text('private feature'), findsNothing);
      first.pending!.complete(AccessTestToken(first.claims));
      await tester.pumpAndSettle();
      expect(find.text('private feature'), findsNothing);
      expect(find.text('Access required'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      await auth.changes.close();
    },
  );

  test('access denial identifies the missing account permission', () {
    expect(
      accessDeniedReason({
        'role': 'admin',
        'departments': ['tourism'],
      }, 'apps'),
      contains('Account approval is off'),
    );
    expect(
      accessDeniedReason({
        'approved': true,
        'departments': ['tourism'],
        'access': {},
      }, 'apps'),
      contains('Mobile app access is off'),
    );
  });
  testWidgets('approved Tourism admin can enter the mobile app', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AccessGate(
          section: 'apps',
          auth: AccessTestAuth(
            claims: {
              'role': 'admin',
              'approved': true,
              'departments': ['tourism'],
              'access': {'dashboard': true, 'apps': true, 'tourism': true},
            },
          ),
          child: const Text('Tourism admin services'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Tourism admin services'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('denied access refresh reports its result', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AccessGate(
          section: 'tourism',
          auth: AccessTestAuth(claims: {}),
          child: const Text('private feature'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Refresh access'));
    await tester.pumpAndSettle();
    expect(
      find.text(
        'Access checked. Your account still needs approval and assigned access.',
      ),
      findsOneWidget,
    );
    await tester.pumpWidget(const SizedBox.shrink());
  });
  testWidgets('sign out replaces a root access screen with login', (
    tester,
  ) async {
    final auth = SignOutTestAuth();
    await tester.pumpWidget(
      MaterialApp(
        home: AccessGate(
          section: 'tourism',
          auth: auth,
          child: const Text('private feature'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    expect(auth.signedOut, isTrue);
    expect(find.text('Access required'), findsNothing);
    expect(find.byType(TextField), findsWidgets);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  testWidgets('unassigned account cannot mount a feature', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AccessGate(
          section: 'tourism',
          auth: AccessTestAuth(claims: {}),
          child: const Text('private feature'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('private feature'), findsNothing);
    expect(find.text('Access required'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  testWidgets('regular user can only open assigned sections with app access', (
    tester,
  ) async {
    for (final section in ['tourism', 'patients', 'pharmacy']) {
      await tester.pumpWidget(
        MaterialApp(
          home: AccessGate(
            key: ValueKey(section),
            section: section,
            auth: AccessTestAuth(
              claims: {
                'role': 'regular',
                'approved': true,
                'departments': ['tourism'],
                'access': {'apps': true, 'tourism': true},
              },
            ),
            child: const Text('private feature'),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.text('private feature'),
        section == 'tourism' ? findsOneWidget : findsNothing,
      );
    }
    await tester.pumpWidget(const SizedBox.shrink());
  });
  test('legacy admin and unapproved accounts have no automatic access', () {
    expect(hasSectionAccess({'role': 'admin'}, 'pharmacy'), isFalse);
    expect(
      hasSectionAccess({'role': 'superadmin'}, 'pharmacy', uid: superAdminUid),
      isTrue,
    );
    expect(
      hasSectionAccess({'role': 'superadmin'}, 'pharmacy', uid: 'other'),
      isFalse,
    );
    expect(
      hasSectionAccess({
        'approved': false,
        'departments': ['tourism'],
        'access': {'apps': true, 'tourism': true},
      }, 'tourism'),
      isFalse,
    );
    expect(
      hasSectionAccess({
        'approved': true,
        'departments': ['rhu'],
        'access': {'tourism': true},
      }, 'tourism'),
      isFalse,
    );
    expect(hasSectionAccess({}, 'tourism'), isFalse);
    expect(
      hasSectionAccess({
        'access': {'tourism': 'true'},
      }, 'tourism'),
      isFalse,
    );
  });
}
