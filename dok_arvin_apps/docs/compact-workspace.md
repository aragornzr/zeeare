# Compact workspace — 27 October 2026

The mobile home screen places Announcement/Messages immediately below Settings / Sign out. The dashboard places it at the start of the workspace, below the header containing Sign out, outside the individual tab panels. This applies to regular users, department administrators and the super admin.

The panel starts collapsed. Open it to read announcements, personal inbox messages, and administrator sent messages/composer. Each account can use Mark as read & close for the currently loaded list. Read announcements do not mark personal messages as read. New arrivals show an unread indicator without automatically expanding the panel. The current department feed and recent announcements/inboxes in other assigned departments refresh each minute. Unread indicators cover the latest 30 updates fetched per feed; older pages remain available through Load older. No total unread count is claimed.

Read markers contain only department/feed/message IDs. They are scoped to the signed-in UID and saved in Flutter secure storage or browser localStorage. This is a device/browser preference, not a server read receipt or cross-device synchronization. Signing out clears displayed content; saved markers for that account remain. Storage failure leaves the content available and reports that read status could not be saved.

The mobile Your daily workspace / Good service. Stronger community. banner is removed after 20 seconds on the home screen. Its timer survives routine permission checks. The dashboard welcome heading and description also disappear after 20 seconds while its role label and all navigation remain available.

Checks: 94 Flutter tests and 47 web tests, including per-account persistence, unread inbox isolation, new arrivals, compact layout and timer behavior. No backend functions, Firestore rules or Storage rules changed for this UI update.
