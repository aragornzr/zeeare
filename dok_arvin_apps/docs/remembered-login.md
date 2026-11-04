# Remember password

The native app login screen has an unchecked-by-default **Remember password** option. Checking it saves the trimmed email and exact password only after Firebase confirms a successful sign-in. Returning to the login screen restores both fields, with the password masked; users still press Sign In. Unchecking removes the saved login immediately, and signing in unchecked leaves no saved login. A failed sign-in never saves the attempted credentials.

`RememberedLoginStore` uses the existing `flutter_secure_storage` dependency and one entry, `remembered_login_v1`. Apple platforms use the device-only unlocked Keychain accessibility option. Android uses the package's default platform-backed encryption; existing backup exclusions already exclude its storage files. This entry is never written to Firestore, account history, logs or the local feature-record files. Deleting it does not delete attendance encryption keys or other secure-storage entries.

A storage failure does not block manual sign-in; a failed save/delete after successful authentication reports that the remembered login could not be updated. A failed explicit removal shows feedback and restores the checked state so the user can retry. The preference does not change Firebase session persistence or remove device-saved tourism data. Passwords changed by an admin must be entered again to replace stale saved credentials on the next successful login.

Flutter Web leaves this checkbox disabled and directs users to their browser password manager. The separate web dashboard's existing Save login option is unchanged. Rebuild/install the native app to include this UI. Automated tests cover opt-in-only saving, no writes before successful Auth, exact password restoration, removal, preserved attendance keys and failed logins. Verify Keychain/Keystore behavior on target devices before release.

## Menu access after login

After successful Firebase authentication, HomePage refreshes the Firebase ID token and uses its server-issued custom claims to build the service menu. Accounts need approval, an assigned department and Mobile app access. Each service appears only when its section permission is enabled and belongs to an assigned department. The protected super admin sees all service entries. An approved account with app access but no assigned service sections sees an empty-menu message instead of all departments.

Set assignments in **Web dashboard → Users & permissions → Edit**: assign the department, approve the account, enable **Mobile app**, and check the desired service sections. The menu refreshes each minute and through **Refresh menu access**; feature entry still checks permissions separately. Access loss hides service content and preserves locally saved records. No Firestore rules deployment is needed for this menu change; the pending Tourism group/fee rules remain local as requested.

## Settings and sign-out

Tap the San Antonio logo on the main menu, or **Settings / Sign out** directly beneath the branding, to open **Settings**. Its **Sign out** item calls Firebase Auth signOut and replaces all routes with the login screen, preventing Back from reopening the authenticated menu. Failed sign-out stays on Settings and offers retry. Sign-out preserves local tourism/attendance records and the user's explicitly remembered credentials; uncheck Remember password on login to remove those credentials.
