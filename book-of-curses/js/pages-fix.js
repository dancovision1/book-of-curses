(function () {
  function $(id) { return document.getElementById(id); }
  function setupDevToggle() {
    const btn = $("debugBtn");
    const dock = $("debugDock");
    if (!btn || !dock) return;
    btn.textContent = "DEV";
    btn.title = "Developer tools";
    dock.classList.remove("show");
    btn.classList.remove("on");
    btn.addEventListener("click", function () {
      const open = dock.classList.toggle("show");
      btn.classList.toggle("on", open);
    });
    setTimeout(function () {
      if (!btn.classList.contains("on")) dock.classList.remove("show");
    }, 1200);
  }
  function cellCenter(reel, row, box) {
    const cell = document.querySelector('.cell[data-r="' + reel + '"][data-row="' + row + '"]');
    if (!cell) return null;
    const cr = cell.getBoundingClientRect();
    return { x: cr.left + cr.width / 2 - box.left, y: cr.top + cr.height / 2 - box.top, cell: cell };
  }
  function parseOldPath(d) {
    const nums = (d || "").match(/-?\d+(\.\d+)?/g);
    if (!nums || nums.length < 4) return null;
    const pts = [];
    for (let i = 0; i < nums.length; i += 2) pts.push({ x: +nums[i], y: +nums[i + 1] });
    if (!pts.every(function (p) { return p.x <= 105 && p.y <= 105; })) return null;
    return pts.map(function (p) {
      return {
        reel: Math.max(0, Math.min(4, Math.round(p.x / 20 - 0.5))),
        row: Math.max(0, Math.min(2, Math.round(p.y / (100 / 3) - 0.5)))
      };
    });
  }
  function paintReal(stops) {
    const svg = $("paylineSvg");
    if (!svg || !stops) return;
    window.__bocPainting = true;
    const box = svg.getBoundingClientRect();
    svg.setAttribute("viewBox", "0 0 " + Math.max(1, box.width) + " " + Math.max(1, box.height));
    svg.setAttribute("preserveAspectRatio", "none");
    document.querySelectorAll(".cell.line-on").forEach(function (c) { c.classList.remove("line-on"); });
    const pts = stops.map(function (s) { return cellCenter(s.reel, s.row, box); }).filter(Boolean);
    svg.innerHTML = "";
    if (pts.length < 2) { window.__bocPainting = false; return; }
    const ns = "http://www.w3.org/2000/svg";
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M" + pts.map(function (p) { return p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" L"));
    path.setAttribute("pathLength", "1");
    svg.appendChild(path);
    pts.forEach(function (p) {
      const c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", p.x.toFixed(1));
      c.setAttribute("cy", p.y.toFixed(1));
      c.setAttribute("r", "4.5");
      c.classList.add("node");
      svg.appendChild(c);
      if (p.cell) p.cell.classList.add("line-on");
    });
    window.__bocPainting = false;
  }
  function watchPaylines() {
    const svg = $("paylineSvg");
    if (!svg) return;
    new MutationObserver(function () {
      if (window.__bocPainting) return;
      const path = svg.querySelector("path");
      if (!path) return;
      const mapped = parseOldPath(path.getAttribute("d"));
      if (mapped) paintReal(mapped);
    }).observe(svg, { childList: true, subtree: true });
  }
  function boot() { setupDevToggle(); watchPaylines(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
