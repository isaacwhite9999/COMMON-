# COMMON research assistant — gated pilot
The member interface now provides three explicit analysis workflows: evidence review, explanation, research planning. The function is not a general autonomous coding agent, does not retrieve real-time prices, cannot read member circles, and cannot execute actions or orders. It only receives text explicitly submitted with consent. The provider output is an unverified draft.
## Before activation
Deploy the Edge Function only after the mock tests and authentication/abuse checks pass. Configure server-side secrets: COMMON_AGENT_ENABLED=true, COMMON_AGENT_ORIGIN (exact app origin), COMMON_AGENT_MODEL, OPENAI_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, COMMON_AGENT_PILOT_USERS (comma-separated authenticated UUIDs). SUPABASE_URL and SUPABASE_ANON_KEY come from the environment. Never commit credentials. Use a dedicated provider project with a spend budget, verify gateway JWT configuration, and review privacy and provider retention. Five requests per pilot member and fifty globally per UTC day; quota fails closed. Set researchAgentEnabled=true in public config only after real authenticated smoke tests. No secrets belong in config.js.
## Future depth
QuantPad-inspired project-scoped assistants, custom commands, tool traces, dataset access controls, isolated code execution, persistent research memory, citation validation, and explicit publish approvals are separate requirements, not implemented by this endpoint.

## Research desk extension
Member-scoped local command templates, optional research-context notes, and explicitly saved analysis history. Six analysis modes cover methodology, evidence explanation, planning, Python review, fundamentals and risk. Notes are opt-in for each request; the combined request remains capped at 10,000 characters. History is not encrypted or synced, and is never auto-sent to a model. Python suggestions are not automatically executed. Provider remains gated.

## Project research plans

From a private project in Research Studio, open **Project research assistant**. Enter a goal and evidence, review the provider disclosure, then request a plan. The endpoint checks project ownership using the caller’s access token before checking quota or contacting the model. Only the entered goal and evidence are sent. Project notes, attachments, identifiers and previous drafts are excluded.

Save a result explicitly to keep its goal, evidence, completion status and plan in that project's account history. The owner may delete drafts, and deleting a project removes its history. Drafts are labeled as unverified member-saved records and may remain visible while the model is disabled. This is a bounded planning request with saved history. Autonomous execution, multi-turn context, streaming and tool runs remain open under QUANT-001, QUANT-002 and QUANT-029.
