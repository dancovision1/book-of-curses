(function () {
  function $(id) { return document.getElementById(id); }
  var FX = ["win", "scatter-land", "infected", "expanded", "line-on", "cursed-land", "filling"];

  function setupDevToggle() {
    var btn = $("debugBtn");
    var dock = $("debugDock");
    var sim = $("simBtn");
    if (!/[?&]dev=1(?:&|$)/.test(location.search)) {
      if (btn) btn.hidden = true;
      if (sim) sim.hidden = true;
      if (dock) dock.classList.remove("show");
      return;
    }
    if (!btn || !dock) return;
    btn.hidden = false;
    btn.textContent = "DEV";
    dock.classList.remove("show");
    btn.classList.remove("on");
    btn.addEventListener("click", function () {
      setTimeout(function () {
        btn.classList.toggle("on", dock.classList.contains("show"));
      }, 0);
    });
  }

  function wipeFx() {
    document.querySelectorAll(".cell").forEach(function (c) {
      FX.forEach(function (k) { c.classList.remove(k); });
    });
    var svg = $("paylineSvg");
    if (svg) svg.innerHTML = "";
  }

  function booksOnStopped() {
    var n = 0;
    document.querySelectorAll(".reel").forEach(function (reel, i) {
      if (reel.classList.contains("spinning")) return;
      var hit = false;
      reel.querySelectorAll(".cell").forEach(function (cell) {
        if (cell.classList.contains("scatter-land") || cell.dataset.sym === "10") hit = true;
      });
      if (hit) n++;
    });
    return n;
  }

  function watchReels() {
    var root = $("reels");
    if (!root) return;
    var wasSpinning = false;
    new MutationObserver(function () {
      var spinning = document.querySelectorAll(".reel.spinning").length;
      if (spinning && !wasSpinning) wipeFx();
      wasSpinning = spinning > 0;
      if (spinning && booksOnStopped() >= 2) {
        document.querySelectorAll(".reel.spinning").forEach(function (r) {
          r.classList.add("anticipate");
        });
      }
      if (!spinning) {
        document.querySelectorAll(".reel.anticipate").forEach(function (r) {
          r.classList.remove("anticipate");
        });
      }
    }).observe(root, { attributes: true, subtree: true, attributeFilter: ["class"] });
  }

  function cellCenter(reel, row, box) {
    var cell = document.querySelector('.cell[data-r="' + reel + '"][data-row="' + row + '"]');
    if (!cell) return null;
    var cr = cell.getBoundingClientRect();
    return { x: cr.left + cr.width / 2 - box.left, y: cr.top + cr.height / 2 - box.top, cell: cell };
  }
  function parseOldPath(d) {
    var nums = (d || "").match(/-?\d+(\.\d+)?/g);
    if (!nums || nums.length < 4) return null;
    var pts = [];
    for (var i = 0; i < nums.length; i += 2) pts.push({ x: +nums[i], y: +nums[i + 1] });
    if (!pts.every(function (p) { return p.x <= 105 && p.y <= 105; })) return pts.length ? "pixel" : null;
    return pts.map(function (p) {
      return {
        reel: Math.max(0, Math.min(4, Math.round(p.x / 20 - 0.5))),
        row: Math.max(0, Math.min(2, Math.round(p.y / (100 / 3) - 0.5)))
      };
    });
  }
  function paintReal(stops) {
    var svg = $("paylineSvg");
    if (!svg || !stops || stops === "pixel") return;
    window.__bocPainting = true;
    var box = svg.getBoundingClientRect();
    svg.setAttribute("viewBox", "0 0 " + Math.max(1, box.width) + " " + Math.max(1, box.height));
    svg.setAttribute("preserveAspectRatio", "none");
    document.querySelectorAll(".cell.line-on").forEach(function (c) { c.classList.remove("line-on"); });
    var pts = stops.map(function (s) { return cellCenter(s.reel, s.row, box); }).filter(Boolean);
    svg.innerHTML = "";
    if (pts.length < 2) { window.__bocPainting = false; return; }
    var ns = "http://www.w3.org/2000/svg";
    var path = document.createElementNS(ns, "path");
    var d = "M" + pts.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" L");
    path.setAttribute("d", d);
    svg.appendChild(path);
    var len = path.getTotalLength ? path.getTotalLength() : 400;
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    path.getBoundingClientRect();
    path.style.transition = "stroke-dashoffset .55s ease-out";
    path.style.strokeDashoffset = "0";
    pts.forEach(function (p, i) {
      var c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", p.x.toFixed(1));
      c.setAttribute("cy", p.y.toFixed(1));
      c.setAttribute("r", "4.5");
      c.classList.add("node");
      c.style.animationDelay = i * 90 + "ms";
      svg.appendChild(c);
      if (p.cell) p.cell.classList.add("line-on");
    });
    window.__bocPainting = false;
  }
  function watchPaylines() {
    var svg = $("paylineSvg");
    if (!svg) return;
    new MutationObserver(function () {
      if (window.__bocPainting) return;
      var path = svg.querySelector("path");
      if (!path) {
        document.querySelectorAll(".cell.line-on").forEach(function (c) { c.classList.remove("line-on"); });
        return;
      }
      var mapped = parseOldPath(path.getAttribute("d"));
      if (mapped && mapped !== "pixel") paintReal(mapped);
    }).observe(svg, { childList: true, subtree: true });
  }

  function boot() {
    setupDevToggle();
    watchPaylines();
    watchReels();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
