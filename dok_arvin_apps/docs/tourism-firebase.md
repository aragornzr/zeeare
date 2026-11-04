# Tourism storage setup

## Verified sync failure (2026-09-28)

The Android emulator reported Storage upload HTTP 404 (`object-not-found`).
Authenticated inspection of `loginsept162026` found no Storage buckets and a
disabled Firestore API. Billing is already enabled. The required service APIs
have now been enabled, but database/bucket creation is awaiting explicit user
approval for the permanent Singapore (`asia-southeast1`) region and usage costs.

Deployable owner-restricted rules are in `firestore.rules` and `storage.rules`,
referenced by `firebase.json`. They have not yet been deployed. Once the default
Firestore database and `loginsept162026.firebasestorage.app` bucket exist, review
any existing rules before deploying these. The app's existing Android bucket
configuration already names this bucket correctly.

The app now keeps the specific failure with each device record and cancels photo
uploads that exceed 60 seconds so a stalled task does not lock the sync queue.
Existing pending records remain on the device and can be retried with Sync now.


Tourism registration is implemented for the native app, primarily Android/iOS.
Records and photo copies remain in the app's documents directory, separated by
signed-in user. Uninstalling the app or clearing its data removes these copies.
Saving records works offline for an already signed-in user. Upload retries run
every 30 seconds while the app is running, on sign-in/relaunch, and via Sync now.
Uploads are not scheduled while the app is terminated. A record is marked
uploaded only after its photos and Firestore document have succeeded.

Enable Cloud Firestore and Cloud Storage in the existing Firebase project.
Ensure the platform Firebase configuration includes the correct Storage bucket.
Review and merge these rule examples into the project's existing rules; do not
replace rules needed by other features. These examples restrict each record to
its submitting account. They have not been deployed by this change.

Firestore rules:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tourism_records/{recordId} {
      allow create: if request.auth != null
        && request.resource.data.ownerId == request.auth.uid;
      allow read, delete: if request.auth != null
        && resource.data.ownerId == request.auth.uid;
      allow update: if request.auth != null
        && resource.data.ownerId == request.auth.uid
        && request.resource.data.ownerId == request.auth.uid;
    }
  }
}
```

Storage rules:

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tourism/{userId}/{recordId}/{photo} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId
        && request.resource.size < 20 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

Firestore collection: `tourism_records`. Fields: `ownerId`, `name`,
`plateNumber`, `createdAt` (device time, UTC), `uploadedAt` (server timestamp),
and `photos` (authenticated Storage object paths). Stable record IDs and photo
paths make retries safe even if the app closes after a partial upload.

Device acceptance check: sign in, disconnect the network, save a tourist with
both photos, restart the app, and confirm the record remains pending. Reconnect,
choose Sync now, and confirm one Firestore document and both Storage objects.
Also test denied camera permission, an entry without a vehicle/photos, and a
second user account (which must not see or upload the first user's queue).

Photo integration follows the Flutter image_picker documentation:
https://pub.dev/packages/image_picker
Firebase file upload reference:
https://firebase.google.com/docs/storage/flutter/upload-files


## Group registration and the Tourism admin rate

2026-10-26 update: the owner approved and the targeted Tourism rules were
deployed successfully. Fee reads and group uploads are now allowed for all
approved Tourism users with Mobile app/Tourism access. The live rules match
`firestore.tourism-fix.rules`; RHU/pharmacy rules were preserved. See
`tourism-fee-repair.md` for validation and deployment details. The deployment
status paragraph below records the earlier state before this repair.

Deployment status: the owner requested that the new Firestore rules remain local. Do not deploy them without a later explicit request. The new mobile form cannot read `department_settings/tourism` or upload the group fields using the existing live rules. Local emulator tests validate the proposed rules.

The current mobile form records the tourist name, optional company/group, number of tourists (1–1000, including the named tourist), destination and optional vehicle/photos. It no longer accepts a manually entered total fee. The app receives the department's declared fee and calculates **total = fee per tourist × tourist count** using integer centavos.

The **Fee per tourist** card in the web dashboard is visible to approved Tourism admins who have Dashboard and Tourism section assignments, and the protected super admin. `getTourismFee` and `setTourismFee` callable functions re-read current Auth permissions. Other department admins and regular users cannot set it. There is one shared Tourism department rate; it is not a different rate for each admin account. Enter `0` for free admission. No default fee is assumed.

`department_settings/tourism` stores the current `rateId`, `feePerPersonCentavos`, `updatedBy` and `updatedAt`. Each rate change creates a permanent `tourism_fee_rates/{rateId}` version and a `tourism_fee_changed` event in the admin's account history, in one Firestore transaction. Direct client writes to both settings collections are denied. Neither collection contains passwords or admin emails.

New records save `company`, `touristCount`, `feeRateId`, `feePerPersonCentavos`, `feeTotalCentavos` and the total pesos in the existing `fee` field. Rules validate the count, calculation and declared rate. The immutable rate version allows an offline record to upload even after a newer fee is declared. Existing local/cloud records are not converted or repriced; their original manual total fees remain. Rules deliberately continue accepting legacy record shapes so previously queued records and older app builds can sync. New rates are enforced for the new group-record format.

The app listens to rate changes. A cached rate can be used offline and is explicitly marked as the last rate received on the device; it may be older than the live dashboard rate. Without any declared/cached rate, the form cannot save a new record. Changing a fee never changes records already saved. Rebuild/install the mobile app to receive the new form. Sign in as a Tourism admin (or super admin), declare a fee in the web dashboard, then open Tourism in the mobile app.

Validation includes exact centavo totals, free admission, invalid counts/rates, admin permissions, atomic fee/history writes, offline preservation, legacy queue retries and local emulator security-rule tests. To rerun the rule tests, install `@firebase/rules-unit-testing` and `firebase` into a temporary directory, set `NODE_PATH` to its `node_modules`, then use `firebase emulators:exec --only firestore --project demo-tourism-fees 'node test/firestore_tourism_rules.cjs'` with a local emulator configuration.
