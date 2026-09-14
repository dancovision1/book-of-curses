/**
 * Headless Monte Carlo runner: node js/simulate-cli.js [spins] [seed]
 */
const path = require("path");
const fs = require("fs");

function loadBrowserModule(file) {
  const code = fs.readFileSync(path.join(__dirname, file), "utf8");
  const wrapped = `(function(global, window, module, exports){\n${code}\n})(global, global, {exports:{}}, {});`;
  eval(wrapped);
}

loadBrowserModule("config.js");
loadBrowserModule("rng.js");
loadBrowserModule("engine.js");

const spins = parseInt(process.argv[2] || "200000", 10);
const seed = parseInt(process.argv[3] || "42", 10);
const bet = 10;

console.log(`BOOK OF CURSES simulation  spins=${spins} seed=${seed} bet=${bet}`);
const t0 = Date.now();
const report = global.BOC.simulate({
  spins,
  bet,
  seed,
  progressEvery: Math.max(10000, Math.floor(spins / 10)),
  onProgress: (i, n) => {
    process.stdout.write(`  ${((i / n) * 100).toFixed(0)}%\r`);
  }
});
const ms = Date.now() - t0;

function pct(x) {
  return (x * 100).toFixed(3) + "%";
}

console.log(`
Completed in ${ms}ms
------------------------------------------------
Spins              ${report.spins}
Wagered            ${report.wagered}
Returned           ${report.returned.toFixed(0)}
RTP                ${pct(report.rtp)}
Base RTP           ${pct(report.baseRtp)}
Bonus RTP          ${pct(report.bonusRtp)}
Hit frequency      ${pct(report.hitFrequency)}
Bonuses            ${report.bonuses}
Bonus frequency    1 / ${(1 / Math.max(report.bonusFrequency, 1e-12)).toFixed(1)}
Avg bonus          ${report.avgBonus.toFixed(1)}  (${report.avgBonusX.toFixed(2)}x)
Retriggers         ${report.retriggers}  (rate ${pct(report.retriggerRate)} per bonus)
Full Curses        ${report.fullCurses}  (rate ${pct(report.fullCurseFrequency)} per bonus)
Full Curse avg     ${report.fullCurseAvg.toFixed(1)}
Max win            ${report.maxWin}  (${report.maxWinX.toFixed(1)}x)
Win buckets        ${JSON.stringify(report.winBuckets)}
------------------------------------------------
`);
