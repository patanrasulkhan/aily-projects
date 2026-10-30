# Changelog

## 2026-10-29 — Keyboard shortcuts and accessible guide

Added Alt + Shift shortcuts (Option + Shift on Mac) for view navigation (1–5),
global search (S), new tasks (T), habits (H), notes (N), and shortcut help (K).
A visible ? button in the top bar opens a native modal guide with an accessible
name and description, key reference, Mac instructions, and Escape guidance.
Closing the guide returns focus to its opener. Navigation focuses the main
workspace; search selects the current query for replacement. Creation reuses
the existing editors, validation, limits, and save behavior.

Shortcuts leave typing and open dialogs undisturbed, ignore key repeats and
composition, and require both modifiers without Ctrl/Command. The guide notes
that browsers and assistive technology may reserve combinations. The local data
policy, storage key, backup version, relative assets, and dependencies are unchanged.

Validation: all 48 tests passed in JavaScriptCore. The original 41 tests remain
unchanged; seven appended tests cover navigation without writes, search focus,
creation and backup compatibility, editing/modal guards, guide focus restoration
and accessible markup, and failed saves. Browser boundary tests exercise actual
app event handlers; no visual or native modal browser walkthrough was available.


## 2026-10-28 — Habit editing and weekly goals

Added habit name editing and weekly targets from one to seven days. Habit
cards show labeled native progress bars, goal-met feedback, and the date range
for the current Monday–Sunday week. Each checked day counts once; future
check-ins do not count toward current progress. Existing daily streaks,
seven-day check-in controls, and full history are preserved. Check-in buttons
regain keyboard focus after updates. Editing keeps the habit identity and
history, and unsuccessful saves leave the editor open.

Version 1 backups and the storage key remain compatible: older habits default
to seven days per week without requiring a rewrite; new backups retain the
optional weeklyTarget field. All data remains in the browser, with local
relative assets and no new dependencies or network access.

Validation: all 41 tests passed using JavaScriptCore. All 32 existing tests
remain unchanged; nine appended tests cover legacy backups, target validation,
immutable editing, history retention, record limits, local calendar boundaries,
weekly progress, escaped editor fields, UI creation/editing, cancellation, and
storage failure. UI event coverage uses a dependency-free browser harness;
visual browser inspection was not available.

## 2026-10-27 — Task list and due-date filters

Added a responsive task list alongside the existing drag/drop board. Switch
views without losing search, priority, project, or due-date filters. New
Overdue, Today, and Overdue & today options show unfinished dated tasks, with
a visible result count and a helpful empty state. List rows support editing,
completion/reopening, and status changes, with project, priority, and due dates.
View buttons expose their selected state, controls are labeled, and focus
returns to the relevant control after changes. Workspace storage, version 1
backups, and the browser-local data policy remain unchanged.

Validation: all 32 tests passed in JavaScriptCore (25 existing tests unchanged
and seven appended regressions). Coverage includes local calendar/leap-year
boundaries, intersecting filters, completion/reopening, immutable selection,
backup round trips, escaped list content, board/list switching, empty results,
and no storage writes from view/filter changes.

## 2026-10-26 — Daylight 1.0

Replaced the daily tiny-project approach with one growing browser app. Added a
personal dashboard, task board, habits, notes, focus timer, global search, local
storage, and backup import/export. Added 25 behavioral regression tests and a
static asset/security/syntax check. Daily improvements are tested before push,
and GitHub Actions tests again before publishing to GitHub Pages.
