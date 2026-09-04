/* =========================================================================
   FlowArena — Community Store (Modul 4)
   -------------------------------------------------------------------------
   WICHTIG: Es gibt kein Backend, also keinen echten Feed mit anderen
   Menschen. Diese Datei seedet ein paar erfundene Beispiel-Posts (klar
   fiktiv, keine echten Personen), und ergänzt sie um das, was DU in diesem
   Browser über "Veröffentlichen" (challenge.js) tatsächlich postest. Alles
   lebt in localStorage — andere Geräte/Browser sehen deine Posts nicht.
   Sobald ein echtes Backend existiert, ersetzt ein /api/posts-Provider
   diese Datei; die Aufrufer (community.html) ändern sich dabei nicht.
   ========================================================================= */

(function (window) {
  "use strict";

  const STORAGE_KEY = "flowarena.community.posts.v1";

  const SEED_POSTS = [
    {
      id: "seed-1", authorName: "MC Vega", authorAvatar: "🚀", isSeed: true,
      topic: "motivation", beatName: "Dark Trap Wave", bpm: 150, overall: 88,
      excerpt: "„…und ich glaub an den Weg, auch wenn's grade nicht leicht ist…“",
      likes: 24, createdAt: Date.now() - 1000 * 60 * 60 * 6,
    },
    {
      id: "seed-2", authorName: "Lyrika", authorAvatar: "🌙", isSeed: true,
      topic: "street", beatName: "Boom Bap Classic", bpm: 90, overall: 79,
      excerpt: "„Block kennt mein'n Namen, bevor ich ihn sag…“",
      likes: 17, createdAt: Date.now() - 1000 * 60 * 60 * 20,
    },
    {
      id: "seed-3", authorName: "Flowzone", authorAvatar: "⚡", isSeed: true,
      topic: "battle", beatName: "Neon Drive", bpm: 120, overall: 91,
      excerpt: "„Du kamst mit 'nem Textblatt, ich kam mit 'nem Plan…“",
      likes: 41, createdAt: Date.now() - 1000 * 60 * 60 * 30,
    },
    {
      id: "seed-4", authorName: "Kleiner Reim", authorAvatar: "🦊", isSeed: true,
      topic: "love", beatName: "Cloud Drift", bpm: 75, overall: 72,
      excerpt: "„Dein Lachen bleibt hängen, so wie 'n guter Refrain…“",
      likes: 9, createdAt: Date.now() - 1000 * 60 * 60 * 50,
    },
  ];

  // Seed-Post-Zitate richten sich nach der aktuellen UI-Sprache (siehe
  // community.seedExcerpts in assets/js/i18n-data.js) — die deutschen
  // Texte im SEED_POSTS-Array oben bleiben der Fallback, falls i18n.js
  // ausnahmsweise noch nicht geladen ist. Autor-Namen sind Eigennamen und
  // bleiben bewusst unübersetzt (siehe docs/I18N.md).
  function localizeSeedPosts(posts) {
    if (!window.FlowI18n) return posts;
    return posts.map((p) => (p.isSeed ? { ...p, excerpt: window.FlowI18n.t(`community.seedExcerpts.${p.id}`) } : p));
  }

  function loadPosts() {
    let stored = [];
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      stored = [];
    }
    return localizeSeedPosts([...SEED_POSTS, ...stored].sort((a, b) => b.createdAt - a.createdAt));
  }

  function loadOwnPosts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveOwnPosts(posts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch (e) {
      /* localStorage evtl. nicht verfügbar — Post lebt dann nur für die Session */
    }
  }

  /** @param {Object} post - { authorName, authorAvatar, topic, beatName, bpm, overall, excerpt } */
  function addPost(post) {
    const own = loadOwnPosts();
    const full = {
      id: `own-${Date.now()}`,
      likes: 0,
      isSeed: false,
      createdAt: Date.now(),
      ...post,
    };
    own.unshift(full);
    saveOwnPosts(own);
    return full;
  }

  const LIKED_KEY = "flowarena.community.liked.v1";
  function getLikedSet() {
    try {
      return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]"));
    } catch (e) {
      return new Set();
    }
  }
  function saveLikedSet(set) {
    try {
      localStorage.setItem(LIKED_KEY, JSON.stringify([...set]));
    } catch (e) {}
  }

  /** Togglet den Like-Status FÜR DIESEN BROWSER (kein echter Multi-User-Zähler). */
  function toggleLike(postId) {
    const liked = getLikedSet();
    const own = loadOwnPosts();
    const seedIndex = SEED_POSTS.findIndex((p) => p.id === postId);
    const ownIndex = own.findIndex((p) => p.id === postId);

    const alreadyLiked = liked.has(postId);
    const delta = alreadyLiked ? -1 : 1;
    if (alreadyLiked) liked.delete(postId); else liked.add(postId);
    saveLikedSet(liked);

    if (seedIndex >= 0) {
      SEED_POSTS[seedIndex].likes += delta;
      return { likes: SEED_POSTS[seedIndex].likes, liked: !alreadyLiked };
    }
    if (ownIndex >= 0) {
      own[ownIndex].likes += delta;
      saveOwnPosts(own);
      return { likes: own[ownIndex].likes, liked: !alreadyLiked };
    }
    return null;
  }

  function isLiked(postId) {
    return getLikedSet().has(postId);
  }

  window.FlowCommunity = { loadPosts, loadOwnPosts, addPost, toggleLike, isLiked };
})(window);
