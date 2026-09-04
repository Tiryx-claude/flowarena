/* =========================================================================
   FlowArena — Social Store: Freunde, Personen-Directory, Benachrichtigungen
   (Modul 4, Ausbau)
   -------------------------------------------------------------------------
   WICHTIG — dieselbe Ehrlichkeit wie bei Profil/Community/Turnieren (siehe
   docs/COMMUNITY.md, docs/TOURNAMENTS.md): Es gibt kein Backend. "Freunde"
   sind lokal in DIESEM Browser gespeicherte Einträge, keine echten,
   bestätigten Beziehungen zwischen zwei Accounts. Die "Personen-Directory"
   startet mit denselben vier fiktiven Community-Seed-Personen wie
   community-data.js und wächst, wenn du Turnier-Bots begegnest
   (tournament-data.js ruft rememberPerson() auf) — das macht Suche/Freunde
   im Lauf der Zeit lebendiger, bleibt aber vollständig lokal.
   ========================================================================= */

(function (window) {
  "use strict";

  const FRIENDS_KEY = "flowarena.friends.v1";
  const DIRECTORY_KEY = "flowarena.people-directory.v1";
  const NOTIFICATIONS_KEY = "flowarena.notifications.v1";
  const MAX_NOTIFICATIONS = 30;

  // Dieselben vier fiktiven Personen wie die Seed-Posts in community-data.js
  // (bewusst dieselben Namen/Avatare/Scores — eine wiedererkennbare, kleine
  // "Stamm-Community" statt beliebiger Zufallsnamen).
  const SEED_PEOPLE = [
    { id: "mc-vega", name: "MC Vega", avatar: "🚀", bestScore: 88 },
    { id: "lyrika", name: "Lyrika", avatar: "🌙", bestScore: 79 },
    { id: "flowzone", name: "Flowzone", avatar: "⚡", bestScore: 91 },
    { id: "kleiner-reim", name: "Kleiner Reim", avatar: "🦊", bestScore: 72 },
  ];

  function slugify(name) {
    return String(name)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `person-${Math.floor(Math.random() * 100000)}`;
  }

  /* ---------------------------------------------------------------------
     Personen-Directory (für die Suche)
     --------------------------------------------------------------------- */
  function loadDirectory() {
    let stored;
    try {
      stored = JSON.parse(localStorage.getItem(DIRECTORY_KEY) || "null");
    } catch (e) {
      stored = null;
    }
    if (!stored) {
      stored = {};
      SEED_PEOPLE.forEach((p) => { stored[p.id] = p; });
      saveDirectory(stored);
    }
    return stored;
  }

  function saveDirectory(dir) {
    try {
      localStorage.setItem(DIRECTORY_KEY, JSON.stringify(dir));
    } catch (e) {
      /* localStorage evtl. nicht verfügbar — Directory lebt dann nur für die Session */
    }
  }

  /** Registriert/aktualisiert eine Person in der Directory (z.B. ein Turnier-Bot, dem man begegnet ist). */
  function rememberPerson({ name, avatar, score }) {
    if (!name) return null;
    const dir = loadDirectory();
    const id = slugify(name);
    if (!dir[id]) {
      dir[id] = { id, name, avatar: avatar || "🤖", bestScore: typeof score === "number" ? score : 55 + Math.floor(Math.random() * 30) };
    } else if (typeof score === "number") {
      dir[id].bestScore = Math.max(dir[id].bestScore, score);
    }
    saveDirectory(dir);
    return dir[id];
  }

  function getPerson(id) {
    return loadDirectory()[id] || null;
  }

  function searchPeople(query) {
    const dir = loadDirectory();
    const all = Object.values(dir);
    const q = (query || "").trim().toLowerCase();
    const filtered = q ? all.filter((p) => p.name.toLowerCase().includes(q)) : all;
    return filtered.sort((a, b) => b.bestScore - a.bestScore);
  }

  /* ---------------------------------------------------------------------
     Freunde
     --------------------------------------------------------------------- */
  function loadFriends() {
    try {
      return JSON.parse(localStorage.getItem(FRIENDS_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveFriends(list) {
    try {
      localStorage.setItem(FRIENDS_KEY, JSON.stringify(list));
    } catch (e) {
      /* localStorage evtl. nicht verfügbar */
    }
  }

  function isFriend(id) {
    return loadFriends().some((f) => f.id === id);
  }

  /** @returns {boolean} true wenn neu hinzugefügt, false wenn schon Freund war */
  function addFriend(person) {
    const list = loadFriends();
    if (list.some((f) => f.id === person.id)) return false;
    list.push({ id: person.id, name: person.name, avatar: person.avatar, addedAt: Date.now() });
    saveFriends(list);
    const text = window.FlowI18n ? window.FlowI18n.t("profile.friendAddedNotification", { name: person.name }) : `${person.name} ist jetzt in deiner Freundesliste.`;
    addNotification({ icon: "👥", text });
    return true;
  }

  function removeFriend(id) {
    saveFriends(loadFriends().filter((f) => f.id !== id));
  }

  /* ---------------------------------------------------------------------
     Benachrichtigungen — ausgelöst durch echte lokale Ereignisse (neues
     Abzeichen, Turnierergebnis, Beat freigeschaltet, neue:r Freund:in …),
     keine erfundene Hintergrund-Aktivität.
     --------------------------------------------------------------------- */
  function loadNotifications() {
    try {
      return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveNotifications(list) {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
    } catch (e) {
      /* localStorage evtl. nicht verfügbar */
    }
  }

  function addNotification({ icon, text }) {
    if (!text) return;
    const list = loadNotifications();
    list.unshift({ id: `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`, icon: icon || "🔔", text, createdAt: Date.now(), read: false });
    saveNotifications(list.slice(0, MAX_NOTIFICATIONS));
  }

  function unreadCount() {
    return loadNotifications().filter((n) => !n.read).length;
  }

  function markAllRead() {
    saveNotifications(loadNotifications().map((n) => ({ ...n, read: true })));
  }

  window.FlowSocial = {
    slugify,
    rememberPerson,
    getPerson,
    searchPeople,
    loadFriends,
    isFriend,
    addFriend,
    removeFriend,
    loadNotifications,
    addNotification,
    unreadCount,
    markAllRead,
  };
})(window);
