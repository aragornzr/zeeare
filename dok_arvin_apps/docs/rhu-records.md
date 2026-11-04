# RHU systems

Home menu → RHU opens Patient Record System and Pharmacy System.

## Patient records

Each checkup is a separate, immutable visit with a patient ID, patient name,
doctor name, checkup date/time, and optional notes. Use the same patient ID for
repeat visits. Search matches patient ID, patient name, or doctor. Tap a visit
for details or to record another checkup for that patient. Times are stored as
UTC instants and displayed in the device's local time zone.

Saving writes an atomic JSON record to the app's private documents directory,
under `rhu/patients/<encoded-account-id>/`. This is the durable local record
store and upload queue; it does not depend on a network connection. Access
requires a signed-in account, including a previously authenticated offline
session. Clearing app data or uninstalling deletes device copies.

Sync now, pull-to-refresh, opening the patient screen, resuming it, and the
30-second timer while the screen is open attempt a sync. Sync downloads previous
Firebase visits into the local store and uploads pending local visits using
stable document IDs. Failed uploads remain pending. Downloaded visits stay
available offline. Sync does not run while the app is closed. The Firebase filter
shows locally cached, previously synced visits; it is not proof of a current
network connection. No automatic deletion of historical local records is done.

Cloud target: existing `loginsept162026`, Standard `(default)` database in
`asia-southeast1`, collection `patient_records`. The database was verified on
2026-09-29. At inspection time its only existing collection was `tourism_records`;
there were no legacy patient records to migrate. Records stored in a different
project, database, collection, or schema require an explicit mapping.

The query is `ownerId == currentUser.uid`, ordered by document ID, paginated in
batches of 100. Checkup ordering/search is performed locally. Cloud fields:

- `ownerId`: submitting Firebase Auth UID (immutable).
- `patientNumber`: string, 1–80 characters.
- `patientName`, `doctorName`: strings, 1–160 characters.
- `notes`: string, up to 4,000 characters.
- `checkedAt`, `createdAt`: Firestore timestamps (immutable).
- `uploadedAt`: server timestamp; may change on retry.

The ID is the Firestore document ID. Local records also contain `id` and
`uploaded`. The recorded doctor is entered by the staff member; it is not a
verified doctor identity. No shared staff roles have been configured. Accounts
can only read and submit their own visits. Shared RHU access requires a defined
staff authorization model rather than granting access to every signed-in user.

## Pharmacy

Account-specific medicine inventory is saved locally under
`rhu/pharmacy/<encoded-account-id>/inventory.json` and synchronized with
`pharmacy_inventory` in the existing Firestore database. Add medicine name,
strength/form, and a nonnegative stock quantity; tap a medicine to update stock.

Existing inventory files are automatically migrated with stable IDs and a
preserved `inventory.legacy-backup.json`. Saves first commit atomically to the
local file; successful Firebase acknowledgements mark the matching revision as
uploaded. An edit during an upload remains pending. Downloads cache cloud
inventory for offline use and never overwrite pending local changes.

Sync runs when opening/resuming the pharmacy screen, every 30 seconds while it
is open, after saves, via the Sync now icon, and on pull-to-refresh. It is not a
background service when the screen/app is closed. Upload retries retain the
same document ID. On multiple devices, the last cloud write wins for each
medicine's absolute stock count; this is inventory editing, not an atomic
multi-user dispensing ledger. Local stale edit forms are rejected. No dispensing
workflow or prescription integration is included.

Cloud fields are `ownerId`, `name` (1–160 characters), `strength` (0–100),
`quantity` (integer 0–1,000,000), `revision` (unique edit token), `createdAt`,
`updatedAt`, and `uploadedAt` (server timestamp). The owner and creation date are
immutable. Queries are account-scoped and paginated by document ID in batches
of 100. Pharmacy rules were syntax-validated, deployed with user approval, and
verified against the published Firestore rules on 2026-09-29.

## Verification

Run `flutter analyze` and `flutter test`. Patient tests cover offline restart,
retry deduplication, downloaded history remaining available offline, separate
visit history, account isolation and account changes during sync, permission
failures, invalid input, and timestamp conversion. Widget tests cover RHU
navigation and required checkup fields.

The new Firestore rules use account ownership, a strict schema, immutable visit
fields, and idempotent retry metadata. Syntax validation uses the Firebase rules
validation service. Review the prototype rules before broader distribution.
Following explicit user approval, `firestore.rules` was deployed to
`loginsept162026` on 2026-09-29 at 13:34 UTC. The published source was retrieved
and verified to exactly match the local file. Ruleset:
`81f5d57e-81c7-473a-bc8e-ba001338a9da`. Patient and pharmacy account-scoped access
is now enabled. Tourism rules are unchanged. This verifies deployment; the
manual device sync acceptance check below remains a separate runtime check.

Manual device acceptance: create a visit offline, reopen the app, verify its
patient ID, doctor, and time, reconnect and choose Sync now, then confirm that
it appears under Firebase. On another device using the same account, sync and
verify that visit appears. Disconnect and reopen to verify downloaded history
is still readable. Use another account to confirm isolation.

References: [Firestore offline data](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
and [Firestore reads](https://firebase.google.com/docs/firestore/query-data/get-data).

## Menu design

The main menu now opens immediately, using a responsive service-card layout.
Deep navy and teal anchor the Material 3 theme, with mint surfaces and amber
stock accents. RHU and pharmacy share the same typography, rounded cards,
search fields, and status colors. Pharmacy counts come from the locally loaded
inventory; cloud status does not imply a current connection.
