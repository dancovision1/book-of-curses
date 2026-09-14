# Book of Curses — HTML5 prototype

Premium dark-fantasy Book slot with a single signature loop:

**Land Books → Free Spins → expand the Cursed Symbol → feed the Curse Meter → FULL CURSE.**

## Run

Open `index.html` in a desktop browser, or:

```bash
cd book-of-curses
python3 -m http.server 8765
```

Then visit http://localhost:8765

Virtual credits only. No deposits, no real-money wagering.

## Controls

- **Spin** or `Space`
- Bet 1 / 2 / 5 / 10 / 20 / 50 / 100
- Auto · Turbo · Sound
- Info — rules + paytable
- Σ — Monte Carlo (same engine, no animation)
- ⌘ — developer: force 3 Books, bonus, retrigger, Full Curse, seed, reset

## Architecture

| Path | Role |
|---|---|
| `js/config.js` | Paytable, strips, curse thresholds, bets |
| `js/rng.js` | Seeded Mulberry32 + Math.random |
| `js/engine.js` | Pure math: lines, scatters, expand, infection, simulation |
| `js/symbols.js` | SVG symbol set |
| `js/audio.js` | Procedural Web Audio |
| `js/main.js` | Renderer + UI state machine |
| `js/simulate-cli.js` | `node js/simulate-cli.js [spins] [seed]` |

Engine, renderer and math config are separated. A certified RNG could replace `rng.js` later.

## Math snapshot (prototype)

Target ~96% RTP, high volatility, max 10,000×.

Latest local 250k-spin run (seed 7, extra cursed copies = 2):

- RTP ≈ **91.9%** (base ~46% / bonus ~46%)
- Bonus frequency ≈ 1 / 238
- Avg bonus ≈ 105×
- Full Curse ≈ 3.4% of bonuses
- Hit frequency ≈ 18%

Tune only `js/config.js` and re-run the simulator. Do not scatter magic numbers through the UI.
