# Private-circle investment memoranda

Open **Decisions** in a joined private circle and choose **View decision** on a nonbinding proposal. The proposal author can record an investment thesis, due diligence and sources, risks and unresolved questions, and conflict disclosures. The recorded memo is read-only. Circle owners and moderators can append one outcome and rationale for another member’s memo after confirming they have no material conflict in reviewing it. Current members can read the dated review history.

The decision panel keeps the existing support, oppose, and abstain poll. **Research ready** and **Changes requested** describe the evidence review. These outcomes do not close polls, confer binding authority, trigger an order, or change financial data.

| Acceptance | Evidence in this slice |
| --- | --- |
| SOCIAL-118, SOCIAL-120 | Existing private-circle proposal with structured investment thesis, diligence and source notes, and risk disclosure |
| SOCIAL-121, SOCIAL-129 | Nonbinding independent owner or moderator review, conflict attestation, and server-side denial of self-review |
| SOCIAL-126 | Required author disclosure and separate reviewer attestation |
| SOCIAL-131, SOCIAL-132 | Read-only review history with actor, timestamp, rationale, and outcome, linked to the poll |
| SOCIAL-116, SOCIAL-127, SOCIAL-128 | Browser regression of the existing nonbinding poll and abstention, with no execution authority |

The server rechecks private visibility, current membership, proposal ownership, and reviewer role. It applies the same account posting restrictions and investment-safety signals used by other community content. A flagged memo or review is rejected at submission. The moderation review workflow remains available for discussion posts. Direct edits and deletes are denied to authenticated members. The UI shows the 50 most recent reviews for a decision.

Apply the additive migration before releasing the static client. SQL tests cover privacy, revocation, invalid role, duplicate reviews, self-review, posting safety and immutability. The mobile browser fixture covers memo submission, field retention after failure, independent review, member read access and abstention. This slice does not add legally authorized signoff, committee-specific permissions, memo revision history, quorum and threshold policies, or execution tracking.
