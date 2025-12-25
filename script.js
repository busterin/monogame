document.addEventListener("DOMContentLoaded", () => {
  const MISSIONS = [
    { id: "m1", title: "Escuela de la Energía", internalTag: "Educación", text: "Misión: Activar una dinámica educativa y coordinar recursos para un taller." },
    { id: "m2", title: "Picofino", internalTag: "Picofino", text: "Misión: Resolver una necesidad operativa de Picofino con recursos limitados." },

    // ✅ Cambiada: ahora es una exposición
    { id: "m3", title: "Batería Alta", internalTag: "Producción", text: "Misión: Preparar la exposición “Batería Alta” coordinando montaje, logística y recursos disponibles." },

    { id: "m4", title: "Expo Melquíades Álvarez", internalTag: "Museo", text: "Misión: Preparar una acción cultural en la expo y gestionar imprevistos." }
  ];

  const CHARACTERS = [
    { id: "c1", name: "Castri", internalTag: "Producción" },
    { id: "c2", name: "Maider", internalTag: "Museo" },
    { id: "c3", name: "Celia", internalTag: "Picofino" },
    { id: "c4", name: "Buster", internalTag: "Educación" }
  ];

  const CARDS = [
    { id: "card_buster", name: "Buster", img: "images/buster.JPEG", text: "Prueba" },
    { id: "card_castri", name: "Castri", img: "images/castri.JPEG", text: "Prueba" },
    { id: "card_maider", name: "Maider", img: "images/maider.JPEG", text: "Prueba" },
    { id: "card_celia", name: "Celia", img: "images/celia.JPEG", text: "Prueba" }
  ];

  // Reglas
  const MISSION_LIFETIME_MS = 2 * 60 * 1000;
  const EXECUTION_TIME_MS = 60 * 1000;

  const MATCH_ADD = 0.80;
  const NO_MATCH_ADD = 0.10;

  const SCORE_WIN = 15;
  const SCORE_LOSE = -5;

  const SPAWN_MIN_DELAY_MS = 1200;
  const SPAWN_MAX_DELAY_MS = 6000;

  // DOM (start)
  const startScreen = document.getElementById("startScreen");
  const startBtn = document.getElementById("startBtn");

  const prevAvatarBtn = document.getElementById("prevAvatarBtn");
  const nextAvatarBtn = document.getElementById("nextAvatarBtn");
  const avatarPreviewImg = document.getElementById("avatarPreviewImg");
  const avatarPreviewName = document.getElementById("avatarPreviewName");
  const dot0 = document.getElementById("dot0");
  const dot1 = document.getElementById("dot1");

  const gameRoot = document.getElementById("gameRoot");
  const mapEl = document.getElementById("map");
  const playerImg = document.getElementById("playerImg");

  // DOM (game)
  const progressEl = document.getElementById("progress");

  const missionModal = document.getElementById("missionModal");
  const missionTitleEl = document.getElementById("missionTitle");
  const missionTextEl = document.getElementById("missionText");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const charactersGrid = document.getElementById("charactersGrid");
  const pickHint = document.getElementById("pickHint");
  const confirmBtn = document.getElementById("confirmBtn");

  const rouletteModal = document.getElementById("rouletteModal");
  const rouletteWheel = document.getElementById("rouletteWheel");
  const rouletteOutcome = document.getElementById("rouletteOutcome");
  const rouletteOkBtn = document.getElementById("rouletteOkBtn");

  const finalModal = document.getElementById("finalModal");
  const finalScoreEl = document.getElementById("finalScore");
  const playAgainBtn = document.getElementById("playAgainBtn");

  // Baraja / cartas
  const deckBtn = document.getElementById("deckBtn");
  const deckModal = document.getElementById("deckModal");
  const closeDeckBtn = document.getElementById("closeDeckBtn");
  const deckGrid = document.getElementById("deckGrid");

  // Popup info carta
  const cardInfoModal = document.getElementById("cardInfoModal");
  const cardInfoTitle = document.getElementById("cardInfoTitle");
  const cardInfoText = document.getElementById("cardInfoText");
  const closeCardInfoBtn = document.getElementById("closeCardInfoBtn");

  // Estado juego
  let score = 0;
  let pendingMissions = [...MISSIONS];
  let activePoints = new Map();
  let completedMissionIds = new Set();
  let lockedCharIds = new Set();

  let currentMissionId = null;
  let selectedCharIds = new Set();
  let pausedMissionId = null;

  let lifeTicker = null;
  let spawnTimer = null;

  // Zona no-spawn
  let noSpawnRect = null;

  // Carrusel de selección jugador
  const AVATARS = [
    { key: "buster", name: "Buster", src: "images/buster1.PNG", alt: "Buster" },
    { key: "celia",  name: "Celia",  src: "images/celia1.PNG",  alt: "Celia" }
  ];
  let avatarIndex = 0;

  // Helpers
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));

  function setScore(delta) { score += delta; }
  function setProgress() { progressEl.textContent = `${completedMissionIds.size} / ${MISSIONS.length}`; }

  function showModal(el) { el.classList.add("show"); el.setAttribute("aria-hidden", "false"); }
  function hideModal(el) { el.classList.remove("show"); el.setAttribute("aria-hidden", "true"); }

  function normalizeTag(tag) {
    const t = String(tag || "").trim().toLowerCase();
    if (t === "museos" || t === "museo") return "Museo";
    if (t === "educación" || t === "educacion") return "Educación";
    if (t === "producción" || t === "produccion") return "Producción";
    if (t === "picofino") return "Picofino";
    return tag;
  }

  function computeChance(mission, chosenIds) {
    const missionTag = normalizeTag(mission.internalTag);
    let p = 0;

    for (const cid of chosenIds) {
      const ch = CHARACTERS.find(c => c.id === cid);
      if (!ch) continue;
      const match = normalizeTag(ch.internalTag) === missionTag;
      p += match ? MATCH_ADD : NO_MATCH_ADD;
    }
    return clamp(p, 0, 1);
  }

  function computeNoSpawnRect() {
    if (!playerImg) return;
    const mapRect = mapEl.getBoundingClientRect();
    const imgRect = playerImg.getBoundingClientRect();
    if (!mapRect.width || !imgRect.width) return;

    const margin = 14;
    noSpawnRect = {
      left: (imgRect.left - mapRect.left) - margin,
      top: (imgRect.top - mapRect.top) - margin,
      right: (imgRect.right - mapRect.left) + margin,
      bottom: (imgRect.bottom - mapRect.top) + margin
    };
  }

  function pointWouldOverlapNoSpawn(xPx, yPx) {
    if (!noSpawnRect) return false;
    const r = 14;
    const left = xPx - r, right = xPx + r, top = yPx - r, bottom = yPx + r;
    return !(right < noSpawnRect.left || left > noSpawnRect.right || bottom < noSpawnRect.top || top > noSpawnRect.bottom);
  }

  /* -----------------------------
     SELECTOR (carrusel)
  ------------------------------ */
  function renderAvatarCarousel() {
    const a = AVATARS[avatarIndex];
    avatarPreviewImg.src = a.src;
    avatarPreviewImg.alt = a.alt;
    avatarPreviewName.textContent = a.name;

    // dots (2 en este prototipo)
    if (dot0 && dot1) {
      dot0.classList.toggle("active", avatarIndex === 0);
      dot1.classList.toggle("active", avatarIndex === 1);
    }
  }

  function prevAvatar() {
    avatarIndex = (avatarIndex - 1 + AVATARS.length) % AVATARS.length;
    renderAvatarCarousel();
  }

  function nextAvatar() {
    avatarIndex = (avatarIndex + 1) % AVATARS.length;
    renderAvatarCarousel();
  }

  function applySelectedAvatarToMap() {
    const a = AVATARS[avatarIndex];
    playerImg.src = a.src;
    playerImg.alt = a.alt;
  }

  function startGame() {
    startScreen.classList.add("hidden");
    gameRoot.classList.remove("hidden");

    applySelectedAvatarToMap();

    const refreshNoSpawn = () => computeNoSpawnRect();
    if (playerImg.complete) refreshNoSpawn();
    else playerImg.addEventListener("load", refreshNoSpawn, { once: true });

    setProgress();
    startLifeTicker();
    scheduleNextSpawn();
  }

  /* -----------------------------
     GAME CORE
  ------------------------------ */
  function createMissionPoint(mission) {
    const point = document.createElement("div");
    point.className = "point";
    point.setAttribute("role", "button");
    point.setAttribute("tabindex", "0");
    point.setAttribute("aria-label", `Misión: ${mission.title}`);

    const mapRect = mapEl.getBoundingClientRect();

    let xPct = 50, yPct = 50;
    for (let i = 0; i < 40; i++) {
      xPct = rand(8, 92);
      yPct = rand(10, 86);
      const xPx = (xPct / 100) * mapRect.width;
      const yPx = (yPct / 100) * mapRect.height;
      if (!pointWouldOverlapNoSpawn(xPx, yPx)) break;
    }

    point.style.left = `${xPct}%`;
    point.style.top = `${yPct}%`;

    const state = {
      mission,
      pointEl: point,
      remainingMs: MISSION_LIFETIME_MS,
      lastTickAt: performance.now(),
      phase: "spawned", // spawned | executing | ready
      isPaused: false,
      assignedCharIds: new Set(),
      chance: null,
      execRemainingMs: null
    };

    point.addEventListener("click", () => onPointClick(mission.id));
    point.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPointClick(mission.id);
      }
    });

    mapEl.appendChild(point);
    activePoints.set(mission.id, state);
  }

  function onPointClick(missionId) {
    const st = activePoints.get(missionId);
    if (!st) return;
    if (completedMissionIds.has(missionId)) return;

    if (st.phase === "spawned") return openMission(missionId);
    if (st.phase === "executing") return;
    if (st.phase === "ready") return openRouletteForMission(missionId);
  }

  function removePoint(missionId) {
    const st = activePoints.get(missionId);
    if (!st) return;
    if (st.pointEl?.parentNode) st.pointEl.parentNode.removeChild(st.pointEl);
    activePoints.delete(missionId);
  }

  function releaseCharsForMission(missionId) {
    const st = activePoints.get(missionId);
    if (!st) return;
    for (const cid of (st.assignedCharIds || [])) lockedCharIds.delete(cid);
  }

  function failMission(missionId) {
    if (completedMissionIds.has(missionId)) return;
    completedMissionIds.add(missionId);
    setProgress();
    setScore(SCORE_LOSE);

    releaseCharsForMission(missionId);
    removePoint(missionId);

    if (completedMissionIds.size >= MISSIONS.length) finishGame();
  }

  function winMission(missionId) {
    if (completedMissionIds.has(missionId)) return;
    completedMissionIds.add(missionId);
    setProgress();
    setScore(SCORE_WIN);

    releaseCharsForMission(missionId);
    removePoint(missionId);

    if (completedMissionIds.size >= MISSIONS.length) finishGame();
  }

  function scheduleNextSpawn() {
    if (spawnTimer) clearTimeout(spawnTimer);
    if (pendingMissions.length === 0) return;

    const delay = randInt(SPAWN_MIN_DELAY_MS, SPAWN_MAX_DELAY_MS);
    spawnTimer = setTimeout(() => {
      if (completedMissionIds.size >= MISSIONS.length) return;

      const idx = randInt(0, pendingMissions.length - 1);
      const mission = pendingMissions.splice(idx, 1)[0];
      createMissionPoint(mission);

      scheduleNextSpawn();
    }, delay);
  }

  function startLifeTicker() {
    if (lifeTicker) clearInterval(lifeTicker);

    lifeTicker = setInterval(() => {
      const now = performance.now();

      for (const [mid, st] of activePoints.entries()) {
        if (st.isPaused) { st.lastTickAt = now; continue; }

        const dt = now - st.lastTickAt;
        st.lastTickAt = now;

        if (st.phase === "spawned") {
          st.remainingMs -= dt;
          if (st.remainingMs <= 0) failMission(mid);
          continue;
        }

        if (st.phase === "executing") {
          st.execRemainingMs -= dt;
          if (st.execRemainingMs <= 0) {
            st.phase = "ready";
            st.execRemainingMs = 0;
            st.pointEl.classList.remove("assigned");
            st.pointEl.classList.add("ready");
          }
        }
      }
    }, 200);
  }

  /* -----------------------------
     MISSION MODAL
  ------------------------------ */
  function openMission(missionId) {
    const st = activePoints.get(missionId);
    if (!st) return;

    st.isPaused = true;
    pausedMissionId = missionId;

    currentMissionId = missionId;
    selectedCharIds = new Set();

    missionTitleEl.textContent = st.mission.title;
    missionTextEl.textContent = st.mission.text;

    pickHint.textContent = "Selecciona al menos 1 personaje (máximo 2).";
    pickHint.style.opacity = "1";

    renderCharacters();
    showModal(missionModal);
  }

  function closeMissionModal() {
    hideModal(missionModal);

    if (pausedMissionId) {
      const st = activePoints.get(pausedMissionId);
      if (st && st.phase === "spawned") {
        st.isPaused = false;
        st.lastTickAt = performance.now();
      }
    }

    pausedMissionId = null;
    currentMissionId = null;
    selectedCharIds = new Set();
  }

  function renderCharacters() {
    charactersGrid.innerHTML = "";

    CHARACTERS.forEach(ch => {
      const locked = lockedCharIds.has(ch.id);

      const card = document.createElement("div");
      card.className = "char" + (locked ? " locked" : "");
      card.dataset.id = ch.id;

      card.innerHTML = `
        <div><div class="name">${ch.name}</div></div>
        <div class="pill">${locked ? "Ocupado" : "Elegir"}</div>
      `;

      card.addEventListener("click", () => {
        if (locked) {
          pickHint.textContent = "Ese personaje está ocupado en otra misión.";
          pickHint.style.opacity = "1";
          return;
        }
        toggleCharacter(ch.id, card);
      });

      charactersGrid.appendChild(card);
    });
  }

  function toggleCharacter(charId, cardEl) {
    if (selectedCharIds.has(charId)) {
      selectedCharIds.delete(charId);
      cardEl.classList.remove("selected");
      cardEl.querySelector(".pill").textContent = "Elegir";
    } else {
      if (selectedCharIds.size >= 2) {
        pickHint.textContent = "Máximo 2 personajes por misión.";
        pickHint.style.opacity = "1";
        return;
      }
      selectedCharIds.add(charId);
      cardEl.classList.add("selected");
      cardEl.querySelector(".pill").textContent = "Elegido";
    }
  }

  function confirmMission() {
    const st = currentMissionId ? activePoints.get(currentMissionId) : null;
    if (!st) return;

    if (selectedCharIds.size < 1) {
      pickHint.textContent = "Debes seleccionar al menos 1 personaje.";
      pickHint.style.opacity = "1";
      return;
    }

    st.assignedCharIds = new Set(selectedCharIds);
    st.chance = computeChance(st.mission, st.assignedCharIds);

    for (const cid of st.assignedCharIds) lockedCharIds.add(cid);

    st.phase = "executing";
    st.execRemainingMs = EXECUTION_TIME_MS;
    st.isPaused = false;
    st.lastTickAt = performance.now();

    st.pointEl.classList.add("assigned");
    st.pointEl.classList.remove("ready");

    hideModal(missionModal);
    pausedMissionId = null;
    currentMissionId = null;
    selectedCharIds = new Set();
  }

  /* -----------------------------
     ROULETTE
  ------------------------------ */
  function spinRoulette(chance, onDone) {
    rouletteOutcome.textContent = "";
    rouletteOkBtn.disabled = true;

    const greenPct = clamp(chance, 0.01, 0.99) * 100;
    rouletteWheel.style.background = `conic-gradient(from 0deg,
      rgba(46,229,157,.85) 0 ${greenPct}%,
      rgba(255,59,59,.85) ${greenPct}% 100%)`;

    const turns = randInt(4, 7);
    const finalDeg = turns * 360 + randInt(0, 359);

    rouletteWheel.animate(
      [{ transform: "rotate(0deg)" }, { transform: `rotate(${finalDeg}deg)` }],
      { duration: 1400, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
    );

    setTimeout(() => {
      const win = Math.random() < chance;
      rouletteOutcome.textContent = win ? "✅ ¡Éxito!" : "❌ Fallo";
      rouletteOutcome.style.color = win ? "var(--ok)" : "var(--danger)";
      rouletteOkBtn.disabled = false;
      onDone(win);
    }, 1500);
  }

  function openRouletteForMission(missionId) {
    const st = activePoints.get(missionId);
    if (!st || st.phase !== "ready") return;

    showModal(rouletteModal);

    spinRoulette(st.chance ?? 0.10, (win) => {
      rouletteOkBtn.onclick = () => {
        hideModal(rouletteModal);
        if (win) winMission(missionId);
        else failMission(missionId);
        rouletteOkBtn.disabled = true;
      };
    });
  }

  /* -----------------------------
     DECK (cards) + popup
  ------------------------------ */
  function openCardInfo(cardData){
    cardInfoTitle.textContent = cardData.name;
    cardInfoText.textContent = cardData.text; // "Prueba"
    showModal(cardInfoModal);
  }
  function closeCardInfo(){ hideModal(cardInfoModal); }

  function openDeck() {
    deckGrid.innerHTML = "";

    CARDS.forEach(cardData => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "deck-card";
      card.setAttribute("aria-label", `Carta: ${cardData.name}`);

      card.innerHTML = `
        <img src="${cardData.img}" alt="${cardData.name}" />
        <div class="deck-card-name">
          <span>${cardData.name}</span>
          <span class="pill">Ver</span>
        </div>
      `;

      card.addEventListener("click", () => openCardInfo(cardData));
      deckGrid.appendChild(card);
    });

    showModal(deckModal);
  }

  function closeDeck() { hideModal(deckModal); }

  /* -----------------------------
     FINAL / RESET
  ------------------------------ */
  function finishGame() {
    if (lifeTicker) clearInterval(lifeTicker);
    if (spawnTimer) clearTimeout(spawnTimer);
    finalScoreEl.textContent = String(score);
    showModal(finalModal);
  }

  function resetGame() {
    hideModal(missionModal);
    hideModal(rouletteModal);
    hideModal(finalModal);
    hideModal(deckModal);
    hideModal(cardInfoModal);

    if (lifeTicker) clearInterval(lifeTicker);
    if (spawnTimer) clearTimeout(spawnTimer);

    for (const [mid] of activePoints.entries()) removePoint(mid);

    score = 0;
    pendingMissions = [...MISSIONS];
    activePoints = new Map();
    completedMissionIds = new Set();
    lockedCharIds = new Set();

    currentMissionId = null;
    selectedCharIds = new Set();
    pausedMissionId = null;

    setProgress();
    startLifeTicker();
    scheduleNextSpawn();
  }

  /* -----------------------------
     EVENTS
  ------------------------------ */
  // carrusel
  prevAvatarBtn.addEventListener("click", prevAvatar);
  nextAvatarBtn.addEventListener("click", nextAvatar);

  // teclado (bonus): flechas
  document.addEventListener("keydown", (e) => {
    if (!startScreen.classList.contains("hidden")) {
      if (e.key === "ArrowLeft") prevAvatar();
      if (e.key === "ArrowRight") nextAvatar();
    }
  });

  startBtn.addEventListener("click", startGame);

  closeModalBtn.addEventListener("click", closeMissionModal);
  missionModal.addEventListener("click", (e) => { if (e.target === missionModal) closeMissionModal(); });
  confirmBtn.addEventListener("click", confirmMission);

  playAgainBtn.addEventListener("click", () => {
    resetGame();
    gameRoot.classList.add("hidden");
    startScreen.classList.remove("hidden");
    avatarIndex = 0;
    renderAvatarCarousel();
  });

  deckBtn.addEventListener("click", openDeck);
  closeDeckBtn.addEventListener("click", closeDeck);
  deckModal.addEventListener("click", (e) => { if (e.target === deckModal) closeDeck(); });

  closeCardInfoBtn.addEventListener("click", closeCardInfo);
  cardInfoModal.addEventListener("click", (e) => { if (e.target === cardInfoModal) closeCardInfo(); });

  window.addEventListener("resize", () => {
    if (!gameRoot.classList.contains("hidden")) computeNoSpawnRect();
  });

  // init
  renderAvatarCarousel();
});