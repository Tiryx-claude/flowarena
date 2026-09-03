/* =========================================================================
   FlowArena — Spark FX (geteilt)
   -------------------------------------------------------------------------
   Kleine Funken-Partikel, die bei Ballkontakt aufblitzen. Genutzt von der
   Homepage-Gameplay-Vorschau (home.js) UND der echten Challenge-Bühne
   (challenge.js) — ein Ort für die Optik, damit beide garantiert gleich
   aussehen (siehe docs/GAMEPLAY.md).
   ========================================================================= */

(function (window) {
  "use strict";

  /**
   * @param {HTMLElement} layer - Container mit position:relative/absolute, in den die Funken eingefügt werden
   * @param {number} x - Position relativ zum Container (px)
   * @param {number} y - Position relativ zum Container (px)
   * @param {Object} [opts]
   * @param {number} [opts.count=7]
   * @param {number} [opts.minDist=16]
   * @param {number} [opts.maxDist=30]
   */
  function spawnSparks(layer, x, y, opts = {}) {
    if (!layer) return;
    const count = opts.count ?? 7;
    const minDist = opts.minDist ?? 16;
    const maxDist = opts.maxDist ?? 30;

    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "pv-spark";
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = minDist + Math.random() * (maxDist - minDist);
      s.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      s.style.setProperty("--dy", `${Math.sin(angle) * dist - 6}px`);
      s.style.left = `${x}px`;
      s.style.top = `${y}px`;
      layer.appendChild(s);
      setTimeout(() => s.remove(), 500);
    }
  }

  window.FlowSparkFX = { spawnSparks };
})(window);
