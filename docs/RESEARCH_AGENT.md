# COMMON research assistant — gated pilot
The member interface now provides three explicit analysis workflows: evidence review, explanation, research planning. The function is not a general autonomous coding agent, does not retrieve real-time prices, cannot read member circles, and cannot execute actions or orders. It only receives text explicitly submitted with consent. The provider output is an unverified draft.
## Before activation
Deploy the Edge Function only after the mock tests and authentication/abuse checks pass. Configure server-side secrets: COMMON_AGENT_ENABLED=true, COMMON_AGENT_ORIGIN (exact app origin), COMMON_AGENT_MODEL, OPENAI_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, COMMON_AGENT_PILOT_USERS (comma-separated authenticated UUIDs). SUPABASE_URL and SUPABASE_ANON_KEY come from the environment. Never commit credentials. Use a dedicated provider project with a spend budget, verify gateway JWT configuration, and review privacy and provider retention. Five requests per pilot member and fifty globally per UTC day; quota fails closed. Set researchAgentEnabled=true in public config only after real authenticated smoke tests. No secrets belong in config.js.
## Future depth
QuantPad-inspired project-scoped assistants, custom commands, tool traces, dataset access controls, isolated code execution, persistent research memory, citation validation, and explicit publish approvals are separate requirements, not implemented by this endpoint.

## Research desk extension
Member-scoped local command templates, optional research-context notes, and explicitly saved analysis history. Six analysis modes cover methodology, evidence explanation, planning, Python review, fundamentals and risk. Notes are opt-in for each request; the combined request remains capped at 10,000 characters. History is not encrypted or synced, and is never auto-sent to a model. Python suggestions are not automatically executed. Provider remains gated.

## Project research plans

From a private project in Research Studio, open **Project research assistant**. Enter a goal and evidence, review the provider disclosure, then request a plan. The endpoint checks project ownership using the caller’s access token before checking quota or contacting the model. A new plan sends only the entered goal and evidence. Project notes, attachments and identifiers are excluded.

Save a result explicitly to keep its goal, evidence, completion status and plan in that project's account history. The owner may delete drafts, and deleting a project removes its history. Drafts are labeled as unverified member-saved records and may remain visible while the model is disabled. Open a saved draft and choose **Continue from this draft** to resume after closing or reloading Studio. Enter new evidence and separately approve the displayed excerpt of the previous response. Studio carries over the same goal, shares up to 3,000 characters of the selected draft, and excludes earlier user evidence and other responses. A saved follow-up stays linked to its parent in the same project. Each branch supports five turns. Delete follow-ups before deleting their parent, or delete the project to remove the entire history.

The workflow resumes member-reviewed turns on demand. Automatic planning loops, long-running job pause/resume, streaming and tools are outstanding. No saved turn is used as model context by default.

### Reusable project commands

Open **Reusable project commands** inside the project assistant to save, edit or delete a template. Its goal and evidence live in the owning project's account storage, so they are available when you reopen Studio. Applying a template fills the editable fields and clears prior consent. In a follow-up it fills evidence only, preserving the original goal. Review what the command inserted and consent before sending a request. With the model disabled, you can still manage commands without contacting a provider.

### Planning run approvals

Open **Planning runs and approvals** in a private project to capture a goal and evidence. Preparing a run saves the inputs privately without contacting the model. Approval shows the exact evidence, requires consent, and is tied to the reviewed run version. Only the Edge Function can claim or complete an attempt. A run has at most two member-approved attempts. A failed or expired attempt can be retried after reviewing the current run. Refresh the run to see work started in another browser or recover a timed-out request.

Cancel a run to revoke the lease and discard later model output. A provider request already in transit may continue and count against quota. Results and run state persist across page reloads. The run executes one planning request and has no background worker or executable tools. Operations must provision the platform-managed `SUPABASE_SERVICE_ROLE_KEY` in the Edge Function environment to enable approved runs. Keep it server-side. The existing model, pilot and quota gates also apply.
