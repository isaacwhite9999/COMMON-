---
name: common-community
description: Implement or review COMMON member identity, social graph, publishing, messaging, private circles, permissions and moderation.
---
Read AGENTS.md, docs/ARCHITECTURE_COMMUNITY.md and docs/TRUST_AND_SAFETY_POLICY.md. Trace UI actions to persisted records and authorization, including blocked users, unrelated users, former members, private circles and signed-out states. Use explicit RLS and grants, minimal privileged functions, scoped storage and negative tests. Support loading, pagination, empty and failure states, accessible mobile interactions and consent. Never invent members, messages or activity. Check current Supabase documentation before schema/API changes; test migrations in disposable databases before staging.
