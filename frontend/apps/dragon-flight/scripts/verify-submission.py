"""Independently read the actual compressed upload files and their integer weights."""
import csv
import hashlib
import io
import json
from fractions import Fraction
from pathlib import Path
import zstandard

root = Path(__file__).resolve().parents[1] / 'submission/math'
index = json.loads((root / 'index.json').read_text())
report = json.loads((root / 'math_report.json').read_text())
assert {m['name'] for m in index['modes']} == {'safe', 'balanced', 'danger', 'storm-run', 'summit-expedition'}
for filename, digest in report['sha256'].items():
    assert (root / filename).parent == root
    assert hashlib.sha256((root / filename).read_bytes()).hexdigest() == digest, filename
samples = {}
for mode in index['modes']:
    count = weight_sum = payout_sum = 0
    largest = -1
    example = {}
    with (root / mode['events']).open('rb') as source, (root / mode['weights']).open() as lookup:
        with zstandard.ZstdDecompressor().stream_reader(source) as reader:
            lines = iter(io.TextIOWrapper(reader))
            for row in csv.reader(lookup):
                book = json.loads(next(lines))
                book_id, weight, payout = map(int, row)
                count += 1
                assert book_id == count == book['id']
                assert 0 < weight < 2**64 and 0 <= payout < 2**64
                assert payout == book['payoutMultiplier'] == book['events'][-1]['payoutMultiplier']
                assert [e['index'] for e in book['events']] == list(range(len(book['events'])))
                assert book['events'][0]['type'] == 'launch'
                assert book['events'][-1]['type'] == 'finalWin'
                weight_sum += weight
                payout_sum += weight * payout
                if payout == 0 and 'loss' not in example: example['loss'] = book_id
                if payout > 100 * mode['cost'] and 'win' not in example: example['win'] = book_id
                if payout > largest: largest, example['maximumWin'] = payout, book_id
            assert next(lines, None) is None
    rtp = Fraction(payout_sum, weight_sum * 100) / Fraction(str(mode['cost']))
    assert rtp == Fraction(24, 25), (mode['name'], rtp)
    samples[mode['name']] = example
    print(f"{mode['name']}: {count:,} books, RTP {float(rtp):.2%}, maximum {largest / 100:g}x base bet")
(root.parent / 'replay-examples.json').write_text(json.dumps(samples, indent=2) + '\n')
