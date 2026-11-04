import 'package:flutter/material.dart';
import '../admin_api.dart';
import 'intro_content_page.dart';

class IntroPage2 extends StatelessWidget {
  const IntroPage2({super.key, this.request = requestAdmin});
  final AdminRequest request;
  @override
  Widget build(BuildContext context) =>
      IntroContentPage(page: 'page2', request: request);
}
