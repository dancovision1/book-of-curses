/**
 * BOOK OF CURSES — Pure game engine (no DOM).
 * Used by both the visual client and the Monte Carlo simulator.
 */
(function (global) {
  const C = () => global.BOC.CONFIG;

  function cloneGrid(g) {
    return g.map((col) => col.slice());
  }

  function emptyFeature() {
    return {
      inBonus: false,
      spinsLeft: 0,
      spinsPlayed: 0,
      cursed: [],
      energy: 0,
      curseLevel: 0,
      retriggers: 0,
      bonusWin: 0,
      fullCurseTriggered: false,
      fullCurseThisSpin: false,
      persistedInfection: []
    };
  }

  function curseLevelFromEnergy(energy) {
    const t = C().curse.thresholds;
    if (energy >= t[3]) return 3;
    if (energy >= t[2]) return 2;
    if (energy >= t[1]) return 1;
    return 0;
  }

  class Engine {
    constructor(rng) {
      this.rng = rng || new global.BOC.RNG();
      this.feature = emptyFeature();
    }

    resetFeature() {
      this.feature = emptyFeature();
    }

    spinReels(strips) {
      const cols = [];
      for (let r = 0; r < 5; r++) {
        const strip = strips[r];
        const stop = this.rng.int(strip.length);
        const col = [];
        for (let row = 0; row < 3; row++) {
          col.push(strip[(stop + row) % strip.length]);
        }
        cols.push(col);
      }
      return cols; // [reel][row]
    }

    countScatters(grid) {
      let n = 0;
      const positions = [];
      for (let r = 0; r < 5; r++) {
        for (let row = 0; row < 3; row++) {
          if (grid[r][row] === C().scatterId) {
            n++;
            positions.push([r, row]);
          }
        }
      }
      return { n, positions };
    }

    /**
     * Evaluate left-to-right paylines. Wild (Book) substitutes for all
     * paying symbols except that a line of only wilds pays as Book.
     */
    evalPaylines(grid, lineBet, allowWild) {
      const pays = [];
      const wild = C().wildId;
      const table = C().paytable;
      C().paylines.forEach((line, lineIdx) => {
        const cells = line.map((row, reel) => grid[reel][row]);
        let i = 0;
        while (i < 5 && cells[i] === wild) i++;
        let symbol = i === 5 ? wild : cells[i];
        if (symbol === undefined) return;
        let count = 0;
        for (let r = 0; r < 5; r++) {
          const s = cells[r];
          if (s === symbol || (allowWild && s === wild)) count++;
          else break;
        }
        if (count >= 3 && table[symbol]) {
          const award = table[symbol][count - 3] * lineBet;
          if (award > 0) {
            pays.push({
              line: lineIdx,
              symbol,
              count,
              amount: award,
              positions: line.slice(0, count).map((row, reel) => [reel, row])
            });
          }
        }
      });
      return pays;
    }

    /**
     * Expanding cursed symbols: if the symbol appears on >=3 reels,
     * those reels are covered top-to-bottom and every payline that
     * would include that symbol on those reels is paid (classic Book).
     *
     * Payment model: number of covered reels → paytable[symbol][n-3] * lineBet * paylineCount
     * (i.e. it pays as if every line hits, which is how Book-style expanders work).
     */
    evalExpansion(grid, cursedId, lineBet, multiplier) {
      if (cursedId === undefined || cursedId === null) return null;
      const reelsWith = [];
      for (let r = 0; r < 5; r++) {
        if (grid[r].includes(cursedId)) reelsWith.push(r);
      }
      if (reelsWith.length < 3) return null;
      const n = reelsWith.length;
      const table = C().paytable[cursedId];
      if (!table) return null;
      const base = table[n - 3] * lineBet * C().paylineCount;
      const amount = Math.floor(base * multiplier);
      return {
        symbol: cursedId,
        reels: reelsWith,
        count: n,
        amount,
        multiplier
      };
    }

    infectGrid(grid, cursedIds, chance) {
      const next = cloneGrid(grid);
      const isCursed = (s) => cursedIds.includes(s);
      const seeds = [];
      for (let r = 0; r < 5; r++) {
        for (let row = 0; row < 3; row++) {
          if (isCursed(next[r][row])) seeds.push([r, row]);
        }
      }
      const infected = [];
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ];
      seeds.forEach(([r, row]) => {
        dirs.forEach(([dr, drow]) => {
          const nr = r + dr;
          const nrow = row + drow;
          if (nr < 0 || nr > 4 || nrow < 0 || nrow > 2) return;
          if (isCursed(next[nr][nrow])) return;
          if (this.rng.chance(chance)) {
            const pick = this.rng.pick(cursedIds);
            next[nr][nrow] = pick;
            infected.push([nr, nrow, pick]);
          }
        });
      });
      return { grid: next, infected };
    }

    enrichStrips(baseStrips, cursedIds) {
      const extra = C().curse.bonusExtraCopies || 3;
      return baseStrips.map((strip, ri) => {
        const next = strip.slice();
        cursedIds.forEach((id, k) => {
          for (let n = 0; n < extra; n++) {
            const pos = (ri * 7 + k * 11 + n * 13 + 5) % next.length;
            // do not overwrite isolated books
            if (next[pos] !== C().scatterId) next[pos] = id;
            else next[(pos + 2) % next.length] = id;
          }
        });
        return next;
      });
    }

    startBonus(chosenSymbol, opts) {
      const f = this.feature;
      const o = opts || {};
      const level = o.level != null ? o.level : 0;
      const energyMap = [0, 3, 6, 9];
      f.inBonus = true;
      f.spinsLeft = o.spinsLeft != null ? o.spinsLeft : C().baseFreeSpins;
      f.spinsPlayed = 0;
      f.cursed = [chosenSymbol];
      if (o.secondSymbol != null && o.secondSymbol !== chosenSymbol) {
        f.cursed.push(o.secondSymbol);
      } else if (level >= 2 && f.cursed.length === 1) {
        let second = this.pickPayingSymbol();
        let guard = 0;
        while (second === chosenSymbol && guard++ < 20) second = this.pickPayingSymbol();
        f.cursed.push(second);
      }
      f.energy = o.energy != null ? o.energy : energyMap[level] || 0;
      f.curseLevel = level;
      f.retriggers = o.retriggers || 0;
      f.bonusWin = 0;
      f.fullCurseTriggered = level >= 3;
      f.fullCurseThisSpin = false;
      f.persistedInfection = [];
      f.bonusStrips = this.enrichStrips(C().bonusReels, f.cursed);
    }

    /**
     * Build a grid that is guaranteed to expand `symbol` on `nReels` reels.
     */
    buildExpandGrid(symbol, nReels, extraBooks) {
      const g = [];
      const n = Math.max(0, Math.min(5, nReels || 0));
      for (let r = 0; r < 5; r++) {
        const col = [this.rng.int(5), this.rng.int(5), this.rng.int(5)];
        if (r < n) {
          col[0] = symbol;
          col[1] = symbol;
          col[2] = symbol;
        }
        g.push(col);
      }
      if (extraBooks) {
        let placed = 0;
        for (let r = 0; r < 5 && placed < extraBooks; r++) {
          if (!g[r].includes(C().scatterId)) {
            g[r][2] = C().scatterId;
            placed++;
          }
        }
      }
      return g;
    }

    pickPayingSymbol() {
      // Paying symbols only (not Book) — classic Book special-symbol select
      return this.rng.int(10);
    }

    applyEnergy(amount) {
      const f = this.feature;
      const prev = f.curseLevel;
      f.energy += amount;
      f.curseLevel = curseLevelFromEnergy(f.energy);
      const events = [];
      if (f.curseLevel > prev) {
        events.push({ type: "levelUp", from: prev, to: f.curseLevel });
        if (f.curseLevel === 2 && f.cursed.length === 1) {
          let second = this.pickPayingSymbol();
          let guard = 0;
          while (second === f.cursed[0] && guard++ < 20) second = this.pickPayingSymbol();
          f.cursed.push(second);
          f.bonusStrips = this.enrichStrips(C().bonusReels, f.cursed);
          events.push({ type: "secondSymbol", symbol: second });
        }
        if (f.curseLevel === 3 && !f.fullCurseTriggered) {
          f.fullCurseTriggered = true;
          events.push({ type: "fullCurse" });
        }
      }
      return events;
    }

    /**
     * Execute one complete spin. Returns a result object consumed by
     * the renderer or aggregated by the simulator.
     */
    spin({ totalBet, forceGrid, forceBonus, forceScatterCount, forceCursed, forceFullCurse, forceRetrigger, forceExpandReels, forceLevel }) {
      const cfg = C();
      const lineBet = totalBet / cfg.paylineCount;
      const f = this.feature;
      const inBonus = f.inBonus;
      const strips = inBonus ? (f.bonusStrips || cfg.bonusReels) : cfg.baseReels;

      if (forceCursed != null && inBonus) {
        const id = Array.isArray(forceCursed) ? forceCursed[0] : forceCursed;
        if (!f.cursed.includes(id)) f.cursed[0] = id;
      }
      if (forceLevel != null) {
        const energyMap = [0, 3, 6, 9];
        f.curseLevel = forceLevel;
        f.energy = Math.max(f.energy, energyMap[forceLevel] || 0);
        if (forceLevel >= 3) f.fullCurseTriggered = true;
        if (forceLevel >= 2 && f.cursed.length === 1) {
          let second = this.pickPayingSymbol();
          while (second === f.cursed[0]) second = this.pickPayingSymbol();
          f.cursed.push(second);
          f.bonusStrips = this.enrichStrips(cfg.bonusReels, f.cursed);
        }
      }

      let grid = forceGrid ? cloneGrid(forceGrid) : this.spinReels(strips);

      if (forceExpandReels && inBonus && f.cursed[0] != null) {
        grid = this.buildExpandGrid(f.cursed[0], forceExpandReels, 0);
      }
      if (forceScatterCount) {
        grid = this._forceScatters(grid, forceScatterCount);
      }
      if (forceRetrigger && inBonus) {
        grid = this._forceScatters(grid, 3);
      }

      if (inBonus && f.persistedInfection.length) {
        f.persistedInfection.forEach(([r, row, sym]) => {
          if (r >= 0 && r < 5 && row >= 0 && row < 3) grid[r][row] = sym;
        });
        f.persistedInfection = [];
      }

      const scatter = this.countScatters(grid);
      const lineWins = this.evalPaylines(grid, lineBet, true);
      let landedGrid = cloneGrid(grid);

      const expansions = [];
      const infections = [];
      let curseEvents = [];
      f.fullCurseThisSpin = false;

      if (inBonus && f.cursed.length) {
        const level = forceFullCurse ? 3 : f.curseLevel;
        const multi = cfg.curse.multipliers[level];

        f.cursed.forEach((cid) => {
          const ex = this.evalExpansion(grid, cid, lineBet, multi);
          if (ex) expansions.push(ex);
        });

        if (level === 3 || forceFullCurse) {
          f.fullCurseThisSpin = true;
          let work = cloneGrid(grid);
          for (let w = 0; w < cfg.curse.fullCurseWaves; w++) {
            const step = this.infectGrid(work, f.cursed, cfg.curse.fullCurseInfectChance);
            if (step.infected.length) {
              infections.push({ wave: w + 1, cells: step.infected });
              work = step.grid;
              f.cursed.forEach((cid) => {
                const ex = this.evalExpansion(work, cid, lineBet, multi);
                if (ex) {
                  const already = expansions.find((e) => e.symbol === cid && e.count === ex.count);
                  if (!already || ex.amount > (already.amount || 0)) {
                    expansions.push({ ...ex, fromInfection: true, wave: w + 1 });
                  }
                }
              });
            }
          }
          grid = work;
          // persist a few infected cells into next FS (signature "escaping control")
          infections.forEach((inf) => {
            inf.cells.forEach((cell) => {
              if (this.rng.chance(0.18)) f.persistedInfection.push(cell);
            });
          });
        }

        const energyGain = expansions.reduce((acc, ex) => {
          if (ex.fromInfection) return acc + 1;
          return acc + (cfg.curse.energyForExpand[ex.count] || 1);
        }, 0);

        if (energyGain > 0) curseEvents = this.applyEnergy(energyGain);
      }

      if (forceCursed && f.inBonus) {
        f.cursed = Array.isArray(forceCursed) ? forceCursed.slice() : [forceCursed];
      }

      // Deduplicate expansion pays: keep best per symbol
      const bestExp = [];
      f.cursed.forEach((cid) => {
        const list = expansions.filter((e) => e.symbol === cid);
        if (!list.length) return;
        list.sort((a, b) => b.amount - a.amount);
        bestExp.push(list[0]);
      });

      const lineTotal = lineWins.reduce((s, w) => s + w.amount, 0);
      const expTotal = bestExp.reduce((s, w) => s + w.amount, 0);
      // During bonus, expanding symbol also appears in line wins — avoid double pay
      // Classic Book: lines still pay normally; expander is ADDITIONAL for that symbol
      // To limit double-dip on the special, subtract line wins of cursed symbols when expander paid
      let adjLine = lineTotal;
      if (inBonus && bestExp.length) {
        const cursedSet = new Set(bestExp.map((e) => e.symbol));
        adjLine = lineWins
          .filter((w) => !cursedSet.has(w.symbol))
          .reduce((s, w) => s + w.amount, 0);
      }

      let win = adjLine + expTotal;
      let capHit = false;
      if (win / totalBet > cfg.maxWinX) {
        win = totalBet * cfg.maxWinX;
        capHit = true;
      }

      const triggered = !inBonus && scatter.n >= cfg.scattersToTrigger;
      const retriggered = inBonus && scatter.n >= cfg.scattersToTrigger;

      if (triggered || forceBonus) {
        const chosen = forceCursed ? (Array.isArray(forceCursed) ? forceCursed[0] : forceCursed) : this.pickPayingSymbol();
        this.startBonus(chosen);
      } else if (retriggered) {
        f.spinsLeft += cfg.retriggerSpins;
        f.retriggers += 1;
        this.applyEnergy(cfg.retriggerEnergy);
      }

      if (inBonus && !triggered) {
        f.spinsLeft = Math.max(0, f.spinsLeft - 1);
        f.spinsPlayed += 1;
        f.bonusWin += win;
        if (f.spinsLeft <= 0) {
          f.inBonus = false;
        }
      }

      return {
        grid,
        landedGrid,
        lineWins,
        expansions: bestExp,
        infections,
        scatter,
        win,
        lineTotal: adjLine,
        expTotal,
        capHit,
        triggered: triggered || !!forceBonus,
        retriggered,
        inBonusStart: inBonus,
        feature: {
          inBonus: f.inBonus,
          spinsLeft: f.spinsLeft,
          spinsPlayed: f.spinsPlayed,
          cursed: f.cursed.slice(),
          energy: f.energy,
          curseLevel: f.curseLevel,
          retriggers: f.retriggers,
          bonusWin: f.bonusWin,
          fullCurseTriggered: f.fullCurseTriggered,
          fullCurseThisSpin: f.fullCurseThisSpin
        },
        curseEvents,
        totalBet
      };
    }

    _forceScatters(grid, n) {
      const g = cloneGrid(grid);
      let have = this.countScatters(g).n;
      const book = C().scatterId;
      const reels = [0, 1, 2, 3, 4];
      for (let i = 0; i < reels.length && have < n; i++) {
        const r = reels[i];
        if (!g[r].includes(book)) {
          g[r][1] = book;
          have++;
        }
      }
      return g;
    }
  }

  function simulate(opts) {
    const {
      spins = 100000,
      bet = 10,
      seed = 1,
      progressEvery = 0,
      onProgress
    } = opts || {};
    const rng = new global.BOC.RNG(seed);
    const engine = new Engine(rng);
    let wagered = 0;
    let returned = 0;
    let baseReturned = 0;
    let bonusReturned = 0;
    let hits = 0;
    let bonuses = 0;
    let retriggers = 0;
    let fullCurses = 0;
    let fullCurseValue = 0;
    let maxWin = 0;
    let maxWinX = 0;
    let bonusValues = [];
    let currentBonusStartReturned = 0;
    let inBonusTrack = false;
    let fullCurseValueAcc = 0;
    const winBuckets = {
      "0": 0,
      "0-1x": 0,
      "1-5x": 0,
      "5-20x": 0,
      "20-50x": 0,
      "50-100x": 0,
      "100-500x": 0,
      "500x+": 0
    };

    for (let i = 0; i < spins; i++) {
      const beforeBonus = engine.feature.inBonus;
      const res = engine.spin({ totalBet: bet });
      wagered += beforeBonus ? 0 : bet;
      // During free spins the spin is "free" — wager counted only on base
      returned += res.win;
      if (res.win > 0) hits++;
      if (res.win > maxWin) maxWin = res.win;
      const wx = res.win / bet;
      if (wx > maxWinX) maxWinX = wx;

      if (wx <= 0) winBuckets["0"]++;
      else if (wx < 1) winBuckets["0-1x"]++;
      else if (wx < 5) winBuckets["1-5x"]++;
      else if (wx < 20) winBuckets["5-20x"]++;
      else if (wx < 50) winBuckets["20-50x"]++;
      else if (wx < 100) winBuckets["50-100x"]++;
      else if (wx < 500) winBuckets["100-500x"]++;
      else winBuckets["500x+"]++;

      if (!beforeBonus && !res.triggered) {
        baseReturned += res.win;
      } else {
        bonusReturned += res.win;
      }

      if (res.triggered) {
        bonuses++;
        inBonusTrack = true;
        currentBonusStartReturned = bonusReturned - res.win;
        fullCurseValueAcc = 0;
      }
      if (res.retriggered) retriggers++;
      if (res.feature.fullCurseThisSpin) {
        fullCurseValueAcc += res.win;
      }
      if (inBonusTrack && !engine.feature.inBonus) {
        const val = bonusReturned - currentBonusStartReturned;
        bonusValues.push(val);
        if (fullCurseValueAcc > 0) {
          fullCurses++;
          fullCurseValue += val;
        }
        inBonusTrack = false;
      }

      if (progressEvery && onProgress && (i + 1) % progressEvery === 0) {
        onProgress(i + 1, spins);
      }
    }

    const avgBonus = bonusValues.length
      ? bonusValues.reduce((a, b) => a + b, 0) / bonusValues.length
      : 0;

    return {
      spins,
      wagered,
      returned,
      rtp: wagered ? returned / wagered : 0,
      baseRtp: wagered ? baseReturned / wagered : 0,
      bonusRtp: wagered ? bonusReturned / wagered : 0,
      hitFrequency: hits / spins,
      bonusFrequency: bonuses / Math.max(1, spins - (engine.feature.spinsPlayed || 0)),
      bonuses,
      avgBonus,
      avgBonusX: avgBonus / bet,
      retriggerRate: bonuses ? retriggers / bonuses : 0,
      retriggers,
      fullCurses,
      fullCurseFrequency: bonuses ? fullCurses / bonuses : 0,
      fullCurseAvg: fullCurses ? fullCurseValue / fullCurses : 0,
      maxWin,
      maxWinX,
      winBuckets
    };
  }

  global.BOC.Engine = Engine;
  global.BOC.emptyFeature = emptyFeature;
  global.BOC.curseLevelFromEnergy = curseLevelFromEnergy;
  global.BOC.simulate = simulate;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { Engine, simulate, curseLevelFromEnergy };
  }
})(typeof window !== "undefined" ? window : global);
