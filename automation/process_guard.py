"""Bounded child-process execution that counts time spent asleep on macOS."""
import os
from pathlib import Path
import signal
import subprocess
import sys
import time


def deadline_reason(start, current, timeout, changed, idle_timeout):
    if current - start >= timeout:
        return 'wall-clock deadline exceeded'
    if idle_timeout and current - changed >= idle_timeout:
        return 'no output before idle deadline'
    return None


def stop_group(process):
    # All model-generated subprocesses share this isolated process group.
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        process.communicate(timeout=2)
    except subprocess.TimeoutExpired:
        pass
    # Reap remaining grandchildren even when the direct child already exited.
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    process.communicate()


def guarded_run(args, cwd, timeout=120, idle_timeout=None, activity_path=None,
                prevent_sleep=False, **kwargs):
    capture = kwargs.pop('capture_output', False)
    if capture:
        kwargs['stdout'], kwargs['stderr'] = subprocess.PIPE, subprocess.PIPE
    started = time.time()
    changed, last_size = started, None
    process = subprocess.Popen(args, cwd=cwd, start_new_session=True, **kwargs)
    wake = None
    try:
        if prevent_sleep and sys.platform == 'darwin' and Path('/usr/bin/caffeinate').is_file():
            wake = subprocess.Popen(['/usr/bin/caffeinate', '-i', '-w', str(process.pid)],
                                    stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                    stderr=subprocess.DEVNULL, start_new_session=True)
        while True:
            current = time.time()  # Unlike an uptime clock, includes sleep.
            if activity_path:
                size = Path(activity_path).stat().st_size
                if size != last_size:
                    changed, last_size = current, size
            reason = deadline_reason(started, current, timeout, changed, idle_timeout)
            if reason:
                raise TimeoutError(f'{reason} ({timeout}s maximum, idle limit {idle_timeout}s)')
            try:
                stdout, stderr = process.communicate(timeout=min(1, max(.01, timeout-(current-started))))
                break
            except subprocess.TimeoutExpired:
                continue
        result = subprocess.CompletedProcess(args, process.returncode, stdout, stderr)
        if result.returncode:
            raise subprocess.CalledProcessError(result.returncode, args, stdout, stderr)
        return result
    except BaseException:
        stop_group(process)
        raise
    finally:
        if wake:
            wake.terminate()
            wake.wait(timeout=5)
