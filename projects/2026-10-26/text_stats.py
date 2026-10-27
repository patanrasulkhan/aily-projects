"""Count text from UTF-8 files or stdin without changing the input."""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
import sys


def summarize(text, top=5):
    if top < 0:
        raise ValueError('top must be nonnegative')
    words = re.findall(r"[^\W_]+(?:['’][^\W_]+)*", text.casefold(), re.UNICODE)
    counts = Counter(words)
    common = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))[:top]
    return {'characters': len(text), 'lines': len(text.splitlines()),
            'words': len(words), 'unique_words': len(counts),
            'top_words': [{'word': word, 'count': count} for word, count in common]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', nargs='?', help='UTF-8 input file; omit to read stdin')
    parser.add_argument('--top', type=int, default=5)
    args = parser.parse_args()
    if not 0 <= args.top <= 100:
        parser.error('--top must be between 0 and 100')
    try:
        text = Path(args.file).read_text(encoding='utf-8') if args.file else sys.stdin.read()
    except (OSError, UnicodeError) as exc:
        parser.exit(1, f'Cannot read input: {exc}\n')
    print(json.dumps(summarize(text, args.top), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
