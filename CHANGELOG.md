# Changelog

## 2026-11-10 — Workspace tour and explicit sample choices

Take an optional five-step tour from Overview or Workspace & backups. Learn
where to plan tasks, track habits, capture notes, focus, find keyboard shortcuts,
and back up browser-local data. Move backward or forward, close at any time,
and replay whenever needed. The native modal has named controls, step-heading
focus, opener restoration, and scrolling on short screens, using the existing
light/dark palette.

New visits begin with an empty workspace. Existing saved workspaces are kept.
The final step offers Export workspace backup, Load sample workspace, Start a
fresh workspace, and Keep workspace & finish. Samples and fresh starts explicitly
confirm replacement of the workspace; canceling or a failed save retains saved
data. Failed recovery resets also retain corruption protection. Successful
replacement resets stale filters and history browsing. Taking the tour never
writes workspace data or changes the current view; no tracking key is stored.
Version 1 backups, storage keys, local URLs, and dependencies are unchanged.

Validation: all 93 tests passed in JavaScriptCore in America/New_York and
Pacific/Auckland. All 87 existing tests are unchanged. Six appended regressions
cover empty first visits, tour navigation/replay/focus, unchanged records and
timers, replacement confirmation and cancellation, failed-save retry, corrupt
storage recovery, other-tab updates, accessible markup, and responsive styling.
UI events use the dependency-free harness; native browser layout, modal keyboard
trapping, and screen-reader behavior were not inspected.

## 2026-11-08 — Persistent appearance settings

Choose System, Light, or Dark under Appearance in Workspace & backups. System
follows your device automatically; explicit choices persist across reloads.
The dark palette covers every workspace view, dialogs, native form controls,
charts, status messages, and keyboard focus while retaining the responsive layout.
Appearance loads before styles to avoid showing the wrong saved theme first.

The preference stays on this device, separate from version 1 workspace backups.
Changes synchronize across tabs without saving or rerendering workspace data.
Unavailable storage falls back safely; failed preference saves keep the prior
choice and show a retry message. Existing data, backups, local URLs, dependencies,
and the browser-local data policy are unchanged.

Validation: all 87 tests passed in JavaScriptCore under America/New_York and
Pacific/Auckland. All 82 prior tests remain unchanged. Five appended regressions
cover defaults, malformed preferences, persistence, storage failures, cross-tab
updates, settings events, workspace isolation, labeled controls, early loading,
system appearance CSS, native controls, and keyboard focus. Browser behavior was
exercised through the dependency-free harness; native visual layout and
screen-reader behavior were not inspected.

## 2026-11-07 — Monthly repeating tasks

Choose Monthly in the task editor. The schedule keeps its original day of the
month, uses the last day in shorter months, then returns to the original day:
January 31 → February 28 → March 31. Task labels show the scheduled day and
short-month rule. Changing the due date resets that day; other edits keep it.
Undated tasks keep the day they are saved as monthly and advance from their
local completion month. Late tasks advance one occurrence at a time.

Completed history, duplicate prevention, and atomic saves apply through every
completion control. Optional repeatMonthDay metadata survives version 1 backup
restore; malformed schedules are discarded while keeping the task. Existing
storage keys, legacy records, local-only data policy, relative assets, and
dependencies remain unchanged.

Validation: all 82 tests passed in JavaScriptCore in America/New_York and
Pacific/Auckland. All 76 existing tests remain unchanged. Six appended tests
cover month-end recovery, leap/year/DST boundaries, undated/late completion,
backups and malformed metadata, editing/stopping, editor guidance and labels,
all completion paths, failed-write retry, duplicate prevention, task limits,
and calendar overflow. UI handlers were exercised through the dependency-free
browser harness; native browser layout and screen-reader behavior were not
inspected.

## 2026-11-05 — Custom repeating task intervals

Choose Every N days in the task editor and set a whole-day interval from 1 to
365. Schedule labels appear wherever task rows are shown. Completion preserves
the finished task and creates one next occurrence with the same interval and
details, advancing from its due date or today's local date if undated. Late
tasks advance once. Reopening does not create duplicates; edit the next open
task to change or stop repeats. The editor scrolls on short screens.

Invalid intervals leave the editor open with feedback. Failed saves, task limits,
and calendar overflow preserve completion and successor creation together.
Version 1 backups retain optional custom interval metadata; legacy records keep
their shape. Malformed imported custom schedules are dropped while retaining
the task. Storage keys, relative URLs, browser-local data policy, and dependencies
are unchanged. Monthly schedules remain a roadmap follow-up.

Validation: all 76 tests passed in JavaScriptCore under America/New_York and
Pacific/Auckland. All 70 prior tests remain unchanged, with six appended tests
covering calendar boundaries, interval validation, backups, immutable history,
duplicate prevention, schedule edits/cancellation, editor labels and guidance,
all four completion paths, failed-write retry, task limits, and calendar overflow.
UI events were checked with the dependency-free browser harness; native browser
layout and screen-reader behavior were not inspected.

## 2026-11-01 — Daily and weekly repeating tasks

Choose Does not repeat, Daily, or Weekly in the task editor. Repeating tasks
show their schedule in the board, list, overview, and search. Completing one
keeps the completed task and creates the next To do occurrence, preserving its
title, notes, project, priority, and repeat schedule. Due dates advance one day
or one week from the task's due date; undated tasks use the local completion
date. Late tasks advance one occurrence at a time without flooding the board.
Reopening and recompleting does not generate duplicates. Stop future repeats
by editing the next open task. Editor guidance explains these rules.

Checkboxes, status controls, drag/drop, and editor completion share the same
behavior. Completion and successor creation save together; storage failures,
task limits, and unsupported calendar overflow preserve stored data and show
feedback. Optional metadata survives version 1 backup restore while older
records retain their shape. Storage keys, relative URLs, the browser-local data
policy, and dependencies remain unchanged. Monthly/custom schedules are deferred.

Validation: all 70 tests passed in JavaScriptCore, including America/New_York
and Pacific/Auckland time zones. The original 62 tests are unchanged; eight
appended regressions cover calendar boundaries, immutable history and copies,
backup compatibility, duplicate prevention, editing and stopping repeats, limits,
accessible editor markup and labels, every completion path, and failed saves
with retry. UI events use the dependency-free browser harness; visual layout
and native browser/screen-reader interactions were not inspected.

## 2026-10-31 — Weekly focus history

The Focus view now includes Monday–Sunday history with previous/next week
buttons and a This week shortcut. See daily focused-minute bars, a visible
accessible table of daily minutes and session counts, and weekly totals.
Browse through empty weeks back to the earliest session; future weeks are
unavailable and future days show a dash. Empty weeks offer a gentle prompt.
Controls have accessible names, table headers identify rows and columns, and
keyboard focus is restored after browsing, including at navigation limits.
The existing timer and recent-session list stay available.

History uses local calendar arithmetic and existing session records. Browsing
never saves workspace data. Version 1 backups, storage keys, relative assets,
and the browser-local data policy are unchanged. No dependencies or network
calls were added.

Validation: all 62 tests passed in JavaScriptCore, also with America/New_York
and Pacific/Auckland time zones. The 57 existing tests are unchanged; five
appended tests cover aggregation, fractional minutes, empty days and weeks,
future exclusion, calendar boundaries, immutable data and backup compatibility,
focus/break completion, accessible markup, navigation bounds, focus restoration,
and no storage writes. UI checks use the dependency-free browser harness;
visual layout and native browser/screen-reader behavior were not inspected.

## 2026-10-30 — Note folders and focused search

Notes now have an optional autosaved folder, with suggestions from existing
folders and an Unfiled option for older or uncategorized notes. Search titles
and text within Notes, combine search with folder filters, see result counts,
and clear filters with one button. Pinned notes remain first. New notes and
notes opened from global search are revealed even when Notes filters were set.
Folder controls and search have visible labels, selection is exposed to assistive
technology, and filters restore keyboard focus after updating the results.

Pending edits save before filter or note selection changes. Failed saves retain
the draft and show a retry message; saved folders immediately appear in filter
options and suggestions. Folder names are escaped, trimmed, and limited to 60
characters. Optional folders round trip in version 1 backups; old notes remain
compatible without a storage rewrite. No dependencies, network access, storage
key changes, or changes to the browser-local policy were introduced.

Validation: all 57 tests passed in JavaScriptCore, including nine appended
regressions. All 48 existing tests remain unchanged. Coverage includes backup
compatibility and malformed folders, combined filters and ordering, immutable
selection, escaped accessible markup, autosave and pending drafts, failed
writes, note creation/global links, and immediate folder option updates.
Browser event checks use the dependency-free harness; no visual browser
walkthrough was available.

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
