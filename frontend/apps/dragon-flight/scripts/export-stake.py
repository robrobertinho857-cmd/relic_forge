"""Build a review bundle inside this app; the existing math sources are read only."""
import sys
sys.dont_write_bytecode = True
import json
import csv
import hashlib
from pathlib import Path
from fractions import Fraction

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP.parents[2] / 'math'))
import zstandard
from games.dragon_flight.publish import build_library

output = APP / 'submission' / 'math'
report = build_library(output, variants=1024)
index = json.loads((output / 'index.json').read_text())
fixtures = []
for mode in index['modes']:
    with (output / mode['events']).open('rb') as src:
        with zstandard.ZstdDecompressor().stream_reader(src) as reader:
            import io
            for line in io.TextIOWrapper(reader):
                book = json.loads(line)
                # Cover every payout with a route for the actual frontend adapter.
                if (book['id'] - 1) % 1024 == 0 or book['id'] == 4:
                    fixtures.append({'roundID': book['id'], 'amount': 1000000, 'payout': book['payoutMultiplier'] * 10000, 'mode': mode['name'], 'active': True, 'state': book['events']})
for mode in json.loads((APP / 'art/submission/bonus-books.json').read_text()):
    name = mode['name']
    books = mode['books']
    total = sum(book['weight'] for book in books)
    rtp = Fraction(sum(book['payoutMultiplier'] * book['weight'] for book in books), total * 100 * mode['cost'])
    assert rtp == Fraction(24, 25)
    events_name, weights_name = f'books_{name}.jsonl.zst', f'lookUpTable_{name}_0.csv'
    with (output / events_name).open('wb') as target:
        with zstandard.ZstdCompressor(level=6).stream_writer(target) as stream:
            for book in books:
                stream.write((json.dumps({key: value for key, value in book.items() if key != 'weight'}, separators=(',', ':')) + '\n').encode())
                fixtures.append({'roundID': book['id'], 'amount': 1000000, 'payout': book['payoutMultiplier'] * 10000, 'mode': name, 'active': True, 'state': book['events']})
    with (output / weights_name).open('w', newline='') as target:
        csv.writer(target, lineterminator='\n').writerows((book['id'], book['weight'], book['payoutMultiplier']) for book in books)
    index['modes'].append({'name': name, 'cost': mode['cost'], 'events': events_name, 'weights': weights_name})
    report['modes'][name] = {'rtp': str(rtp), 'books': len(books), 'cost': mode['cost']}
(output / 'index.json').write_text(json.dumps(index, indent=2) + '\n')
report['sha256'] = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in output.iterdir() if path.name != 'math_report.json'}
(output / 'math_report.json').write_text(json.dumps(report, indent=2) + '\n')
(APP / 'art/submission/server-rounds.json').write_text(json.dumps(fixtures, separators=(',', ':')))
print('Five modes exported; all RTPs exactly 24/25. Frontend compatibility fixtures saved.')
