import 'package:flutter/material.dart';
import 'login_page.dart';
import 'tourism_store.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'app_theme.dart';
import 'account_history.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  AccountHistory.start();
  TourismStore.instance.start();
  runApp(const SAZAPPS());
}

class SAZAPPS extends StatelessWidget {
  const SAZAPPS({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: const LoginPage(),
      title: 'San Antonio Apps',
      theme: buildAppTheme(),
    );
  }
}
