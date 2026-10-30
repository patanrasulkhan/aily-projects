"""Install the daily Daylight improvement schedule."""
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
LABEL = 'com.khan.daily-projects'


def main():
    if sys.platform != 'darwin':
        raise SystemExit('This installer requires macOS.')
    subprocess.run(['git', 'ls-remote', '--exit-code', 'origin', 'refs/heads/main'], cwd=ROOT, check=True)
    logs = ROOT / '.daily'
    logs.mkdir(exist_ok=True, mode=0o700)
    target = Path.home() / 'Library/LaunchAgents' / (LABEL + '.plist')
    target.parent.mkdir(exist_ok=True)
    codex = shutil.which('codex')
    environment = {'PATH': '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
                   'PYTHONDONTWRITEBYTECODE': '1',
                   'GIT_SSH_COMMAND': 'ssh -o BatchMode=yes -o ConnectTimeout=15'}
    if codex:
        environment['DAILY_CODEX'] = codex
    configuration = {
        'Label': LABEL,
        'ProgramArguments': [sys.executable, str(ROOT / 'automation/daily.py')],
        'WorkingDirectory': str(ROOT),
        'EnvironmentVariables': environment,
        'StartCalendarInterval': {'Hour': 9, 'Minute': 0},
        'StartInterval': 900,
        'RunAtLoad': True,
        'StandardOutPath': str(logs / 'scheduler.log'),
        'StandardErrorPath': str(logs / 'scheduler-error.log'),
        'ProcessType': 'Background',
        'ThrottleInterval': 60,
        'ExitTimeOut': 15,
    }
    if target.exists():
        old = plistlib.loads(target.read_bytes())
        if old.get('Label') != LABEL or old.get('WorkingDirectory') != str(ROOT):
            raise SystemExit('An unrelated schedule exists at ' + str(target))
        (logs / 'schedule-before-update.plist').write_bytes(target.read_bytes())
    target.write_bytes(plistlib.dumps(configuration))
    domain = f'gui/{os.getuid()}'
    subprocess.run(['launchctl', 'bootout', domain, str(target)], capture_output=True)
    subprocess.run(['launchctl', 'bootstrap', domain, str(target)], check=True)
    subprocess.run(['launchctl', 'print', domain + '/' + LABEL], check=True)
    print('Active: Daylight improvements daily after 9 AM America/New_York, with tested pushes and Pages deployment.')


if __name__ == '__main__':
    main()
