# COMMON design and interaction audit

The application uses a shared navigation bar, restrained type hierarchy, compact data surfaces, and a navy and off-white palette. Existing chart colors continue to encode financial semantics. The workspace index uses a department list and shortcuts for importing data, starting a project, and returning to a circle. The department routes, auth boundaries, and financial gates follow the existing integration branch.

| Surface | Changes and verification |
| --- | --- |
| Workspace index and shared navigation | Department list, access context, workflow links, active department, and keyboard command menu. Alt+K opens tool search. Arrow keys move between results, Enter follows the selected destination, and Escape returns focus. |
| Markets | Removed decorative shortcut numbers, a nonfunctional chevron, and redundant sidebar copy. Aligned typography and control styling. Fixed tablet toolbar overflow. The existing market command search has an accessible label. Regression coverage includes Treasury series, valuation, options, bond risk, venture dilution, and quantitative strategy tools. |
| Browser Research | Aligned the overview, instrument watch, source library, project tabs, editor, notebooks, compute, portfolio, risk, ownership, circles, and nested settings with the shared typography and surfaces. Fixed narrow-phone layout overflow. The backtest report has a keyboard-operable observation cursor with numeric readings for both series and sortable comparison columns with persistent visibility. Report access, saved datasets, run history, and evidence publication are covered by the workspace and integration browser suites. |
| Research Studio | Shared typography, surfaces, and form controls. The default guidance preference selects essential explanations or advanced methodology without changing analytical tools. Existing project, data import, strategy, validation, saved result, and instructor workflows run under the browser fixture. |
| Community | Shared controls and surface scale, labeled active navigation, visible tablet icons, and native publishing dialogs. Escape restores focus to the originating control, while open dialogs preserve entered values through a render. Browser fixtures cover authorized feed pagination, retry, discussion drafts, private-circle publication, chat, polls, and inactive accounting. |
| Appearance | Nested controls persist navigation density, guidance, and desktop Research navigation width. The width is adjustable with a keyboard or pointer. Existing per-workspace preferences remain available. |

## Evidence and extent

The responsive browser matrix checks the public and signed-out department entry points, all primary local-workspace routes, and Appearance at 1440, 820, 390, and 320 CSS pixels. The authenticated fixture additionally exercises the Community journey at a tablet width, including modal Escape and focus restoration. The workspace suite covers chart and column interactions, with existing desktop and mobile analytical regression tests. Playwright uses synthetic or public-source fixtures for research and a fixture identity for member activity.

The standalone legacy educational FastAPI prototype retains its separate interface. The audit does not establish comprehensive coverage for every nested member and administrator permutation, other browser engines, or assistive technologies. Report column controls apply to the holdout comparison table. The layout width setting applies to the Research navigation panel. Those limits and the open page requirements remain in the product checklist.

Partial evidence applies to PLATFORM-004, 006–014 and 033, 036. No new financial or provider activation is included.
