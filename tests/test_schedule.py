from datetime import datetime, timezone
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('daily', Path(__file__).resolve().parents[1] / 'automation/daily.py')
daily = importlib.util.module_from_spec(spec)
spec.loader.exec_module(daily)


class ScheduleTests(unittest.TestCase):
    def test_summer_gate(self):
        self.assertFalse(daily.allowed(datetime(2026, 10, 27, 12, 59, tzinfo=timezone.utc)))
        self.assertTrue(daily.allowed(datetime(2026, 10, 27, 13, 0, tzinfo=timezone.utc)))

    def test_winter_gate(self):
        self.assertFalse(daily.allowed(datetime(2026, 11, 2, 13, 59, tzinfo=timezone.utc)))
        self.assertTrue(daily.allowed(datetime(2026, 11, 2, 14, 0, tzinfo=timezone.utc)))

    def test_manual_override(self):
        self.assertTrue(daily.allowed(datetime(2026, 10, 27, 5, tzinfo=timezone.utc), True))

    def test_candidate_cannot_change_automation(self):
        with tempfile.TemporaryDirectory() as directory:
            work = Path(directory)
            (work / 'automation').mkdir()
            (work / 'automation/daily.py').write_text('changed')
            with self.assertRaisesRegex(RuntimeError, 'unapproved'):
                daily.validate_candidate(work)

    def test_candidate_cannot_weaken_existing_tests(self):
        with tempfile.TemporaryDirectory() as directory:
            work = Path(directory)
            (work / 'tests').mkdir()
            (work / 'tests/core.test.js').write_text('no tests')
            with self.assertRaisesRegex(RuntimeError, 'regression'):
                daily.validate_candidate(work)

    def test_symlinks_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            work = Path(directory)
            (work / 'web').mkdir()
            (work / 'web/unsafe').symlink_to('/tmp')
            with self.assertRaisesRegex(RuntimeError, 'symlink'):
                daily.validate_candidate(work)

    def test_deployment_is_not_assumed_on_http_error(self):
        with patch.object(daily, 'urlopen', side_effect=OSError('offline')):
            self.assertFalse(daily.deployed('abc'))

    def test_atomic_state_round_trip(self):
        import json
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'day.json'
            daily.atomic_status(path, {'pushed': True, 'commit': 'abc'})
            self.assertEqual(json.loads(path.read_text())['commit'], 'abc')
            self.assertFalse(path.with_suffix('.tmp').exists())


class ProcessGuardTests(unittest.TestCase):
    def test_deadline_counts_time_spent_asleep(self):
        self.assertEqual(daily._guard.deadline_reason(100, 100+86400, 2700, 100+86400, 600), 'wall-clock deadline exceeded')

    def test_idle_process_is_detected_before_wall_deadline(self):
        self.assertEqual(daily._guard.deadline_reason(100, 750, 2700, 100, 600), 'no output before idle deadline')
        self.assertIsNone(daily._guard.deadline_reason(100, 750, 2700, 700, 600))

    def test_normal_subprocess_capture_is_preserved(self):
        import sys
        result=daily.guarded_run([sys.executable,'-c','print("ready")'],cwd=Path('/tmp'),timeout=5,capture_output=True,text=True)
        self.assertEqual(result.stdout.strip(), 'ready')

    def test_nonzero_exit_retains_diagnostics(self):
        import sys,subprocess
        with self.assertRaises(subprocess.CalledProcessError) as caught:
            daily.guarded_run([sys.executable,'-c','import sys; print("offline",file=sys.stderr);sys.exit(2)'],cwd=Path('/tmp'),timeout=5,capture_output=True,text=True)
        self.assertIn('offline',caught.exception.stderr)

    def test_timed_out_process_group_is_stopped(self):
        import sys, time
        start=time.time()
        with self.assertRaises(TimeoutError):
            daily.guarded_run([sys.executable,'-c','import time; time.sleep(30)'],cwd=Path('/tmp'),timeout=.15,capture_output=True,text=True)
        self.assertLess(time.time()-start,5)

    def test_idle_deadline_stops_silent_generation(self):
        import sys
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'attempt.log'
            with path.open('w') as log:
                with self.assertRaisesRegex(TimeoutError,'idle'):
                    daily.guarded_run([sys.executable,'-c','import time; time.sleep(30)'],cwd=Path(directory),timeout=5,idle_timeout=.1,activity_path=path,stdout=log)

    def test_health_report_never_runs_git_or_generation(self):
        with patch.object(daily,'_main',side_effect=AssertionError('must not generate')), patch.object(daily,'git',side_effect=AssertionError('must not publish')):
            self.assertIn('recent',daily.health())

    def test_failure_records_retry_without_claiming_success(self):
        import json
        with tempfile.TemporaryDirectory() as directory, patch.object(daily,'STATE',Path(directory)), patch.object(daily,'_main',side_effect=TimeoutError('stalled')):
            with self.assertRaises(TimeoutError):
                daily.main()
            record=json.loads(next(Path(directory).glob('daylight-*.json')).read_text())
            self.assertEqual(record['phase'],'failed')
            self.assertNotIn('pushed',record)
            self.assertIn('stalled',record['last_error'])
            self.assertIn('retry_after',record)

    def test_historical_deployment_is_verified_from_matching_workflow(self):
        import io, json
        responses=[io.BytesIO(b'{"commit":"newer"}'),io.BytesIO(json.dumps({'workflow_runs':[{'id':1,'head_sha':'old','path':'.github/workflows/pages.yml','event':'push','status':'completed','conclusion':'success'}]}).encode())]
        with patch.object(daily,'urlopen',side_effect=responses):
            self.assertEqual(daily.deployment_status('old'),'deployed')

    def test_failed_deployment_is_not_reported_as_success(self):
        import io,json
        responses=[OSError('not yet live'),io.BytesIO(json.dumps({'workflow_runs':[{'id':1,'head_sha':'old','path':'.github/workflows/pages.yml','event':'push','status':'completed','conclusion':'failure'}]}).encode())]
        with patch.object(daily,'urlopen',side_effect=responses):
            self.assertEqual(daily.deployment_status('old'),'failed')
