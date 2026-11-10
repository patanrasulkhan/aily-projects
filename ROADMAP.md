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
- [x] Add keyboard shortcuts with a discoverable accessible shortcut guide (2026-10-29)
- [x] Add note folders or tags and note-specific search (2026-10-30)
- [x] Add focus session history by week with a clear accessible chart (2026-10-31)
- [x] Add daily and weekly task recurrence with tested calendar boundaries (2026-11-01)
- [x] Extend task recurrence with custom day intervals (1–365 days) (2026-11-05)
- [x] Add monthly task recurrence with an explicit month-end rule (2026-11-07)
- [x] Add an accessible light/dark theme setting that persists (2026-11-08)
- [x] Add an onboarding tour with explicit demo-data controls (2026-11-10)
- [ ] Add optional CSV export for tasks and focus history
- [ ] Improve accessibility based on a keyboard-only walkthrough

Each daily run should finish one meaningful item or fix an observed bug,
add regression coverage, and describe the change in CHANGELOG.md. Avoid busywork,
new dependencies, remote APIs, accounts, payments, or storing data in the repository.
Keep the current UI polished and responsive. Do not delete or weaken existing tests.

## Latest validation — 2026-11-10

Added a five-step, optional workspace tour from Overview and Workspace & backups.
It explains tasks, habits, notes, focus, keyboard help, local storage, and backups.
Back/Next, close/Escape, step-heading focus, opener restoration, and a scrollable
native modal support keyboard use and short screens. Replay starts at step one.
The tour never navigates away from the current view or saves workspace content.

New visits now start empty rather than implicitly loading samples. The final
tour step offers backup export, confirmed sample loading, confirmed fresh start,
and Keep workspace & finish. Existing sample workspaces stay intact. Replacement
failures keep data and the tour available for retry, including corruption
protection; successful replacements clear stale view filters. Version 1 backups,
storage keys, existing workspace records, relative assets, dependencies, and
browser-local policy remain unchanged. No onboarding tracking key was added.

Validation: all 93 tests passed in JavaScriptCore under America/New_York and
Pacific/Auckland. All 87 previous tests remain unchanged; six appended tests
cover first visits, bounded navigation, replay and focus, unchanged records and
timers, cancellation, replacement failure/retry, corrupt storage recovery,
cross-tab updates, modal markup, and responsive theme-aware styling. UI events
use the dependency-free browser harness; native browser layout, modal keyboard
trapping, and screen-reader behavior were not inspected.

## Previous validation — 2026-11-08


Added a labeled Appearance selector in Workspace & backups with System, Light,
and Dark choices. System follows device appearance changes automatically; an
explicit choice overrides the device. Appearance loads before styles, includes
native controls and visible keyboard focus, and covers all workspace views,
editors, notices, charts, and responsive navigation.

The separate daylight.theme.v1 key persists the device preference and follows
updates from other tabs. Invalid/missing preferences fall back to System;
blocked reads remain usable and failed writes retain the previous selection
with feedback. Theme changes do not render or save workspace content. Workspace
version 1, backups, existing storage keys, and the browser-local policy remain
unchanged. No dependencies or network calls were added.

Validation: all 87 tests passed in JavaScriptCore in America/New_York and
Pacific/Auckland. All 82 existing tests are unchanged; five appended regressions
cover startup defaults, invalid preferences, persistence/reload, storage failure,
cross-tab updates/clearing, actual settings change events, workspace isolation,
accessible selector markup, early loading, system CSS, native controls and focus.
UI checks use the dependency-free browser harness; native browser visual layout
and screen-reader behavior were not inspected.

## Previous validation — 2026-11-07


Added Monthly to the task editor and schedule labels throughout task views.
Monthly schedules retain the original day, clamp to the last day of shorter
months, then return to the original day (January 31 → February 28 → March 31).
Changing the due date resets the scheduled day; other edits preserve it.
Undated tasks use the day they are saved as monthly and advance from the local
completion month. Late tasks advance once, retaining completed history and
duplicate prevention. Editor guidance explains the rule and stopping repeats.

Optional repeatMonthDay metadata round trips in version 1 backups. Malformed
monthly schedules are discarded without dropping tasks. Legacy data, storage
keys, relative URLs, browser-local policy, and dependencies are unchanged.
Completion and successor creation still save atomically.

Validation: all 82 tests passed in JavaScriptCore under America/New_York and
Pacific/Auckland. All 76 prior tests are unchanged; six appended regressions
cover month ends, leap/year/DST boundaries, original-day recovery, undated and
late completion, backup restoration, invalid metadata, schedule edits/stopping,
labels and editor guidance, all four completion paths, failed saves/retry,
duplicate prevention, task limits, and calendar overflow. UI events use the
existing dependency-free browser harness; native layout and screen-reader
behavior were not inspected.

## Previous validation — 2026-11-05


Added Every N days to the task editor with a labeled 1–365 whole-day interval,
visible schedule labels, and guidance. Custom schedules advance from the due
date, or local completion date if undated. Late tasks advance once; completed
history and duplicate prevention remain intact. All completion paths use the
same atomic save. The editor scrolls on short screens to keep save controls
reachable. Monthly schedules remain an explicit follow-up.

Optional repeat: custom and repeatEvery metadata round trip in version 1 backups.
Malformed imported custom schedules are discarded without dropping the task;
invalid creation/edit intervals report an error without saving. Legacy task
shapes, storage keys, local assets, and browser-local policy are unchanged.

Validation: all 76 tests passed in JavaScriptCore in America/New_York and
Pacific/Auckland. All 70 existing tests are unchanged; six appended regressions
cover intervals, leap/year/month/DST boundaries, undated/late tasks, backup
normalization, history, stopping/editing, duplicate prevention, editor markup,
labels, every completion path, failed writes/retry, task limits and calendar
overflow. UI events use the dependency-free browser boundary; native browser
layout and screen-reader behavior were not inspected.

## Previous validation — 2026-11-01

Added optional daily and weekly repeats in the task editor, with visible repeat
labels in board, list, overview, and search task rows. Completing an open repeat
keeps its completed history and creates one new To do task with the same details.
The next due date advances from the original due date, or the local completion
date for undated tasks. Late tasks advance one occurrence at a time. Reopening
and recompleting an occurrence never generates another copy, even after backup
restore. To stop future repeats, change the next open task to Does not repeat.
Monthly/custom schedules remain a separate bounded follow-up.

Optional repeat and repeatGenerated fields round trip in version 1 backups;
legacy records keep their shape. Failed saves, task limits, and dates beyond the
supported calendar leave completion and successor creation unapplied together.
Status, checkbox, and drop errors show a message and restore the saved view.
Storage keys, relative assets, dependencies, and browser-local policy are unchanged.

Validation: all 70 tests passed in JavaScriptCore, including America/New_York
and Pacific/Auckland runs. All 62 existing tests remain unchanged; eight appended
regressions cover leap days, month/year/DST boundaries, undated and late tasks,
duplicate prevention, immutable updates, optional backup metadata, editing and
stopping repeats, task/calendar limits, accessible escaped editor markup, labels,
all four completion paths, and failed-write retry. UI validation uses the existing
dependency-free browser boundary; native browser layout and screen-reader behavior
were not inspected.

## Previous validation — 2026-10-31

Added Monday–Sunday focus history with previous/next week browsing and a
This week control. Daily minute bars have a matching visible table with scoped
headers and a dated caption; weekly totals show minutes and session counts.
Empty weeks remain readable, future days are marked with a dash, and browsing
stops at the earliest recorded week and current week. Keyboard focus stays on
the navigation control or moves to the week summary when a control is disabled.
The timer and recent-session list remain available. History is derived from
existing sessions without writes; storage keys, version 1 backups, and the
browser-local policy remain unchanged.

Validation: all 62 tests passed in JavaScriptCore, including explicit runs with
America/New_York and Pacific/Auckland time zones. All 57 existing tests remain
unchanged; five appended regressions cover aggregation, fractional minutes,
zero-filled days, future exclusion, immutability and backup compatibility,
year/leap-day/DST boundaries, focus/break completion, accessible markup, empty
states, navigation bounds, focus restoration, and browsing without writes.
UI validation uses the dependency-free browser boundary; visual layout and
native browser/screen-reader interactions were not inspected in a browser.

## Previous validation — 2026-10-30

Added optional note folders with autosave and existing-folder suggestions,
Notes title/body search, combined All folders/Unfiled/folder filters, result
counts, and clear filters. New notes and global search links reveal their note
by clearing Notes filters. Pending edits save before filtering or selecting;
failed writes keep the draft available. Folder names are escaped and bounded
to 60 characters. Version 1 backups retain optional folders; legacy notes stay
Unfiled without a schema rewrite. Storage key and local-only policy are unchanged.

Validation: all 57 tests passed in JavaScriptCore. The original 48 tests are
unchanged; nine appended regressions cover legacy/new backups, malformed folder
values, combined filtering, ordering and immutability, accessible escaped
markup, autosave and pending edits, failed saves, creation/global links, and
immediate folder suggestions. UI checks use the dependency-free browser boundary;
visual layout and native browser interactions were not inspected in a browser.

## Previous validation — 2026-10-29


Added Alt + Shift shortcuts (Option + Shift on Mac): 1–5 navigate the five
workspace views, S focuses and selects global search, T/H/N create a task,
habit, or note, and K opens the guide. A visible help button opens a named,
described native modal with key references, typing rules, and Escape guidance.
Navigation focuses the workspace; closing the guide restores its opener.
Typing, editable controls, open dialogs, composition, repeats, and additional
Ctrl/Command modifiers suppress shortcuts. No single-character shortcuts or
persistence changes were introduced; version 1 backups remain compatible.

Validation: all 48 tests passed in JavaScriptCore. All 41 previous tests are
unchanged; seven appended regressions exercise navigation, search selection,
normal creation flows, modal/editing guards, guide markup and focus restoration,
and failed saves. Tests use the dependency-free browser boundary; native modal
Tab trapping, Escape behavior, and visual layout were not inspected in a browser.

## Previous validation — 2026-10-28

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
