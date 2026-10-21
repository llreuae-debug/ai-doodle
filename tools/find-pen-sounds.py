#!/usr/bin/env python3
"""
Finds CC0 pen/marker/chalk/pencil recordings on freesound.org for tools/prepare-pen-sounds.mjs.

For every search result it opens the sound's own page and keeps it only if that page states the
licence "Creative Commons 0" (link to creativecommons.org/publicdomain/zero). Writes
assets/pen-sounds/candidates.json with title, author, page URL, licence, duration, tags and the
high-quality preview URL. Nothing is downloaded here.

  python3 tools/find-pen-sounds.py
"""
import html, json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'assets/pen-sounds/candidates.json')
QUERIES = {
    'marker': ['whiteboard marker', 'marker writing', 'marker pen writing', 'sharpie writing', 'marker drawing', 'marker cap'],
    'chalk': ['chalk blackboard', 'chalk writing', 'chalkboard writing', 'chalk drawing'],
    'pencil': ['pencil writing', 'pencil on paper', 'pencil drawing', 'pencil scribble'],
    'soft': ['felt tip pen', 'highlighter writing', 'felt pen writing'],
    'ballpoint': ['ballpoint pen writing', 'pen writing paper', 'pen on paper', 'pen scribble'],
}
UA = {'User-Agent': 'Mozilla/5.0 (Ai Doodle pen-sound finder)'}

def get(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read().decode('utf8', 'replace')
        except Exception as e:
            time.sleep(2 * (attempt + 1))
    return ''

def sound_page(path):
    h = get('https://freesound.org' + path)
    lic = re.search(r'href="(https?://creativecommons\.org/[^"]+)"[^>]*>\s*([^<]+?)\s*</a>', h)
    title = re.search(r'og:audio:title" content="([^"]*)"', h)
    author = re.search(r'og:audio:artist" content="([^"]*)"', h)
    dur = re.search(r'data-duration="([0-9.]+)"', h)
    hq = re.search(r'https://cdn\.freesound\.org/previews/[^"]+-hq\.mp3', h)
    tags = sorted(set(re.findall(r'href="/browse/tags/([^/"]+)/', h)))
    desc = re.search(r'<div id="soundDescriptionSection"[^>]*>(.*?)</div>', h, re.S)
    return {
        'id': int(re.search(r'/sounds/(\d+)/', path).group(1)),
        'url': 'https://freesound.org' + path,
        'title': html.unescape(title.group(1)) if title else '',
        'author': html.unescape(author.group(1)) if author else '',
        'licenseName': lic.group(2).strip() if lic else '',
        'licenseUrl': lic.group(1) if lic else '',
        'duration': float(dur.group(1)) if dur else 0,
        'tags': tags[:20],
        'description': re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html.unescape(desc.group(1))))[:300].strip() if desc else '',
        'preview': hq.group(0) if hq else '',
    }

found = {}
for kind, queries in QUERIES.items():
    for q in queries:
        for page in (1, 2):
            url = 'https://freesound.org/search/?' + urllib.parse.urlencode({'q': q, 'f': 'license:"Creative Commons 0"', 'page': page})
            h = get(url)
            paths = sorted(set(re.findall(r'href="(/people/[^/"]+/sounds/\d+/)"', h)))
            for p in paths:
                if p in found:
                    found[p]['kinds'] = sorted(set(found[p]['kinds'] + [kind]))
                    continue
                info = sound_page(p)
                info['kinds'] = [kind]
                info['query'] = q
                found[p] = info
                time.sleep(0.4)
            print(f'{kind:9} "{q}" p{page}: {len(paths)} results, {len(found)} unique so far', flush=True)
            if len(paths) < 10:
                break

cc0 = [v for v in found.values() if v['licenseName'] == 'Creative Commons 0' and 'publicdomain/zero' in v['licenseUrl']]
rejected = [v for v in found.values() if v not in cc0]
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({'checked': time.strftime('%Y-%m-%d'), 'cc0': sorted(cc0, key=lambda v: v['id']), 'rejected': [{k: v[k] for k in ('url', 'licenseName')} for v in rejected]}, open(OUT, 'w'), indent=1)
print(f'{len(cc0)} CC0 sounds kept, {len(rejected)} rejected (not CC0 on their page) -> {OUT}')
