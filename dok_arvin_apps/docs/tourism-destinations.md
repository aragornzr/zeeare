# Tourism destinations — implementation and validation

The destination catalog/delegation functions were deployed on 2026-10-25 to
`loginsept162026`, `asia-southeast1` (codebase `dashboard-users`). Only these four
new functions were selected. The existing `(default)` database was verified as
Standard edition in `asia-southeast1`. No database/Storage provisioning or rules
deployment was performed.

Validation: 45 backend tests, 39 dashboard tests, and four focused Flutter widget
tests passed. The Flutter widget tests ran against the unchanged destination
widget/API source in an isolated temporary package using cached dependencies,
bypassing the main app's unrelated OpenCV native build hook. Static analysis of
the changed Flutter screens/tests passed. The full ARM64 debug APK built at
`build/app/outputs/flutter-apk/app-debug.apk`. All four live endpoints returned
HTTP 401 / UNAUTHENTICATED for unsigned smoke requests. A signed-in administrator
still needs to populate real destinations and choose personnel; no sample
production entries or delegation grants were created.

## Existing deployment discrepancy

Read-only inspection of the exact `cloud.firestore` release found that live
rules were last updated on 2026-10-10 and differ from local `firestore.rules`.
They have no direct access rule for `tourism_catalog`, so the new catalog remains
server-only as intended. However, those older rules also omit reads for
`department_settings/tourism` and `tourism_fee_rates`, and do not accept the
current group fields in `tourism_records`. This is a pre-existing registration
fee/read and group-upload blocker, separate from destination catalog management.
Do not deploy all local rules blindly: their account-access changes also affect
RHU and other existing feature records. Any repair should preserve device-only
records and queued uploads, review rule changes, and run the relevant rules and
sync tests first.
