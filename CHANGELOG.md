# Changelog

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
