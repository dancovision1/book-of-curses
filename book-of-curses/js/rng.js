/**
 * Deterministic seeded RNG (Mulberry32) + fallback Math.random.
 * Same engine used by visual game and headless simulation.
 */
(function (global) {
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  class RNG {
    constructor(seed) {
      this.setSeed(seed);
    }
    setSeed(seed) {
      if (seed === null || seed === undefined || seed === "") {
        this.seed = null;
        this._next = Math.random;
        this.mode = "crypto-math";
      } else {
        const n = typeof seed === "number" ? seed : hashString(String(seed));
        this.seed = n;
        this._next = mulberry32(n);
        this.mode = "seeded";
      }
    }
    random() {
      return this._next();
    }
    int(maxExclusive) {
      return Math.floor(this.random() * maxExclusive);
    }
    pick(arr) {
      return arr[this.int(arr.length)];
    }
    chance(p) {
      return this.random() < p;
    }
  }

  global.BOC = global.BOC || {};
  global.BOC.RNG = RNG;
  if (typeof module !== "undefined" && module.exports) module.exports = { RNG };
})(typeof window !== "undefined" ? window : global);
