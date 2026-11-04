import 'package:flutter/material.dart';
import 'app_theme.dart';
import 'patient_records_page.dart';
import 'pharmacy_page.dart';

class RhuPage extends StatelessWidget {
  const RhuPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Rural Health Unit')),
    body: Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 900),
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SectionHero(
              eyebrow: 'RHU workspace',
              title: 'Care, connected.',
              description:
                  'Patient visits and medicine inventory, organized for your everyday work.',
              icon: Icons.health_and_safety_outlined,
            ),
            const SizedBox(height: 28),
            const Text(
              'Your health services',
              style: TextStyle(
                fontSize: 21,
                fontWeight: FontWeight.w800,
                color: AppColors.navy,
              ),
            ),
            const SizedBox(height: 16),
            ServiceCard(
              title: 'Patient Record System',
              subtitle:
                  'Record checkups, find patient history, and keep the attending doctor and visit time together.',
              icon: Icons.folder_shared_outlined,
              color: AppColors.teal,
              badge: 'Patient history · Local & cloud',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PatientRecordsPage()),
              ),
            ),
            const SizedBox(height: 16),
            ServiceCard(
              title: 'Pharmacy System',
              subtitle:
                  'Manage medicines and stock levels. Save on this device and sync your inventory across devices.',
              icon: Icons.medication_outlined,
              color: const Color(0xFF5578B1),
              badge: 'Medicine inventory · Local & cloud',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PharmacyPage()),
              ),
            ),
            const SizedBox(height: 24),
            const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.offline_pin_outlined,
                  color: AppColors.teal,
                  size: 20,
                ),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Keep working offline. Saved records stay on your device while cloud updates are pending.',
                    style: TextStyle(color: AppColors.muted, height: 1.5),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}
