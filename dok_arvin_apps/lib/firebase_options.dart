import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

/// Firebase app identifiers for the registered Android and iOS apps.
class DefaultFirebaseOptions {
  static FirebaseOptions? get currentPlatform {
    if (kIsWeb) return null;
    return switch (defaultTargetPlatform) {
      TargetPlatform.android => android,
      TargetPlatform.iOS => ios,
      _ => null,
    };
  }

  static const android = FirebaseOptions(
    apiKey: 'AIzaSyD__2QYt6_5zJH3_z6U7Ya3f0xY2BfNLMg',
    appId: '1:476568118086:android:35ab4521736aaac63c7b47',
    messagingSenderId: '476568118086',
    projectId: 'loginsept162026',
    storageBucket: 'loginsept162026.firebasestorage.app',
  );

  static const ios = FirebaseOptions(
    apiKey: 'AIzaSyDs0Fi5OFMHPje3spSzDGt-6MlpQk2DVxc',
    appId: '1:476568118086:ios:f16babba43e28aaf3c7b47',
    messagingSenderId: '476568118086',
    projectId: 'loginsept162026',
    storageBucket: 'loginsept162026.firebasestorage.app',
    iosBundleId: 'com.example.dokArvinApps',
    iosClientId: '476568118086-bg7epvq32p6o7d03v95d9h43jdpa9hh7.apps.googleusercontent.com',
  );
}
