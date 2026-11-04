import 'package:dok_arvin_apps/tourism_fee.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('group fees use exact centavos, including zero fees', () {
    final rate = TourismFeeRate.fromData({
      'rateId': 'approved-rate',
      'feePerPersonCentavos': 15050,
    });
    expect(rate.totalCentavos(3), 45150);
    expect(rate.totalCentavos(1), 15050);
    expect(
      const TourismFeeRate(id: 'free', perPersonCentavos: 0).totalCentavos(7),
      0,
    );
  });
  test('invalid counts and rates cannot produce a saved fee', () {
    const rate = TourismFeeRate(id: 'approved-rate', perPersonCentavos: 505);
    for (final count in [0, -1, 1001]) {
      expect(() => rate.totalCentavos(count), throwsArgumentError);
    }
    for (final data in [
      {'rateId': '', 'feePerPersonCentavos': 5},
      {'rateId': 'wrong/path', 'feePerPersonCentavos': 5},
      {'rateId': 'rate', 'feePerPersonCentavos': -1},
      {'rateId': 'rate', 'feePerPersonCentavos': 10.5},
      {'rateId': 'rate', 'feePerPersonCentavos': 100000001},
    ]) {
      expect(() => TourismFeeRate.fromData(data), throwsFormatException);
    }
  });
}
