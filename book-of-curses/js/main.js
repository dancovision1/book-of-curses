(function () {
  const { CONFIG: CFG, Engine, RNG, symbolSvg, HERO_BOOK, simulate } = window.BOC;

  const state = {
    balance: CFG.startBalance,
    bet: CFG.defaultBet,
    spinning: false,
    auto: false,
    turbo: false,
    muted: false,
    lastGrid: null,
    debug: false,
    seed: "",
    force: {}
  };

  const rng = new RNG();
  const engine = new Engine(rng);
  const audio = new window.BOC.AudioBus();

  const $ = (id) => document.getElementById(id);

  function format(n) {
    return Math.round(n).toLocaleString("en-US");
  }

  function setText(id, v) {
    const el = $(id);
    if (el) el.textContent = v;
  }

  function renderGrid(grid) {
    for (let r = 0; r < 5; r++) {
      for (let row = 0; row < 3; row++) {
        const cell = document.querySelector(`.cell[data-r="${r}"][data-row="${row}"]`);
        if (!cell) continue;
        const id = grid[r][row];
        cell.dataset.sym = id;
        cell.querySelector(".sym").innerHTML = symbolSvg(id);
        cell.classList.remove("win", "scatter-land", "infected", "expanded");
      }
    }
    state.lastGrid = grid;
  }

  function idleGrid() {
    const g = [];
    for (let r = 0; r < 5; r++) {
      const strip = CFG.baseReels[r];
      const stop = (r * 5) % strip.length;
      g.push([strip[stop], strip[(stop + 1) % strip.length], strip[(stop + 2) % strip.length]]);
    }
    renderGrid(g);
  }

  function updateMeters(feature) {
    const f = feature || engine.feature;
    const maxE = CFG.curse.maxEnergyDisplay;
    const e = Math.min(f.energy, maxE);
    const fill = $("energyFill");
    if (fill) fill.style.width = (e / Math.max(9, maxE)) * 100 + "%";
    setText("energyRead", `${f.energy} / 9`);
    document.querySelectorAll(".curse-step").forEach((el, i) => {
      el.classList.toggle("on", f.curseLevel >= i && (f.inBonus || f.energy > 0));
      el.classList.toggle("full", i === 3 && f.curseLevel >= 3);
    });
    const frame = $("frame");
    frame.classList.toggle("corrupted", f.inBonus && f.curseLevel >= 1);
    frame.classList.toggle("possessed", f.inBonus && f.curseLevel >= 2);
    frame.classList.toggle("fullcurse", f.inBonus && f.curseLevel >= 3);

    $("fsBox").style.display = f.inBonus || f.spinsLeft > 0 ? "block" : "none";
    setText("fsCount", String(f.spinsLeft));
    const preview = $("cursedPreview");
    preview.innerHTML = "";
    (f.cursed || []).forEach((id) => {
      const d = document.createElement("div");
      d.className = "cursed-chip";
      d.innerHTML = symbolSvg(id);
      preview.appendChild(d);
    });

    $("spinBtn").classList.toggle("bonus", !!f.inBonus);
    $("hero").classList.toggle("opened", !!f.inBonus);
    $("heroCaption").textContent = f.inBonus
      ? CFG.curse.shortNames[f.curseLevel]
      : "THE BOOK IS SEALED";
    document.body.classList.remove("curse-0", "curse-1", "curse-2", "curse-3", "energy-hot", "anticipate-energy");
    const lvl = f.inBonus ? f.curseLevel : 0;
    document.body.classList.add("curse-" + lvl);
    if (f.inBonus && f.energy >= 8) document.body.classList.add("energy-hot", "anticipate-energy");
  }

  function updateHud(win) {
    setText("balVal", format(state.balance));
    setText("betAmt", format(state.bet));
    const w = $("winVal");
    w.textContent = format(win || 0);
    w.classList.toggle("win-on", !!win);
  }

  async function countUp(target) {
    const el = $("winVal");
    el.classList.add("win-on");
    if (state.turbo || target <= 0) {
      el.textContent = format(target);
      return;
    }
    const steps = Math.min(28, Math.max(8, Math.floor(target / 4)));
    for (let i = 1; i <= steps; i++) {
      el.textContent = format((target * i) / steps);
      await sleep(28);
    }
    el.textContent = format(target);
  }

  function drawPaylines(wins) {
    const svg = $("paylineSvg");
    if (!svg) return;
    svg.innerHTML = "";
    wins.slice(0, 4).forEach((w, i) => {
      const line = CFG.paylines[w.line];
      if (!line) return;
      const pts = line.map((row, reel) => {
        const x = ((reel + 0.5) / 5) * 100;
        const y = ((row + 0.5) / 3) * 100;
        return `${x},${y}`;
      });
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", "M" + pts.join(" L"));
      p.style.animationDelay = i * 80 + "ms";
      requestAnimationFrame(() => p.classList.add("on"));
      svg.appendChild(p);
    });
    setTimeout(() => { svg.innerHTML = ""; }, state.turbo ? 400 : 1600);
  }

  function setBookState(kind) {
    const hero = $("hero");
    hero.classList.remove("chained", "slam");
    if (kind === "chain") hero.classList.add("chained");
    if (kind === "open") {
      hero.classList.add("opened");
      hero.classList.remove("chained");
    }
    if (kind === "close") {
      hero.classList.remove("opened");
      hero.classList.add("slam");
    }
  }

  function showCeremony({ title, sub, cls, ms, book }) {
    const el = $("ceremony");
    $("ceremonyTitle").textContent = title || "";
    $("ceremonySub").textContent = sub || "";
    el.className = "ceremony show " + (cls || "");
    $("ceremonyBook").style.display = book === false ? "none" : "block";
    return new Promise((res) => {
      setTimeout(() => {
        el.className = "ceremony";
        res();
      }, state.turbo ? Math.min(ms || 1800, 500) : (ms || 1800));
    });
  }

  function showBanner(title, sub, curse) {
    const b = $("banner");
    $("bannerTitle").textContent = title;
    $("bannerTitle").classList.toggle("curse", !!curse);
    $("bannerSub").textContent = sub || "";
    b.classList.add("show");
    return new Promise((res) => {
      const t = state.turbo ? 500 : 1600;
      setTimeout(() => {
        b.classList.remove("show");
        res();
      }, t);
    });
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, state.turbo ? Math.min(ms, 80) : ms));
  }

  function flashCells(positions, cls) {
    positions.forEach(([r, row]) => {
      const cell = document.querySelector(`.cell[data-r="${r}"][data-row="${row}"]`);
      if (cell) cell.classList.add(cls);
    });
  }

  function cellEl(r, row) {
    return document.querySelector(`.cell[data-r="${r}"][data-row="${row}"]`);
  }

  function setCellSymbol(r, row, id, cls) {
    const cell = cellEl(r, row);
    if (!cell) return;
    cell.dataset.sym = String(id);
    cell.querySelector(".sym").innerHTML = symbolSvg(id);
    if (cls) cell.classList.add(cls);
  }

  function revealReel(r, grid, cursedIds) {
    let cursedHits = 0;
    let bookHits = 0;
    for (let row = 0; row < 3; row++) {
      const id = grid[r][row];
      const cell = cellEl(r, row);
      cell.dataset.sym = String(id);
      cell.querySelector(".sym").innerHTML = symbolSvg(id);
      if (id === CFG.scatterId) {
        cell.classList.add("scatter-land");
        bookHits++;
      } else if (cursedIds && cursedIds.includes(id)) {
        cell.classList.add("cursed-land");
        cursedHits++;
      }
    }
    return { cursedHits, bookHits };
  }

  async function animateSpinTo(grid) {
    const reels = [...document.querySelectorAll(".reel")];
    document.querySelectorAll(".cell").forEach((c) =>
      c.classList.remove("win", "scatter-land", "infected", "expanded", "cursed-land", "filling")
    );
    reels.forEach((el) => el.classList.add("spinning"));
    let booksLanded = 0;
    const baseDelays = state.turbo ? [40, 80, 120, 160, 220] : [320, 480, 640, 820, 1100];
    const delays = baseDelays.slice();
    const scramble = setInterval(() => {
      reels.forEach((reel) => {
        if (!reel.classList.contains("spinning")) return;
        reel.querySelectorAll(".cell").forEach((cell) => {
          cell.querySelector(".sym").innerHTML = symbolSvg(Math.floor(Math.random() * 11));
        });
      });
      audio.reelTick();
    }, state.turbo ? 36 : 55);

    for (let i = 0; i < 5; i++) {
      const energyHot = engine.feature.inBonus && engine.feature.energy >= 8;
      if (i === 4 && (booksLanded >= 2 || energyHot) && !state.turbo) {
        delays[4] += energyHot && booksLanded < 2 ? 480 : 780;
        reels[4].classList.add("anticipate");
        audio.heartbeatStart();
        audio.duck(0.18, 300);
      }
      await sleep(i === 0 ? delays[0] : delays[i] - delays[i - 1]);
      reels[i].classList.remove("spinning");
      const cursedIds = engine.feature.inBonus ? engine.feature.cursed : [];
      const hits = revealReel(i, grid, cursedIds);
      if (hits.bookHits) {
        booksLanded++;
        audio.scatter();
        setBookState("chain");
      } else if (hits.cursedHits) {
        audio.cursedLand();
      } else audio.land();
    }
    audio.stopHeartbeat();
    audio.restoreMusic();
    reels[4].classList.remove("anticipate");
    clearInterval(scramble);
  }

  async function animateExpansion(ex) {
    const reels = [...document.querySelectorAll(".reel")];
    for (const r of ex.reels) {
      reels[r].classList.add("filling-reel");
      audio.expandReel();
      for (let row = 0; row < 3; row++) {
        const cell = cellEl(r, row);
        const already = Number(cell.dataset.sym) === ex.symbol;
        if (!already) {
          setCellSymbol(r, row, ex.symbol, "filling");
        }
        cell.classList.add("expanded", "win", "cursed-land");
        await sleep(90);
      }
      await sleep(70);
    }
  }

  async function animateInfection(infections) {
    $("inkVeil").classList.add("on");
    audio.noise(0.35, 0.08, 700);
    for (const inf of infections) {
      for (const [r, row, pick] of inf.cells) {
        const id = pick != null ? pick : Number(cellEl(r, row).dataset.sym);
        setCellSymbol(r, row, id, "infected");
        cellEl(r, row).classList.add("cursed-land");
        audio.cursedLand();
        await sleep(110);
      }
    }
    await sleep(280);
    $("inkVeil").classList.remove("on");
  }

  async function playFullCurseCeremony() {
    audio.silence();
    audio.heartbeatStart();
    await sleep(420);
    audio.stopHeartbeat();
    audio.fullCurse();
    $("inkVeil").classList.add("on");
    await showCeremony({
      title: "FULL CURSE",
      sub: "THE BOOK LOSES CONTROL",
      cls: "black",
      ms: 2200
    });
    $("inkVeil").classList.remove("on");
    audio.setMood("full");
    audio.restoreMusic();
  }

  async function playMaxWinCeremony() {
    audio.silence();
    setBookState("close");
    await sleep(500);
    await showCeremony({
      title: "YOU SHOULDN'T HAVE OPENED IT.",
      sub: "",
      cls: "scratch",
      book: false,
      ms: 2000
    });
    audio.maxWin();
    await showCeremony({
      title: "MAX WIN",
      sub: CFG.maxWinX + "×",
      cls: "black",
      book: false,
      ms: 1600
    });
    audio.setMood("base");
    audio.restoreMusic();
  }

  async function playResult(res) {
    const show = res.landedGrid || res.grid;
    renderGrid(show);
    if (res.scatter.n) flashCells(res.scatter.positions, "scatter-land");

    const cursed = (res.feature && res.feature.cursed) || engine.feature.cursed || [];
    if (res.inBonusStart && cursed.length) {
      for (let r = 0; r < 5; r++) {
        for (let row = 0; row < 3; row++) {
          if (cursed.includes(show[r][row])) cellEl(r, row).classList.add("cursed-land");
        }
      }
    }

    if (res.lineWins.length) {
      res.lineWins.forEach((w) => flashCells(w.positions, "win"));
      drawPaylines(res.lineWins);
    }

    if (res.expansions.length) {
      await sleep(180);
      for (const ex of res.expansions) {
        await animateExpansion(ex);
      }
      audio.win(res.expTotal / Math.max(1, res.totalBet));
      await sleep(220);
    }

    if (res.win) await countUp(res.win);

    if (res.curseEvents) {
      for (const ev of res.curseEvents) {
        if (ev.type === "fullCurse") {
          await playFullCurseCeremony();
        }
        if (ev.type === "levelUp" && ev.to !== 3) {
          await showBanner(CFG.curse.names[ev.to], "THE CURSE DEEPENS", ev.to >= 2);
        }
        if (ev.type === "secondSymbol") {
          await showBanner("SECOND CURSED SYMBOL", CFG.symbolMeta[ev.symbol].name);
        }
      }
    }

    if (res.infections && res.infections.length) {
      await animateInfection(res.infections);
    }

    if (res.triggered) {
      setBookState("open");
      audio.bonusStart();
      const name = CFG.symbolMeta[engine.feature.cursed[0]].name;
      await showCeremony({
        title: "FREE SPINS",
        sub: "CURSED SYMBOL — " + name,
        cls: "black",
        ms: 2000
      });
    }
    if (res.retriggered) {
      await showBanner("RETRIGGER", `+${CFG.retriggerSpins} SPINS  ·  +1 CURSE ENERGY`);
    }

    if (res.capHit) {
      await playMaxWinCeremony();
    }

    if (res.inBonusStart && !engine.feature.inBonus && engine.feature.spinsPlayed) {
      audio.setMood("base");
      setBookState("close");
      await showBanner("THE BOOK CLOSES", `BONUS WIN  ${format(engine.feature.bonusWin)}`);
    } else if (engine.feature.inBonus) {
      audio.setMood(engine.feature.curseLevel >= 3 ? "full" : "bonus");
    }
  }

  async function doSpin() {
    if (state.spinning) return;
    const inBonus = engine.feature.inBonus;
    if (!inBonus && state.balance < state.bet) {
      await showBanner("INSUFFICIENT BALANCE", "Adjust bet or reset credits");
      state.auto = false;
      $("autoBtn").classList.remove("on");
      return;
    }
    state.spinning = true;
    $("spinBtn").disabled = true;
    audio.resume();

    if (!inBonus) state.balance -= state.bet;
    updateHud(0);

    const res = engine.spin({
      totalBet: state.bet,
      forceBonus: state.force.bonus,
      forceScatterCount: state.force.scatters,
      forceRetrigger: state.force.retrigger,
      forceFullCurse: state.force.full,
      forceExpandReels: state.force.expand,
      forceCursed: state.force.cursed,
      forceLevel: state.force.level,
      forceGrid: state.force.grid
    });
    if (state.force.capHit) res.capHit = true;
    state.force = {};

    await animateSpinTo(res.landedGrid || res.grid);
    await playResult(res);

    state.balance += res.win;
    updateHud(res.win);
    updateMeters(engine.feature);
    state.spinning = false;
    $("spinBtn").disabled = false;

    if (state.auto) {
      await sleep(220);
      doSpin();
    }
  }

  state.pickCursed = 9;

  function chosenSymbol() {
    return state.pickCursed == null ? 9 : state.pickCursed;
  }

  function runScene(name) {
    if (state.spinning) return;
    audio.resume();
    const sym = chosenSymbol();
    if (name === "reset") {
      engine.resetFeature();
      state.balance = CFG.startBalance;
      state.auto = false;
      $("autoBtn").classList.remove("on");
      updateMeters();
      updateHud(0);
      return;
    }
    if (name === "enter") {
      engine.startBonus(sym, { level: 0 });
      updateMeters();
      showBanner("FREE SPINS", `CURSED SYMBOL — ${CFG.symbolMeta[sym].name}`);
      return;
    }
    if (name === "tease") {
      state.force.scatters = 2;
      doSpin();
      return;
    }
    if (name === "trigger") {
      state.force.scatters = 3;
      state.force.cursed = sym;
      state.force.bonus = true;
      doSpin();
      return;
    }
    if (name === "retrigger") {
      if (!engine.feature.inBonus) engine.startBonus(sym, { level: 1 });
      state.force.retrigger = true;
      doSpin();
      return;
    }
    if (name === "curse1") {
      engine.startBonus(sym, { level: 0, energy: 1 });
      updateMeters();
      state.force.expand = 3;
      doSpin();
      return;
    }
    if (name === "curse2") {
      engine.startBonus(sym, { level: 1, energy: 4 });
      updateMeters();
      state.force.expand = 4;
      state.force.level = 1;
      doSpin();
      return;
    }
    if (name === "curse3") {
      engine.startBonus(sym, { level: 2, energy: 7 });
      updateMeters();
      state.force.expand = 4;
      state.force.level = 2;
      doSpin();
      return;
    }
    if (name === "full") {
      engine.startBonus(sym, { level: 3, energy: 9 });
      updateMeters();
      state.force.expand = 4;
      state.force.full = true;
      state.force.level = 3;
      doSpin();
      return;
    }
    if (name === "expand3") {
      if (!engine.feature.inBonus) engine.startBonus(sym, { level: 0 });
      state.force.expand = 3;
      doSpin();
      return;
    }
    if (name === "expand5") {
      if (!engine.feature.inBonus) engine.startBonus(sym, { level: 1, energy: 4 });
      state.force.expand = 5;
      doSpin();
      return;
    }
    if (name === "maxwin") {
      engine.startBonus(sym, { level: 3, energy: 9 });
      state.force.expand = 5;
      state.force.full = true;
      state.force.capHit = true;
      doSpin();
    }
  }

  function buildSymbolPicker() {
    const wrap = $("symPick");
    if (!wrap) return;
    wrap.innerHTML = "";
    for (let id = 0; id <= 9; id++) {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = symbolSvg(id);
      b.title = CFG.symbolMeta[id].name;
      b.addEventListener("click", () => {
        state.pickCursed = id;
        wrap.querySelectorAll("button").forEach((x) => (x.style.outline = ""));
        b.style.outline = "1px solid #1dff8a";
      });
      if (id === state.pickCursed) b.style.outline = "1px solid #1dff8a";
      wrap.appendChild(b);
    }
  }

  function changeBet(dir) {
    if (state.spinning || engine.feature.inBonus) return;
    const i = CFG.bets.indexOf(state.bet);
    const n = CFG.bets[Math.max(0, Math.min(CFG.bets.length - 1, i + dir))];
    state.bet = n;
    updateHud(0);
  }

  function bind() {
    $("spinBtn").addEventListener("click", doSpin);
    $("betUp").addEventListener("click", () => changeBet(1));
    $("betDown").addEventListener("click", () => changeBet(-1));
    $("autoBtn").addEventListener("click", () => {
      state.auto = !state.auto;
      $("autoBtn").classList.toggle("on", state.auto);
      if (state.auto && !state.spinning) doSpin();
    });
    $("turboBtn").addEventListener("click", () => {
      state.turbo = !state.turbo;
      $("turboBtn").classList.toggle("on", state.turbo);
    });
    $("soundBtn").addEventListener("click", () => {
      const on = audio.toggle();
      $("soundBtn").classList.toggle("on", on);
      $("soundBtn").textContent = on ? "♪" : "×";
    });
    $("infoBtn").addEventListener("click", () => $("infoOverlay").classList.add("show"));
    $("infoClose").addEventListener("click", () => $("infoOverlay").classList.remove("show"));
    $("infoOverlay").addEventListener("click", (e) => {
      if (e.target.id === "infoOverlay") e.target.classList.remove("show");
    });
    $("simBtn").addEventListener("click", () => $("simOverlay").classList.add("show"));
    $("simClose").addEventListener("click", () => $("simOverlay").classList.remove("show"));
    $("runSim").addEventListener("click", runSim);
    $("debugBtn").addEventListener("click", () => {
      state.debug = !state.debug;
      $("debugDock").classList.toggle("show", state.debug);
    });
    document.getElementById("debugDock").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-scene]");
      if (btn) runScene(btn.dataset.scene);
    });
    $("seedApply").addEventListener("click", () => {
      const s = $("seedInput").value.trim();
      rng.setSeed(s === "" ? null : s);
    });
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        doSpin();
      }
    });
    document.addEventListener("click", () => audio.resume(), { once: true });
    document.addEventListener("pointerdown", () => audio.resume(), { once: true });
  }

  function buildPaytable() {
    const tb = $("payBody");
    tb.innerHTML = CFG.symbolMeta
      .map((m) => {
        const p = CFG.paytable[m.id];
        return `<tr>
          <td>${symbolSvg(m.id)} ${m.name}</td>
          <td>${p[0]}</td><td>${p[1]}</td><td>${p[2]}</td>
        </tr>`;
      })
      .join("");
  }

  function runSim() {
    const spins = parseInt($("simSpins").value, 10) || 100000;
    const seed = parseInt($("simSeed").value, 10) || 1;
    $("simOut").textContent = "Running…";
    setTimeout(() => {
      const t0 = performance.now();
      const r = simulate({ spins, bet: state.bet, seed });
      const ms = Math.round(performance.now() - t0);
      $("simOut").textContent = [
        `BOOK OF CURSES  ·  ${spins.toLocaleString()} spins  ·  ${ms}ms`,
        `RTP              ${(r.rtp * 100).toFixed(2)}%`,
        `Base RTP         ${(r.baseRtp * 100).toFixed(2)}%`,
        `Bonus RTP        ${(r.bonusRtp * 100).toFixed(2)}%`,
        `Hit frequency    ${(r.hitFrequency * 100).toFixed(2)}%`,
        `Bonuses          ${r.bonuses}   (1 / ${(1 / Math.max(r.bonusFrequency, 1e-9)).toFixed(1)})`,
        `Avg bonus        ${r.avgBonus.toFixed(1)}   (${r.avgBonusX.toFixed(2)}×)`,
        `Retriggers       ${r.retriggers}   (${(r.retriggerRate * 100).toFixed(2)}% / bonus)`,
        `Full Curses      ${r.fullCurses}   (${(r.fullCurseFrequency * 100).toFixed(2)}% / bonus)`,
        `Full Curse avg   ${r.fullCurseAvg.toFixed(1)}`,
        `Max win          ${r.maxWin}   (${r.maxWinX.toFixed(1)}×)`,
        `Buckets          ${JSON.stringify(r.winBuckets)}`
      ].join("\n");
    }, 30);
  }

  function paintEmbers() {
    const c = $("embers");
    if (!c) return;
    for (let i = 0; i < 18; i++) {
      const s = document.createElement("span");
      s.style.cssText = `position:absolute;width:2px;height:2px;background:#c9a44a;border-radius:50%;
        left:${Math.random() * 100}%;bottom:${Math.random() * 40}%;opacity:${0.2 + Math.random() * 0.5};
        box-shadow:0 0 6px #c9a44a;animation:floatUp ${6 + Math.random() * 8}s linear ${Math.random() * 6}s infinite;`;
      c.appendChild(s);
    }
    const st = document.createElement("style");
    st.textContent = `@keyframes floatUp{0%{transform:translateY(0);opacity:.4}100%{transform:translateY(-70vh);opacity:0}}`;
    document.head.appendChild(st);
  }

  function applyEmbeddedArt() {
    const pack = window.BOC.ASSETS || {};
    if (pack.bg) {
      const b = document.querySelector(".backdrop");
      if (b) b.style.backgroundImage = `url("${pack.bg}")`;
    }
    const book = pack["assets/symbols/book.jpg"];
    if (book && $("ceremonyBook")) $("ceremonyBook").style.backgroundImage = `url("${book}")`;
  }

  function init() {
    applyEmbeddedArt();
    $("heroSvg").innerHTML = HERO_BOOK;
    if ($("miniBook")) $("miniBook").innerHTML = HERO_BOOK;
    idleGrid();
    updateHud(0);
    updateMeters();
    buildPaytable();
    buildSymbolPicker();
    bind();
    paintEmbers();
    // Dev panel visible by default so bonus scenarios are one click away
    state.debug = true;
    $("debugDock").classList.add("show");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
