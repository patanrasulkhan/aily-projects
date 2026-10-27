from datetime import datetime, timezone
import importlib.util
from pathlib import Path
import unittest

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
