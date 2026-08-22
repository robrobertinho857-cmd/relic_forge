# Relic Forge math

This directory contains an executable Stake Engine development math game for a
5x3, 20-payline slot. It includes reel strips, paytable evaluation, Wild
substitution, Scatter-triggered 8 Free Spins, authoritative sticky Relic Wild
state, additive per-line symbol multipliers, recovery events, six bet modes,
book generation, development simulation, and a server-side 5000x win cap.

Relic Wild configuration is centralized in `game_config.py`. Standard uses x2
and x3. Super uses x2/x3/x5 and guarantees a Wild on the first feature spin.
Mythic uses x5/x10/x20 and also guarantees a first-spin Wild. Reel weights,
multiplier weights, guarantees, and mode costs remain development inputs that
must be tuned and optimized before certification.

From the `math` directory:

    env\Scripts\python.exe -m pytest games\relic_forge\test_relic_wild.py -q
    env\Scripts\python.exe games\relic_forge\simulate.py --sims 10000
    env\Scripts\python.exe games\relic_forge\run.py

The simulation report is deterministic engineering evidence, not a theoretical
or production-certified RTP result. Generated library output is gitignored.
