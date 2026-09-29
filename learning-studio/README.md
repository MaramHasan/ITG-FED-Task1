# MyCourses · Learning Studio

A standalone redesign of the course dashboard. **The redesign implementation lives in this directory.** The root `index.html` now opens this dashboard by default, preserving URL query parameters and page hashes. The original `style.css`, `js/`, `data/`, and assets remain untouched. There are no package dependencies, generated build files, or changes to shared configuration.

## Open it

Open the root `index.html` directly in a modern browser, or use your existing static development server and visit the project root. It automatically opens `learning-studio/index.html`. You can also visit `/learning-studio/` directly. No installation or build is required.

Signed-out visitors see `sign-in.html`. Choose **Explore the demo**, use `alex.morgan@example.com` / `learn-together`, or choose **Create an account** to register a local learner. `sign-up.html` and `register.html` open the same registration flow. All three auth screens also have root entry points.

The root entry point is a small redirect so the implementation stays isolated. Both static hosting under a subdirectory and direct file opening are supported. The previous root page remains available in Git history.

## Included

- Responsive sidebar, mobile drawer, overview dashboard, and header search (Ctrl/Cmd K).
- Matching sign-in, registration, and signed-out pages with form validation, password visibility, password confirmation, duplicate-email handling, and shared appearance. Sidebar and Profile include Sign out links.
- Header sun/moon toggle and My profile → Preferences with Light, Dark, and System appearance. System is the default, follows device changes live, and a saved choice applies before rendering.
- Explore courses with category and level filters, sorting, global text search, course details, and useful empty states.
- Dedicated `course-details.html?id=html` page with course overview, instructor, expandable lesson roadmap, enrollment, favorites, and saved progress. Course links share and refresh directly, with loading, retry, missing-course, and no-lessons states.
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
| `sign-in.html`, `sign-up.html`, `sign-out.html` | Responsive local account screens; `register.html` aliases sign-up |
| `auth-service.js` | Local registration, password verification, session storage, return URL validation, and account-specific storage keys |
| `auth-guard.js` | Signed-out navigation and cross-tab account changes |
| `auth.js`, `auth.css` | Authentication form interactions and shared presentation |
| `styles.css` | Design tokens, components, responsive and accessibility styles |
| `courses.js` | Independent catalog and reading lesson content |
| `course-details.html` | Details entry point using the existing application shell (also linked from the root redirect) |
| `course-service.js` | Async local course lookup and reading-lesson normalization; no remote API calls |
| `course-details.js` | Course Details presentation and page states |
| `course-details.css` | Responsive course overview, roadmap, enrollment card, and dark theme |
| `app.js` | Routing, rendering, state, storage, interaction handling |
| `workspace.js` | Paths, planner, notebook, insights, and their independent storage |
| `workspace.css` | Workspace components, charts, calendars, and responsive layouts |
| `atelier.css` | Shared visual redesign: dark navigation, expressive hero, course covers, responsive surfaces and controls |
| `appearance.js` | Early theme initialization, saved preference, device appearance and cross-tab synchronization |
| `appearance.css` | Appearance picker and dark styles across the workspace |
| `assets/brand.svg` | Local vector brand mark |
| `verify.cjs` | Browser verification; see below |
| `verify-course-details.cjs` | Details links, history, page states, learning actions, file opening, and responsive theme checks |
| `verify-auth.cjs`, `verify-registration.cjs` | Local account lifecycle, validation, account separation, storage errors, navigation, and responsive auth pages |
| `verify-workspace.cjs` | Connected workspace behavior checks invoked by `verify.cjs` |
| `verify-appearance.cjs` | Theme persistence, device changes, keyboard controls, storage fallback and dark layouts |

## Demo data and persistence

Course Details continues to use `STUDIO_COURSES` and `STUDIO_LESSONS` from `courses.js`. The local service maps lesson tuples into named fields before rendering; the existing course UI model and IDs are preserved. The Education API is intentionally not connected in this UI iteration. The application controller handles loading and failures outside the renderer, so a future API adapter can replace the local service. No API response schema is assumed.

The sample account uses a fictional Alex Morgan profile, two enrolled courses with sample progress, and two favorites. Registered local accounts start with the entered name/email and empty enrollments, favorites, progress, and workspace data. Ratings and instructor details are illustrative. Weekly activity starts at zero and records real completion actions in this browser. All profile inputs are escaped before rendering.

The sample account stores changes under `mycourses.learning-studio.v1` in local storage. Registered accounts append their generated account ID to this key and to `mycourses.workspace.v1`, keeping their saved learning separate. Moving between `file://` and a server gives you a separate storage context. Signing out preserves saved learning data. Browsers that restrict storage can explore the demo with a tab session when session storage is available; registration requires local storage.

This is a local UI prototype, not server authentication. Accounts are stored in `mycourses.local-accounts.v1`, and the active account ID in `mycourses.demo-session.v1`. Passwords are stored as salted PBKDF2-SHA-256 verifiers (210,000 iterations), never plaintext. The client-side guard and local data can be modified through browser tools; a production account system needs a backend. There is no email delivery, account recovery, or online account creation. Registration uses Web Crypto and requires HTTPS, localhost, or a browser that supports it for local files. The profile keeps a registered account's sign-in email read-only.

The planner, notebook, and joined learning paths use a separate key, `mycourses.workspace.v1`. Existing profiles and course progress are preserved when upgrading. The workspace starts with no invented sessions or notes; create your own from the planner or a lesson. Clear both keys to reset the complete demo.

Appearance is stored separately as `light`, `dark`, or `system` under `mycourses.appearance.v1`. The header toggle selects an explicit light or dark preference; choose System in My profile → Preferences to follow the device again. Changes apply immediately, synchronize across tabs, and remain usable for the session if storage is unavailable. Clear this key to restore System without changing learning data.

Session dates use the device's local timezone. Calendar exports use UTC timestamps, support non-ASCII content and escaped text, and contain only planned sessions in the visible week. Session completion is recorded manually and does not complete course lessons. Insights distinguish all-time lesson progress (including demo starting progress) from dated activity; study minutes are the durations of sessions you mark complete. The streak counts consecutive days with a lesson completion or a recorded completed session, and remains current when the latest activity was yesterday. These are personal learning records, not automated attendance measurements.

Notes are plain text and are saved with the explicit Save note button. Pinned notes sort first. Exports include all notes, regardless of the current filter. Deleting a note or session provides an Undo action in the confirmation toast. The UI synchronizes saved data across tabs on the same origin.

Completion records are plain text personal records, not accredited certificates. Lesson duration estimates include independent practice; there is no video player or external lesson hosting. A production deployment would need authentication, server persistence, real course content and enrollment services, and appropriate privacy controls.

The interface uses local SVG/CSS artwork. Google Fonts is an optional enhancement; system sans-serif fallbacks keep the app functional without network access. The Atelier visual layer uses an ink sidebar, ivory surfaces, lime accents, illustrated course covers, and restrained entrance transitions with reduced-motion support. Mobile layouts keep weekly goals visible and show full-width course cards. The overview prioritizes continuing a lesson before planner and notebook shortcuts. Existing saved profiles, enrollments, notes, and sessions are preserved.

## Browser verification

Explore and Favorites use six courses per page, with 6 / 12 / 24 page-size buttons, a bounded page-number range, and a direct page jump for more than seven pages. Mobile uses Previous / Next and the current page count. Category shortcuts come from the catalog; Browse categories opens a searchable dialog with course counts. Filters, search, sorting, page size, and page are stored in the hash URL for refresh, sharing, and browser history. Changing filters or page size starts at page one. This static demo filters the complete catalog locally; a production catalog should fetch filtered pages and totals from its API.

`verify-catalog.cjs` is included in the browser verification and uses a temporary browser-only fixture of 249 courses across 43 categories to check pagination, category search, URL recovery, keyboard focus, and responsive layouts. The shipped catalog remains unchanged.

`verify.cjs` runs a small local static server and checks navigation, global search, filters, favorites, lesson completion, profile persistence, downloads, dialogs, mobile navigation, and all nine page layouts at six viewport widths using Playwright. It also invokes `verify-workspace.cjs` to check path enrollment, notes, planner conflicts, calendar export, undo, cross-tab updates, and derived insights. It requires Playwright in the invoking environment and a Chromium-compatible browser. No test dependency is installed in the original project.

```powershell
# If Playwright is already available:
node learning-studio/verify.cjs
```

Optionally set `STUDIO_BROWSER_PATH` to the browser executable and `STUDIO_PLAYWRIGHT_PATH` to an absolute Playwright module path. Set `STUDIO_SCREENSHOT_DIR` to an existing directory to capture desktop and mobile screenshots during verification.

Set `STUDIO_CATALOG_ONLY=1` to run only the category and pagination checks.

Set `STUDIO_DETAILS_ONLY=1` to run only the Course Details checks. When `STUDIO_SCREENSHOT_DIR` is set, these checks also capture desktop and mobile details pages in light and dark themes.

Set `STUDIO_AUTH_ONLY=1` to run only sign-in/sign-out and registration checks. Auth screenshots are included when `STUDIO_SCREENSHOT_DIR` is set. The existing workspace suites use an authenticated sample-account fixture.
