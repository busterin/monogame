document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // CONFIG (misiones y personajes)
  // -----------------------------
  const MISSIONS = [
    {
      id: "m1",
      title: "Escuela de la Energía",
      internalTag: "Educación",
      text: "Misión: Activar una dinámica educativa y coordinar recursos para un taller."
    },
    {
      id: "m2",
      title: "Picofino",
      internalTag: "Picofino",
      text: "Misión: Resolver una necesidad operativa de Picofino con recursos limitados."
    },
    {
      id: "m3",
      title: "Batería Alta",
      internalTag: "Producción",
      text: "Misión: Optimizar producción para mantener la batería al máximo sin desperdiciar recursos."
    },
    {
      id: "m4",
      title: "Expo Melquíades Álvarez",
      internalTag: "Museo",
      text: "Misión: Preparar una acción cultural en la expo y gestionar imprevistos."
    }
  ];

  const CHARACTERS = [
    { id: "c1", name: "Castri", internalTag: "Producción" },
    { id: "c2", name: "Maider", internalTag: "Museo" },      // (normalizo a "Museo" para que coincida)
    { id: "c3", name: "Celia", internalTag: "Picofino" },
    { id: "c4", name: "Buster", internalTag: "Educación" }
  ];

  // -----------------------------
  // REGLAS
  // -----------------------------
  const MISSION_LIFETIME_MS = 2 * 60 * 1000; // 2 minutos
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
  const scoreEl = document.getElementById("score");
  const progressEl = document.getElementById("progress");
  const resetBtn = document.getElementById("resetBtn");

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

  // Misiones pendientes/activas/completadas
  let pendingMissions = [...MISSIONS];
  let activePoints = new Map(); // missionId -> { pointEl, remainingMs, lastTickAt, expired, isPaused }
  let completedMissionIds = new Set();

  // Modal selección
  let currentMission = null;
  let selectedCharIds = new Set();
  let pausedMissionId = null;

  // Timers
  let lifeTicker = null;
  let spawnTimer = null;

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
    // Evita problemas por "museos" vs "Museo"
    // (Si luego quieres más tags, lo ampliamos)
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

  // -----------------------------
  // PUNTOS EN MAPA
  // -----------------------------
  function createMissionPoint(mission) {
    const point = document.createElement("div");
    point.className = "point";
    point.setAttribute("role", "button");
    point.setAttribute("tabindex", "0");
    point.setAttribute("aria-label", `Misión: ${mission.title}`);

    // Posición aleatoria (con márgenes)
    const rect = mapEl.getBoundingClientRect();
    const x = rand(8, 92);
    const y = rand(10, 80);

    point.style.left = `${x}%`;
    point.style.top = `${y}%`;

    const state = {
      mission,
      pointEl: point,
      remainingMs: MISSION_LIFETIME_MS,
      lastTickAt: performance.now(),
      isPaused: false,
      expired: false
    };

    point.addEventListener("click", () => openMission(mission.id));
    point.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMission(mission.id);
      }
    });

    mapEl.appendChild(point);
    activePoints.set(mission.id, state);
  }

  function removePoint(missionId) {
    const st = activePoints.get(missionId);
    if (!st) return;
    if (st.pointEl && st.pointEl.parentNode) st.pointEl.parentNode.removeChild(st.pointEl);
    activePoints.delete(missionId);
  }

  function failMission(missionId, reason = "fail") {
    if (completedMissionIds.has(missionId)) return;

    completedMissionIds.add(missionId);
    setProgress();
    setScore(SCORE_LOSE);

    // Quita punto si estaba activo
    removePoint(missionId);

    // Si ya acabamos
    if (completedMissionIds.size >= MISSIONS.length) finishGame();
  }

  function winMission(missionId) {
    if (completedMissionIds.has(missionId)) return;

    completedMissionIds.add(missionId);
    setProgress();
    setScore(SCORE_WIN);

    removePoint(missionId);

    if (completedMissionIds.size >= MISSIONS.length) finishGame();
  }

  // -----------------------------
  // SPAWN CONTROLADO
  // -----------------------------
  function scheduleNextSpawn() {
    if (spawnTimer) clearTimeout(spawnTimer);

    // No spawnear si ya no quedan pendientes
    if (pendingMissions.length === 0) return;

    const delay = randInt(SPAWN_MIN_DELAY_MS, SPAWN_MAX_DELAY_MS);
    spawnTimer = setTimeout(() => {
      // Si el juego terminó, no spawn
      if (completedMissionIds.size >= MISSIONS.length) return;

      // Selecciona 1 misión pendiente y créala como punto
      const idx = randInt(0, pendingMissions.length - 1);
      const mission = pendingMissions.splice(idx, 1)[0];
      createMissionPoint(mission);

      // Programa el siguiente
      scheduleNextSpawn();
    }, delay);
  }

  // -----------------------------
  // TICKER DE VIDA (2 min)
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
        st.remainingMs -= dt;

        if (st.remainingMs <= 0 && !st.expired) {
          st.expired = true;
          // Expira => fallo automático (-5) y desaparece
          failMission(mid, "expired");
        }
      }
    }, 200);
  }

  // -----------------------------
  // MODAL MISIÓN (pausa)
  // -----------------------------
  function openMission(missionId) {
    const st = activePoints.get(missionId);
    if (!st) return;
    if (completedMissionIds.has(missionId)) return;

    // Pausa tiempo de esa misión mientras está el modal abierto
    st.isPaused = true;
    pausedMissionId = missionId;

    currentMission = st.mission;
    selectedCharIds = new Set();
    renderCharacters();
    updateChanceUI();

    missionTitleEl.textContent = currentMission.title;
    missionTextEl.textContent = currentMission.text;

    pickHint.textContent = "Selecciona al menos 1 personaje (máximo 2).";
    pickHint.style.opacity = "1";

    showModal(missionModal);
  }

  function closeMissionModal() {
    hideModal(missionModal);

    // Reanuda el tiempo de esa misión
    if (pausedMissionId) {
      const st = activePoints.get(pausedMissionId);
      if (st) {
        st.isPaused = false;
        st.lastTickAt = performance.now();
      }
    }
    pausedMissionId = null;
    currentMission = null;
    selectedCharIds = new Set();
  }

  function renderCharacters() {
    charactersGrid.innerHTML = "";

    CHARACTERS.forEach(ch => {
      const card = document.createElement("div");
      card.className = "char";
      card.dataset.id = ch.id;

      // OJO: etiqueta NO visible al usuario (solo para debug si quisieras)
      card.innerHTML = `
        <div>
          <div class="name">${ch.name}</div>
          <div class="tag" style="display:none">${ch.internalTag}</div>
        </div>
        <div class="pill">Elegir</div>
      `;

      card.addEventListener("click", () => toggleCharacter(ch.id, card));
      charactersGrid.appendChild(card);
    });
  }

  function toggleCharacter(charId, cardEl) {
    if (selectedCharIds.has(charId)) {
      selectedCharIds.delete(charId);
      cardEl.classList.remove("selected");
    } else {
      if (selectedCharIds.size >= 2) {
        // No más de 2
        pickHint.textContent = "Máximo 2 personajes por misión.";
        pickHint.style.opacity = "1";
        return;
      }
      selectedCharIds.add(charId);
      cardEl.classList.add("selected");
    }
    updateChanceUI();
  }

  function updateChanceUI() {
    if (!currentMission) {
      chanceValueEl.textContent = "—";
      return;
    }
    const n = selectedCharIds.size;
    if (n === 0) {
      chanceValueEl.textContent = "10%";
      return;
    }
    const chance = computeChance(currentMission, selectedCharIds);
    chanceValueEl.textContent = `${Math.round(chance * 100)}%`;
  }

  // -----------------------------
  // RULETA PONDERADA
  // -----------------------------
  function spinRoulette(chance, onDone) {
    rouletteOutcome.textContent = "";
    rouletteOkBtn.disabled = true;

    // Ajusta la rueda visual para que "verde" tenga el % correcto
    const greenPct = clamp(chance, 0.01, 0.99) * 100;
    rouletteWheel.style.background = `conic-gradient(from 0deg,
      rgba(46,229,157,.85) 0 ${greenPct}%,
      rgba(255,59,59,.85) ${greenPct}% 100%)`;

    // Animación: rotación + resultado al final
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

  // -----------------------------
  // CONFIRMAR MISIÓN
  // -----------------------------
  function confirmMission() {
    if (!currentMission) return;

    if (selectedCharIds.size < 1) {
      pickHint.textContent = "Debes seleccionar al menos 1 personaje.";
      pickHint.style.opacity = "1";
      return;
    }

    // Cierra selección (y mantenemos pausada hasta resolver)
    hideModal(missionModal);

    const missionId = currentMission.id;
    const chance = computeChance(currentMission, selectedCharIds);

    showModal(rouletteModal);

    spinRoulette(chance, (win) => {
      rouletteOkBtn.onclick = () => {
        hideModal(rouletteModal);

        // Reanudar "estado" y cerrar
        // (Como la misión ya se resuelve, no reanudamos su tiempo: la completamos)
        if (win) winMission(missionId);
        else failMission(missionId, "roulette");

        // Limpieza estado modal
        pausedMissionId = null;
        currentMission = null;
        selectedCharIds = new Set();
        rouletteOkBtn.disabled = true;
      };
    });
  }

  // -----------------------------
  // FINAL
  // -----------------------------
  function finishGame() {
    // Stop timers
    if (lifeTicker) clearInterval(lifeTicker);
    if (spawnTimer) clearTimeout(spawnTimer);

    finalScoreEl.textContent = String(score);
    showModal(finalModal);
  }

  // -----------------------------
  // RESET
  // -----------------------------
  function resetGame() {
    // Cleanup
    hideModal(missionModal);
    hideModal(rouletteModal);
    hideModal(finalModal);

    if (lifeTicker) clearInterval(lifeTicker);
    if (spawnTimer) clearTimeout(spawnTimer);

    // remove all points
    for (const [mid] of activePoints.entries()) removePoint(mid);

    score = 0;
    scoreEl.textContent = "0";

    pendingMissions = [...MISSIONS];
    activePoints = new Map();
    completedMissionIds = new Set();
    currentMission = null;
    selectedCharIds = new Set();
    pausedMissionId = null;

    setProgress();

    // Start again
    startLifeTicker();
    scheduleNextSpawn();
  }

  // -----------------------------
  // EVENTS
  // -----------------------------
  closeModalBtn.addEventListener("click", closeMissionModal);
  missionModal.addEventListener("click", (e) => {
    if (e.target === missionModal) closeMissionModal();
  });

  confirmBtn.addEventListener("click", confirmMission);

  rouletteModal.addEventListener("click", (e) => {
    // No cerramos por click fuera: fuerza "Continuar"
    e.stopPropagation();
  });

  playAgainBtn.addEventListener("click", resetGame);
  resetBtn.addEventListener("click", resetGame);

  // -----------------------------
  // INIT
  // -----------------------------
  setProgress();
  startLifeTicker();
  scheduleNextSpawn();
});
