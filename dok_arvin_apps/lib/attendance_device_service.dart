import 'package:geolocator/geolocator.dart';
import 'package:local_auth/local_auth.dart';

class AttendanceDeviceService {
  final _auth = LocalAuthentication();

  Future<void> authenticate() async {
    if (!await _auth.canCheckBiometrics ||
        (await _auth.getAvailableBiometrics()).isEmpty) {
      throw StateError(
        'Set up Face ID or fingerprint recognition in device settings first.',
      );
    }
    final ok = await _auth.authenticate(
      localizedReason: 'Confirm attendance for your signed-in account',
      biometricOnly: true,
    );
    if (!ok) {
      throw StateError(
        'Biometric verification was cancelled. Attendance was not recorded.',
      );
    }
  }

  Future<Position> location() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw StateError(
        'Turn on device location services before recording attendance.',
      );
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever) {
      throw StateError(
        'Allow location access for this app in device settings.',
      );
    }
    if (permission == LocationPermission.denied) {
      throw StateError('Location permission is required to record attendance.');
    }
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 20),
      ),
    );
    if (position.isMocked) {
      throw StateError('A simulated location cannot be used for attendance.');
    }
    if (!position.accuracy.isFinite ||
        position.accuracy > 100 ||
        DateTime.now().difference(position.timestamp).abs() >
            const Duration(seconds: 30)) {
      throw StateError(
        'Location is not accurate enough yet. Move near a window or outdoors and try again.',
      );
    }
    return position;
  }
}
