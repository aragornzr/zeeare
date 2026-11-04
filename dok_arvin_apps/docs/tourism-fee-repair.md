# Tourism fee read and registration repair

On 2026-10-26, read-only production inspection confirmed that Jeff Balaoing is
enabled and approved, with Tourism department, Mobile app, and Tourism access.
The existing department rate is 2000 centavos (₱20) per tourist.

Live Firestore rules omit fee-setting and historical-rate reads and reject the
group fields submitted by the current mobile form. The missing fee read leaves
the form without a rate, disabling Save tourist.

`../firestore.tourism-fix.rules` is a targeted candidate based on the production
snapshot in `firestore-live-before-tourism-fix.rules`. It preserves the deployed
RHU/pharmacy rules, adds approved Tourism fee reads and validates current group
registrations against immutable historical rates. Legacy queued record shapes
remain supported. No data migration, account permission change or provisioning
is required. Existing records are not rewritten or repriced.

The owner explicitly approved deployment on 2026-10-26. The targeted rules
were deployed to `loginsept162026` at 21:39 Asia/Manila. The live rules were
read back and matched `firestore.tourism-fix.rules` exactly.
Ruleset: `ddaba9d7-1db2-4b3f-a041-e4e679723ff0`.

Review the diff against the snapshot, then re-read live rules before deploying
to ensure no intervening changes are overwritten. The deployment command after
approval is:

```sh
firebase deploy --only firestore:rules --project loginsept162026 --config firebase.tourism-fix.json
```

The main `firestore.rules` also includes unrelated access changes and should
not be deployed as part of this targeted repair.

Validation passed: Firebase compilation dry run and the Firestore emulator
Tourism suite using the targeted candidate. Tests cover approved regular-user
fee reads, denied cross-department/signed-out reads, server-only rate writes,
legacy queued records, historical rates, group totals and record ownership.
Jeff's actual mobile session has not been tested; deployment and reopening
Tourism are required before checking the displayed fee and Save tourist.


The fix applies to all existing and new approved Tourism accounts through shared
claims checks; Jeff has no special exception. New accounts still require admin
approval, Tourism assignment and Mobile app/Tourism permissions.

The owner also requested consistent behavior for other departments. Expanded
local-rule tests passed for fresh and existing UIDs across all eight departments,
and 45 backend tests passed. Automatic approval review rejected deployment of
the broader local rules because it would also change live RHU access behavior.
The safer Tourism-only deployment succeeded and preserves live RHU/pharmacy
rules. Broader cross-department rule alignment remains local, not deployed.
