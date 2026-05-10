# Security Specification for Church Management App

## Data Invariants
1. **User Identity**: A user can only access and modify their own private profile data. Roles can only be assigned by admins.
2. **Ministry Integrity**: Only pastors or admins can create or delete ministries.
3. **Financial Records**: Only accountants or admins can create or modify financial transactions. Members cannot read them.
4. **Chat Privacy**: Only participants of a chat room can read messages or add new messages to that room.
5. **Task Assignment**: Tasks must have an `assignedTo` and `assignedBy` field. `assignedBy` must match the current user on creation.
6. **Activity Management**: Only staff, pastors, or admins can create/update activities.
7. **Temporal Integrity**: All `createdAt` and `updatedAt` fields must match `request.time`.

## The "Dirty Dozen" Payloads (Deny List)

1. **Identity Spoofing**: Attempt to create a user profile with a different `uid` than the auth token.
2. **Privilege Escalation**: A non-admin user attempting to update their own `role` to 'admin'.
3. **Shadow Update**: Updating a Task and sneaking in an `isVerified: true` field not in the schema.
4. **Orphaned Message**: Creating a message in a room the user is not a participant of.
5. **PII Leak**: A member attempting to read another member's full profile (including address/phone).
6. **Financial Tampering**: A member attempting to read the `transactions` collection.
7. **Resource Poisoning**: Injecting a 2MB string into a `topic` field in `PrayerTopic`.
8. **State Shortcutting**: Skipping 'in-progress' and marking a task as 'done' while also changing the `assignedTo` field illegally.
9. **Timestamp Faking**: Providing a client-side `createdAt` date for a new Activity.
10. **ID Poisoning**: Using a 1KB junk string as a document ID for a new user.
11. **Self-Approval**: A new user setting `isApproved: true` during registration.
12. **Unauthorized Ministry Creation**: A member attempting to create a new ministry.

## Firestore Rules Test Runner
(See `firestore.rules.test.ts` for implementation details once test environment is ready)
