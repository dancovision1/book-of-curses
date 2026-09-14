(function () {
  const files = [
    ["assets/dvision-gaming.svg", "DVISION"],
    ["assets/bg-temple.jpg", "STONE"],
    ["assets/the-vault-breathes.mp3", "THE VAULT"],
    ["assets/symbols/10.jpg", "10"],
    ["assets/symbols/J.jpg", "J"],
    ["assets/symbols/Q.jpg", "Q"],
    ["assets/symbols/K.jpg", "K"],
    ["assets/symbols/A.jpg", "A"],
    ["assets/symbols/scarab.jpg", "SCARAB"],
    ["assets/symbols/idol.jpg", "IDOL"],
    ["assets/symbols/mask.jpg", "MASK"],
    ["assets/symbols/gem.jpg", "GEM"],
    ["assets/symbols/priest.jpg", "PRIEST"],
    ["assets/symbols/book.jpg", "THE BOOK"]
  ];
  function $(id) { return document.getElementById(id); }
  function setProgress(i, total, label) {
    const p = Math.round((i / total) * 100);
    if ($("splashFill")) $("splashFill").style.width = p + "%";
    if ($("splashPct")) $("splashPct").textContent = p + "%";
    if ($("splashSub") && label) $("splashSub").textContent = label;
  }
  function loadOne(src) {
    return new Promise((resolve) => {
      if (src.endsWith(".mp3")) {
        const a = new Audio();
        a.preload = "auto";
        a.addEventListener("canplaythrough", resolve, { once: true });
        a.addEventListener("error", resolve, { once: true });
        a.src = src;
        return;
      }
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = src;
    });
  }
  async function run() {
    for (let i = 0; i < files.length; i++) {
      await loadOne(files[i][0]);
      setProgress(i + 1, files.length, files[i][1]);
    }
    if ($("splashSub")) $("splashSub").textContent = "THE BOOK IS SEALED";
    await new Promise((r) => setTimeout(r, 400));
    document.body.classList.remove("booting");
    if ($("splash")) $("splash").classList.add("gone");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
