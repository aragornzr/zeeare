import 'package:flutter/material.dart';
import '../admin_api.dart';
import 'intro_content_page.dart';

class IntroPage1 extends StatelessWidget {
  const IntroPage1({super.key, this.request = requestAdmin});
  final AdminRequest request;
  @override
  Widget build(BuildContext context) =>
      IntroContentPage(page: 'page1', request: request);
}
