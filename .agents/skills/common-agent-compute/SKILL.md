---
name: common-agent-compute
description: Build or review COMMON AI agents, tool calling, research memory, Python execution, notebooks and isolated computation.
---
Read AGENTS.md, docs/RESEARCH_AGENT.md and docs/QUANT_DEVELOPMENT_ENVIRONMENT.md. Use scoped project authorization, explicit model-data consent, untrusted-input boundaries, bounded state machines, structured tools, human approval for consequential actions, execution traces and cancellation. Keep model credentials server-side. Never execute arbitrary code in a shared API host; require isolated execution, no injected secrets, network restrictions, quotas and cleanup. Test with mocks and actual sandbox smoke tests separately. Label unavailable providers and unverified output. No autonomous financial execution.
