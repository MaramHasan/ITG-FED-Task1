# MyCourses · Learning Studio

A standalone redesign of the course dashboard. **The redesign implementation lives in this directory.** The root `index.html` now opens this dashboard by default, preserving URL query parameters and page hashes. The original `style.css`, `js/`, `data/`, and assets remain untouched. There are no package dependencies, generated build files, or changes to shared configuration.

## Open it

Open the root `index.html` directly in a modern browser, or use your existing static development server and visit the project root. It automatically opens `learning-studio/index.html`. You can also visit `/learning-studio/` directly. No installation or build is required.

The root entry point is a small redirect so the implementation stays isolated. Both static hosting under a subdirectory and direct file opening are supported. The previous root page remains available in Git history.

## Included

- Responsive sidebar, mobile drawer, overview dashboard, and header search (Ctrl/Cmd K).
- Header sun/moon toggle and My profile → Preferences with Light, Dark, and System appearance. System is the default, follows device changes live, and a saved choice applies before rendering.
- Explore courses with category and level filters, sorting, global text search, course details, and useful empty states.
- Favorites with saved state, dedicated My Learning and Profile pages, and browser history navigation.
- Nine self-paced demo courses, each with five original reading lessons, code examples, and independent practice prompts.
- Enrollment, lesson completion, progress indicators, weekly goals, learning updates, and downloadable personal completion records.
- Editable profile and local persistence with input validation, stored-data validation, cross-tab updates, and feedback when browser storage is unavailable.
- Semantic elements, keyboard access, native modal focus management, mobile focus containment, reduced-motion support, and responsive layouts.
- Three learning paths with course roadmaps, enrollment, and progress shared with My Learning.
- A weekly study planner with editable sessions, day/status filters, overlap validation, completion tracking, undo, and `.ics` calendar export.
- A searchable notebook with pinned notes, course and lesson links, editing, deletion recovery, and Markdown export. Notes can be written directly from a lesson.
- Progress insights with 7/28-day activity charts, accessible data tables, study time, streaks, skill distribution, milestones, and CSV export.
- Header search across courses, learning paths, notes, and planned study sessions.

## Files

| File | Responsibility |
| --- | --- |
| `index.html` | Document, application shell, navigation, global search |
| `styles.css` | Design tokens, components, responsive and accessibility styles |
| `courses.js` | Independent catalog and reading lesson content |
| `app.js` | Routing, rendering, state, storage, interaction handling |
| `workspace.js` | Paths, planner, notebook, insights, and their independent storage |
| `workspace.css` | Workspace components, charts, calendars, and responsive layouts |
| `atelier.css` | Shared visual redesign: dark navigation, expressive hero, course covers, responsive surfaces and controls |
| `appearance.js` | Early theme initialization, saved preference, device appearance and cross-tab synchronization |
| `appearance.css` | Appearance picker and dark styles across the workspace |
| `assets/brand.svg` | Local vector brand mark |
| `verify.cjs` | Browser verification; see below |
| `verify-workspace.cjs` | Connected workspace behavior checks invoked by `verify.cjs` |
| `verify-appearance.cjs` | Theme persistence, device changes, keyboard controls, storage fallback and dark layouts |

## Demo data and persistence

The first visit uses a fictional Alex Morgan profile, two enrolled courses with sample progress, and two favorites. Ratings and instructor details are illustrative. Weekly activity starts at zero and records real completion actions in this browser. All profile inputs are escaped before rendering.

Changes are stored under `mycourses.learning-studio.v1` in local storage. They remain local to the browser and origin, without authentication or a server. Moving between `file://` and a server gives you a separate storage context. Browsers that restrict storage still allow in-memory use, with a warning when changes cannot persist. Clear this one storage key in browser developer tools to reset the demo.

The planner, notebook, and joined learning paths use a separate key, `mycourses.workspace.v1`. Existing profiles and course progress are preserved when upgrading. The workspace starts with no invented sessions or notes; create your own from the planner or a lesson. Clear both keys to reset the complete demo.

Appearance is stored separately as `light`, `dark`, or `system` under `mycourses.appearance.v1`. The header toggle selects an explicit light or dark preference; choose System in My profile → Preferences to follow the device again. Changes apply immediately, synchronize across tabs, and remain usable for the session if storage is unavailable. Clear this key to restore System without changing learning data.

Session dates use the device's local timezone. Calendar exports use UTC timestamps, support non-ASCII content and escaped text, and contain only planned sessions in the visible week. Session completion is recorded manually and does not complete course lessons. Insights distinguish all-time lesson progress (including demo starting progress) from dated activity; study minutes are the durations of sessions you mark complete. The streak counts consecutive days with a lesson completion or a recorded completed session, and remains current when the latest activity was yesterday. These are personal learning records, not automated attendance measurements.

Notes are plain text and are saved with the explicit Save note button. Pinned notes sort first. Exports include all notes, regardless of the current filter. Deleting a note or session provides an Undo action in the confirmation toast. The UI synchronizes saved data across tabs on the same origin.

Completion records are plain text personal records, not accredited certificates. Lesson duration estimates include independent practice; there is no video player or external lesson hosting. A production deployment would need authentication, server persistence, real course content and enrollment services, and appropriate privacy controls.

The interface uses local SVG/CSS artwork. Google Fonts is an optional enhancement; system sans-serif fallbacks keep the app functional without network access. The Atelier visual layer uses an ink sidebar, ivory surfaces, lime accents, illustrated course covers, and restrained entrance transitions with reduced-motion support. Mobile layouts keep weekly goals visible and show full-width course cards. The overview prioritizes continuing a lesson before planner and notebook shortcuts. Existing saved profiles, enrollments, notes, and sessions are preserved.

## Browser verification

`verify.cjs` runs a small local static server and checks navigation, global search, filters, favorites, lesson completion, profile persistence, downloads, dialogs, mobile navigation, and all nine page layouts at six viewport widths using Playwright. It also invokes `verify-workspace.cjs` to check path enrollment, notes, planner conflicts, calendar export, undo, cross-tab updates, and derived insights. It requires Playwright in the invoking environment and a Chromium-compatible browser. No test dependency is installed in the original project.

```powershell
# If Playwright is already available:
node learning-studio/verify.cjs
```

Optionally set `STUDIO_BROWSER_PATH` to the browser executable and `STUDIO_PLAYWRIGHT_PATH` to an absolute Playwright module path. Set `STUDIO_SCREENSHOT_DIR` to an existing directory to capture desktop and mobile screenshots during verification.
