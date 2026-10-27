# Text Stats

A read-only text analyzer: count lines, words, Unicode characters, unique words,
and the most common words. Output is JSON, useful for scripts and writing checks.
Requires Python 3.9+; no packages or network access needed.

```sh
python3 text_stats.py notes.txt --top 10
printf 'Hello hello world!\n' | python3 text_stats.py
python3 -m unittest discover -v
```

Words are Unicode letter/digit sequences, optionally joined by apostrophes.
Counts ignore case; equal-frequency words sort alphabetically. Blank input has
zero lines; a final line break does not create an extra line. Characters count
Unicode code points, not visual glyphs. Input is loaded into memory, so this is
intended for ordinary text documents rather than very large data streams.
