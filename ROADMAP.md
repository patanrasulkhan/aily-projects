# Daylight roadmap

One personal productivity app, improved a little each day. Data remains local
in the user's browser and existing backups must remain compatible.

## Shipped

- [x] Responsive overview dashboard with task and focus statistics
- [x] Task board with priorities, projects, due dates, editing, search, and drag/drop
- [x] Daily habit check-ins, seven-day history, and streaks
- [x] Notes with autosave and pinning
- [x] Persistent focus timer with pause/resume, breaks, and session history
- [x] Global search and JSON backup import/export
- [x] Versioned state validation and regression tests

## Next, in priority order

- [x] Add task list view and an overdue/today filter, preserving board functionality (2026-10-27)
- [x] Add habit editing and weekly completion targets (2026-10-28)
- [ ] Add keyboard shortcuts with a discoverable accessible shortcut guide
- [ ] Add note folders or tags and note-specific search
- [ ] Add focus session history by week with a clear accessible chart
- [ ] Add recurrence for repeating tasks with tested calendar boundaries
- [ ] Add an accessible light/dark theme setting that persists
- [ ] Add an onboarding tour with explicit demo-data controls
- [ ] Add optional CSV export for tasks and focus history
- [ ] Improve accessibility based on a keyboard-only walkthrough

Each daily run should finish one meaningful item or fix an observed bug,
add regression coverage, and describe the change in CHANGELOG.md. Avoid busywork,
new dependencies, remote APIs, accounts, payments, or storing data in the repository.
Keep the current UI polished and responsive. Do not delete or weaken existing tests.

## Latest validation — 2026-10-28

Habit names and weekly targets (1–7 days) can now be edited without losing
identity or check-in history. Habit cards show labeled progress for the local
Monday–Sunday week, with a goal-met message. Daily streaks and seven-day
check-in controls remain available. Legacy version 1 habits default to seven
days; optional weeklyTarget values survive backup import/export. Storage keys,
backup version, relative assets, and the browser-local policy are unchanged.

Validation: all 41 tests passed in JavaScriptCore, with the existing 32 tests
unchanged and nine regressions appended. Coverage includes immutable edits,
limits and invalid targets, old/new backups, year/leap-day/week boundaries,
future and duplicate check-ins, UI prefilling and escaping, creation, editing,
cancellation, and failed storage writes. Browser events were exercised through
the dependency-free test harness; no visual browser inspection was available.

## Previous validation — 2026-10-27

Task board and list now share search, priority, project, and due-date filters.
Overdue, Today, and Overdue & today select unfinished dated tasks; All dates
keeps completed and undated tasks available. List supports editing, completion,
and status changes; board retains drag/drop. View/filter changes do not write
workspace data. Version 1 storage and backups are unchanged.

Validation: 32 tests passed in JavaScriptCore, including seven appended
regressions for calendar boundaries, combined filters, completion/reopening,
backup compatibility, escaped list rendering, and view/filter interactions.
Keyboard focus is retained after view/filter and task-status changes.
