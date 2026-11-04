# Dashboard user management

Firebase v2 callable functions in the existing `loginsept162026` project, Node.js 22, `asia-southeast1`, maximum two instances each. Existing database and Storage locations are retained.

The protected super admin is Firebase UID `z9I3AD77p5PWJjsP2Ae27nW7Tze2` (original email `zaldy.rafanan@gmail.com`). Its identity is pinned by UID, so changing the email does not transfer protection. Only that UID with the `superadmin` claim has all permissions. It may edit all administrator and regular accounts, including its own profile/password. Dashboard functions reject creating another super admin, demoting, disabling or removing access from the protected account. There is no account-deletion endpoint. This protection applies to the dashboard/backend; Firebase project owners and Firebase Auth account self-deletion APIs are outside that boundary.

Department admins require explicit approval, assigned departments and dashboard permission. Only the super admin assigns admins and their departments/section permissions. Department admins list and manage regular users in their assigned departments, including pending users, but cannot edit managers, transfer existing users, or grant access beyond their own assignments. Regular users belong to one department; admins may manage several.

Department keys: `tourism`, `engineering`, `rhu`, `mswd`, `treasurer`, `hrmo`, `mao`, `attendance`. Section keys include those departments plus `dashboard`, `apps`, `patients`, `pharmacy`. Patient and pharmacy sections belong to RHU. Department membership alone does not grant a section; approval and its access checkbox are also required. New self-registrations without claims remain pending and unassigned. The super admin routes these accounts to a department, then the department admin approves them and selects the necessary menu access. Legacy roles without explicit approval/departments must be assigned again; old admin claims no longer imply access to all sections.

- `listDashboardUsers`: paginated sanitized Auth records, filtered by the caller's current department authority.
- `createDashboardUser`: creates an initially disabled Auth account, sets approved/role/departments/access claims, then enables sign-in as requested. Pending approval blocks menus without disabling sign-in. Failed initialization deletes only the newly created account.
- `updateDashboardUser`: edits profile, password, status and assignments; preserves unrelated claims and revokes refresh tokens.

Passwords are sent only to Firebase Authentication, never stored in Firestore, logged or returned. Role/approval/department claims can be written only through privileged Firebase Admin operations. The functions reread current Auth records before authorization to reject stale manager privileges. Cloud rules retain record ownership boundaries even for the super admin. Local saved records are untouched.

Auth profile and claims updates are separate operations: refresh users after an error before retrying. Existing ID tokens can retain old feature access for up to approximately one hour; dashboard/backend management checks current claims immediately, and clients refresh permissions every minute. Sign in again after changes. Rebuild mobile clients to apply the new menu gates.

Run `npm test`. Deploy only existing functions and rules using the project configuration; do not provision new databases/buckets without explicit region and usage-cost approval.


Account history now permits approved department admins to read their own and assigned regular users' history. Events are additionally filtered to their current departments; missing legacy scopes remain super-admin-only. Login events store bounded client-reported platform/manufacturer/model/OS fields and current department scope, with login time from the authenticated Firebase session. Existing direct Firestore denial remains unchanged. No rules or database provisioning is needed.
