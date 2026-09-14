/**
 * Symbol renderer — painted assets with SVG fallback.
 */
(function (global) {
  const FILES = {
    0: "assets/symbols/10.jpg",
    1: "assets/symbols/J.jpg",
    2: "assets/symbols/Q.jpg",
    3: "assets/symbols/K.jpg",
    4: "assets/symbols/A.jpg",
    5: "assets/symbols/scarab.jpg",
    6: "assets/symbols/idol.jpg",
    7: "assets/symbols/mask.jpg",
    8: "assets/symbols/gem.jpg",
    9: "assets/symbols/priest.jpg",
    10: "assets/symbols/book.jpg"
  };

  function srcFor(path) {
    const pack = (global.BOC && global.BOC.ASSETS) || {};
    return pack[path] || path;
  }

  function symbolSvg(id) {
    const path = FILES[id] || FILES[0];
    const src = srcFor(path);
    return `<img class="sym-art" src="${src}" alt="" draggable="false">`;
  }

  const HERO = `<img class="hero-art" src="${srcFor("assets/symbols/book.jpg")}" alt="Book of Curses" draggable="false">`;

  global.BOC = global.BOC || {};
  global.BOC.symbolSvg = symbolSvg;
  global.BOC.HERO_BOOK = HERO;
  global.BOC.SYMBOL_FILES = FILES;
})(typeof window !== "undefined" ? window : global);
