# Changelog

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
