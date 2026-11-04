# Mobile and dashboard review — 27 October 2026

## Fixed

- Dashboard Back/Forward restoration previously cleared the minute permission timer permanently. Restored pages now hide and clear private panels, recheck authentication, and restart exactly one timer.
- An in-flight dashboard permission check could suppress checking a different account. Account changes now invalidate previous requests, clear private panels immediately, and check the new identity.
- Mobile access gates now cover protected content while backgrounded and wait for fresh permissions on resume. Same-account drafts remain mounted behind the cover. Account changes invalidate pending checks and remove the previous feature immediately.
- Android now explicitly rejects cleartext HTTP traffic.
- Account pages now restrict scripts to local files and the Firebase CDN with a Content Security Policy. Embedded objects and base-URL changes are blocked; form destinations stay on the same origin; referrer information is withheld.
- Mobile registration requires at least eight characters, matching dashboard-created accounts. This is client validation; the Firebase project password policy remains a separate server setting.
- Mobile sign-in no longer displays raw unexpected Firebase exception messages.
- Fixed three analyzer findings in attendance sync control flow.

## Interface

The mobile home screen puts service menus before the introductory banner and department updates. Mobile sign-in and registration share the San Antonio teal palette. Sign-in includes system autofill, keyboard submission, a password visibility control, a constrained responsive layout, and an explicit personal-device reminder for optional credential storage. Existing remembered-password behavior remains opt-in and uses platform secure storage.

Dashboard role pages and browser sign-in share municipal branding, subdued service cards, larger text and controls, keyboard skip links, visible focus indicators and reduced-motion behavior. Updated assets have new version URLs. `build-dashboard-pages.cjs` regenerates the three role pages from `dashboard.html`.

## Scope and remaining verification

These are local source changes. No Firebase rules, functions, database, bucket, region, permissions or live account settings were deployed or provisioned. Existing device records and sync queues were not migrated or deleted. The existing protected UID and project configuration remain in place.

This review is not a complete security audit. Patient and tourism local files still rely on the OS application sandbox; they have not been migrated to application-level encryption. The opt-in remembered-password feature still retains a recoverable credential in platform secure storage. Firebase password policy, App Check enforcement, production hosting headers and live deployed rules need separate verification. Existing backend tests verify current-account authorization and department isolation, but do not prove the deployed services match local code.

Production hosting should serve HTTPS and send `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and a suitable HSTS header. `frame-ancestors` must be an HTTP response header and cannot be enforced by the added HTML meta policy. Hosting is not configured in this dashboard directory.

No interactive browser or physical-device sign-in was available in this session. Browser checks are still needed for actual Firebase network calls under CSP, keyboard navigation, layout at phone/tablet/desktop widths, and Back/Forward restoration. On-device verification is needed for biometrics/camera and background/resume. The Flutter lifecycle cover is not an OS screenshot-blocking guarantee.

## Checks

- Web: `node --test tests/*.test.cjs` (44 passing).
- Backend: `npm test` in `functions` (52 passing).
- App: `flutter analyze --no-pub` (clean).
- App tests: 91 passing, including lifecycle, account switching, enlarged-text sign-in and updated onboarding navigation. Use the installed Android CMake directory on PATH if CMake is not otherwise available: `PATH="$HOME/Library/Android/sdk/cmake/3.22.1/bin:$PATH" flutter test --no-pub`.

Flutter's installed SDK refreshed its pinned test dependencies in `pubspec.lock` and added generated-platform exclusions to `analysis_options.yaml` during analysis.

## Deployment — 27 October 2026

The owner subsequently requested deployment. Firebase Hosting now publishes
the dashboard at https://loginsept162026.web.app/login.html. The live page and
CSP/anti-framing/no-sniff headers were verified. The root `firebase.json` uses
`scripts/build-dashboard.cjs` to prepare only the six HTML entry pages and
their runtime assets in `build/web-dashboard`; tests and documentation are not
published. The four Attendance and three user-management functions were
deployed to the existing Singapore region. Signed-out requests to all seven
returned 401 / UNAUTHENTICATED. No Firestore/Storage rules or provisioned
databases/buckets changed.
