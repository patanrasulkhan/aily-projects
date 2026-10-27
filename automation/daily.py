"""Generate, validate, commit, and push one small project per Eastern date."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / '.daily'
REMOTE = 'git@github.com:patanrasulkhan/aily-projects.git'


def run(args, cwd=ROOT, timeout=120, **kwargs):
    return subprocess.run(args, cwd=cwd, timeout=timeout, check=True, **kwargs)


def git(*args):
    return run(['git', *args], capture_output=True, text=True).stdout.strip()


def allowed(now, force=False):
    return force or now.astimezone(ZoneInfo('America/New_York')).hour >= 9


def validate(folder):
    files = [p for p in folder.rglob('*') if p.is_file()]
    if any(p.is_symlink() for p in folder.rglob('*')):
        raise RuntimeError('Symbolic links are not allowed')
    if len(files) > 15:
        raise RuntimeError('Too many generated files')
    allowed_suffixes = {'.py', '.md', '.json', '.txt', '.csv'}
    for file in files:
        if file.suffix not in allowed_suffixes or file.stat().st_size > 200_000:
            raise RuntimeError('Unexpected or oversized generated file: ' + file.name)
        if file.name.startswith('.'):
            raise RuntimeError('Hidden generated files are not allowed')
    if not (folder / 'README.md').is_file() or not list(folder.glob('test_*.py')):
        raise RuntimeError('A README and tests are required')
    # Require the result written by the fixed sandboxed unittest runner.
    result = json.loads((folder / 'validation.json').read_text())
    if result.get('tests_run', 0) < 3 or result.get('successful') is not True:
        raise RuntimeError('At least three passing tests are required')


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
        status_file = STATE / (day + '.json')
        status = json.loads(status_file.read_text()) if status_file.exists() else {}
        if status.get('pushed'):
            return
        if git('remote', 'get-url', 'origin') != REMOTE:
            raise RuntimeError('Unexpected remote; stopping')
        if git('branch', '--show-current') != 'main':
            raise RuntimeError('Switch back to main before running the scheduler')
        if git('status', '--porcelain'):
            raise RuntimeError('Local changes found; leaving them untouched')
        # Retry previously committed but unpushed work before making anything new.
        git('pull', '--ff-only', 'origin', 'main')
        target = ROOT / 'projects' / day
        if not target.exists():
            attempts = status.get('attempts', 0)
            if attempts >= 2:
                print('Daily generation attempt limit reached; inspect logs.', flush=True)
                return
            status['attempts'] = attempts + 1
            status_file.write_text(json.dumps(status))
            work = STATE / 'work' / day / str(attempts + 1)
            work.mkdir(parents=True, exist_ok=False)
            previous = '\n'.join(p.read_text()[:600] for p in sorted((ROOT / 'projects').glob('*/README.md'))[-30:])
            prompt = f'''Build one NEW useful small Python standard-library CLI project for {day}.
Work only in this directory. Choose a different idea from these recent projects:
{previous}
Use synthetic examples only. No APIs, network calls, package installs, secrets,
personal data, Git operations, paid services, or changes outside this workspace.
Create a polished practical utility, a README with run examples and limitations,
and at least three meaningful unittest tests in test_*.py at the workspace root.
Keep it small (under 15 files), dependency-free, and finish in this run.
Run tests with PYTHONDONTWRITEBYTECODE=1 and fix failures. Do not create
validation.json; the scheduler runs an independent test check after generation.
Use only .py .md .json .txt .csv files. Do not create hidden files or symlinks.
'''
            codex = os.environ.get('DAILY_CODEX') or shutil.which('codex')
            if not codex or not Path(codex).exists():
                # VS Code extension updates can change the absolute CLI path.
                choices = sorted((Path.home() / '.vscode/extensions').glob('openai.chatgpt-*/bin/macos-aarch64/codex'), key=lambda p: p.stat().st_mtime)
                codex = str(choices[-1]) if choices else None
            if not codex:
                raise RuntimeError('Codex CLI not found')
            env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
            with (STATE / (day + f'-attempt-{attempts + 1}.log')).open('w') as log:
                run([codex, 'exec', '--ignore-user-config', '--sandbox', 'workspace-write',
                     '-c', 'approval_policy="never"', '-c', 'sandbox_workspace_write.network_access=false',
                     '--skip-git-repo-check', '--cd', str(work), prompt],
                    cwd=work, timeout=1800, env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT)
                check = ("import json, pathlib, unittest; "
                         "suite=unittest.TestLoader().discover('.'); "
                         "result=unittest.TextTestRunner(verbosity=2).run(suite); "
                         "pathlib.Path('validation.json').write_text(json.dumps("
                         "{'tests_run':result.testsRun,'successful':result.wasSuccessful()})); "
                         "raise SystemExit(0 if result.wasSuccessful() and result.testsRun>=3 else 1)")
                run([codex, 'sandbox', '--cd', str(work),
                     '-c', 'sandbox_mode="workspace-write"',
                     '-c', 'sandbox_workspace_write.network_access=false',
                     '--', sys.executable, '-c', check], cwd=work, timeout=120,
                    env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT)
            validate(work)
            shutil.copytree(work, target)
            git('add', '--', str(target.relative_to(ROOT)))
            git('commit', '-m', f'Add daily project for {day}')
        git('push', '-u', 'origin', 'main')
        status.update(pushed=True, commit=git('rev-parse', 'HEAD'))
        status_file.write_text(json.dumps(status, indent=2))
        print(f'{day}: pushed {status["commit"]}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--now', action='store_true', help='Run before 9 AM if needed')
    args = parser.parse_args()
    try:
        main(args.now)
    except Exception as exc:
        print(f'Daily project failed: {type(exc).__name__}: {exc}', file=sys.stderr, flush=True)
        sys.exit(1)
