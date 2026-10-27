import unittest
from text_stats import summarize


class TextStatsTests(unittest.TestCase):
    def test_empty(self):
        result = summarize('')
        self.assertEqual((result['lines'], result['words'], result['characters']), (0, 0, 0))

    def test_unicode_and_case(self):
        result = summarize('Café café HELLO hello')
        self.assertEqual(result['unique_words'], 2)
        self.assertEqual(result['top_words'][0], {'word': 'café', 'count': 2})

    def test_line_endings_and_final_line(self):
        self.assertEqual(summarize('one\r\ntwo\nthree')['lines'], 3)
        self.assertEqual(summarize('one\n')['lines'], 1)

    def test_contractions(self):
        self.assertEqual(summarize("Don't stop. Don’t stop!")['words'], 4)

    def test_limit_and_stable_ties(self):
        self.assertEqual(summarize('z a b', 1)['top_words'], [{'word': 'a', 'count': 1}])
        self.assertEqual(summarize('z a b', 0)['top_words'], [])
        with self.assertRaises(ValueError):
            summarize('text', -1)


if __name__ == '__main__':
    unittest.main()
