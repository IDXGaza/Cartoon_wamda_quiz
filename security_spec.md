# Security Specification - ومضة (Wamda)

## Data Invariants
1. A **Room** must have a valid `hostId` (the user who created it).
2. A **Player** can only join a Room if that Room exists.
3. Only the `host` of a Room can change the `gameState` (except for specific state transitions allowed by system or players).
4. For the **Buzzer** functionality:
    - Only one player can buzz at a time.
    - A player can only buzz if the `gameState` is 'question'.
    - Once a player buzzes (`buzzedPlayerId` is set), no one else can change it until the host clears it.
5. **VaultQuestions** belong to a user and should only be accessible/modifiable by that user.
6. **User** profiles should be immutable for `role` unless the updater is an admin.
7. `createdAt` and `joinedAt` fields are immutable after creation.
8. All string fields must have size constraints.

## "The Dirty Dozen" Payloads (Attack Vectors)

### Identity & Authentication
1. **User Spoofing**: Attempting to create a user profile with a UID that doesn't match `request.auth.uid`.
2. **Admin Escalation**: Attempting to set `role: 'admin'` during user creation.
3. **Vault Hijacking**: Attempting to read or write a `VaultQuestion` with a `userId` belonging to another user.

### Integrity & Validation
4. **ID Poisoning**: Injecting a 1MB string as a `roomId` or `playerId`.
5. **Shadow Fields**: Adding an `isAdmin: true` field to a `Player` document to see if it bypasses logic.
6. **Type Mismatch**: Sending `score: "one thousand"` (string) instead of a number.
7. **Negative Score**: Sending `score: -100` to undermine the game.

### State & Logic
8. **Buzzer Hijack**: Attempting to overwrite `buzzedPlayerId` when another player has already buzzed.
9. **Illegal State Jump**: Changing `gameState` from 'waiting' directly to 'revealed' bypassing 'playing' and 'question'.
10. **Time Travel**: Providing a `createdAt` date from the year 2099.
11. **Orphaned Player**: Creating a `Player` in a non-existent `roomId`.
12. **Mass Data Scraping**: Attempting to `list` all rooms in the system without a filter.

## Test Runner (Logic verification)

A `firestore.rules.test.ts` (conceptual) would verify:
- `get(/rooms/NON_EXISTENT)` -> DENIED
- `update(/rooms/R1, { buzzedPlayerId: 'ME' })` where `buzzedPlayerId` is already 'HIM' -> DENIED
- `create(/questions_vault/Q1, { userId: 'OTHER' })` -> DENIED
- `update(/users/ME, { role: 'admin' })` -> DENIED
- `list(/rooms)` without constraints -> DENIED
