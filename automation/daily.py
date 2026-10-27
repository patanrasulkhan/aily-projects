"""Improve one Daylight app, run tests, and publish daily via GitHub Pages."""
import argparse
from datetime import datetime
import fcntl
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.request import urlopen
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / '.daily'
REMOTE = 'git@github.com:patanrasulkhan/aily-projects.git'
LIVE = 'https://patanrasulkhan.github.io/aily-projects/'
EDITABLE = ('web', 'tests/core.test.js', 'ROADMAP.md', 'CHANGELOG.md')


def run(args, cwd=ROOT, timeout=120, **kwargs):
    return subprocess.run(args, cwd=cwd, timeout=timeout, check=True, **kwargs)


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


def deployed(commit):
    try:
        with urlopen(LIVE + 'release.json?commit=' + commit, timeout=15) as response:
            return json.load(response).get('commit') == commit
    except Exception:
        return False


def atomic_status(path, status):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(status, indent=2))
    temporary.replace(path)


def main(force=False):
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
        status_file = STATE / ('daylight-' + day + '.json')
        status = json.loads(status_file.read_text()) if status_file.exists() else {}
        if status.get('deployed'):
            return
        if status.get('pushed'):
            if deployed(status['commit']):
                status['deployed'] = True
                atomic_status(status_file, status)
                print(f'{day}: deployment verified at {LIVE}', flush=True)
            else:
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
            atomic_status(status_file, status)
            work = STATE / 'daylight-work' / day / str(attempts + 1)
            work.mkdir(parents=True, exist_ok=False)
            copy_inputs(work)
            binary = codex_path()
            prompt = f'''Improve the existing Daylight browser app for {day}. This is ONE growing
project, not a new app each day. Read ROADMAP.md and CHANGELOG.md, inspect web/
and tests/core.test.js, then finish one substantial useful improvement or an
observed bug fix. Prefer the first unfinished roadmap item. Preserve the calm,
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
                    cwd=work, timeout=3600, env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT)
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
            atomic_status(status_file, status)
        git('push', '-u', 'origin', 'main')
        status.update(pushed=True, commit=git('rev-parse', 'HEAD'), url=LIVE)
        atomic_status(status_file, status)
        print(f'{day}: tested and pushed {status["commit"]}; GitHub Pages deployment triggered.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--now', action='store_true', help='Run before 9 AM')
    try:
        main(parser.parse_args().now)
    except Exception as exc:
        print(f'Daylight daily run failed: {type(exc).__name__}: {exc}', file=sys.stderr, flush=True)
        sys.exit(1)
