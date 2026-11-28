# Account discussion drafts

The member composer keeps one general discussion draft per account. Browser edits are saved under the current member ID. Selecting **Save draft** synchronizes the title, text, and optional circle to the account. A signed-in member can resume that version on another device. If account sync fails, the composer keeps the device copy and reports how to retry. The device copy uses browser storage on the current origin.

The saved version has a monotonically increasing revision when written through the composer. If the account revision changes and the browser has unsynced edits, the composer asks the member which copy to keep before writing again. Discard clears the account slot through a revision-checked write. While disconnected, discard requires a retry before showing completion.

Postgres row-level policies grant access only to the draft owner. Selecting a circle for an account draft requires membership. Publication locks the owner’s draft row, rechecks current membership and complete content, and runs the existing discussion insertion and moderation rules in the same transaction that clears the draft. A browser-generated submission ID identifies retries of the most recent publication. Clearing content leaves the revision to prevent stale-device writes.

The private-circle research evidence handoff continues through its existing review and publication flow. This slot does not schedule posts, sync every keystroke to the server, or manage multiple simultaneous drafts.

Apply the draft migration before publishing the updated member UI. The older client and existing research evidence flow remain compatible with the additive schema. The SQL smoke exercises revision conflicts, owner isolation, atomic publication, retry, and revoked membership. The browser test uses two isolated contexts and a shared API fixture to exercise synchronization and conflict handling. Both are linked to SOCIAL-053.
