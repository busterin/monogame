document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // CONFIG (misiones y personajes)
  // -----------------------------
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

  // -----------------------------
  // REGLAS
  // -----------------------------
  const MISSION_LIFETIME_MS = 2 * 60 * 1000; // 2 minutos si NO asignas
  const EXECUTION_TIME_MS = 60 * 1000;       // 1 minuto tras asignar
  const SUCCESS_IF_MATCH = 0.90;
  const SUCCESS_IF_NO_MATCH = 0.10;
  const SCORE_WIN = 15;
  const SCORE_LOSE = -5;

  // Spawn: no todos a la vez
  const SPAWN_MIN_DELAY_MS = 1200;
  const SPAWN_MAX_DELAY_MS = 6000;

  // -----------------------------
  // DOM
  // -----------------------------
  const mapEl = document.getElementById("map");
  const busterImg = document.getElementById("busterImg");
  const scoreEl = document.getElementById("score");
  const progressEl = document.getElementById("progress");

  const missionModal = document.getElementById("missionModal");
  const missionTitleEl = document.getElementById("missionTitle");
  const missionTextEl = document.getElementById("missionText");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const charactersGrid = document.getElementById("charactersGrid");
  const pickHint = document.getElementById("pickHint");
  const chanceValueEl = document.getElementById("chanceValue");
  const confirmBtn = document.getElementById("confirmBtn");

  const rouletteModal = document.getElementById("rouletteModal");
  const rouletteWheel = document.getElementById("rouletteWheel");
  const rouletteOutcome = document.getElementById("rouletteOutcome");
  const rouletteOkBtn = document.getElementById("rouletteOkBtn");

  const finalModal = document.getElementById("finalModal");
  const finalScoreEl = document.getElementById("finalScore");
  const playAgainBtn = document.getElementById("playAgainBtn");

  // -----------------------------
  // ESTADO
  // -----------------------------
  let score = 0;

  let pendingMissions = [...MISSIONS];

  // missionId -> {
  //   mission, pointEl,
  //   remainingMs, lastTickAt,
  //   phase: "spawned" | "executing" | "ready" | "done",
  //   isPaused,
  //   assignedCharIds:Set,
  //   chance:number,
  //   execRemainingMs:number
  // }
  let activePoints = new Map();

  let completedMissionIds = new Set();

  // Bloqueo de personajes mientras ejecutan misión
  let lockedCharIds = new Set(); // charId bloqueado

  // Modal selección
  let currentMissionId = null;
  let selectedCharIds = new Set();
  let pausedMissionId = null;

  // Timers
  let lifeTicker = null;
  let spawnTimer = null;

  // Zona prohibida (buster) en coordenadas de MAPA
  let noSpawnRect = null; // {left, top, right, bottom} en px relativo al map

  // -----------------------------
  // HELPERS
  // -----------------------------
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));

  function setScore(delta) {
    score += delta;
    scoreEl.textContent = String(score);
  }

  function setProgress() {
    progressEl.textContent = `${completedMissionIds.size} / ${MISSIONS.length}`;
  }

  function showModal(el) {
    el.classList.add("show");
    el.setAttribute("aria-hidden", "false");
  }

  function hideModal(el) {
    el.classList.remove("show");
    el.setAttribute("aria-hidden", "true");
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
    const chosen = CHARACTERS.filter(c => chosenIds.has(c.id));
    const hasMatch = chosen.some(c => normalizeTag(c.internalTag) === missionTag);
    return hasMatch ? SUCCESS_IF_MATCH : SUCCESS_IF_NO_MATCH;
  }

  function computeNoSpawnRect() {
    if (!busterImg) return;
    const mapRect = mapEl.getBoundingClientRect();
    const imgRect = busterImg.getBoundingClientRect();
    if (!mapRect.width || !imgRect.width) return;

    const margin = 14; // margen extra
    noSpawnRect = {
      left: (imgRect.left - mapRect.left) - margin,
      top: (imgRect.top - mapRect.top) - margin,
      right: (imgRect.right - mapRect.left) + margin,
      bottom: (imgRect.bottom - mapRect.top) + margin
    };
  }

  function pointWouldOverlapNoSpawn(xPx, yPx) {
    if (!noSpawnRect) return false;
    const r = 14; // radio aproximado + margen
    const left = xPx - r, right = xPx + r, top = yPx - r, bottom = yPx + r;
    return !(right < noSpawnRect.left || left > noSpawnRect.right || bottom < noSpawnRect.top || top > noSpawnRect.bottom);
  }

  // -----------------------------
  // PUNTOS EN MAPA
  // -----------------------------
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

    if (st.phase === "spawned") {
      openMission(missionId);
      return;
    }

    if (st.phase === "executing") {
      // Durante el minuto, no se puede resolver
      return;
    }

    if (st.phase === "ready") {
      openRouletteForMission(missionId);
      return;
    }
  }

  function removePoint(missionId) {
    const st = activePoints.get(missionId);
    if (!st) return;
    if (st.pointEl && st.pointEl.parentNode) st.pointEl.parentNode.removeChild(st.pointEl);
    activePoints.delete(missionId);
  }

  function releaseCharsForMission(missionId) {
    const st = activePoints.get(missionId);
    if (!st) return;
    if (st.assignedCharIds && st.assignedCharIds.size) {
      for (const cid of st.assignedCharIds) lockedCharIds.delete(cid);
    }
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

  // -----------------------------
  // SPAWN CONTROLADO
  // -----------------------------
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

  // -----------------------------
  // TICKERS (vida y ejecución)
  // -----------------------------
  function startLifeTicker() {
    if (lifeTicker) clearInterval(lifeTicker);

    lifeTicker = setInterval(() => {
      const now = performance.now();

      for (const [mid, st] of activePoints.entries()) {
        if (st.isPaused) {
          st.lastTickAt = now;
          continue;
        }

        const dt = now - st.lastTickAt;
        st.lastTickAt = now;

        if (st.phase === "spawned") {
          st.remainingMs -= dt;
          if (st.remainingMs <= 0) {
            // Expira sin asignación => fallo
            failMission(mid);
          }
          continue;
        }

        if (st.phase === "executing") {
          st.execRemainingMs -= dt;
          if (st.execRemainingMs <= 0) {
            st.phase = "ready";
            st.execRemainingMs = 0;

            // Quitar reloj (solo en assigned) -> al pasar a ready quitamos assigned
            // y dejamos parpadeo exagerado amarillo con la clase ready
            st.pointEl.classList.remove("assigned");
            st.pointEl.classList.add("ready");
          }
          continue;
        }
      }
    }, 200);
  }

  // -----------------------------
  // MODAL MISIÓN (selección)
  // -----------------------------
  function openMission(missionId) {
    const st = activePoints.get(missionId);
    if (!st) return;

    // Pausa cuenta atrás mientras elige
    st.isPaused = true;
    pausedMissionId = missionId;

    currentMissionId = missionId;
    selectedCharIds = new Set();

    missionTitleEl.textContent = st.mission.title;
    missionTextEl.textContent = st.mission.text;

    pickHint.textContent = "Selecciona al menos 1 personaje (máximo 2).";
    pickHint.style.opacity = "1";

    renderCharacters();
    updateChanceUI();

    showModal(missionModal);
  }

  function closeMissionModal() {
    hideModal(missionModal);

    // Reanuda si aún estaba en fase spawned
    if (pausedMissionId