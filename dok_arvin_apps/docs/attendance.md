# Biometric attendance

The cloud workflow added on 2026-10-26 is described below. The original
local-only implementation notes are retained for historical context.

Open **Attendance** in the home menu. Android 7/API 24+ and iOS 13+ are required.

## Personal devices

Sign in with the employee's existing account, select **My device**, and enroll a
name and employee ID. Enrollment and each attendance action require system
biometrics with passcode fallback disabled. The local profile is bound to the
signed-in Firebase UID; selecting another employee is not permitted in this mode.

System authentication accepts any face/finger enrolled in device settings. It
does not return a fingerprint template, matched fingerprint ID, or biometric
modality. This mode assumes the employee owns the device and controls its enrolled
biometrics. Do not use it as employee identification on a shared phone.

## Shared devices

An existing administrator or subadministrator with app access must sign in and
remain the device operator. Under **Shared**, enroll each employee's name,
employee ID, and face with their consent. Enrollment is supervised; the operator
is responsible for establishing that the name and ID belong to that employee.

A three-step camera interaction captures a frontal face, a randomized head turn,
and another frontal face. MobileFaceNet generates 192-dimensional embeddings via
`face_detection_tflite`; recognition compares both frontal samples against the
encrypted local employee registry. Matching requires cosine similarity >= 0.72
and at least 0.10 separation from the next employee. Unknown, ambiguous, multiple,
or changed faces fail without saving attendance. Similar already-enrolled faces
are rejected to avoid duplicate employee identities.

These thresholds are conservative defaults, **not validated accuracy guarantees**.
Test false acceptance/rejection with representative employees, lighting, eyewear,
and both camera platforms before using the feature for official attendance. The
movement prompt is a basic continuity check, **not certified presentation attack
detection**; replayed video or manipulated imagery may defeat it. A vetted PAD
solution would be needed for stronger anti-spoofing requirements.

Phone fingerprint sensors and Face ID cannot identify separate employees or
export the device's biometric registry. Shared fingerprint matching needs an
external scanner with a supported SDK; it is not implemented in this version.

## Time, location, and storage

Choose **Verify & time in** or **Verify & time out**, complete recognition, and
confirm the identified employee and measured coordinates. Cancelling saves
nothing. Each saved event contains the employee ID/name, UTC verification time,
device UTC offset, action, operator UID, verification method, latitude, longitude,
GPS measurement timestamp, accuracy in metres, and face similarity where available.

Location permission and enabled device location services are required. Attendance
rejects location samples older than 30 seconds relative to verification, samples
with accuracy worse than 100 metres, and OS-reported mock locations. Verification
expires after 60 seconds. These checks do not prove that an uncompromised device
or trusted clock was used: time is the local device clock and location is the OS
location provider, not a server-certified timestamp or geofence.

Time in/out must alternate, even across midnight, to support overnight shifts.
Consecutive records for an employee must be at least one minute apart. A disk
failure leaves in-memory records unchanged; writes are serialized and an encrypted
temporary file is renamed only after a successful flush. Unreadable data or a
missing encryption key stops writes rather than overwriting existing records.

The registry and attendance journal use AES-256-GCM in the app's private support
directory. The encryption key is stored in the platform Keychain/Keystore-backed
secure storage. Captured camera files are deleted after each scan; only embeddings
are retained. Android backup rules exclude attendance files and secure-storage
preferences while leaving existing tourism/patient/pharmacy data policies intact.

Records are scoped to the signed-in operator **on that device**. The same account
on another device has an independent registry and attendance sequence. Two
administrators on a shared device also have separate registries. This version
does not upload biometric templates, provision Firebase resources, or consolidate
cross-device attendance. Existing local tourism records are untouched. Uninstalling
the app or losing its encryption key may make attendance unrecoverable.

## Validation

`flutter test test/attendance_store_test.dart test/attendance_page_test.dart test/login_page_test.dart test/menu_design_test.dart`

Install a current CMake (tested with 4.4.4) and put its `bin` directory on PATH
for the OpenCV native build used by the offline face library. Older Android SDK
CMake versions can fail to identify the compiler in recent Xcode versions.

Verified: 17 targeted tests pass, static analysis of the attendance files is clean,
an unsigned iOS debug app builds, and the physical-device ARM Android debug APK
builds successfully. Build Android for physical ARM devices with
`flutter build apk --debug --target-platform android-arm,android-arm64`. The local
SDK x86 assembler is Intel-only; x86 emulator packaging on this Apple Silicon host
needs a compatible assembler/Rosetta setup.

Physical-device checks still needed: Face ID/Touch ID/fingerprint cancellation and
lockout; camera permission denial; one/multiple/unknown faces; enrollment and
matching on Android/iOS; approximate/denied location; record persistence after
restart; time in/out sequence; backgrounding during recognition; scan accuracy
and replay resistance. Simulators do not establish biometric accuracy.

## Cloud attendance and corrections (2026-10-26)

The updated app retains its encrypted local profiles and records. New events
include the linked Firebase employee UID, device platform/make/model and OS
version obtained through the existing native device channel. Face templates
remain local. Existing device-only events are preserved and are not assigned
invented historical device information. Legacy face profiles can be linked to
approved registered employees when next scanned by an administrator.

Personal mode requires system face/fingerprint authentication with passcode
fallback disabled. Shared mode compares locally enrolled faces and requires an
administrator and a registered approved employee in their departments. Any
biometric enrolled in the personal phone settings may authenticate. Both the
verification result and device information are client-reported; these are not
server hardware attestation or a guarantee of biometric identity/liveness.

New server-only callables: recordAttendance, listAttendance, editAttendance,
listAttendanceChanges. Data uses the existing Standard `(default)` database in
Singapore. No database, bucket or Firestore rules changes are needed.
`attendance_users/{uid}/records/{id}` provides self review;
`attendance_departments/{department}/records/{id}` provides department reports;
`.../records/{id}/changes/{id}` retains correction history.

Each operation re-reads current Firebase Auth permissions. Employees can review
only their own time-in/out and correction/void status. Department administrators
with dashboard access can review and correct only assigned departments; the
protected super admin can choose any department. Regular clients cannot edit.
Attendance permission can be enabled for any assigned department; it does not
require moving the employee into an Attendance department. Pending accounts
remain blocked until administrator approval.

New events upload idempotently after local save and retry while Attendance is
open. Server receipt time is saved separately from client-reported attendance
time. Upload enforces alternating time in/out. Stale/offline sequence conflicts
are retained locally and reported for administrator review rather than silently
rewritten. Cloud review shows the latest administrator corrections. Paging is
by server receipt time; event dates are displayed in Philippine time.

Corrections require a reason and expected revision. The corrected record,
owner's review copy, immutable before/after history and account audit event
commit together in one transaction. Original action/time, verification method
and device information are retained. No record deletion endpoint exists; an
administrator can mark an event void with a recorded reason. Corrections do not
rewrite the original encrypted event on the device.

The dashboard Attendance menu provides employee self review and administrator
review, correction and paginated history. Department-assignment controls in
Users & permissions are visible only to the super admin. Department admins
retain their assigned work menus; new workers default to the admin's first
assigned department when those assignment controls are hidden.


Deployment status (27 October 2026): deployed after the owner's request to
publish the changes. The four Attendance functions and three user-management
functions are live in `asia-southeast1`. All seven endpoints were checked and
returned HTTP 401 / UNAUTHENTICATED for signed-out requests. Existing account
claims are unchanged; administrators must enable Attendance for approved users.
Firestore and Storage rules were not deployed.

Validation for this change: 52 backend tests, 43 dashboard tests, and 19 Flutter
attendance/access tests passed. Dart analysis of attendance and access files
passed. The ARM64 debug APK built successfully at
`build/app/outputs/flutter-apk/app-debug.apk`. Actual face/fingerprint recognition
and synced multi-user use still need physical-device acceptance after backend
activation. Tests use mocked biometrics and do not establish recognition accuracy.

To redeploy this scope, use the configured codebase:

```sh
firebase deploy --project loginsept162026 --only functions:dashboard-users:recordAttendance,functions:dashboard-users:listAttendance,functions:dashboard-users:editAttendance,functions:dashboard-users:listAttendanceChanges,functions:dashboard-users:listDashboardUsers,functions:dashboard-users:createDashboardUser,functions:dashboard-users:updateDashboardUser
```

Do not deploy Firestore or Storage rules for this attendance change.
