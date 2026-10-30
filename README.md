# Daylight

A calm personal workspace for tasks, habits, notes, and focused time.

**Live app:** https://patanrasulkhan.github.io/aily-projects/

This is one growing app. The daily Mac automation now improves Daylight instead
of creating a different small project each day. Previous CLI projects remain in
`projects/` for reference.

## What you can do

- Plan tasks in a board with projects, priorities, due dates, descriptions, and drag/drop.
- Check in on daily habits and track streaks and the last seven days.
- Write, pin, and search notes with autosave.
- Run a 25-minute focus session, 50-minute deep-work session, or five-minute break.
- Pause/resume timers across reloads and see completed focus sessions.
- Search your workspace and export/import versioned JSON backups.

The first visit displays **clearly labeled sample data**. Choose **Start fresh**
to begin your own workspace. Your data is stored in this browser only. There is
no account, server storage, cross-device sync, SMS integration, or external API.
Export a backup before clearing browser data. Browser timers can run late while
a device sleeps; the app reconciles elapsed time when it runs again.

## Daily build → test → push → deploy

Every day after **9:00 AM America/New_York**, the local Mac scheduler:

1. Reads ROADMAP.md and the current app.
2. Implements one meaningful finished improvement in an isolated candidate folder.
3. Runs the trusted static/syntax checks and the full JavaScript regression suite
   inside a workspace sandbox. It preserves the existing test suite.
4. Commits only app, tests, roadmap, and changelog changes and pushes to `main`.
5. GitHub Actions repeats the checks and publishes `web/` to GitHub Pages only
   after tests pass. The last successful deployment remains live on test failure.

The Mac must be signed in and online with working Codex login and GitHub SSH.
The scheduler checks every 15 minutes to catch up when awake. It does not backfill
whole days the Mac was off. Generation uses the existing Codex allowance: up to
2 attempts of 45 wall-clock minutes per date, with a 10-minute no-output
watchdog. Child process groups are stopped on timeout, and retries wait at least
15 minutes. The Mac is kept awake during generation (this does not override lid
closure, manual sleep, shutdown, or lost connectivity). A failed push is retried without regenerating.
A GitHub deployment can still fail due to hosting/account outages; check Actions.
Logs and state are local and ignored under `.daily/`.

## Develop and test

No package dependencies or build step are required. Serve the repository locally:

```sh
python3 -m http.server 8080 --directory web
python3 automation/verify.py
python3 -m unittest discover -s tests -v
```

JavaScript tests use Node.js on CI or the built-in JavaScriptCore runtime on
macOS. HTML/CSS/JS in `web/` are deployed as static files. Keep all asset URLs
relative so the app works under the `/aily-projects/` path.

## Schedule operations

- Install/activate: `python3 automation/install_schedule.py`
- Run manually before 9 AM: `python3 automation/daily.py --now`
- Pause: `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.khan.daily-projects.plist`
- Resume: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.khan.daily-projects.plist`
- Logs: `.daily/scheduler.log`, `.daily/scheduler-error.log`, daily attempt logs
- Read-only health check: `python3 automation/daily.py --health` (never builds or publishes)
- Timestamped lifecycle/failure events: `.daily/events.jsonl`
- State: `.daily/daylight-YYYY-MM-DD.json`

Daily agents cannot change the scheduler, trusted verifier, or deployment
workflow. Changes to those files require an explicit maintenance session.
