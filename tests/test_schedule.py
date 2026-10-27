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
