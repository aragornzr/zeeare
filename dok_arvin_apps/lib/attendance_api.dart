import 'package:cloud_functions/cloud_functions.dart';
import 'attendance_store.dart';

class AttendanceApi {
  Future<Map<String, dynamic>> call(
    String name,
    Map<String, dynamic> data,
  ) async {
    final result = await FirebaseFunctions.instanceFor(
      region: 'asia-southeast1',
    ).httpsCallable(name).call(data);
    return Map<String, dynamic>.from(result.data as Map);
  }

  Future<void> upload(AttendanceEvent event) async {
    await call('recordAttendance', {
      'id': event.id,
      'ownerUid': event.ownerUid,
      'action': event.action,
      'time': event.time.toUtc().toIso8601String(),
      'employeeId': event.employeeId,
      'method': event.method,
      'device': event.device,
    });
  }
}
