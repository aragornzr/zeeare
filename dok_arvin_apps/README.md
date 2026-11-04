# dok_arvin_apps

A new Flutter project.

## RHU

RHU opens Patient Record System and Pharmacy System. Patient checkups record a
patient ID/name, doctor, date/time, and notes, with local persistence and Firebase
upload/download. Pharmacy saves medicine inventory locally and includes Firebase upload/download.
Existing local stock is preserved during migration. The patient and pharmacy
Firestore rules were deployed and verified on 2026-09-29. See
[RHU records](docs/rhu-records.md) for synchronization, account access, and testing.

## Android resource build protection

Every Android module checks resource filenames before building and removes
identical numbered copies (such as `launch_background 3.xml`) from its generated
`intermediates/packaged_res`, `generated/source`, `generated/res` (including
Google Services `values 2.xml`), and incremental `merged.dir` resource directories.
The guard also runs before directly invoked Google Services and resource tasks,
even on incremental builds. Incremental merger metadata is excluded. App source files
are never deleted. If a
numbered generated file differs from its original, the build stops with a
message to run `flutter clean` and rebuild.

Keep generated `build/` folders out of file-copy or folder-sync workflows.
If Desktop is synced, prefer a project folder outside that sync location.
The guard repairs existing duplicates; it cannot prevent another program from
writing files during a build.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## Member registration

Select **Register now** on the login screen, then enter a full name, email,
password (at least 6 characters), and matching password confirmation. Registration
creates a Firebase Authentication user, saves the full name as the user's display
name, and signs the member in before opening the home menu. No separate member
database is required for these fields.

The connected Firebase project must have **Authentication → Sign-in method →
Email/Password** enabled. See the [Firebase setup instructions](https://firebase.google.com/docs/auth/flutter/password-auth).
Any stricter password policy configured in Firebase is enforced by the server.
Android has a checked-in `android/app/google-services.json`. Android and iOS
initialize Firebase with the registered app settings in `lib/firebase_options.dart`.
The iOS bundle ID is `com.example.dokArvinApps`; both mobile apps use the existing
`loginsept162026` project. Other platforms still need their own configuration.

## Running on mobile

Run `flutter pub get`, then `flutter run -d <device-id>` (list devices with
`flutter devices`). Android builds with `flutter build apk --debug`.
For iOS, use a Mac with Xcode and CocoaPods, then
`flutter build ios --simulator --debug`. An installed iOS simulator runtime is
required to launch a simulator. To compile for an iPhone without signing, use
`flutter build ios --debug --no-codesign`; installing on a physical iPhone requires
selecting your Apple development team in `ios/Runner.xcworkspace` and signing.
The pinned iOS plugins and project target iOS 13.0 or later.

Photo uploads on both platforms remain dependent on provisioning the Storage
bucket and Firestore database described in `docs/tourism-firebase.md`.

Run `flutter analyze` and `flutter test` for local checks. Widget tests use a fake
Firebase client; to verify the live integration, register a fresh email on a
configured device, confirm its email and display name under Authentication →
Users in Firebase, and sign in with the same credentials. Also check duplicate
email and offline error handling.


## Department workspace and native admin tools

The mobile home identifies the role below SAN ANTONIO / Municipal services. The daily workspace includes department announcements, My inbox, and (for admins) Sent messages plus a composer. Approved app members read announcements for their assigned departments; only the protected super admin and approved department admins publish. A department admin may target regular users in their departments, while the super admin can target accounts assigned to the chosen department. Message bodies appear only in the sender's Sent list and recipient's inbox. There are no push notifications; active clients refresh every minute and provide manual Refresh updates. Sending requires connectivity; failed sends retain the draft.

Super Admin tools / Department Admin tools reuse the website's callable APIs for account creation/editing, approvals, roles/departments (super admin only), section permissions, disable status, passwords, scoped history/device login events, Tourism fees, and daily/weekly/monthly Tourism reports. All report pages load before totals are displayed. Existing service pages remain available according to claims, and unfinished departments retain their workspace placeholder behavior. Native role/department controls mirror backend restrictions. Apps-only approved managers can use the shared admin endpoints without needing web-dashboard permission; they still cannot grant sections beyond their own assignments.

Communications use the existing Standard Firestore `(default)` database in `asia-southeast1`: `department_workspaces/{department}/announcements/{id}`, `department_workspaces/{department}/inboxes/{uid}/messages/{id}`, and `department_workspaces/{department}/sent/{uid}/messages/{id}`. Two new callable functions publish and read these server-only collections. Each publish/send and its metadata-only audit record are committed atomically. No direct client Firestore reads or new rules/indexes are required. Announcements/messages are currently append-only. No existing local records or sync queues are changed.

Checks: backend communications authorization, recipient isolation, atomic auditing and pagination; web safe rendering and sign-out races; Flutter role labels, admin editing, messages, reports and existing access/sign-out/device checks.


## Super-admin intro pages and global notices

Intro pages 1–2 display saved public pictures, titles and text. Intro page 3 displays global notices and a private For me tab after login. The home workspace also includes these notices after sign-in; users waiting for approval can open Announcements & instructions from Access required. Commands are plain text instructions, not executable device actions.

The protected super admin opens Admin tools → Intro pages & global notices in the app, or the matching Overview editor on the web. Department admins and regular users have no editor, and every mutation verifies the current protected super-admin Auth record on the backend. Select page 1/2 to choose a picture, edit title/text, remove the picture or save. Page 3 supports Everyone (public) or a registered user and Announcement / Command instruction. Public intro notices and personal inboxes are stored separately. Publishing is append-only; page content can be revised.

The existing Storage bucket `loginsept162026.firebasestorage.app` was verified to exist in `ASIA1` (multi-region); its location and access policy were preserved. Only the backend uploads intro images into `intro_content/{page}/{random-id}.{format}`. JPEG, PNG and WebP signatures and the 1.5 MB limit are checked server-side. Web uploads are resized/re-encoded, and the native picker requests a resized/compressed picture. Public page images use download-token URLs, deliberately shareable because pages 1–2 are public. No new Storage bucket, database or rule deployment is required. Existing Tourism files and locally saved records are untouched.

Data: `intro_pages/page1|page2`, public `intro_broadcasts`, private `intro_inboxes/{uid}/messages`, and super-admin `intro_sent/{uid}/messages`. Four callable APIs serve/read/edit/publish this content. Page version checks prevent silent overwrites between devices. Audit transactions include every page edit and notice publication, omit private message text/image tokens, and clean up a new uploaded image if the Firestore save fails. Previous images are removed only after a successful replacement/removal.

Firebase backends are deployed to the existing Singapore region with the existing instance cap. Updates refresh every minute or manually; there are no push notifications. Rebuild/install mobile clients for this UI. iOS physical-device image picking remains a separate acceptance check.


## Login-first app navigation

Cold launch always opens LoginPage. Successful email/password sign-in and successful registration replace it with Intro 1 → Intro 2 → Intro 3; the last button is Main menu. Back moves to the preceding intro and there is no Skip shortcut. Completion replaces the intro route with HomePage, where existing approval/department access checks apply. Sign-out clears authenticated navigation and returns to LoginPage. Remembered credentials may populate the login fields but do not automatically bypass sign-in. Public intro content and announcements are now displayed after authentication in the app flow; public content APIs remain public, and personal announcements retain their existing authenticated isolation.

Intro navigation places Next and Main menu after the scrollable content. Forward buttons wait for content and page pictures to finish loading (or show an error), and forward swiping is disabled. Long text and announcement lists scroll before the forward action becomes visible.

## Tourism destination list

Tourism registration offers a searchable **Destination / intended resort** list.
Use the list icon beside the field; another destination can still be entered,
including when the list cannot be loaded offline. **Destinations & resorts**
opens the shared catalog from Tourism; Tourism administrators also have a direct
button under Admin tools. Add a name, edit it, or turn off **Available for new
registrations**. Existing visitor records and queued/device-only records keep
their original saved destination text.

Tourism admins and the protected super admin can manage the list and open
**Delegate destination management → Load Tourism personnel**. Enable a regular
Tourism worker to allow catalog editing; disable it to remove that permission.
This grants destination editing only. The worker still needs account approval,
Tourism access, and the existing Mobile app/Web dashboard permissions for the
platform they use. Delegates cannot delegate to others. Current account access
and the grant are checked on every backend operation; no custom-claim refresh
is needed for destination delegation changes. Reload the list to refresh visible
controls after an access change.

The web dashboard has the same catalog and delegation controls under **Tourism
→ Destinations & resorts**, including for delegated regular personnel. The
server-only `tourism_catalog/destinations` document holds up to 300 active or
inactive entries and an optimistic revision. `tourism_catalog/editors` holds up
to 100 delegated UIDs. Existing default-deny client rules protect both documents;
all access uses callable functions in the existing Singapore region. No database,
bucket, rules, Authentication provider, or stored tourist records are provisioned
or changed. Destination/delegation changes and their audit events commit in one
transaction. A stale edit keeps the draft and requires reloading the list.

Backend functions: `getTourismDestinations`, `saveTourismDestination`,
`listTourismDestinationPersonnel`, `setTourismDestinationEditor`.
Tests: `node --test functions/*.test.js`, dashboard `node --test tests/*.test.cjs`,
and `flutter test test/tourism_destinations_test.dart`.

## Security and interface review (27 October 2026)

See [the review notes](docs/security-ui-review.md) for local session-security fixes,
updated sign-in screens, dashboard changes, checks, and remaining production
verification. Saved feature records and upload queues are preserved.

## Compact announcements and welcome (27 October 2026)

Announcement/Messages now appears below Settings / Sign out, starts collapsed,
and indicates new department/inbox updates. Mark as read & close saves message
ID markers for the signed-in account on this device. The welcome banner hides
after 20 seconds. See [behavior and verification](docs/compact-workspace.md).
