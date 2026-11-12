# COMMON Trust & Safety — Meme-Coin and Investment-Fraud Policy

**Scope:** all users, communities, startup founder pages, ownership projects, discussions, direct messages, group chats, research links and future financial products.

## Core rule

COMMON has **zero tolerance for meme-coin promotion, rug pulls, investment scams, pump-and-dump schemes, impersonation, and off-platform requests to transfer funds to strangers**. No meme-coin sale, presale, airdrop, referral code, wallet funding request, or scheme promising investment returns may be organized through COMMON. Commons can discuss lawful investing in conventional assets through external regulated platforms; members must make their own decisions.

**Any meme-coin mention is a potential safety indicator, not proof the speaker is a scammer.** Automated review flags are confidential. We never publicly name someone a scammer on the basis of a keyword or automated classifier.

### Community-facing policy text

> We do not permit meme-coin promotion, rug pulls, pump-and-dump activity, misleading return guarantees, fake investment opportunities or requests to send money to unverified wallets. Messages that mention meme coins or suspected crypto fraud may be temporarily held for safety review, including educational warnings. Educational analysis can be restored when a reviewer confirms that it contains no solicitation or deceptive instruction. Confirmed scams are removed and may result in account restrictions, suspension or referral to authorities where appropriate.

## Automated first line (implemented in PostgreSQL)

- On insert and content edit, detect defined meme-coin terms, rug-pull/pump-and-dump language, wallet funding requests and misleading financial promises.
- Hold matching public discussions, group chat, private messages, group listings, research proposals, projects, and linked research sources from other participants until independent review.
- Author can still see their held content and why it was flagged, preventing silent disappearance.
- Members cannot approve their own flagged content. Independent group moderators may review cases within their community. **Only dedicated Trust & Safety staff can view and review direct-message cases.**
- Each flagged item creates one case with a confidential reason/rule, actor, short excerpt and review state. Each account accumulates a private risk-signal count; a signal does not establish fraud.
- Decisions generate a documented reviewer/action history. Approving a harmless warning can restore visibility; rejecting a promotional post keeps it hidden.
- Edits to approved posts are rechecked; reintroducing prohibited content immediately reopens the case and quarantines the post.
- Non-privileged users cannot directly update moderation cases or assign themselves a Trust & Safety role.
- User reports of suspected fraud are available for discussions; staff and group moderators must investigate evidence rather than assuming guilt.

## Human review standard

**Allowed after review:** genuine warnings about a scam, balanced academic explanations of meme coins, news reports about enforcement, factual research on a victim's experience, or evidence submitted for a fraud report, provided there is no investment pitch or malicious destination.

**Prohibited:** promotion or solicitation for a meme coin, coordinated artificial price movement, fraudulent token presales, wallet-drainer links, guaranteeing returns, fake startup equity or ownership claims, advice to send funds to private wallets, impersonating a founder/adviser, or soliciting off-platform financial transfers.

Reviewers must document why content is approved or rejected. An author may request an independent second review; no moderator can approve their own case. Account-level penalties should use confirmed behavior or multiple independently corroborated indicators, not the word "meme coin" alone.

## Safeguards and transparency

- The private moderation queue is not an investor warning label or public reputation score.
- Scam reports and private messages must not be exposed to unrelated community members.
- Links are never automatically trusted because they appear in a private group. Do not use unknown wallet-connect URLs.
- Hide verified malicious content immediately and preserve appropriate review/audit information.
- Avoid impossible claims such as "AI guarantees no scams": keyword filters do not catch all impersonation, novel tokens or obfuscated URLs.
- Rate limits, abuse throttles and member-blocking complement content checks; staff escalation, suspicious-domain intelligence, incident handling, user appeals and enforcement tooling must be verified before broad public launch.

## Implementation status (not a production readiness declaration)

- Database migration \`20261111000600_meme_coin_fraud_review.sql\`: server-side quarantine/reviewer scope; migrate/test before declaring it active.
- UI: account-visible held status, Trust & Safety tab, group moderator decision controls.
- PostgreSQL CI: multi-user visibility, author self-review ban, private DM confidentiality and edit rechecks.
- **Not yet implemented:** account suspension / appeal workflow, global Trust & Safety staff assignment, robust external link reputation, cross-platform fraud risk scoring, email/Google OAuth operational activation, live two-browser adversarial tests.
