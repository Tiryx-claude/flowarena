/* =========================================================================
   FlowArena — i18n Engine (Mehrsprachigkeit: Deutsch, Englisch, Russisch)
   -------------------------------------------------------------------------
   Lädt VOR jedem anderen App-Skript (siehe <script>-Reihenfolge in jeder
   HTML-Datei) und stellt window.FlowI18n bereit:
     - t(key, vars)      — Übersetzung nachschlagen, {{platzhalter}} ersetzen
     - tPick(key, vars)  — wie t(), aber key zeigt auf ein Array → zufälliger Eintrag
     - getLocale() / setLocale(locale) — aktuelle Sprache lesen/setzen
     - applyTranslations(root) — füllt alle [data-i18n]/[data-i18n-attr] im
       übergebenen Wurzelelement (Standard: ganzes Dokument)
     - onLocaleChange(fn) — Callback, wenn sich die Sprache ändert (damit
       Seiten ihre dynamisch per JS gerenderten Inhalte neu zeichnen können)
     - ensureLocaleChosen() — zeigt bei allererstem Besuch (kein Locale
       gespeichert) eine blockierende Sprachwahl, BEVOR irgendetwas anderes
       passiert; speichert die Wahl dauerhaft (localStorage)

   WICHTIG — Ehrlichkeit: es gibt keinen Übersetzungsdienst/keine externe
   API. Alle drei Sprachen (Deutsch, Englisch, Russisch) sind von Hand
   kuratierte, statische Wörterbücher (assets/js/i18n-data.js), die
   zusammen mit diesem Skript geladen werden — funktioniert deshalb
   komplett offline, ohne Latenz, ohne Kosten pro Aufruf. Siehe docs/I18N.md.

   Architektur-Entscheidung: [data-i18n]-Attribute statt eines vollen
   Framework-Bindings — bewusst so leichtgewichtig wie der Rest dieses
   Prototyps (kein Build-Schritt, kein Bundler), passt zum bestehenden
   Stil (siehe README.md).
   ========================================================================= */

(function (window) {
  "use strict";

  const STORAGE_KEY = "flowarena.locale.v1";
  const SUPPORTED = ["de", "en", "ru"];
  const FALLBACK = "de";

  const LOCALE_META = {
    de: { label: "Deutsch", flag: "🇩🇪", native: "Deutsch" },
    en: { label: "English", flag: "🇬🇧", native: "English" },
    ru: { label: "Русский", flag: "🇷🇺", native: "Русский" },
  };

  let currentLocale = null;
  const changeListeners = [];

  function readStoredLocale() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return SUPPORTED.includes(raw) ? raw : null;
    } catch (e) {
      return null;
    }
  }

  function writeStoredLocale(locale) {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch (e) {
      /* localStorage evtl. nicht verfügbar — Sprache lebt dann nur für die Session */
    }
  }

  function detectBrowserLocale() {
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "de"];
    for (const l of langs) {
      const short = String(l).slice(0, 2).toLowerCase();
      if (SUPPORTED.includes(short)) return short;
    }
    return FALLBACK;
  }

  function getLocale() {
    if (currentLocale) return currentLocale;
    currentLocale = readStoredLocale() || FALLBACK;
    return currentLocale;
  }

  function setLocale(locale, opts = {}) {
    if (!SUPPORTED.includes(locale)) return;
    currentLocale = locale;
    writeStoredLocale(locale);
    document.documentElement.setAttribute("lang", locale);
    applyTranslations(document);
    if (!opts.silent) changeListeners.forEach((fn) => { try { fn(locale); } catch (e) { /* ein fehlerhafter Listener soll die anderen nicht blockieren */ } });
  }

  function onLocaleChange(fn) {
    if (typeof fn === "function") changeListeners.push(fn);
  }

  /* -----------------------------------------------------------------
     Übersetzung nachschlagen — dotted key path, z.B. "nav.home".
     Fällt auf FALLBACK-Sprache, dann auf den Key selbst zurück (sichtbarer
     Hinweis auf einen fehlenden Eintrag statt eines stillen Lecks).
     ----------------------------------------------------------------- */
  function resolve(dict, key) {
    if (!dict) return undefined;
    return key.split(".").reduce((node, part) => (node && typeof node === "object" ? node[part] : undefined), dict);
  }

  function lookup(key) {
    const dicts = window.FlowI18nStrings || {};
    let value = resolve(dicts[getLocale()], key);
    if (value === undefined) value = resolve(dicts[FALLBACK], key);
    return value;
  }

  function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{\{(\w+)\}\}/g, (m, name) => (Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m));
  }

  function t(key, vars) {
    const value = lookup(key);
    if (value === undefined) return key;
    if (Array.isArray(value)) return interpolate(value[0], vars); // Array ohne tPick() → erstes Element als sinnvoller Default
    return interpolate(String(value), vars);
  }

  function tPick(key, vars) {
    const value = lookup(key);
    if (Array.isArray(value) && value.length) {
      return interpolate(value[Math.floor(Math.random() * value.length)], vars);
    }
    return t(key, vars);
  }

  // Wie t(), gibt aber bei einem Array-Wert ALLE Einträge zurück (interpoliert)
  // statt nur den ersten — für Fälle, in denen die ganze Sequenz gebraucht wird
  // (z.B. eine Reihe von Status-Texten, die nacheinander angezeigt werden).
  function tList(key, vars) {
    const value = lookup(key);
    if (Array.isArray(value)) return value.map((v) => interpolate(v, vars));
    if (value === undefined) return [key];
    return [interpolate(String(value), vars)];
  }

  // Zahlwort-Pluralformen: Deutsch/Englisch kennen nur 1 vs. viele, Russisch
  // braucht eine echte 3-Wege-Unterscheidung (1 / 2-4 / 5+, mit der üblichen
  // 11-14-Ausnahme) — z.B. "1 куплет" / "3 куплета" / "5 куплетов". `key`
  // muss auf drei Varianten zeigen: {key}One, {key}Few, {key}Many.
  function tPlural(keyBase, n, vars) {
    const locale = getLocale();
    let form;
    if (locale === "ru") {
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) form = "One";
      else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) form = "Few";
      else form = "Many";
    } else {
      form = n === 1 ? "One" : "Many";
    }
    return t(`${keyBase}${form}`, vars);
  }

  /* -----------------------------------------------------------------
     DOM-Anwendung: [data-i18n]="key" setzt textContent, [data-i18n-html]
     setzt innerHTML (nur für Strings mit bewusst eingebautem <strong>/<a>
     etc. in den Wörterbüchern selbst — nie mit Nutzereingaben kombiniert),
     [data-i18n-attr]="attr1:key1,attr2:key2" setzt beliebige Attribute
     (z.B. placeholder, aria-label, title).
     ----------------------------------------------------------------- */
  function applyTranslations(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    scope.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    scope.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.getAttribute("data-i18n-attr").split(",").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
  }

  /* -----------------------------------------------------------------
     Erststart: Sprachwahl. Zeigt EINMALIG (kein gespeichertes Locale) eine
     blockierende Auswahl — vorausgewählt ist die per Browser-Sprache
     erkannte Sprache, damit ein Klick auf "Bestätigen" für die meisten
     schon passt, aber die Wahl bleibt explizit beim Menschen (siehe
     Anforderung "Der Nutzer wählt die Sprache beim ersten Start").
     ----------------------------------------------------------------- */
  function ensureLocaleChosen() {
    if (readStoredLocale()) {
      setLocale(readStoredLocale(), { silent: true });
      return;
    }
    showFirstLaunchPicker();
  }

  function showFirstLaunchPicker() {
    const preselect = detectBrowserLocale();
    const overlay = document.createElement("div");
    overlay.className = "i18n-picker-overlay";
    overlay.innerHTML = `
      <div class="i18n-picker">
        <div class="i18n-picker__logo">🎤</div>
        <h1 class="i18n-picker__title">Flow<span class="i18n-picker__title-accent">Arena</span></h1>
        <p class="i18n-picker__sub" id="i18nPickerSub"></p>
        <div class="i18n-picker__opts" id="i18nPickerOpts"></div>
        <button class="btn btn-primary btn-hero i18n-picker__confirm" type="button" id="i18nPickerConfirm"></button>
      </div>
    `;
    document.documentElement.appendChild(overlay);

    let selected = preselect;
    const subEl = overlay.querySelector("#i18nPickerSub");
    const optsEl = overlay.querySelector("#i18nPickerOpts");
    const confirmBtn = overlay.querySelector("#i18nPickerConfirm");

    // Drei-sprachiger Willkommens-Text gleichzeitig sichtbar (bevor eine
    // Sprache feststeht, macht es wenig Sinn, nur eine Sprache zu zeigen).
    subEl.textContent = "Wähle deine Sprache · Choose your language · Выберите язык";

    function renderOpts() {
      optsEl.innerHTML = SUPPORTED.map((loc) => `
        <button type="button" class="i18n-picker__opt ${loc === selected ? "is-selected" : ""}" data-locale="${loc}">
          <span class="i18n-picker__opt-flag">${LOCALE_META[loc].flag}</span>
          <span class="i18n-picker__opt-label">${LOCALE_META[loc].native}</span>
        </button>
      `).join("");
      confirmBtn.textContent = { de: "Bestätigen", en: "Confirm", ru: "Подтвердить" }[selected];
    }
    renderOpts();

    optsEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-locale]");
      if (!btn) return;
      selected = btn.dataset.locale;
      renderOpts();
    });

    confirmBtn.addEventListener("click", () => {
      setLocale(selected);
      overlay.classList.add("is-leaving");
      setTimeout(() => overlay.remove(), 260);
    });
  }

  window.FlowI18n = {
    SUPPORTED_LOCALES: SUPPORTED,
    LOCALE_META,
    getLocale,
    setLocale,
    t,
    tPick,
    tList,
    tPlural,
    applyTranslations,
    onLocaleChange,
    ensureLocaleChosen,
  };

  // Sprache + Übersetzungen so früh wie möglich anwenden (Skript lädt vor
  // allen anderen App-Skripten), damit kein unübersetzter Blitz sichtbar wird.
  document.documentElement.setAttribute("lang", getLocale());
  document.addEventListener("DOMContentLoaded", () => {
    ensureLocaleChosen();
    applyTranslations(document);
  });
})(window);
