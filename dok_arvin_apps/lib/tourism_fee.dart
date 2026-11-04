/// Money is represented in centavos to avoid rounding errors in group totals.
class TourismFeeRate {
  const TourismFeeRate({required this.id, required this.perPersonCentavos});
  final String id;
  final int perPersonCentavos;

  factory TourismFeeRate.fromData(Map<String, dynamic> data) {
    final id = data['rateId'];
    final amount = data['feePerPersonCentavos'];
    if (id is! String ||
        !RegExp(r'^[A-Za-z0-9_-]{1,128}$').hasMatch(id) ||
        amount is! int ||
        amount < 0 ||
        amount > 100000000) {
      throw const FormatException('Invalid Tourism rate');
    }
    return TourismFeeRate(id: id, perPersonCentavos: amount);
  }

  int totalCentavos(int count) {
    if (count < 1 || count > 1000) {
      throw ArgumentError.value(count, 'count', 'Enter 1–1000 tourists');
    }
    if (perPersonCentavos < 0 ||
        perPersonCentavos > 100000000 ||
        !RegExp(r'^[A-Za-z0-9_-]{1,128}$').hasMatch(id)) {
      throw const FormatException('Invalid Tourism rate');
    }
    return perPersonCentavos * count;
  }
}
