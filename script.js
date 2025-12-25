document.addEventListener("DOMContentLoaded", () => {
  /* ✅ FIX: altura real en móviles (evita corte abajo) */
  function setAppHeightVar() {
    const h = window.innerHeight;
    document.documentElement.style.setProperty("--appH", `${h}px`);
  }
  setAppHeightVar();
  window.addEventListener("resize", setAppHeightVar);
  window.addEventListener("orientationchange", setAppHeightVar);

  // -------------------------
  // ✅ DURACIÓN DE PARTIDA (oculta)
  // -------------------------
  const GAME_DURATION_MS = 5 * 60 * 1000; // 5 minutos
  let gameEndAt = null;
  let gameClockTimer = null;

  // ✅ nunca más de 10 puntos activos a la vez
  const MAX_ACTIVE_POINTS = 10;

  // -------------------------
  // ✅ MISIONES (15 total)
  // -------------------------
  const MISSIONS = [
    // EDUCACIÓN (3)
    { id: "m1", title: "Taller Exprés", internalTag: "Educación", text: "Hay un grupo listo para empezar y falta ajustar la dinámica. Envía a alguien que domine actividades educativas y manejo de tiempos." },
    { id: "m2", title: "Guía de Actividad", internalTag: "Educación", text: "Necesitamos una mini-guía clara para que cualquiera pueda dirigir la sesión. Envía a quien sepa convertir ideas en instrucciones sencillas." },
    { id: "m3", title: "Plan de Aula", internalTag: "Educación", text: "Han cambiado el perfil del público a última hora. Envía a alguien que sepa adaptar contenidos y mantener a la gente enganchada." },

    // PICOFINO (3)
    { id: "m4", title: "Incidencia de Operativa", internalTag: "Picofino", text: "Se ha bloqueado una tarea del día a día y hay que desbloquearla sin montar lío. Envía a quien conozca bien cómo se mueve Picofino." },
    { id: "m5", title: "Pedido Descuadrado", internalTag: "Picofino", text: "Un pedido no cuadra con lo esperado y el equipo necesita una mano para reordenar prioridades y resolverlo rápido." },
    { id: "m6", title: "Turno Improvisado", internalTag: "Picofino", text: "Falta gente en un turno clave. Envía a quien sepa reorganizar recursos y apagar fuegos sin que se note." },

    // PRODUCCIÓN (3)
    { id: "m7", title: "Montaje a Contrarreloj", internalTag: "Producción", text: "Hay que montar algo rápido y bien, cuidando detalles y materiales. Envía a quien sepa de logística, montaje y ejecución." },
    { id: "m8", title: "Materiales Perdidos", internalTag: "Producción", text: "Falta material y nadie sabe dónde está. Envía a quien tenga control de inventario y sepa coordinar búsquedas sin caos." },
    { id: "m9", title: "Plan B de Producción", internalTag: "Producción", text: "El plan inicial se ha caído. Necesitamos a alguien que replantee el paso a paso y saque la tarea adelante con recursos limitados." },

    // MUSEOS (1)
    { id: "m10", title: "Ajuste de Sala", internalTag: "Museos", text: "La sala necesita un cambio fino: recorrido, cartelas y flujo de personas. Envía a quien sepa de exposición y criterios de museo." },

    // PROGRAMACIÓN (5)
    { id: "m11", title: "Bug Fantasma", internalTag: "Programación", text: "Algo falla solo a veces y nadie logra reproducirlo. Envía a quien sepa investigar errores raros y aislar la causa." },
    { id: "m12", title: "Integración Rápida", internalTag: "Programación", text: "Hay que conectar dos piezas que no se hablan bien. Envía a quien se maneje con integraciones y soluciones limpias." },
    { id: "m13", title: "Optimizar Carga", internalTag: "Programación", text: "En móviles tarda demasiado en cargar. Envía a quien sepa mejorar rendimiento sin romper nada." },
    { id: "m14", title: "Botón Rebelde", internalTag: "Programación", text: "Un botón deja de responder en ciertos casos. Envía a quien tenga mano con eventos, estados y depuración." },
    { id: "m15", title: "Refactor Discreto", internalTag: "Programación", text: "Hay código que funciona pero es un lío. Envía a quien sepa ordenar y dejarlo mantenible sin cambiar el comportamiento." }
  ];

  // -------------------------
  // ✅ PERSONAJES (múltiples etiquetas)
  // -------------------------
  const CHARACTERS = [
    { id: "c1",  name: "Castri",  tags: ["Producción", "Museos"] },
    { id: "c2",  name: "Maider",  tags: ["Museos", "Producción"] },
    { id: "c3",  name: "Celia",   tags: ["Picofino"] },
    { id: "c4",  name: "Buster",  tags: ["Educación"] },
    { id: "c5",  name: "Dre",     tags: ["Programación"] },

    // ✅ Nuevos
    { id: "c6",  name: "Genio",   tags: ["Producción"] },
    { id: "c7",  name: "Lorena",  tags: ["Diseño"] },
    { id: "c8",  name: "Alba",    tags: ["Producción"] },
    { id: "c9",  name: "María M", tags: ["Producción"] },
    { id: "c10", name: "Voby",    tags: ["Producción"] }
  ];

  // ✅ Cartas (todas)
  const CARDS = [
    { id: "card_buster", name: "Buster", img: "images/buster.JPEG", text: "Carta de apoyo: aporta claridad y estructura." },
    { id: "card_castri", name: "Castri", img: "images/castri.JPEG", text: "Carta de apoyo: coordinación y ejecución con criterio." },
    { id: "card_maider", name: "Maider", img: "images/maider.JPEG", text: "Carta de apoyo: mirada de sala y ajuste fino." },
    { id: "card_celia",  name: "Celia",  img: "images/celia.JPEG",  text: "Carta de apoyo: resuelve operativa con rapidez." },
    { id: "card_dre",    name: "Dre",    img: "images/dre.JPEG",    text: "Carta de apoyo: detecta fallos y los arregla." },

    // ✅ Nuevos (nombres de archivo según tu mensaje)
    { id: "card_genio",  name: "Genio",  img: "images/genio.JPEG",  text: "Carta de apoyo: saca tareas adelante con recursos limitados." },
    { id: "card_lorena", name: "Lorena", img: "images/lorena.JPEG", text: "Carta de apoyo: mejora presentación, orden y estética." },
    { id: "card_alba",   name: "Alba",   img: "images/alba.JPEG",   text: "Carta de apoyo: ejecución rápida y organizada." },
    { id: "card_mariam", name: "María M",img: "images/mariam.JPEG", text: "Carta de apoyo: coordina y aterriza lo pendiente." },
    { id: "card_voby",   name: "Voby",   img: "images/voby.JPEG",   text: "Carta de apoyo: empuja producción y logística." }
  ];

  // -------------------------
  // Balance de tiempos
  // -------------------------
  const MISSION_LIFETIME_MS = 2 * 60 * 1000;
  const EXECUTION_TIME_MS = 60 * 1000;

  const MATCH_ADD = 0.8;
  const NO_MATCH_ADD = 0.1;

  // scoring por misiones completadas
  const SCORE_WIN = 1;
  const SCORE_LOSE = 0;

  const SPAWN_MIN_DELAY_MS = 900;
  const SPAWN_MAX_DELAY_MS = 3800;

  // -------------------------
  // DOM
  // -------------------------
  // Intro
  const introScreen = document.getElementById("introScreen");
  const introStartBtn = document.getElementById("introStartBtn");

  // Start (avatar)
  const startScreen = document.getElementById("startScreen");
  const startBtn = document.getElementById("startBtn");

  const prevAvatarBtn = document.getElementById("prevAvatarBtn");
  const nextAvatarBtn = document.getElementById("nextAvatarBtn");
  const avatarPreviewImg = document.getElementById("avatarPreviewImg");
  const avatarPreviewName = document.getElementById("avatarPreviewName");
  const dot0 = document.getElementById("dot0");
  const dot1 = document.getElementById("dot1");

  // ✅ Team screen
  const teamScreen = document.getElementById("teamScreen");
  const teamGrid = document.getElementById("teamGrid");
  const teamCountEl = document.getElementById("teamCount");
  const teamHint = document.getElementById("teamHint");
  const teamConfirmBtn = document.getElementById("teamConfirmBtn");

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

  // -------------------------
  // Estado
  // -------------------------
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

  // ✅ Equipo (6 cartas)
  let selectedTeamCardIds = new Set(); // ids de CARDS
  let availableCharNames = new Set();  // nombres seleccionados para misiones
  let availableCharacters = [];        // subset de CHARACTERS
  let availableCards = [];             // subset de CARDS

  // Avatares (alfabético) - mapa
  const AVATARS = [
    { key: "buster", name: "Buster", src: "images/buster1.PNG", alt: "Buster" },
    { key: "castri", name: "Castri", src: "images/castri1.PNG", alt: "Castri" },
    { key: "celia",  name: "Celia",  src: "images/celia1.PNG",  alt: "Celia" },
    { key: "maider", name: "Maider", src: "images/maider1.png", alt: "Maider" }
  ].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

  let avatarIndex = 0;

  let specialUsed = false;
  let specialArmed = false;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));

  function setScore(delta) { score += delta; }
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
    if (t === "museos" || t === "museo") return "Museos";
    if (t === "educación" || t === "educacion") return "Educación";
    if (t === "producción" || t === "produccion") return "Producción";
    if (t === "picofino") return "Picofino";
    if (t === "programación" || t === "programacion") return "Programación";
    if (t === "diseño" || t === "diseno") return "Diseño";
    return tag;
  }

  function computeChance(mission, chosenIds) {
    const missionTag = normalizeTag(mission.internalTag);
    let p = 0;

    for (const cid of chosenIds) {
      const ch = availableCharacters.find(c => c.id === cid);
      if (!ch) continue;

      const tags = Array.isArray(ch.tags) ? ch.tags : [ch.tags];
      const match = tags.map(normalizeTag).includes(missionTag);
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

  // -------------------------
  // Flow screens
  // -------------------------
  function goToStartScreen() {
    introScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    teamScreen.classList.add("hidden");
    gameRoot.classList.add("hidden");
  }

  function goToTeamScreen() {
    startScreen.classList.add("hidden");
    teamScreen.classList.remove("hidden");
    renderTeamSelection();
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

  // -------------------------
  // ✅ Team selection (6 cartas)
  // -------------------------
  function updateTeamUI() {
    const n = selectedTeamCardIds.size;
    teamCountEl.textContent = String(n);
    teamConfirmBtn.disabled = n !== 6;

    if (n < 6) teamHint.textContent = "Elige 6 cartas para continuar.";
    else if (n === 6) teamHint.textContent = "Perfecto. Confirma el equipo para empezar.";
    else teamHint.textContent = "Máximo 6 cartas.";
  }

  function renderTeamSelection() {
    teamGrid.innerHTML = "";

    // Orden por nombre
    const cardsSorted = [...CARDS].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

    cardsSorted.forEach(cardData => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "team-card" + (selectedTeamCardIds.has(cardData.id) ? " selected" : "");
      btn.innerHTML = `
        <img src="${cardData.img}" alt="${cardData.name}" />
        <div class="team-card-name">
          <span>${cardData.name}</span>
          <span class="pill">${selectedTeamCardIds.has(cardData.id) ? "Elegida" : "Elegir"}</span>
        </div>
      `;

      btn.addEventListener("click", () => {
        const isSelected = selectedTeamCardIds.has(cardData.id);

        if (isSelected) {
          selectedTeamCardIds.delete(cardData.id);
        } else {
          if (selectedTeamCardIds.size >= 6) return; // cap duro
          selectedTeamCardIds.add(cardData.id);
        }
        renderTeamSelection();
        updateTeamUI();
      });

      teamGrid.appendChild(btn);
    });

    updateTeamUI();
  }

  function commitTeamAndStart() {
    // names from selected cards
    const selectedNames = new Set(
      [...selectedTeamCardIds]
        .map(cid => CARDS.find(c => c.id === cid))
        .filter(Boolean)
        .map(c => c.name)
    );

    availableCharNames = selectedNames;

    availableCharacters = CHARACTERS.filter(ch => selectedNames.has(ch.name));
    availableCards = CARDS.filter(c => selectedNames.has(c.name));

    // seguridad: si por lo que sea quedan menos de 6, no arrancar
    if (availableCharacters.length !== 6 || availableCards.length !== 6) return;

    // ir al juego
    teamScreen.classList.add("hidden");
    startGame();
  }

  // -------------------------
  // ✅ Normalización tamaño sprite en mapa (igual que antes)
  // -------------------------
  const spriteBoxCache = new Map();
  let referenceVisibleHeightPx = null;

  async function getSpriteBox(src) {
    if (spriteBoxCache.has(src)) return spriteBoxCache.get(src);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("No se pudo cargar " + src));
    });

    const hasPngAlpha = /\.png$/i.test(src) || /\.webp$/i.test(src);
    if (!hasPngAlpha) {
      const out = { w: img.naturalWidth, h: img.naturalHeight, boxH: img.naturalHeight, boxW: img.naturalWidth };
      spriteBoxCache.set(src, out);
      return out;
    }

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let minX = width, minY = height, maxX = -1, maxY = -1;
    const A_TH = 16;

    for (let y = 0; y < height; y++) {
      const row = y * width * 4;
      for (let x = 0; x < width; x++) {
        const a = data[row + x * 4 + 3];
        if (a > A_TH) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0 || maxY < 0) {
      const out = { w: img.naturalWidth, h: img.naturalHeight, boxH: img.naturalHeight, boxW: img.naturalWidth };
      spriteBoxCache.set(src, out);
      return out;
    }

    const boxW = (maxX - minX + 1);
    const boxH = (maxY - minY + 1);

    const out = { w: img.naturalWidth, h: img.naturalHeight, boxH, boxW };
    spriteBoxCache.set(src, out);
    return out;
  }

  async function applyNormalizedMapSizeFor(src) {
    const baseWidthPx = parseFloat(getComputedStyle(playerImg).width) || 120;
    const box = await getSpriteBox(src);

    const visibleHeight = box.boxH * (baseWidthPx / box.w);

    if (referenceVisibleHeightPx == null) {
      referenceVisibleHeightPx = visibleHeight;
      playerImg.style.width = "";
      return;
    }

    const neededWidth = referenceVisibleHeightPx * (box.w / box.boxH);
    const clamped = Math.max(baseWidthPx * 0.75, Math.min(neededWidth, baseWidthPx * 1.8));
    playerImg.style.width = `${clamped}px`;
  }

  async function applySelectedAvatarToMap() {
    const a = AVATARS[avatarIndex];
    playerImg.src = a.src;
    playerImg.alt = a.alt;

    playerImg.style.width = "";

    if (playerImg.complete) {
      await applyNormalizedMapSizeFor(a.src);
      computeNoSpawnRect();
    } else {
      playerImg.addEventListener("load", async () => {
        await applyNormalizedMapSizeFor(a.src);
        computeNoSpawnRect();
      }, { once: true });
    }
  }

  // -------------------------
  // ✅ Reloj (oculto)
  // -------------------------
  function startGameClock() {
    clearInterval(gameClockTimer);
    gameEndAt = performance.now() + GAME_DURATION_MS;

    gameClockTimer = setInterval(() => {
      const now = performance.now();
      if (now >= gameEndAt) endGameByTime();
    }, 250);
  }

  function endGameByTime() {
    clearInterval(gameClockTimer);
    gameClockTimer = null;

    clearInterval(lifeTicker);
    clearTimeout(spawnTimer);

    rouletteOkBtn.disabled = true;

    hideModal(missionModal);
    hideModal(rouletteModal);
    hideModal(deckModal);
    hideModal(cardInfoModal);
    hideModal(specialModal);

    finishGame();
  }

  // -------------------------
  // Game start
  // -------------------------
  function startGame() {
    gameRoot.classList.remove("hidden");

    specialUsed = false;
    specialArmed = false;
    setSpecialArmedUI(false);

    applySelectedAvatarToMap();

    const refreshNoSpawn = () => computeNoSpawnRect();
    if (playerImg.complete) refreshNoSpawn();
    else playerImg.addEventListener("load", refreshNoSpawn, { once: true });

    setProgress();

    startGameClock();
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
  }

  function winMission(missionId) {
    if (completedMissionIds.has(missionId)) return;
    completedMissionIds.add(missionId);
    setProgress();
    setScore(SCORE_WIN);
    releaseCharsForMission(missionId);
    removePoint(missionId);
  }

  function scheduleNextSpawn() {
    clearTimeout(spawnTimer);
    if (gameClockTimer === null) return;

    if (activePoints.size >= MAX_ACTIVE_POINTS) {
      spawnTimer = setTimeout(() => scheduleNextSpawn(), 800);
      return;
    }

    if (pendingMissions.length === 0) pendingMissions = [...MISSIONS];

    spawnTimer = setTimeout(() => {
      if (gameClockTimer === null) return;
      if (activePoints.size >= MAX_ACTIVE_POINTS) { scheduleNextSpawn(); return; }

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

    availableCharacters.forEach(ch => {
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

    availableCards.forEach(cardData => {
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
    clearInterval(gameClockTimer);
    gameClockTimer = null;

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
    clearInterval(gameClockTimer);
    gameClockTimer = null;

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

    startGameClock();
    startLifeTicker();
    scheduleNextSpawn();
  }

  // -------------------------
  // Events
  // -------------------------
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

  // ✅ ahora Start -> Team screen
  startBtn.addEventListener("click", () => {
    // reset selección de equipo al entrar
    selectedTeamCardIds = new Set();
    goToTeamScreen();
  });

  teamConfirmBtn.addEventListener("click", () => {
    if (selectedTeamCardIds.size !== 6) return;
    commitTeamAndStart();
  });

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
    teamScreen.classList.add("hidden");
    avatarIndex = 0;
    renderAvatarCarousel(0);
  });

  window.addEventListener("resize", () => {
    setAppHeightVar();
    if (!gameRoot.classList.contains("hidden")) computeNoSpawnRect();
  });

  // init
  renderAvatarCarousel(0);

  // fija referencia tamaño (si el src inicial es Buster)
  if (playerImg?.getAttribute("src")) {
    const src = playerImg.getAttribute("src");
    playerImg.addEventListener("load", async () => {
      try {
        referenceVisibleHeightPx = null;
        await applyNormalizedMapSizeFor(src);
      } catch {}
    }, { once: true });
  }
});