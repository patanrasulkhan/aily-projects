"""Trusted test gate for Daylight: no package downloads required."""
from html.parser import HTMLParser
from pathlib import Path
import argparse
import os
import re
import shutil
import subprocess
import sys

JSC = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc'


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []
        self.csp = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if any(k.startswith('on') for k in attrs):
            raise ValueError('Inline event handlers are not allowed')
        if tag == 'script' and not attrs.get('src'):
            raise ValueError('Use external script files')
        if tag == 'meta' and attrs.get('http-equiv') == 'Content-Security-Policy':
            self.csp = "connect-src 'none'" in attrs.get('content', '')
        for attr in ('src', 'href'):
            value = attrs.get(attr, '')
            if not value or value.startswith('#'):
                continue
            if value.startswith(('/', 'http:', 'https:', '//', 'data:')):
                raise ValueError('Use relative, local static assets: ' + value)
            self.paths.append(value)


def verify(root):
    root = Path(root).resolve()
    web = root / 'web'
    if not web.is_dir():
        raise ValueError('web directory missing')
    files = [p for p in web.rglob('*') if p.is_file()]
    if len(files) > 100:
        raise ValueError('Too many web files')
    allowed = {'.html', '.css', '.js', '.json', '.svg', '.png', '.webp', '.ico', '.txt'}
    for path in web.rglob('*'):
        if path.is_symlink():
            raise ValueError('Symlinks are not allowed')
        if path.is_file() and (path.suffix not in allowed or path.stat().st_size > 1_000_000 or path.name.startswith('.')):
            raise ValueError('Unexpected web file: ' + str(path))
    parser = Assets()
    parser.feed((web / 'index.html').read_text())
    if not parser.csp:
        raise ValueError('The browser-local data policy must be preserved')
    for asset in parser.paths:
        target = (web / asset.split('?')[0]).resolve()
        if not target.is_relative_to(web) or not target.is_file():
            raise ValueError('Missing/unsafe asset: ' + asset)
    node = shutil.which('node')
    if node:
        for file in web.rglob('*.js'):
            subprocess.run([node, '--check', str(file)], cwd=root, check=True, timeout=30)
        command = [node, 'tests/core.test.js']
    elif Path(JSC).is_file():
        for file in web.rglob('*.js'):
            relative = str(file.relative_to(root))
            import json
            subprocess.run([JSC, '-e', 'new Function(readFile(' + json.dumps(relative) + '));'], cwd=root, check=True, timeout=30)
        command = [JSC, 'tests/core.test.js']
    else:
        raise RuntimeError('Install Node.js to run JavaScript tests')
    result = subprocess.run(command, cwd=root, text=True, capture_output=True, check=True, timeout=120)
    print(result.stdout)
    count = re.search(r'DAYLIGHT_TESTS_PASSED=(\d+)', result.stdout)
    if not count or int(count[1]) < 20:
        raise ValueError('At least 20 passing regression tests are required')
    print('PASS static assets, content security policy, and JavaScript syntax')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('root', nargs='?', default=str(Path(__file__).resolve().parents[1]))
    verify(parser.parse_args().root)
