import 'package:cloud_functions/cloud_functions.dart';

const departmentNames = <String, String>{
  'tourism': 'Tourism',
  'engineering': 'Engineering',
  'rhu': 'RHU',
  'mswd': 'MSWD',
  'treasurer': 'Treasurer',
  'hrmo': 'HRMO',
  'mao': 'MAO',
  'attendance': 'Attendance',
};
const accessNames = <String, String>{
  'dashboard': 'Web dashboard',
  'apps': 'Mobile app',
  ...departmentNames,
  'patients': 'Patient records',
  'pharmacy': 'Pharmacy',
};
typedef AdminRequest =
    Future<Map<String, dynamic>> Function(
      String name,
      Map<String, dynamic> data,
    );
Future<Map<String, dynamic>> requestAdmin(
  String name,
  Map<String, dynamic> data,
) async {
  final response =
      await FirebaseFunctions.instanceFor(region: 'asia-southeast1')
          .httpsCallable(
            name,
            options: HttpsCallableOptions(timeout: const Duration(seconds: 30)),
          )
          .call<dynamic>(data);
  final payload = response.data;
  if (payload is! Map || payload.keys.any((key) => key is! String)) {
    throw const FormatException('Invalid server response');
  }
  return Map<String, dynamic>.from(payload);
}

String adminError(Object error) => error is FirebaseFunctionsException
    ? error.message ?? 'Request failed. Try again.'
    : 'Could not connect. Please try again.';
String philippineTime(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '');
  if (date == null) return 'Not recorded';
  final local = date.toUtc().add(const Duration(hours: 8));
  String two(int n) => n.toString().padLeft(2, '0');
  return '${local.year}-${two(local.month)}-${two(local.day)} ${two(local.hour)}:${two(local.minute)}:${two(local.second)} PHT';
}
