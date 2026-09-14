/**
 * Helper used only while tuning. Prints P(book visible) per reel and 3+ rate.
 */
const path = require("path");
const fs = require("fs");
function load(file) {
  eval(`(function(global, window, module, exports){\n${fs.readFileSync(path.join(__dirname, file), "utf8")}\n})(global, global, {exports:{}}, {});`);
}
load("config.js");
const cfg = global.BOC.CONFIG;

function windowHit(strip, id) {
  let hits = 0;
  for (let i = 0; i < strip.length; i++) {
    const w = [strip[i], strip[(i + 1) % strip.length], strip[(i + 2) % strip.length]];
    if (w.includes(id)) hits++;
  }
  return hits / strip.length;
}

function comboRate(probs, atLeast) {
  // exact enumeration 2^5
  let p = 0;
  for (let mask = 0; mask < 32; mask++) {
    let bits = 0;
    let pr = 1;
    for (let r = 0; r < 5; r++) {
      if (mask & (1 << r)) {
        bits++;
        pr *= probs[r];
      } else pr *= 1 - probs[r];
    }
    if (bits >= atLeast) p += pr;
  }
  return p;
}

const bp = cfg.baseReels.map((s) => windowHit(s, 10));
const fp = cfg.bonusReels.map((s) => windowHit(s, 10));
console.log("base lengths", cfg.baseReels.map((s) => s.length));
console.log("base book window p", bp.map((x) => x.toFixed(3)), "3+", comboRate(bp, 3).toFixed(5), "1/", (1 / comboRate(bp, 3)).toFixed(1));
console.log("bonus book window p", fp.map((x) => x.toFixed(3)), "3+", comboRate(fp, 3).toFixed(5), "1/", (1 / comboRate(fp, 3)).toFixed(1));
console.log("sample base reel0", cfg.baseReels[0].join(","));
