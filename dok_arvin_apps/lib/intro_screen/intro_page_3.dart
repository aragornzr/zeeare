import 'package:flutter/material.dart';
import '../admin_api.dart';
import '../intro_notices.dart';
import '../login_page.dart';
import 'intro_style.dart';
import 'intro_navigation.dart';

class IntroPage3 extends StatelessWidget {
  const IntroPage3({super.key, this.request = requestAdmin, this.userId});
  final AdminRequest request;
  final String? userId;
  @override
  Widget build(BuildContext context) => IntroShell(
    index: 2,
    showNavigation: false,
    children: [
      const Text(
        'THE COMMUNITY BOARD',
        style: TextStyle(
          color: introInk,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 2,
        ),
      ),
      const SizedBox(height: 12),
      const Text(
        'Stay informed.\nStay connected.',
        style: TextStyle(
          color: introInk,
          fontSize: 36,
          fontWeight: FontWeight.w800,
          height: 1.12,
          letterSpacing: -1.2,
        ),
      ),
      const SizedBox(height: 14),
      Text(
        'Announcements for everyone. Personal updates just for you.',
        style: TextStyle(
          color: introInk.withValues(alpha: .8),
          fontSize: 15,
          height: 1.6,
        ),
      ),
      const SizedBox(height: 24),
      IntroNoticesPanel(
        request: request,
        userId: userId,
        introStyle: true,
        footer: IntroNavigation.actionFor(context, 2),
        onSignIn: () => Navigator.of(
          context,
        ).push(MaterialPageRoute<void>(builder: (_) => const LoginPage())),
      ),
    ],
  );
}
