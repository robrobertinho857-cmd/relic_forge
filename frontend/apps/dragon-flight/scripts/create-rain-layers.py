"""Build seamless vector rain tiles for the game's repeating weather layers."""
from pathlib import Path
import random

target = Path(__file__).resolve().parents[1] / "static" / "weather"
target.mkdir(exist_ok=True)
size = 384
for index, (name, count, length, width) in enumerate([
    ("rain-far", 68, 9, 0.6),
    ("rain-mid", 42, 18, 0.8),
    ("rain-near", 19, 30, 1.1),
]):
    rng = random.Random(71 + index)
    lines = []
    for _ in range(count):
        x, y = rng.uniform(0, size), rng.uniform(0, size)
        reach = length * rng.uniform(0.7, 1.3)
        opacity = rng.uniform(0.35, 0.85)
        # Repeat edge-crossing strokes on opposite sides of the tile.
        for dx in (-size, 0, size):
            for dy in (-size, 0, size):
                lines.append(
                    f'<path d="M{x+dx:.2f} {y+dy:.2f}l{-reach/2:.2f} {reach:.2f}" '
                    f'opacity="{opacity:.3f}"/>'
                )
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 {size} {size}"><g fill="none" stroke="#e3edf6" '
        f'stroke-width="{width}" stroke-linecap="round">' + ''.join(lines) + '</g></svg>'
    )
    (target / f"{name}.svg").write_text(svg, encoding="utf-8")
