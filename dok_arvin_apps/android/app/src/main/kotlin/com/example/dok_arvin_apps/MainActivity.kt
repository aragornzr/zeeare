package com.example.dok_arvin_apps

import android.os.Build
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterFragmentActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "san_antonio/login_device")
            .setMethodCallHandler { call, result ->
                if (call.method == "getDeviceInfo") {
                    result.success(mapOf(
                        "platform" to "android",
                        "manufacturer" to Build.MANUFACTURER,
                        "model" to Build.MODEL,
                        "osVersion" to Build.VERSION.RELEASE
                    ))
                } else {
                    result.notImplemented()
                }
            }
    }
}
