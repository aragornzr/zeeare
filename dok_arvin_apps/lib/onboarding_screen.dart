import 'package:dok_arvin_apps/intro_screen/intro_page_1.dart';
import 'package:dok_arvin_apps/intro_screen/intro_page_2.dart';
import 'package:dok_arvin_apps/intro_screen/intro_page_3.dart';
import 'package:flutter/material.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

import 'home_page.dart';
import 'admin_api.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'intro_screen/intro_style.dart';
import 'intro_screen/intro_navigation.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, this.auth, this.request = requestAdmin});
  final FirebaseAuth? auth;
  final AdminRequest request;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _controller = PageController();
  int page = 0;

  Widget _forwardAction(int index) => Padding(
    padding: const EdgeInsets.only(top: 18),
    child: Align(
      alignment: Alignment.centerRight,
      child: FilledButton.icon(
        style: FilledButton.styleFrom(
          backgroundColor: introInk,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: const StadiumBorder(),
        ),
        icon: const Icon(Icons.arrow_forward_rounded, size: 18),
        onPressed: () {
          if (page != index) return;
          if (index == 2) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute<void>(
                builder: (_) =>
                    HomePage(auth: widget.auth, request: widget.request),
              ),
            );
          } else {
            _controller.nextPage(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeIn,
            );
          }
        },
        label: Text(index == 2 ? 'Main menu' : 'Next'),
      ),
    ),
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IntroNavigation(
      action: _forwardAction,
      page: page,
      child: Scaffold(
        backgroundColor: introColors[page],
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: PageView(
                  physics: const NeverScrollableScrollPhysics(),
                  controller: _controller,
                  onPageChanged: (index) => setState(() => page = index),
                  children: [
                    IntroPage1(request: widget.request),
                    IntroPage2(request: widget.request),
                    IntroPage3(
                      request: widget.request,
                      userId: widget.auth?.currentUser?.uid,
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 18,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton(
                      style: TextButton.styleFrom(foregroundColor: introInk),
                      onPressed: page == 0
                          ? null
                          : () => _controller.previousPage(
                              duration: const Duration(milliseconds: 300),
                              curve: Curves.easeInOut,
                            ),
                      child: const Text('Back'),
                    ),
                    Expanded(
                      child: Center(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: SmoothPageIndicator(
                            controller: _controller,
                            count: 3,
                            effect: ExpandingDotsEffect(
                              activeDotColor: introInk,
                              dotColor: introInk.withValues(alpha: .18),
                              dotHeight: 7,
                              dotWidth: 7,
                              expansionFactor: 3,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 64),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
