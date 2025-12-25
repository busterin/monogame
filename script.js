document.addEventListener("DOMContentLoaded", () => {
  /* ✅ FIX: altura real en móviles (evita corte abajo) */
  function setAppHeightVar() {
    const h = window.innerHeight;
    document.documentElement.style.setProperty("--appH", `${h}px`);
  }
  setAppHeightVar();
  window.addEventListener("resize", setAppHeightVar);
  window.addEventListener("orientationchange", setAppHeightVar);

  const MISSIONS = [
    { id: "m1", title: "Escuela de la Energía", internalTag: "Educación", text: "Misión: Activar una dinámica educativa y coordinar recursos para un taller." },
    { id: "m2", title: "Picofino", internalTag: "Picofino", text: "Misión: Resolver una necesidad operativa de Picofino con recursos limitados." },
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

  const MISSION_LIFETIME_MS = 2 * 60 * 1000;
  const EXECUTION_TIME_MS = 60 * 1000;

  const MATCH_ADD = 0.80;
  const NO_MATCH_ADD = 0.10;

  const SCORE_WIN = 15;
  const SCORE_LOSE = -5;

  const SPAWN_MIN_DELAY_MS = 1200;
  const SPAWN_MAX_DELAY_MS = 6000;

  // Intro
  const introScreen = document.getElementById("introScreen");
  const introStartBtn = document.getElementById("introStartBtn");

  // Start
  const startScreen = document.getElementById("startScreen");
  const startBtn = document.getElementById("startBtn");

  const prevAvatarBtn = document.getElementById("prevAvatarBtn");
  const nextAvatarBtn = document.getElementById("nextAvatarBtn");
  const avatarPreviewImg = document.getElementById("avatarPreviewImg");
  const avatarPreviewName = document.getElementById("avatarPreviewName");
  const dot0 = document.getElementById("dot0");
  const dot1 = document.getElementById("dot1");

  // Game
  const gameRoot = document.getElementById("gameRoot");
  const mapEl = document.getElementById("map");
  const playerImg = document.getElementById("playerImg");
  const progressEl = document.getElementById("progress");

  // Mission modal
  const missionModal = document.getElementById("missionModal");
  const missionTitleEl = document.getElementById("missionTitle");
  const missionTextEl = document.getElementById("missionText");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const charactersGrid = document.getElementById("charactersGrid");
  const pickHint = document.getElementById("pickHint");
  const confirmBtn = document.getElementById("confirmBtn");

  // Roulette modal
  const rouletteModal = document.getElementById("rouletteModal");
  const rouletteWheel = document.getElementById("rouletteWheel");
  const rouletteOutcome = document.getElementById("rouletteOutcome");
  const rouletteOkBtn = document.getElementById("rouletteOkBtn");

  // Final modal
  const finalModal = document.getElementById("finalModal");
  const finalScoreEl = document.getElementById("finalScore");
  const playAgainBtn = document.getElementById("playAgainBtn");

  // Deck
  const deckBtn = document.getElementById("deckBtn");
  const deckModal = document.getElementById("deckModal");
  const closeDeckBtn = document.getElementById("closeDeckBtn");
  const deckGrid = document.getElementById("deckGrid");

  // Card info
  const cardInfoModal = document.getElementById("cardInfoModal");
  const cardInfoTitle = document.getElementById("cardInfoTitle");
  const cardInfoText = document.getElementById("cardInfoText");
  const closeCardInfoBtn = document.getElementById("closeCardInfoBtn");

  // Special modal
  const specialModal = document.getElementById("specialModal");
  const closeSpecialBtn = document.getElementById("closeSpecialBtn");
  const specialCancelBtn = document.getElementById("specialCancelBtn");
  const specialAcceptBtn = document.getElementById("specialAcceptBtn");

  // Estado
  let score = 0;
  let pendingMissions = [...MISSIONS];
  let activePoints = new Map();
  let completedMissionIds = new Set();
  let lockedCharIds = new Set();

  let currentMissionId = null;
  let selectedCharIds = new Set();

  let lifeTicker = null;
  let spawnTimer = null;

  let noSpawnRect = null;

  // ✅ selector por orden alfabético (y Maider usa .png + scale solo para mapa)
  const AVATARS = [
    { key: "buster", name: "Buster", src: "images/buster1.PNG", alt: "Buster" },
    { key: "celia",  name: "Celia",  src: "images/celia1.PNG",  alt: "Celia" },
    { key: "castri", name: "Castri", src: "images/castri1.PNG", alt: "Castri" },
    { key: "maider", name: "Maider", src: "images/maider1.png", alt: "Maider", scale: 1.18 }
  ].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

  let avatarIndex = 0;

  let specialUsed = false;
  let specialArmed = false;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));

  function setScore(delta) { score += delta; }

  // ✅ SOLO NÚMERO (sin /4)
  function setProgress() { progressEl.textContent = String(completedMissionIds.size); }

  function showModal(el) { el.classList.add("show"); el.setAttribute("aria-hidden", "false"); }
  function hideModal(el) { el.classList.remove("show"); el.setAttribute("aria-hidden", "true"); }

  function isAnyModalOpen() {
    return (
      missionModal.classList.contains("show") ||
      rouletteModal.classList.contains("show") ||
      finalModal.classList.contains("show") ||
      deckModal.classList.contains("show") ||
      cardInfoModal.classList.contains("show") ||
      specialModal.classList.contains("show")
    );
  }

  function setGlobalPause(paused) {
    const now = performance.now();
    for (const st of activePoints.values()) {
      st.isPaused = paused;
      st.lastTickAt = now;
    }
  }

  function setSpecialArmedUI(isArmed) {
    playerImg.classList.toggle("special-armed", !!isArmed);
  }

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

  function goToStartScreen() {
    introScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
  }

  function animateCarousel(direction) {
    const dx = direction > 0 ? 24 : -24;
    avatarPreviewImg.animate(
      [{ transform: `translateX(${dx}px)`, opacity: 0 }, { transform: "translateX(0px)", opacity: 1 }],
      { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
    avatarPreviewName.animate(
      [{ transform: `translateX(${dx}px)`, opacity: 0 }, { transform: "translateX(0px)", opacity: 1 }],
      { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  }

  function renderAvatarCarousel(direction = 0) {
    const a = AVATARS[avatarIndex];
    avatarPreviewImg.src = a.src;
    avatarPreviewImg.alt = a.alt;
    avatarPreviewName.textContent = a.name;

    // dots: si hay más de 2 avatares, solo activamos para 0/1 (sin tocar HTML)
    dot0?.classList.toggle("active", avatarIndex === 0);
    dot1?.classList.toggle("active", avatarIndex === 1);

    if (direction !== 0) animateCarousel(direction);
  }

  function prevAvatar() {
    avatarIndex = (avatarIndex - 1 + AVATARS.length) % AVATARS.length;
    renderAvatarCarousel(-1);
  }

  function nextAvatar() {
    avatarIndex = (avatarIndex + 1) % AVATARS.length;
    renderAvatarCarousel(+1);
  }

  function applySelectedAvatarToMap() {
    const a = AVATARS[avatarIndex];
    playerImg.src = a.src;
    playerImg.alt = a.alt;

    // ✅ SOLO: ajustar Maider para que ocupe como los demás en el mapa
    const s = (a && typeof a.scale === "number" && isFinite(a.scale)) ? a.scale : 1;
    playerImg.style.setProperty("--playerScale", String(s));
  }

  function startGame() {
    startScreen.classList.add("hidden");
    gameRoot.classList.remove("hidden");

    specialUsed = false;
    specialArmed = false;
    setSpecialArmedUI(false);

    applySelectedAvatarToMap();

    const refreshNoSpawn = () => computeNoSpawnRect();
    if (playerImg.complete) refreshNoSpawn();
    else playerImg.addEventListener("load", refreshNoSpawn, { once: true });

    setProgress();
    startLifeTicker();
    scheduleNextSpawn();
  }

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
      phase: "spawned",
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

    if (specialArmed && !specialUsed) {
      specialUsed = true;
      specialArmed = false;
      setSpecialArmedUI(false);
      openForcedWinRoulette(missionId);
      return;
    }

    if (st.phase === "spawned") return openMission(missionId);
    if (st.phase === "executing") return;
    if (st.phase === "ready") return openRouletteForMission(missionId);
  }

  function removePoint(missionId) {
    const st = activePoints.get(missionId);
    if (!st) return;
    st.pointEl?.parentNode?.removeChild(st.pointEl);
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
    clearTimeout(spawnTimer);
    if (pendingMissions.length === 0) return;

    spawnTimer = setTimeout(() => {
      if (completedMissionIds.size >= MISSIONS.length) return;
      const idx = randInt(0, pendingMissions.length - 1);
      const mission = pendingMissions.splice(idx, 1)[0];
      createMissionPoint(mission);
      scheduleNextSpawn();
    }, randInt(SPAWN_MIN_DELAY_MS, SPAWN_MAX_DELAY_MS));
  }

  function startLifeTicker() {
    clearInterval(lifeTicker);

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

  function openMission(missionId) {
    const st = activePoints.get(missionId);
    if (!st) return;

    setGlobalPause(true);
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
    currentMissionId = null;
    selectedCharIds = new Set();
    if (!isAnyModalOpen()) setGlobalPause(false);
  }

  function renderCharacters() {
    charactersGrid.innerHTML = "";
    CHARACTERS.forEach(ch => {
      const locked = lockedCharIds.has(ch.id);
      const card = document.createElement("div");
      card.className = "char" + (locked ? " locked" : "");
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
    st.lastTickAt = performance.now();
    st.pointEl.classList.add("assigned");
    st.pointEl.classList.remove("ready");

    hideModal(missionModal);
    currentMissionId = null;
    selectedCharIds = new Set();
    if (!isAnyModalOpen()) setGlobalPause(false);
  }

  function spinRoulette(chance, onDone, forcedWin = null) {
    rouletteOutcome.textContent = "";
    rouletteOkBtn.disabled = true;

    const greenPct = clamp(chance, 0.01, 1) * 100;
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
      const win = (forcedWin === null) ? (Math.random() < chance) : forcedWin;
      rouletteOutcome.textContent = win ? "✅ ¡Éxito!" : "❌ Fallo";
      rouletteOutcome.style.color = win ? "var(--ok)" : "var(--danger)";
      rouletteOkBtn.disabled = false;
      onDone(win);
    }, 1500);
  }

  function openRouletteForMission(missionId) {
    const st = activePoints.get(missionId);
    if (!st || st.phase !== "ready") return;

    setGlobalPause(true);
    showModal(rouletteModal);

    spinRoulette(st.chance ?? 0.10, (win) => {
      rouletteOkBtn.onclick = () => {
        hideModal(rouletteModal);
        win ? winMission(missionId) : failMission(missionId);
        rouletteOkBtn.disabled = true;
        if (!isAnyModalOpen()) setGlobalPause(false);
      };
    });
  }

  function openForcedWinRoulette(missionId) {
    const st = activePoints.get(missionId);
    if (!st) return;

    setGlobalPause(true);
    showModal(rouletteModal);

    spinRoulette(1, () => {
      rouletteOkBtn.onclick = () => {
        hideModal(rouletteModal);
        winMission(missionId);
        rouletteOkBtn.disabled = true;
        if (!isAnyModalOpen()) setGlobalPause(false);
      };
    }, true);
  }

  function openCardInfo(cardData){
    setGlobalPause(true);
    cardInfoTitle.textContent = cardData.name;
    cardInfoText.textContent = cardData.text;
    showModal(cardInfoModal);
  }
  function closeCardInfo(){
    hideModal(cardInfoModal);
    if (!isAnyModalOpen()) setGlobalPause(false);
  }

  function openDeck() {
    setGlobalPause(true);
    deckGrid.innerHTML = "";
    CARDS.forEach(cardData => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "deck-card";
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

  function closeDeck() {
    hideModal(deckModal);
    if (!isAnyModalOpen()) setGlobalPause(false);
  }

  function openSpecialModal() {
    if (specialUsed) return;
    setGlobalPause(true);
    showModal(specialModal);
  }

  function cancelSpecial() {
    specialArmed = false;
    setSpecialArmedUI(false);
    hideModal(specialModal);
    if (!isAnyModalOpen()) setGlobalPause(false);
  }

  function acceptSpecial() {
    if (specialUsed) return;
    specialArmed = true;
    setSpecialArmedUI(true);
    hideModal(specialModal);
    if (!isAnyModalOpen()) setGlobalPause(false);
  }

  function finishGame() {
    clearInterval(lifeTicker);
    clearTimeout(spawnTimer);
    finalScoreEl.textContent = String(score);
    setGlobalPause(true);
    showModal(finalModal);
  }

  function resetGame() {
    hideModal(missionModal);
    hideModal(rouletteModal);
    hideModal(finalModal);
    hideModal(deckModal);
    hideModal(cardInfoModal);
    hideModal(specialModal);

    clearInterval(lifeTicker);
    clearTimeout(spawnTimer);

    for (const st of activePoints.values()) {
      st.pointEl?.parentNode?.removeChild(st.pointEl);
    }

    score = 0;
    pendingMissions = [...MISSIONS];
    activePoints = new Map();
    completedMissionIds = new Set();
    lockedCharIds = new Set();

    currentMissionId = null;
    selectedCharIds = new Set();

    specialUsed = false;
    specialArmed = false;
    setSpecialArmedUI(false);

    setProgress();
    setGlobalPause(false);
    startLifeTicker();
    scheduleNextSpawn();
  }

  // Events
  introStartBtn.addEventListener("click", goToStartScreen);

  prevAvatarBtn.addEventListener("click", prevAvatar);
  nextAvatarBtn.addEventListener("click", nextAvatar);

  document.addEventListener("keydown", (e) => {
    if (!introScreen.classList.contains("hidden")) {
      if (e.key === "Enter") goToStartScreen();
      return;
    }
    if (!startScreen.classList.contains("hidden")) {
      if (e.key === "ArrowLeft") prevAvatar();
      if (e.key === "ArrowRight") nextAvatar();
    }
  });

  startBtn.addEventListener("click", startGame);

  playerImg.addEventListener("click", openSpecialModal);

  closeModalBtn.addEventListener("click", closeMissionModal);
  missionModal.addEventListener("click", (e) => { if (e.target === missionModal) closeMissionModal(); });
  confirmBtn.addEventListener("click", confirmMission);

  deckBtn.addEventListener("click", openDeck);
  closeDeckBtn.addEventListener("click", closeDeck);
  deckModal.addEventListener("click", (e) => { if (e.target === deckModal) closeDeck(); });

  closeCardInfoBtn.addEventListener("click", closeCardInfo);
  cardInfoModal.addEventListener("click", (e) => { if (e.target === cardInfoModal) closeCardInfo(); });

  closeSpecialBtn.addEventListener("click", cancelSpecial);
  specialCancelBtn.addEventListener("click", cancelSpecial);
  specialAcceptBtn.addEventListener("click", acceptSpecial);
  specialModal.addEventListener("click", (e) => { if (e.target === specialModal) cancelSpecial(); });

  playAgainBtn.addEventListener("click", () => {
    resetGame();
    gameRoot.classList.add("hidden");
    introScreen.classList.remove("hidden");
    startScreen.classList.add("hidden");
    avatarIndex = 0;
    renderAvatarCarousel(0);
  });

  window.addEventListener("resize", () => {
    setAppHeightVar();
    if (!gameRoot.classList.contains("hidden")) computeNoSpawnRect();
  });

  // init
  renderAvatarCarousel(0);
});