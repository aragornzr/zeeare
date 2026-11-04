# Middle-earth homepage

Open `index.html` in your browser to view the website. No installation or build is required. The background image is stored locally in `assets/`.

To add a navigation menu, edit the `<nav>` in `index.html`. Replace a coming-soon button with an `<a class="nav-link" href="your-page.html">Menu name</a>` when its page is ready.

Files: `index.html` (content), `styles.css` (responsive design), `script.js` (mobile navigation and coming-soon dialogs). Google Fonts is optional; the page falls back to system fonts when offline.

## Dashboard sign-in

Choose **Begin your journey → Web Dashboard**, or open `login.html` through the local server. Email/password sign-in uses Firebase Authentication in the existing `loginsept162026` project and the registered web app `1:476568118086:web:da78b553e98410e73c7b47`. Users must already have registered in that project's Authentication service; this website does not create accounts.

**Save login** selects persistent Firebase Auth sessions. Unchecked, sign-in lasts for the current tab session. Passwords are never saved by this code. The dashboard waits for Firebase Auth before showing account content and redirects signed-out visitors to login. Sign out clears the Firebase session.

Run `python3 serve-dashboard.py` here and visit `http://localhost:8080/`. Internet access is required for Firebase's SDK and sign-in service. The JavaScript modules use the pinned Firebase 12.4.0 CDN SDK. Email/Password must be enabled in the existing project's Authentication providers.

The dashboard uses secure callable functions for account management and account history. It does not directly read Firestore history; backend permissions and default-deny Firestore rules protect it.

Access checks run every minute and when returning to the tab. Routine token
renewal no longer reinitializes dashboard panels: changing token timestamps
cannot erase unsaved fee, destination, intro-page or message drafts. Account,
approval, department or enabled-service changes still update the panels, and
sign-out or denied access still clears private content. Reload the dashboard
once after updating its files to receive the corrected script.

## Users and permissions

The **Users & permissions** menu lets the protected super admin (`zaldy.rafanan@gmail.com`, permanent Firebase UID `z9I3AD77p5PWJjsP2Ae27nW7Tze2`) manage all accounts. The super admin assigns each department admin's departments and visible dashboard/app sections. Department admins can list, edit and approve only regular workers in their assigned departments; they cannot edit admins, transfer existing workers, or grant sections beyond their assignments.

New self-registrations appear as **Pending approval / Unassigned** to the super admin. Assign one department and save; its department admin can then approve the worker, select **Mobile app** and the appropriate department menus, and save. RHU access uses the RHU menu plus patient-record/pharmacy sections. New accounts have no menu access until approved. **Approve account access** is unchecked by default when creating accounts. Unchecking approval removes effective access without deleting locally saved records. Legacy accounts without department/approval claims also require assignment and approval.

For a department admin, select **Department admin**, assign departments, check **Approve account access**, **Web dashboard**, and the specific sections they may see, then save. The Overview shows only assigned sections. Roles and sections remain enforced by the backend even if someone edits browser controls. Only the protected account may retain the super admin role, and its role, approval, access and enabled status cannot be removed through dashboard functions. There is no dashboard account-deletion action. Project-owner actions in the Firebase console and Auth self-deletion APIs are outside this protection.

Backend functions are in `../dok_arvin_apps/functions`, deployed to the existing project in Singapore (`asia-southeast1`) with the owner's approval. The owner selected `zaldy.rafanan@gmail.com` as the first administrator. Passwords are sent only to Firebase Authentication and are never stored in Firestore or shown in the users table. User lists omit password hashes and unneeded account metadata.

The mobile app must be rebuilt to include the new access gates. They check permissions at entry and every minute; the website also refreshes access on return to its tab. Managers' permissions are checked against their current Auth account on each backend request. Account updates revoke refresh tokens; existing Firebase ID tokens can remain valid for up to about one hour, so permission changes are not guaranteed to take effect instantly on older app versions. Users should sign in again after an account change. Device-saved records remain intact, including queued Tourism records.

Checks: `node tests/auth-page.test.cjs` and `node --test tests/users-page.test.cjs` here; `npm test` in the backend directory; Flutter access/login/store tests and analysis in the app directory. No real user passwords are needed for automated tests. Browser sign-in and real account creation/editing still need verification by the administrator.


## Super admin account history

Open **Users & permissions → History** beside any account. The protected super admin alone can view history, including registered/enrolled date, latest Firebase sign-in, recorded login sessions, dashboard account creation and account edits. Dates use **Asia/Manila**, including seconds. The list loads 50 records at a time and provides refresh and older-record controls. Account changes show the actor and before/after username, email, role, departments, approval, enabled status and assigned access. Password edits show only a change marker.

Firestore stores history at `account_history/{uid}/events/{id}` using the existing Standard `(default)` database in `asia-southeast1`. All access is through Admin SDK callable functions; the existing rules give clients no access. There are no history edit/delete controls. Updates reserve a pending audit record before modifying Authentication, then record completed or partial/failed results. Auth and Firestore are different services and cannot share an atomic transaction: a process failure may leave a pending record, which needs administrator investigation. Account creation failures attempt to remove the incomplete account. Registration triggers are idempotent and use the default no-retry policy. If a registration event fails, the account still displays its true Firebase creation date.

Login time comes from Firebase's verified `auth_time`, not the device clock. Restored sessions, refreshes and retries deduplicate by UID and second; separate sign-ins in the same second can share one entry. Web sessions retry recording during minute access refreshes. Mobile builds initialize `AccountHistory` after Firebase and retry each minute; rebuild/install the app to enable this. Older mobile builds do not report every login. Network failures followed by sign-out can leave a login unrecorded. Existing accounts expose their true Firebase creation date and most recent sign-in, but previous full login/change history cannot be reconstructed.

The tracking scope is dashboard account management and instrumented web/mobile sign-ins. Auth registration is also captured from other clients by the registration trigger. Firebase-console edits, external SDK changes and email-link password-reset completions do not produce account-update events through standard Auth triggers. This feature does not collect biometric attendance enrollment history. Never describe missing history as evidence that no changes occurred.


## Tourism fee administration

The owner selected **Keep the rules local for now**. The Tourism fee functions are deployed separately; the new Firestore rules are prepared locally. Mobile rate reads and new group-record uploads require a later explicitly authorized rules deployment.

Approved Tourism admins with **Web dashboard** and **Tourism** section access, and the protected super admin, see **Tourism → Fee per tourist**. Enter a per-person rate in pesos (up to two decimals), then **Save Tourism fee**. Enter zero for free admission. This is one shared Tourism department rate. New mobile Tourism records use the declared rate multiplied by the total number of tourists, including the named tourist. Saved records retain the original rate and total. The mobile app must be rebuilt/installed for the new company/group and tourist-count fields. Offline devices may use their last received rate; they display that status.

Rate updates use `getTourismFee` / `setTourismFee`, checked against current backend Auth claims. Immutable rate versions, the current setting and an account-history event are stored together in Firestore. Super admins can inspect fee changes using **Users & permissions → History** beside the admin's account. Regular users and admins of other departments cannot change this fee.

On a mouse/trackpad, the **Edit** button appears when hovering over the user's row. Keyboard focus reveals it too; touch devices keep Edit visible. The Tourism tab and its fee-setting card are available to the protected super admin and approved Tourism admins with Dashboard and Tourism access.

Edit sits beside the user name in the first column, which stays visible while scrolling the user table horizontally. Clicking it opens and scrolls to the account settings form.

The Users menu initially shows the account list. Editing fields appear only after selecting a row’s **Edit** button; **Add user** opens a blank form. **Cancel** or a successful save closes the form.


## Department workspaces

The Overview’s **Your departments** buttons open Tourism, Engineering, RHU,
MSWD, Treasurer, HRMO, MAO and Attendance when assigned. Tourism has a visitor
register; RHU contains Patient visits and Medicine inventory. Other departments
have workspace landing views until their feature data is connected.

The record views read the existing `tourism_records`, `patient_records` and
`pharmacy_inventory` collections. Verified database metadata on 2026-10-23:
`loginsept162026`, `(default)`, Standard edition, `asia-southeast1`.
RHU queries use `ownerId == signed-in UID`, order by document ID, and fetch 100
records per page from the server. Search, Philippine-date filters and displayed
summaries apply only to loaded records; Load next 100 expands that set. The
views are read-only. Patients retain separate visits; medicine quantities show
current inventory, not dispensing activity. Tourism reports are described below. Tourism fees show saved amounts,
not payment confirmation. Legacy Tourism counts/rates are shown as missing,
never invented; recorded tourist totals exclude missing counts. Photos remain viewable in the mobile app.

RHU account ownership boundaries apply to admins and super admins as well.
Tourism uses an authorized callable for department-wide reporting. Current feature rules also require Mobile app and specific feature
access for ordinary accounts, in addition to dashboard access. Permission
failures show an explicit error. No rules, cloud provisioning, mobile records or
sync queues are changed. Tourism fee management keeps its existing callable
functions and admin checks.

Verification: `node --test tests/*.test.cjs` covers navigation, permissions,
queries, pagination, legacy fees, service switching and clearing records after
sign-out. A signed-in browser check against real account records remains a
manual acceptance check.


## Tourism reports

Tourism displays read-only records from the Flutter app's `tourism_records`
collection across staff accounts. The protected super admin and approved Tourism
department admins with Dashboard and Tourism access can use these reports. The
`listTourismRecords` callable rechecks current account permissions for every page;
client Firestore ownership rules and mobile records remain unchanged.

Choose Day, Week (Monday–Sunday), or Month and a date in that period. Dates use
Asia/Manila and the original registration time, rather than cloud upload time.
The dashboard automatically fetches every page in that period before displaying
totals. Search filters both records and totals. Weekly/monthly reports include
daily breakdowns. View opens each named visitor/group registration's details.
Group members without names in the mobile record cannot be listed individually.
Legacy entries without tourist counts or fees are flagged and excluded only from
the corresponding total. Fees are recorded amounts, not verified payments.

Device-only or pending-upload records appear after successful mobile sync. No
local Flutter records are modified by reporting. Use Refresh after new uploads.


## Role-specific dashboards

`dashboard.html` is the shared entry point. After Firebase verifies dashboard access, it routes the account to `super-admin.html`, `department-admin.html`, or `user-dashboard.html`. Opening another role's URL routes back to the signed-in account's own dashboard. The super admin manages all accounts; department admins manage only regular users in assigned departments; regular users have no account-management controls. Backend permissions remain authoritative.

The user list now shows Mobile app access status. Role and department alone do not grant access: account approval, Mobile app, and the department service must also be enabled. Super admins can use **Apply approved department admin access** to fill approval, Web dashboard, Mobile app and assigned department services, review the checkboxes, then save. This button does not save automatically. Pending registrations remain pending until explicitly approved.

Edit the shared `dashboard.html` layout, then run `node build-dashboard-pages.cjs` to regenerate the three role entry pages. Run `node --test tests/*.test.cjs` to verify role routing, account controls and permissions.

The dashboard uses `dashboard-theme.css` for the desktop-inspired dark sidebar, colorful department cards, and responsive account/report panels. The theme is scoped to dashboard pages; public homepage and login styles remain in `styles.css`.


## Signed-in identity and device login history

The sidebar keeps the signed-in display name (email fallback), role, personal activity-history action for managers, and Sign out together. The page heading identifies Super admin, Department admin or Regular user.

Super admins can open History for every account. Approved department admins with dashboard permission can open History for regular users currently assigned to their departments, and My activity history for their own account. Every request rechecks current Auth permissions. Each event must also belong wholly to the manager's current departments; legacy events without a department scope are visible only to the super admin. This prevents a worker transfer from exposing another department's older events. Pagination can include an empty scoped page with more older events available.

Account create/edit/approval/role/access/password/status actions retain their audit trail, including failed/partial updates. Tourism fee changes are committed atomically with their audit event. Password values are never stored. Backend or console edits outside the dashboard are not automatically captured by these dashboard handlers.

New web and rebuilt mobile clients report device platform, manufacturer, model and OS version with login events. Android uses Build manufacturer/model/release; iOS uses Apple's device family and system version. This does not request serial numbers, hardware IDs or user-assigned device names. Device details are client-reported, not verified device identity. Firebase auth_time supplies the sign-in time, displayed in Asia/Manila. Old events retain a Device not reported label. Offline failures retry while the user remains signed in; signing out before a retry can leave a login unrecorded. Historic missing device data cannot be reconstructed.

Rebuild/install the mobile app for native device reporting. An Android update install preserves local records. iOS native compilation and physical-device acceptance remain separate checks.

Android build note: the current Intel/x86 native OpenCV assembler requires an unavailable host executable. `flutter build apk --debug --target-platform android-arm64` targets the connected ARM64 emulator and compatible Android phones without changing dependencies or clearing data.


## Department communications

Overview includes department announcements, My inbox, and admin Sent messages/composer, shared with the mobile app. Approved department members can read announcements even if a specific service menu is off. Department admins publish only to assigned departments and message their regular users; the super admin chooses any department. Inbox/Sent reads are always scoped to the signed-in account. Updates refresh every minute while visible and also have a manual Refresh action. Message text is rendered safely as plain text. Audit history records publish/send metadata, without exposing private message bodies to other account-history readers.


## Intro page editor (super admin only)

Overview includes Intro pages & global notices for the protected super admin. Page 1/2 have picture upload, title/text, removal, Save and Reload controls. Page 3 publishes an announcement or text instruction to Everyone (public, shown in Intro 3 after app sign-in) or a selected registered user (private, requires sign-in). The From the Super Admin panel shows Everyone / For me notices to signed-in dashboard users; only the super admin can inspect All sent notices. The same backend/content is used by the mobile app. Version conflicts retain the draft and require reloading before saving. Image uploads reuse the verified existing Storage bucket; no bucket/database/rules are provisioned.

## Tourism destinations and delegated management

Open **Tourism → Destinations & resorts**. Tourism admins and the protected
super admin can add, rename, deactivate, and reactivate resorts/usual destinations.
The list feeds the mobile registration field. Old visitor records keep their
original destination text. Duplicate names are rejected, and conflicting edits
retain the draft for review after **Reload destinations**.

Use **Load Tourism personnel** to delegate or remove destination management for
regular Tourism workers. Delegation enables catalog editing only; delegates
cannot grant access to others. Account approval, Tourism access, and separate
app/dashboard permission remain required. Personnel without delegation see the
available list without editing controls. The backend rechecks current account
permissions and delegation on every operation. Reload destinations after a grant
change to refresh the displayed controls.

The four destination callables use `tourism_catalog` in the existing
`loginsept162026` Standard `(default)` database in `asia-southeast1`. Default-deny
client rules apply. Changes and scoped audit events commit together. No existing
Tourism records, fee settings, rules, databases, or buckets are modified.

## Attendance review and corrections

Attendance opens the signed-in employee's own time-in/out review. Department
admins can review their assigned departments; the protected super admin can
choose any department. Administrators see recorded device make/model, platform,
OS version, verification method, original times and receipt time. Edit attendance
requires a reason and keeps paginated before/after history, actor and change time.
Employees have no edit controls. All authorization and edit revision checks run
again on the server. Dates and corrections use Philippine time.

Department admins no longer see Assigned departments controls in Users &
permissions; their own work menus remain available. New workers default to the
admin's first assigned department. Only the super admin can transfer accounts.
Attendance may be granted as a shared service within any assigned department.

Backend deployment is pending explicit approval after automatic approval review
rejected the seven-function deployment scope. The new attendance screens require
those backend functions before cloud review/editing is operational. See
`../dok_arvin_apps/docs/attendance.md` for exact targets, tests and APK details.

## Workspace refresh (27 October 2026)

Sign-in and all role dashboards now share San Antonio municipal branding,
responsive teal styling, larger controls, focus indicators and skip links.
`dashboard.html` is the source for the three role pages; run
`node build-dashboard-pages.cjs` after changing it.

Account pages include a Content Security Policy. Serve them over HTTPS in
production and verify actual Firebase sign-in, callable requests, images and
Firestore access under that policy. Production hosting must separately provide
anti-framing and other HTTP security headers; HTML meta policies cannot enforce
`frame-ancestors`. This local refresh does not publish or change Firebase
resources. See `../dok_arvin_apps/docs/security-ui-review.md` for the full scope.

Back/Forward restoration now clears private panels, refreshes authentication and
resumes the minute permission timer. Switching accounts invalidates in-flight
checks so a prior account cannot delay or overwrite the new account's access.

## Live deployment (27 October 2026)

The dashboard is live at https://loginsept162026.web.app/login.html. Hosting
is configured in `../dok_arvin_apps/firebase.json`. Its predeploy script stages
only runtime pages and assets in `build/web-dashboard`. Production sends CSP,
anti-framing, no-sniff, referrer and HTTPS security headers. The four Attendance
and three user-management functions are deployed to the existing Singapore
region; the earlier pending-deployment note is superseded. No Firestore or
Storage rules were changed.

The local dashboard is served at http://localhost:8080/login.html when the
Python server is running.

## Compact announcements (27 October 2026)

Announcement/Messages is at the top of every role workspace, outside the tab
panels. It starts collapsed and indicates unread announcements/inbox messages.
Mark as read & close retains account-specific message ID markers in this browser;
no message text is saved in browser storage. This preference is local to each
device/browser. The welcome heading/description hides after 20 seconds without
removing navigation or the role label. Routine access refreshes do not restart
that timer. All 47 web tests and 94 Flutter tests pass for the shared behavior.

## Interactive Explore atlas

Open `explore.html` from the homepage Explore link using the local server. The atlas contains 97 schematic Third Age map markers and 13 earlier-age or uncertain-geography index entries (110 places total). Hover or keyboard-focus a marker for a description; click, Enter, Space, or tap to pin details. Search ignores accents, the region selector filters the index and highlights matching markers, and zoom controls work with the scrollable map. Content is maintained in `middle-earth-places.js`; no Firebase writes or external map service are involved. This is a broad atlas, not an exhaustive catalogue across every age.

### Relief terrain edition

The atlas now layers a generated shaded-relief terrain illustration (`assets/middle-earth-relief.png`) beneath the existing SVG location markers. The built-in imagegen prompt is retained at `assets/middle-earth-relief.prompt.txt`. Terrain is an artistic interpretation; map coordinates remain approximate. Mouse/pen dragging pans the map; touch uses native scrolling. Zoom reaches 500%, minor place labels appear from 200%, Labels toggles map text, and supported browsers can expand the map to fullscreen. The original SVG terrain remains as a fallback if the artwork cannot load.

### City zoom and discovery cards

`explore.html` supports pointer-anchored wheel zoom, two-finger touch pinch, drag panning, double-click zoom, and +/- keyboard controls when the map is focused. Select Gondor or Minas Tirith and zoom beyond 250% to transition into the dedicated Minas Tirith city artwork, or use the city entry button. The city layer exposes six illustrated points of interest; its street layout is an artistic interpretation. Zoom out below the city’s minimum zoom or choose World map to restore the prior world camera. Reset returns to the full world view.

Every selected place, including index-only entries such as Angband, shows a discovery card for 7.5 seconds followed by a 2.2-second fade. Hover or keyboard focus pauses dismissal; Escape and the close button dismiss it. Persistent details remain below the map. The city artwork is generated with the built-in imagegen tool; its prompt is retained at `assets/minas-tirith-city.prompt.txt`.

A second zoom transition from the city at 250% opens an illustrated street quarter (`assets/minas-tirith-streets.png`), revealing larger individual houses, cobbled lanes, stalls and courtyards. Its four hotspots describe illustrative details without inventing canonical street names. City view restores the city camera, and World map restores the world camera directly. Both generated layers retain their own shading and relief at all supported zoom levels; this is a layered image atlas rather than a freely rotatable 3D mesh. The built-in imagegen street prompt is saved at `assets/minas-tirith-streets.prompt.txt`.

### Procedural 3D atlas update

The current close-up engine is `atlas-3d.js`, a local WebGL renderer with real geometry, directional lighting, shadow mapping, and procedural architectural/terrain detail. Every one of the 110 indexed places plus eight paths/roads can open in 3D. The world background and earlier image assets are preserved; the old image-only Minas Tirith transitions are superseded. Use Explore selected place in 3D, or select a place and zoom beyond 250%. Drag to orbit, Shift-drag or right-drag to pan, wheel/pinch to zoom, and Tilt camera to switch viewing angles. Arrow keys rotate the focused 3D canvas. Return to World map to restore the prior camera.

Zooming, tilting, and entering/leaving 3D close any discovery card and show no transition messages. Discovery cards remain only for deliberate place selections. Persistent descriptions appear below the map. Roads in `atlas-routes.js` are schematic connections rather than surveyed geometries. The 3D scenes are seeded procedural interpretations: they do not reproduce canonical street plans or provide individually handcrafted, photorealistic assets for every location. Earlier-age and uncertain places can be explored as independent 3D studies without assigning invented Third Age world-map positions.

### Terrain and material quality revision

The shared renderer now uses smooth terrain normals, seeded multi-scale height fields, a wider surrounding landscape, photographic ground/masonry/roof textures, normal-map surface relief, mipmaps and anisotropic filtering when supported. Building geometry includes foundations, ridge caps, timber corners, window lintels and chimneys; broadleaf trees use rounded multi-volume canopies. Incorrect inward normals on box/cone surfaces were corrected. All material assets are local CC0 files from Poly Haven; see `assets/materials/CREDITS.md` and `sources.json`. World-map data and popup-free zoom behavior are retained.

Lamedon and other rural Gondor regions now use valley scenes with smaller settlements, riverbanks, fields and bridges instead of generic concentric fortress cities. This remains a procedural atlas: photographic material detail improves surface quality, while unique high-fidelity models and accurate street layouts for every location are not supplied by this revision.

The quality revision also corrects inward-facing normals on all box and cone primitives, uses larger non-overlapping building footprints with terrain-aware foundations, and reuses terrain vertex calculations. Outer terrain is tessellated more finely near rivers. Surface maps use mipmapped minification and optional anisotropic filtering. Rendering is event-driven rather than continuously animating an idle scene.

### Deep-zoom resolution and camera revision

Close-up views progressively load local 4K material sources. Desktop color maps use up to 4096 pixels per side; normal maps and compact-screen views use a 2048-pixel GPU cap to reduce memory pressure. Lower-resolution maps remain the initial loading fallback. Uploads respect hardware texture limits, preserve mipmaps/anisotropic filtering, and prevent late low-resolution loads from replacing sharper textures. The renderer also respects the device's pixel ratio and drawing-buffer limit.

The camera now follows the local terrain elevation and checks its sightline against intervening terrain, fixing deep zoom beneath raised Gondor terraces. World imagery switches to geometry from 200% zoom. All indexed locations share the camera and material fixes. Gondor/Minas Tirith additionally has aligned terrace geometry, continuous curved walls, gatehouses, street-aligned buildings, paved city ground, and a more detailed citadel/court. These architectural forms remain artistic procedural interpretations; 4K surfaces do not turn the entire atlas into a photorealistic, individually authored Middle-earth model.

High-resolution source URLs are recorded under `highResolutionAssets` in `assets/materials/sources.json`. The sources remain CC0 Poly Haven materials; see `assets/materials/CREDITS.md`.

### Current navigation and illustrated maps

Explore in the main menu and the hero action open the separate `explore.html` page. The homepage contains no embedded map. A Back to main page link stays in the map toolbar; World map returns from a detail view to the world overview. Older `index.html#explore` bookmarks redirect to the separate page.

The supplied 2752 × 1536 Rivendell and Lothlórien artwork is copied unchanged under `assets/illustrations/`. Rivendell opens its supplied valley image; Lothlórien offers regional and canopy images. Minas Tirith retains the detailed city and street illustrations. Destination cards, map markers, and search all use the same detail-entry behavior. Wheel, pinch, keyboard and toolbar zoom preserve aspect ratio; zoom stops at source-image detail rather than enlarging the raster indefinitely. Region/close-up transitions and world returns do not open discovery cards. Hotspots follow the artwork during zoom/pan, provide hover descriptions and update persistent details when clicked.

These are illustrated location views with baked-in artwork labels, not newly authored freely rotatable 3D models. The optional Orbit 3D model button retains the procedural renderer. Locations without dedicated artwork keep their existing procedural views. Artwork provenance is documented in `assets/illustrations/README.md`.

Run `python3 serve-dashboard.py` for the local site. The server serves page/code files with `Cache-Control: no-store` and handles parallel asset requests; the page asset URLs are versioned to avoid stale interface copies.

## Cinematic and 3D atlas — 118 destinations (28 October 2026)

Every indexed destination now opens a cinematic camera tour and interactive 3D scene from Explore, including 110 named places and eight schematic routes. All 13 unlocated/earlier-age entries retain their null map coordinates. Photographic materials, reflective water, detailed foliage, per-place scene briefs and landmark geometry replace the former generic low-detail orbit view. Existing supplied illustrations remain accessible. Moria retains its gates/interior journey, detailed image-based characters, synchronized whip effects and a newly rendered 32-second video with brief Gandalf lines, original roars, weapon sounds, cavern ambience and captions. See [implementation, limits, assets and checks](docs/atlas-realism.md).

## Hobbiton in native 4K (28 October 2026)

Hobbiton now has a dedicated source-informed Hill/Water village scene, twelve actual articulated 3D hobbits, seven close-up landmarks and a six-chapter cinematic tour. Desktop 4K mode renders at 3840 x 2160; native 4K frame export, saved tour playback/download and live recording are available. The bundled movie is a native 4K, forty-second, 24-fps offline render with an original pastoral music track. The updated village adds layered woodland, detailed houses, leaf-based vegetables and sculpted mesh faces. See [Hobbiton details, accuracy references, assets and verification](docs/hobbiton-4k.md).

## Mordor regional 4K scene

Mordor now has a dedicated regional terrain model, ten exploration landmarks and an eight-chapter native 3840 × 2160, 24-fps cinematic. It follows the supplied brief from Morannon through Udûn, Gorgoroth, Orodruin and Barad-dûr to Cirith Ungol and cultivated Nurn. See [scene coverage and limits](docs/mordor-scene.md).

## Cinematic graphics across all 118 destinations (31 October 2026)

Every destination now supports native 3840 × 2160 live rendering, frame export and tour recording. Shared improvements include photographed roughness maps, denser terrain and vegetation, finer architectural silhouettes, biome-specific foreground detail, improved shadows/reflections and a linear photographic finishing pass. See [graphics changes, preview instructions and verification](docs/graphics-cinematic-20261031.md).

## Bag End: Bilbo, Gandalf and Frodo

Bag End now has a dedicated wooded garden scene with Bilbo's green-door home as the focal point, five smaller neighbouring smials, and animated Bilbo/Gandalf/Frodo character moments. It includes a six-view live camera tour, native UHD captures and a separately generated scene portrait. See [scene details, assets and controls](docs/bag-end-scene.md).
