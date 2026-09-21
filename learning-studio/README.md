# MyCourses · Learning Studio

A standalone redesign of the course dashboard. **Every implementation file is new and lives in this directory.** The original `index.html`, `style.css`, `js/`, `data/`, and assets are untouched. There are no package dependencies, generated build files, or changes to shared configuration.

## Open it

Open `learning-studio/index.html` directly in a modern browser, or use your existing static development server and visit `/learning-studio/`. For example, open this folder with VS Code Live Server. No installation or build is required.

The original project is still available at `/index.html`. This redesign intentionally has its own entry point; replacing the original entry point would violate the new-files-only requirement.

## Included

- Responsive sidebar, mobile drawer, overview dashboard, and header search (Ctrl/Cmd K).
- Explore courses with category and level filters, sorting, global text search, course details, and useful empty states.
- Favorites with saved state, dedicated My Learning and Profile pages, and browser history navigation.
- Nine self-paced demo courses, each with five original reading lessons, code examples, and independent practice prompts.
- Enrollment, lesson completion, progress indicators, weekly goals, learning updates, and downloadable personal completion records.
- Editable profile and local persistence with input validation, stored-data validation, cross-tab updates, and feedback when browser storage is unavailable.
- Semantic elements, keyboard access, native modal focus management, mobile focus containment, reduced-motion support, and responsive layouts.

## Files

| File | Responsibility |
| --- | --- |
| `index.html` | Document, application shell, navigation, global search |
| `styles.css` | Design tokens, components, responsive and accessibility styles |
| `courses.js` | Independent catalog and reading lesson content |
| `app.js` | Routing, rendering, state, storage, interaction handling |
| `assets/brand.svg` | Local vector brand mark |
| `verify.cjs` | Browser verification; see below |

## Demo data and persistence

The first visit uses a fictional Alex Morgan profile, two enrolled courses with sample progress, and two favorites. Ratings and instructor details are illustrative. Weekly activity starts at zero and records real completion actions in this browser. All profile inputs are escaped before rendering.

Changes are stored under `mycourses.learning-studio.v1` in local storage. They remain local to the browser and origin, without authentication or a server. Moving between `file://` and a server gives you a separate storage context. Browsers that restrict storage still allow in-memory use, with a warning when changes cannot persist. Clear this one storage key in browser developer tools to reset the demo.

Completion records are plain text personal records, not accredited certificates. Lesson duration estimates include independent practice; there is no video player or external lesson hosting. A production deployment would need authentication, server persistence, real course content and enrollment services, and appropriate privacy controls.

The interface uses local SVG/CSS artwork. Google Fonts is an optional enhancement; system sans-serif fallbacks keep the app functional without network access.

## Browser verification

`verify.cjs` runs a small local static server and checks navigation, search, filters, favorites, lesson completion, profile persistence, downloads, dialogs, mobile navigation, and layout overflow using Playwright. It requires Playwright in the invoking environment and a Chromium-compatible browser. No test dependency is installed in the original project.

```powershell
# If Playwright is already available:
node learning-studio/verify.cjs
```

Optionally set `STUDIO_BROWSER_PATH` to the browser executable and `STUDIO_PLAYWRIGHT_PATH` to an absolute Playwright module path. Set `STUDIO_SCREENSHOT_DIR` to an existing directory to capture desktop and mobile screenshots during verification.
