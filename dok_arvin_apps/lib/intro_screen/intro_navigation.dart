import 'package:flutter/material.dart';

/// Places each forward action after that page's scrollable content.
class IntroNavigation extends InheritedWidget {
  const IntroNavigation({
    super.key,
    required this.action,
    required this.page,
    required super.child,
  });
  final Widget Function(int page) action;
  final int page;

  static Widget? actionFor(BuildContext context, int page) => context
      .dependOnInheritedWidgetOfExactType<IntroNavigation>()
      ?.action(page);

  @override
  bool updateShouldNotify(IntroNavigation oldWidget) =>
      page != oldWidget.page || action != oldWidget.action;
}
