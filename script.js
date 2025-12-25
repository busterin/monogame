document.addEventListener("DOMContentLoaded", () => {
  const MISSIONS = [
    { id: "m1", title: "Escuela de la Energía", internalTag: "Educación", text: "Misión: Activar una dinámica educativa y coordinar recursos para un taller." },
    { id: "m2", title: "Picofino", internalTag: "Picofino", text: "Misión: Resolver una necesidad operativa de Picofino con recursos limitados." },
    { id: "m3", title: "Batería Alta", internalTag: "Producción", text: "Misión: Optimizar producción para mantener la batería al máximo sin desperdiciar recursos." },
    { id: "m4", title: "Expo Melquíades Álvarez", internalTag: "Museo", text: "Misión: Preparar una acción cultural en la expo y gestionar imprevistos." }
  ];

  const CHARACTERS = [
    { id: "c1", name: "Castri", internalTag: "Producción" },
    { id: "c2", name: "Maider", internalTag: "Museo" },
    { id: "c3", name: "Celia", internalTag: "Picofino" },
    { id: "c4", name: "Buster", internalTag: "Educación" }
  ];

  // Reglas
  const MISSION_LIFETIME_MS = 2 * 60 * 1000;
  const EXECUTION_TIME_MS = 60 * 1000;

  // Nueva probabilidad por personaje:
  // +80% si coincide tag, +10% si no
  const MATCH_ADD = 0.80;
  const NO_MATCH_ADD = 0.10;

  const SCORE_WIN = 15;
  const SCORE_LOSE = -5;

  const SPAWN_MIN_DELAY_MS = 1200;
  const SPAWN_MAX_DELAY_MS = 6000;

  // DOM
  const mapEl = document.getElementById("map");
  const busterImg = document.getElementById("busterImg");
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

  const deckBtn = document.getElementById("deckBtn");
  const deckModal = document.getElementById("deckModal");
  const closeDeckBtn = document.getElementById("closeDeckBtn");
  const deckGrid = document.getElementById("deckGrid");
  const deckDetail = document.getElementById("deckDetail");

  // Estado
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

  let noSpawnRect = null;

  // Helpers
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));

  function setScore(delta) { score += delta; }

  function setProgress() {
    progressEl.textContent = `${completedMissionIds.size} / ${MISSIONS.length}`;
  }

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

  // NUEVA prob: suma por personaje (máx 100%)
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
    if (!busterImg) return;
    const mapRect = mapEl.getBoundingClientRect();
    const imgRect = busterImg.getBoundingClientRect();
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

  // Puntos
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

  // Spawn
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

  // Ticker
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
          continue;
        }
      }
    }, 200);
  }

  // Modal misión
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
        <div>
          <div class="name">${ch.name}</div>
          <div class="tag">${ch.internalTag}</div>
        </div>
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

  // Confirmar -> ejecutar 1 min
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

  // Ruleta ponderada
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

  // Baraja
  function openDeck() {
    deckDetail.textContent = "Selecciona un personaje.";
    deckGrid.innerHTML = "";

    CHARACTERS.forEach(ch => {
      const card = document.createElement("div");
      card.className = "char";
      card.innerHTML = `
        <div>
          <div class="name">${ch.name}</div>
        </div>
        <div class="pill">Ver</div>
      `;
      card.addEventListener("click", () => { deckDetail.textContent = "Prueba"; });
      deckGrid.appendChild(card);
    });

    showModal(deckModal);
  }

  function closeDeck() { hideModal(deckModal); }

  // Final / reset
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

  // Events
  closeModalBtn.addEventListener("click", closeMissionModal);
  missionModal.addEventListener("click", (e) => { if (e.target === missionModal) closeMissionModal(); });
  confirmBtn.addEventListener("click", confirmMission);

  playAgainBtn.addEventListener("click", resetGame);

  deckBtn.addEventListener("click", openDeck);
  closeDeckBtn.addEventListener("click", closeDeck);
  deckModal.addEventListener("click", (e) => { if (e.target === deckModal) closeDeck(); });

  // no-spawn rect
  function refreshNoSpawn() { computeNoSpawnRect(); }
  window.addEventListener("resize", refreshNoSpawn);
  if (busterImg) {
    if (busterImg.complete) refreshNoSpawn();
    else busterImg.addEventListener("load", refreshNoSpawn);
  }

  // Init
  setProgress();
  startLifeTicker();
  scheduleNextSpawn();
});