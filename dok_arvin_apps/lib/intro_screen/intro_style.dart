import 'package:flutter/material.dart';
import 'intro_navigation.dart';

const introColors = [Color(0xfff06292), Color(0xffba68c8), Color(0xffcddc39)];
const introInk = Color(0xff2b2036);

class IntroShell extends StatelessWidget {
  const IntroShell({
    super.key,
    required this.index,
    required this.children,
    this.showNavigation = true,
    this.contentReady = true,
  });
  final int index;
  final List<Widget> children;
  final bool showNavigation;
  final bool contentReady;

  @override
  Widget build(BuildContext context) => ColoredBox(
    color: introColors[index],
    child: Stack(
      children: [
        Positioned(top: -110, right: -95, child: _orb(300, .14)),
        Positioned(bottom: 30, left: -130, child: _orb(260, .08)),
        SingleChildScrollView(
          key: PageStorageKey('intro-scroll-$index'),
          padding: const EdgeInsets.fromLTRB(24, 22, 24, 24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 620),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: .24),
                          borderRadius: BorderRadius.circular(15),
                        ),
                        child: const Icon(
                          Icons.location_city_rounded,
                          color: introInk,
                          size: 23,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'SAN ANTONIO\nMUNICIPAL SERVICES',
                          style: TextStyle(
                            color: introInk,
                            fontWeight: FontWeight.w800,
                            fontSize: 10,
                            letterSpacing: 1.5,
                            height: 1.6,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: introInk.withValues(alpha: .16),
                          ),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Text(
                          '0${index + 1} / 03',
                          style: const TextStyle(
                            color: introInk,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 30),
                  ...children,
                  if (showNavigation && contentReady)
                    ?IntroNavigation.actionFor(context, index),
                ],
              ),
            ),
          ),
        ),
      ],
    ),
  );

  Widget _orb(double size, double alpha) => IgnorePointer(
    child: Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: alpha),
      ),
    ),
  );
}
