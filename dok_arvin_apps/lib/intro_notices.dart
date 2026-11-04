import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'admin_api.dart';

class IntroNoticesPanel extends StatefulWidget {
  const IntroNoticesPanel({
    super.key,
    this.userId,
    this.request = requestAdmin,
    this.introStyle = false,
    this.onSignIn,
    this.footer,
  });
  final String? userId;
  final AdminRequest request;
  final bool introStyle;
  final VoidCallback? onSignIn;
  final Widget? footer;
  @override
  State<IntroNoticesPanel> createState() => _IntroNoticesPanelState();
}

class _IntroNoticesPanelState extends State<IntroNoticesPanel> {
  String? uid, cursor, error;
  String audience = 'all';
  bool loading = false;
  int epoch = 0;
  List<Map<String, dynamic>> items = [];
  StreamSubscription<User?>? subscription;
  Timer? timer;
  @override
  void initState() {
    super.initState();
    uid = widget.userId;
    if (uid == null) {
      try {
        final auth = FirebaseAuth.instance;
        uid = auth.currentUser?.uid;
        subscription = auth.authStateChanges().listen((user) {
          if (!mounted) return;
          if (uid != user?.uid) {
            setState(() {
              uid = user?.uid;
              audience = 'all';
              items = [];
            });
            load();
          }
        });
      } catch (_) {
        /* Public intro works without an authenticated account. */
      }
    }
    load();
    timer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (!loading) load();
    });
  }

  @override
  void didUpdateWidget(covariant IntroNoticesPanel old) {
    super.didUpdateWidget(old);
    if (old.userId != widget.userId) {
      uid = widget.userId;
      audience = 'all';
      items = [];
      load();
    }
  }

  Future<void> load({bool append = false}) async {
    final generation = ++epoch;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await widget.request('listIntroNotices', {
        'audience': audience,
        if (append && cursor != null) 'cursor': cursor,
      });
      if (mounted && generation == epoch) {
        setState(() {
          items = [
            if (append) ...items,
            ...(data['items'] as List).map((v) => Map<String, dynamic>.from(v)),
          ];
          cursor = data['cursor'] as String?;
        });
      }
    } catch (e) {
      if (mounted && generation == epoch) {
        setState(() {
          items = [];
          cursor = null;
          error = adminError(e);
        });
      }
    } finally {
      if (mounted && generation == epoch) setState(() => loading = false);
    }
  }

  @override
  void dispose() {
    epoch++;
    timer?.cancel();
    subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Card(
    elevation: widget.introStyle ? 0 : null,
    margin: widget.introStyle ? EdgeInsets.zero : null,
    color: widget.introStyle ? const Color(0xfffbfcef) : null,
    shape: widget.introStyle
        ? RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(26),
            side: const BorderSide(color: Colors.white),
          )
        : null,
    child: Padding(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.introStyle
                ? 'Your announcement board'
                : 'From the Super Admin',
            style: const TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.w800,
              color: Color(0xff2b2036),
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                label: const Text('Everyone'),
                avatar: const Icon(Icons.public, size: 17),
                selectedColor: widget.introStyle
                    ? const Color(0xffdce775)
                    : null,
                selected: audience == 'all',
                onSelected: loading
                    ? null
                    : (_) {
                        setState(() {
                          audience = 'all';
                          items = [];
                          cursor = null;
                        });
                        load();
                      },
              ),
              ChoiceChip(
                label: const Text('For me'),
                avatar: const Icon(Icons.lock_outline, size: 17),
                selectedColor: widget.introStyle
                    ? const Color(0xffdce775)
                    : null,
                selected: audience == 'mine',
                onSelected: loading || uid == null
                    ? null
                    : (_) {
                        setState(() {
                          audience = 'mine';
                          items = [];
                          cursor = null;
                        });
                        load();
                      },
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              audience == 'all'
                  ? 'Public announcements for everyone.'
                  : 'Private announcements addressed to your account.',
              style: const TextStyle(fontSize: 12, height: 1.5),
            ),
          ),
          if (uid == null)
            const Text(
              'Sign in to read announcements and instructions addressed to you.',
            ),
          if (uid == null && widget.onSignIn != null)
            TextButton.icon(
              onPressed: widget.onSignIn,
              icon: const Icon(Icons.login, size: 17),
              label: const Text('Sign in for personal announcements'),
            ),
          if (loading) const LinearProgressIndicator(),
          if (error != null) Text(error!),
          if (!loading && items.isEmpty && error == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('No announcements yet.'),
            ),
          for (final item in items)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item['kind'] == 'instruction'
                        ? 'Instruction'
                        : 'Announcement',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item['text'] as String,
                    style: const TextStyle(fontSize: 16, height: 1.5),
                  ),
                  Text(
                    '${item['authorName']} · ${philippineTime(item['createdAt'])}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const Divider(),
                ],
              ),
            ),
          Wrap(
            spacing: 8,
            children: [
              TextButton.icon(
                onPressed: loading ? null : () => load(),
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh notices'),
              ),
              if (cursor != null)
                TextButton(
                  onPressed: loading ? null : () => load(append: true),
                  child: const Text('Load older'),
                ),
            ],
          ),
          if (!loading) ?widget.footer,
        ],
      ),
    ),
  );
}
