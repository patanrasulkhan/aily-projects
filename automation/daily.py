"""Improve one Daylight app, run tests, and publish daily via GitHub Pages."""
import argparse
from datetime import datetime, timedelta
import fcntl
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import signal
import importlib.util
from urllib.request import urlopen
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / '.daily'
REMOTE = 'git@github.com:patanrasulkhan/aily-projects.git'
LIVE = 'https://patanrasulkhan.github.io/aily-projects/'
EDITABLE = ('web', 'tests/core.test.js', 'ROADMAP.md', 'CHANGELOG.md')
# Load from the trusted scheduler directory, even when imported by unit tests.
_guard_spec = importlib.util.spec_from_file_location('daylight_process_guard', Path(__file__).with_name('process_guard.py'))
_guard = importlib.util.module_from_spec(_guard_spec)
_guard_spec.loader.exec_module(_guard)
guarded_run = _guard.guarded_run


def run(args, cwd=ROOT, timeout=120, **kwargs):
    return guarded_run(args, cwd=cwd, timeout=timeout, **kwargs)


def git(*args):
    return run(['git', *args], capture_output=True, text=True).stdout.strip()


def allowed(now, force=False):
    return force or now.astimezone(ZoneInfo('America/New_York')).hour >= 9


def codex_path():
    binary = os.environ.get('DAILY_CODEX') or shutil.which('codex')
    if binary and Path(binary).is_file():
        return binary
    choices = sorted((Path.home() / '.vscode/extensions').glob('openai.chatgpt-*/bin/macos-aarch64/codex'), key=lambda p: p.stat().st_mtime)
    if not choices:
        raise RuntimeError('Codex CLI not found')
    return str(choices[-1])


def copy_inputs(work):
    for name in EDITABLE:
        source, target = ROOT / name, work / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            shutil.copy2(source, target)


def validate_candidate(work):
    for path in work.rglob('*'):
        if path.is_symlink():
            raise RuntimeError('Candidate contains a symlink')
        if not path.is_file():
            continue
        relative = str(path.relative_to(work))
        if not (relative.startswith('web/') or relative in EDITABLE[1:]):
            raise RuntimeError('Candidate changed an unapproved path: ' + relative)
        if path.stat().st_size > 1_000_000:
            raise RuntimeError('Candidate file is too large')
    baseline = (ROOT / 'tests/core.test.js').read_text()
    updated = (work / 'tests/core.test.js').read_text()
    if not updated.startswith(baseline):
        raise RuntimeError('Existing regression tests must remain unchanged; append new tests')
    for name in EDITABLE:
        if not (work / name).exists():
            raise RuntimeError('Required candidate path missing: ' + name)
    current_web = {str(p.relative_to(ROOT / 'web')): p.read_bytes() for p in (ROOT / 'web').rglob('*') if p.is_file()}
    candidate_web = {str(p.relative_to(work / 'web')): p.read_bytes() for p in (work / 'web').rglob('*') if p.is_file()}
    if current_web == candidate_web:
        raise RuntimeError('A daily improvement must change the app, not only documentation')
    changed = any((work / name).read_bytes() != (ROOT / name).read_bytes() for name in ('ROADMAP.md', 'CHANGELOG.md'))
    if not changed:
        raise RuntimeError('Document the completed improvement in the roadmap/changelog')


def deployment_status(commit):
    try:
        with urlopen(LIVE + 'release.json?commit=' + commit, timeout=15) as response:
            if json.load(response).get('commit') == commit:
                return 'deployed'
    except Exception:
        pass
    # Historical deployments need the workflow result once a newer release is live.
    url = 'https://api.github.com/repos/patanrasulkhan/aily-projects/actions/runs?head_sha=' + commit + '&per_page=5'
    try:
        with urlopen(url, timeout=15) as response:
            runs = json.load(response).get('workflow_runs', [])
        matches = [r for r in runs if r.get('head_sha') == commit and r.get('path') == '.github/workflows/pages.yml' and r.get('event') == 'push']
        if not matches:
            return 'pending'
        latest = max(matches, key=lambda r: r.get('id', 0))
        if latest.get('status') != 'completed':
            return 'pending'
        return 'deployed' if latest.get('conclusion') == 'success' else 'failed'
    except Exception:
        return 'unknown'


def deployed(commit):
    return deployment_status(commit) == 'deployed'


def reconcile_previous(day):
    for path in sorted(STATE.glob('daylight-????-??-??.json'))[-7:]:
        if path.stem >= 'daylight-' + day:
            continue
        record = json.loads(path.read_text())
        if record.get('pushed') and not record.get('deployed'):
            result = deployment_status(record['commit'])
            record['deployment_status'] = result
            if result == 'deployed':
                record.update(deployed=True, phase='deployed')
            elif result == 'failed':
                record['last_error'] = 'GitHub Pages workflow failed; last successful site remains live.'
            atomic_status(path, record)


def atomic_status(path, status):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(status, indent=2))
    temporary.replace(path)


def _main(force=False):
    now = datetime.now(ZoneInfo('America/New_York'))
    if not allowed(now, force):
        return
    STATE.mkdir(exist_ok=True)
    with (STATE / 'run.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        day = now.date().isoformat()
        reconcile_previous(day)
        status_file = STATE / ('daylight-' + day + '.json')
        status = json.loads(status_file.read_text()) if status_file.exists() else {}
        if status.get('retry_after') and now.timestamp() < status['retry_after']:
            return
        if status.get('deployed'):
            return
        if status.get('pushed'):
            if deployed(status['commit']):
                status['deployed'] = True
                status['phase'] = 'deployed'
                atomic_status(status_file, status)
                event('deployment_verified', day=day, commit=status['commit'])
                print(f'{day}: deployment verified at {LIVE}', flush=True)
            else:
                status['deployment_checks'] = status.get('deployment_checks', 0) + 1
                status['last_deployment_check'] = now.isoformat()
                atomic_status(status_file, status)
                event('deployment_pending', day=day, commit=status['commit'])
                print(f'{day}: pushed; deployment pending or failed. Check GitHub Actions.', flush=True)
            return
        if git('remote', 'get-url', 'origin') != REMOTE or git('branch', '--show-current') != 'main':
            raise RuntimeError('Unexpected remote or branch; stopping')
        if git('status', '--porcelain'):
            raise RuntimeError('Local changes found; leaving them untouched')
        git('pull', '--ff-only', 'origin', 'main')
        # A crash after committing but before updating state must not duplicate work.
        if git('log', '-1', '--format=%s') == f'Improve Daylight for {day}':
            status['committed'] = True
        if not status.get('committed'):
            attempts = status.get('attempts', 0)
            if attempts >= 2:
                print('Daily generation attempt limit reached; inspect logs.', flush=True)
                return
            status['attempts'] = attempts + 1
            status['started_at'] = now.isoformat()
            status['deadline_at'] = (now + timedelta(minutes=45)).isoformat()
            status['phase'] = 'generating'
            status.pop('last_error', None)
            event('generation_started', day=day, attempt=attempts+1, deadline=status['deadline_at'])
            atomic_status(status_file, status)
            work = STATE / 'daylight-work' / day / str(attempts + 1)
            work.mkdir(parents=True, exist_ok=False)
            copy_inputs(work)
            binary = codex_path()
            prompt = f'''Improve the existing Daylight browser app for {day}. This is ONE growing
project, not a new app each day. Read ROADMAP.md and CHANGELOG.md, inspect web/
and tests/core.test.js, then finish one substantial useful improvement or an
observed bug fix. Prefer the first unfinished roadmap item. Choose a bounded
improvement that you can finish and test within 30 minutes; avoid open-ended
refactoring. If a roadmap item is large, finish a useful smaller part of it. Preserve the calm,
polished visual design, accessibility, responsive layout, existing features,
backups and stored data. Only edit web/, tests/core.test.js, ROADMAP.md, CHANGELOG.md.
Append meaningful tests to the END of tests/core.test.js; do not modify or remove
its existing contents. Keep its tests compatible with Node and JavaScriptCore.
Update the roadmap and changelog with the concrete outcome and validation.
No package dependencies, remote APIs, accounts, credentials, payments, trackers,
network calls, Git operations, generated Python files, hidden files or symlinks.
The app is public static hosting under /aily-projects/; use relative local URLs.
Keep the browser-local data policy and versioned persistence backward compatible.
Run tests if a JavaScript runtime is available; fix failures. The scheduler runs
an independent trusted test gate after you finish. Work only in this directory.
'''
            env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
            with (STATE / (day + f'-daylight-attempt-{attempts+1}.log')).open('w') as log:
                run([binary, 'exec', '--ignore-user-config', '--sandbox', 'workspace-write',
                     '-c', 'approval_policy="never"', '-c', 'sandbox_workspace_write.network_access=false',
                     '--skip-git-repo-check', '--cd', str(work), prompt],
                    cwd=work, timeout=2700, idle_timeout=600, activity_path=STATE / (day + f'-daylight-attempt-{attempts+1}.log'),
                    prevent_sleep=True, env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT)
                status['phase'] = 'testing'
                atomic_status(status_file, status)
                event('test_started', day=day)
                validate_candidate(work)
                run([binary, 'sandbox', '-c', 'sandbox_mode="workspace-write"',
                     '-c', 'sandbox_workspace_write.network_access=false', '--', sys.executable,
                     str(ROOT / 'automation/verify.py'), str(work)], cwd=work, timeout=180,
                    env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT)
            # Copy only files owned by this daily app change. Keep automation fixed.
            for name in EDITABLE:
                source, target = work / name, ROOT / name
                if source.is_dir():
                    backup = STATE / 'previous-web'
                    if backup.exists():
                        shutil.rmtree(backup)
                    target.rename(backup)
                    try:
                        shutil.copytree(source, target)
                    except Exception:
                        if target.exists():
                            shutil.rmtree(target)
                        backup.rename(target)
                        raise
                else:
                    shutil.copy2(source, target)
            git('add', '--', *EDITABLE)
            if not git('diff', '--cached', '--name-only'):
                raise RuntimeError('No meaningful app changes were made')
            git('commit', '-m', f'Improve Daylight for {day}')
            status['committed'] = True
            status['phase'] = 'committed'
            atomic_status(status_file, status)
        git('push', '-u', 'origin', 'main')
        status.update(pushed=True, commit=git('rev-parse', 'HEAD'), url=LIVE, phase='deployment_pending', pushed_at=datetime.now(ZoneInfo('America/New_York')).isoformat())
        atomic_status(status_file, status)
        event('pushed', day=day, commit=status['commit'])
        print(f'{day}: tested and pushed {status["commit"]}; GitHub Pages deployment triggered.', flush=True)


def event(kind, **fields):
    STATE.mkdir(exist_ok=True)
    record = {'at': datetime.now(ZoneInfo('America/New_York')).isoformat(), 'event': kind, **fields}
    with (STATE / 'events.jsonl').open('a') as log:
        log.write(json.dumps(record) + '\n')


def health():
    """Read-only status report: never generate, commit, push, or deploy."""
    records = []
    for path in sorted(STATE.glob('daylight-????-??-??.json'))[-7:]:
        try:
            records.append({'date': path.stem.removeprefix('daylight-'), **json.loads(path.read_text())})
        except (ValueError, OSError):
            records.append({'date': path.stem, 'error': 'Unreadable status'})
    return {'checked_at': datetime.now(ZoneInfo('America/New_York')).isoformat(),
            'schedule': 'Daily after 09:00 America/New_York; 15-minute retry checks',
            'requires': 'Mac signed in, awake/online, Codex and GitHub authentication', 'recent': records}


def main(force=False):
    started_day = datetime.now(ZoneInfo('America/New_York')).date().isoformat()
    try:
        return _main(force)
    except Exception as exc:
        current = datetime.now(ZoneInfo('America/New_York'))
        path = STATE / ('daylight-' + started_day + '.json')
        status = json.loads(path.read_text()) if path.exists() else {}
        reason = type(exc).__name__ + ': ' + str(exc)[:500]
        # Include Git's actual error, rather than only its nonzero exit status.
        if isinstance(exc, subprocess.CalledProcessError) and exc.stderr:
            reason = str(exc.stderr).strip()[:500]
        status.update(last_error=reason, failed_at=current.isoformat(), phase='failed',
                      retry_after=(current+timedelta(minutes=15)).timestamp())
        atomic_status(path, status)
        event('failed', error=reason, retry_at=(current+timedelta(minutes=15)).isoformat())
        raise


if __name__ == '__main__':
    def terminated(signum, frame):
        raise SystemExit(128 + signum)
    signal.signal(signal.SIGTERM, terminated)
    parser = argparse.ArgumentParser()
    parser.add_argument('--health', action='store_true', help='Read-only health report; no generation or publication')
    parser.add_argument('--now', action='store_true', help='Run before 9 AM')
    try:
        args = parser.parse_args()
        if args.health:
            print(json.dumps(health(), indent=2))
        else:
            main(args.now)
    except Exception as exc:
        print(f'Daylight daily run failed: {type(exc).__name__}: {exc}', file=sys.stderr, flush=True)
        sys.exit(1)
