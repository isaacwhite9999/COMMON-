# COMMON — REA (Reverse Engineer Anything) setup and evidence workflow
Updated: November 12, 2026

## Official REA tool
- Original repository: https://github.com/morluto/rea
- Documentation: https://rea.tools/
- Package: https://www.npmjs.com/package/rea-agents
- REA is an optional **local development tool** for inspecting the behavior of apps and code we own, open-source projects that permit it, and systems where the operator has authorization.
- REA is not a production dependency, is never loaded by COMMON users, and needs no COMMON/Supabase access keys.

## One-time Cursor setup on macOS

1. Install Node.js compatible with the current REA release. See the repository README because Node minimum versions change. As of this review REA requires Node 22.x >=22.23.4, 24.x >=24.22.1 or 26.12.1+.
2. From a trusted terminal location **outside** the COMMON repository, run:

   ```bash
   node --version
   npx rea-agents@latest setup
   ```

3. Select **Cursor** as the target coding agent. Review the setup's proposed changes and explicitly approve; do not silently modify existing Cursor configuration or install Hopper/other native tools.
4. Restart Cursor. In Cursor's MCP/Tools settings confirm the REA server is connected and inspect the available tools.
5. For a one-off assessment of your own deployed COMMON website, open a dedicated Chrome instance with remote debugging enabled (use a disposable browser profile):

   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/.cache/common-rea-chrome" \
     "https://isaacwhite9999.github.io/COMMON-/live/"
   ```

6. Do not expose debugging port 9222 to the internet or browse sensitive websites with that debug profile. REA can discover local browser targets and inspect accessible page structure.
7. Ask Cursor:
   
   > Use REA to inspect our **own** COMMON app at the local Chrome DevTools endpoint http://127.0.0.1:9222. Inventory routes, accessibility, navigation, browser errors, resource loading and cross-feature consistency. Do not inspect private tokens, passwords, user messages or wallet information. Produce a source-grounded defect report and implement fixes against COMMON in an isolated branch. Run automated tests before committing.

For installed REA commands, use `rea --help` and the official guides. Do not assume a CLI flag exists without checking. Browser inspection may require choosing a page target from `rea list-browser-targets http://127.0.0.1:9222 --json`.

## Clean-room product analysis

For **independent** feature design and implementation, maintain:
- feature or user need, public source URL, observed date, required input/output,
- testable acceptance criteria and accessible UI behavior,
- independent implementation decisions and data provenance,
- open-source license verification (including copyleft obligations),
- own screenshots of the COMMON implementation, performance and automated test logs.

Build original modules: Research Studio, student-mode instructor, CSV OHLCV validation, reproducible backtests, parameter sweeps, risk summaries, independent security model, shareable research with disclosures, later licensed market-data integrations. Describe unimplemented datasets or paid services as integrations—not live data.

**Do not target QuantPad with REA.** QuantPad's published Acceptable Use Policy and License expressly prohibit reverse-engineering the service and using it to develop a competing application or its workflows; see:
- https://quantpad.ai/acceptable-use
- https://quantpad.ai/license

It is reasonable to read and cite **public marketing documentation** and standard financial mathematics to identify generic problems to solve. Do not copy QuantPad private code, source maps, market feeds, prompt pipelines, trade data, outputs, workflows or protected imagery. If authorized access is negotiated later, confirm its scope in writing.

## Engineering acceptance gates

- No "we copied the competitor" branch merges: clean-room specification and original code review.
- Real signed-in persisted accounts, RLS for every user-owned research item.
- Import real and properly licensed datasets, show date/source/data quality warnings.
- Backtests prevent lookahead bias and include transaction cost assumptions.
- Every quantitative metric has an explicit definition and regression test.
- Beginner and expert explanations are distinct, contextual, and do not guarantee financial outcomes.
- No trading, custody, fundraising or personalized investment advice without regulated providers.

## Current runtime limitation

The ChatGPT execution container where this integration was prepared had Node 22.16.0 (below the current REA minimum) and could not reach npm registry (`EAI_AGAIN`). Therefore **REA was not installed or executed in that container**; the workflow above is a documented local Cursor setup, not a completed REA assessment. Running it on the developer's Mac requires an appropriate Node version and network access.
