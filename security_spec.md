# CampusSpace UCC Security Specification

## Data Invariants
1. **User Profile Ownership & PII Isolation**: `/users/{userId}` documents contain PII (`email`, `phone`, `uccId`) and may only be read (`get`) by the owning user (`request.auth.uid == userId`) or a verified admin. `uid` must match `request.auth.uid` on creation and remain immutable.
2. **No Self-Assigned Admin Privileges**: Users may select a campus role label (`Lecturer`, `Class Representative`, `AV Technician`, `Department Coordinator`, `Student`) in their profile, but system admin privileges are strictly controlled via `/admins/{uid}` (non-writable from client) or verified admin email (`email_verified == true`).
3. **Referential Integrity on Bookings, Emergencies & AV Logs**: Every `/bookings/{bookingId}`, `/emergencies/{emergencyId}`, and `/avLogs/{logId}` document must reference an existing `/rooms/{roomId}` document via `exists()`.
4. **Temporal & Identity Integrity**: `ownerId` must equal `request.auth.uid` on creation and remain immutable. `createdAt` and `updatedAt` must strictly equal `request.time`.
5. **Terminal State Locking**: Cancelled or Completed bookings cannot be modified (`existing().status != 'Cancelled' && existing().status != 'Completed'`). Resolved emergencies cannot be reopened by non-admins. AV logs are append-only (`update, delete: if false`).

## Dirty Dozen Adversarial Payloads
1. **Shadow Field Injection on Profile Create**: `{ uid, fullName, ..., isAdmin: true }` -> Rejected by `hasOnly(...)`.
2. **Unverified Admin Email Spoof**: Request with admin email string but `email_verified: false` -> Rejected by `email_verified == true` check in `isAdmin()`.
3. **Cross-User PII Read**: Authenticated User B performs `get(/users/userA)` -> Rejected by `isOwner(userId) || isAdmin()`.
4. **UID Spoofing on Booking Create**: User B creates booking with `ownerId: 'userA'` -> Rejected by `incoming().ownerId == request.auth.uid`.
5. **Orphaned Booking Create**: Booking with non-existent `roomId: 'FAKE-999'` -> Rejected by `exists(/databases/$(database)/documents/rooms/$(incoming().roomId))`.
6. **Oversized Document ID Poisoning**: Creating `/rooms/<1500-char-id>` -> Rejected by `isValidId()` (`<= 128` chars + regex).
7. **Client Timestamp Forgery**: Setting `createdAt` to a past timestamp instead of `serverTimestamp()` -> Rejected by `incoming().createdAt == request.time`.
8. **Mutating Cancelled Booking**: Updating a booking after `status == 'Cancelled'` -> Rejected by terminal state guard.
9. **Type Poisoning on Capacity / Battery**: Sending `micBattery: "100"` (string) or `micBattery: 999` -> Rejected by `is int && val >= 0 && val <= 100`.
10. **Escalating Profile UID on Update**: Updating `/users/{uid}` to change `uid` or `createdAt` -> Rejected by `affectedKeys().hasOnly(...)` and immutability checks.
11. **Deleting Immutable AV Log**: Client attempts `deleteDoc(/avLogs/log1)` -> Rejected by `allow update, delete: if false`.
12. **Client-Side Admin Escalation**: Client attempts `setDoc(/admins/myUid, { active: true })` -> Rejected by `allow write: if false`.
