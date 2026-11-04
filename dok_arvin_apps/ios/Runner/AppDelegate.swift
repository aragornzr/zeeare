import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    if let controller = window?.rootViewController as? FlutterViewController {
      let channel = FlutterMethodChannel(name: "san_antonio/login_device", binaryMessenger: controller.binaryMessenger)
      channel.setMethodCallHandler { call, result in
        guard call.method == "getDeviceInfo" else {
          result(FlutterMethodNotImplemented)
          return
        }
        result([
          "platform": "ios",
          "manufacturer": "Apple",
          "model": UIDevice.current.model,
          "osVersion": UIDevice.current.systemVersion
        ])
      }
    }
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
