# Database

MongoDB via Prisma. See [../server/prisma/schema.prisma](../server/prisma/schema.prisma) for the source of truth.

## Collections

| Collection           | Purpose                                                            |
| -------------------- | ------------------------------------------------------------------ |
| `User`               | Account, credentials, profile, presence.                           |
| `RefreshToken`       | Rotating refresh tokens with reuse-detection family IDs.           |
| `Conversation`       | Unified DIRECT/GROUP conversation.                                 |
| `ConversationMember` | Membership + role + per-user read cursor + mute state.             |
| `Message`            | Text/image/file/system messages, soft delete, edit trail, replies. |
| `MessageRead`        | Per-user read receipts for group semantics.                        |

## Key invariants

- A DIRECT conversation is uniquely identified by `directKey = sorted(userA, userB).join(':')`.
- Group operations check `ConversationMember.role`:
  - `OWNER` — one per group; can delete/transfer.
  - `ADMIN` — can add/remove members, change group info.
  - `MEMBER` — can read/send messages.
- `Message.deletedAt` is a soft-delete tombstone; content is redacted at the API boundary.
- `RefreshToken.familyId` enables detection of stolen refresh tokens: reuse of a
  revoked token in a family revokes the entire family.

## Indexes

Prisma manages the standard indexes declared in `schema.prisma`. MongoDB-only
indexes (currently just the full-text index on `Message.content`) are created
by `server/prisma/mongo-indexes.js`.

Run once after `prisma db push`:

```powershell
npm --workspace server run prisma:indexes
```
