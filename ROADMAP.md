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

- [ ] Add task list view and an overdue/today filter, preserving board functionality
- [ ] Add habit editing and weekly completion targets
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
