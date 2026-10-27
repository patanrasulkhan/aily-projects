# Daily Projects

One new useful small project per day, each in `projects/YYYY-MM-DD/` with its
own README, runnable Python CLI, and tests. Projects use Python's standard
library and synthetic example data. Start by browsing the projects folder.

## Schedule

The Mac scheduler checks at 9:00 AM and every 15 minutes thereafter. The runner
uses America/New_York to allow one completed project per date after 9 AM,
including weekends and daylight-saving changes. If asleep at the scheduled
check, it can catch up when awake. It does not backfill days the Mac was off.

The Mac must be signed in, online, and have working Codex login and GitHub SSH
access. Codex generation uses your existing ChatGPT/Codex allowance. No API
key or paid third-party service is configured. Generation is limited to two
attempts per date, 30 minutes each; failed pushes retry on subsequent checks.
Success depends on connectivity, authentication, allowance, and passing tests.

Automation uses macOS launchd, not a cloud-hosted scheduled task. The code
agent runs in a workspace-write sandbox with shell network access disabled.
The outer runner handles only Git synchronization and publishing to this
repository. It stops if local changes or a different remote are detected.

## First project

[Text Stats](projects/2026-10-26/README.md): inspect text from files or stdin,
including line, word, character, and common-word counts.

## Operations

- Install/activate after the first push: `python3 automation/install_schedule.py`
- Run manually: `python3 automation/daily.py --now`
- Logs: `.daily/scheduler.log`, `.daily/scheduler-error.log`, and daily attempt logs.
- State: `.daily/YYYY-MM-DD.json` records attempts and successful pushes.
- Pause: `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.khan.daily-projects.plist`
- Resume: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.khan.daily-projects.plist`

Keep this folder in its installed location or update the launchd plist paths.
Completed daily projects are automatically committed and pushed to the public
GitHub repository patanrasulkhan/aily-projects. No deployments, messages, or changes to the calendar/SMS bots are made.
