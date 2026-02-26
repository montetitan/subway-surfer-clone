(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const scoreEl = document.getElementById("score");
  const coinsEl = document.getElementById("coins");
  const highScoreEl = document.getElementById("highScore");
  const highScoreUserEl = document.getElementById("highScoreUser");
  const speedEl = document.getElementById("speed");
  const syncStatusEl = document.getElementById("syncStatus");
  const hudEl = document.querySelector(".hud");
  const overlay = document.getElementById("overlay");
  const finalScoreEl = document.getElementById("finalScore");
  const finalCoinsEl = document.getElementById("finalCoins");
  const finalHighScoreEl = document.getElementById("finalHighScore");
  const finalHighScoreUserEl = document.getElementById("finalHighScoreUser");
  const newRecordBox = document.getElementById("newRecordBox");
  const nameInput = document.getElementById("nameInput");
  const saveNameBtn = document.getElementById("saveNameBtn");
  const restartBtn = document.getElementById("restartBtn");
  const helpEl = document.querySelector(".help");
  const settingsBtn = document.getElementById("settingsBtn");
  const runnerBtn = document.getElementById("runnerBtn");
  const screenBtn = document.getElementById("screenBtn");
  const bgBtn = document.getElementById("bgBtn");
  const styleBtn = document.getElementById("styleBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const orientationSelect = document.getElementById("orientationSelect");
  const runnerSelect = document.getElementById("runnerSelect");
  const renderModeSelect = document.getElementById("renderModeSelect");
  const bgSelect = document.getElementById("bgSelect");
  const styleSelect = document.getElementById("styleSelect");

  let W = canvas.width;
  let H = canvas.height;
  let laneX = [W * 0.35, W * 0.5, W * 0.65];

  let state;
  const HIGH_SCORE_KEY = "subway_surfer_clone_high_score";
  const HELP_SHOWN_KEY = "subway_surfer_clone_help_shown";
  const ORIENTATION_KEY = "subway_surfer_clone_orientation";
  const RUNNER_KEY = "subway_surfer_clone_runner";
  const RENDER_MODE_KEY = "subway_surfer_clone_render_mode";
  const BACKGROUND_KEY = "subway_surfer_clone_background";
  const STYLE_KEY = "subway_surfer_clone_style";
  const REMOTE_API_URL = "/api/highscore";
  const isHttpMode = window.location.protocol.startsWith("http");
  let remoteRecord = { high_score: 0, high_score_user: "-" };
  let pendingHighScore = null;
  let remoteSyncOk = false;
  let selectedRunner = "jogger";
  let selectedRenderMode = "fixed";
  let selectedBackground = "normal";
  let selectedStyle = "default";
  let activeVisual = null;
  let activeFx = 1;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  const rand = (n) => Math.floor(Math.random() * n);
  const toInt = (v) => Number.parseInt(v, 10) || 0;

  function normalizeRecord(record) {
    const high_score = toInt(record?.high_score);
    const rawUser = typeof record?.high_score_user === "string" ? record.high_score_user.trim() : "";
    return {
      high_score,
      high_score_user: rawUser || "-",
    };
  }

  function getLocalRecord() {
    try {
      const raw = localStorage.getItem(HIGH_SCORE_KEY);
      if (!raw) return { high_score: 0, high_score_user: "-" };
      const parsed = JSON.parse(raw);
      if (typeof parsed === "number") {
        return { high_score: toInt(parsed), high_score_user: "-" };
      }
      return normalizeRecord(parsed);
    } catch (_err) {
      return { high_score: 0, high_score_user: "-" };
    }
  }

  function setLocalRecord(record) {
    const normalized = normalizeRecord(record);
    try {
      localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(normalized));
    } catch (_err) {
      // Ignore storage errors (private mode, blocked storage, etc.)
    }
  }

  function getOrientationSetting() {
    try {
      const v = (localStorage.getItem(ORIENTATION_KEY) || "").toLowerCase();
      if (v === "portrait" || v === "landscape" || v === "auto") return v;
    } catch (_err) {
      // Ignore storage errors.
    }
    return "auto";
  }

  function setOrientationSetting(value) {
    try {
      localStorage.setItem(ORIENTATION_KEY, value);
    } catch (_err) {
      // Ignore storage errors.
    }
  }

  function getRunnerSetting() {
    try {
      const v = (localStorage.getItem(RUNNER_KEY) || "").toLowerCase();
      if (v === "jogger" || v === "businessman" || v === "joker" || v === "mechanic") return v;
    } catch (_err) {
      // Ignore storage errors.
    }
    return "jogger";
  }

  function setRunnerSetting(value) {
    try {
      localStorage.setItem(RUNNER_KEY, value);
    } catch (_err) {
      // Ignore storage errors.
    }
  }

  function applyRunnerSetting(value) {
    const runner = ["jogger", "businessman", "joker", "mechanic"].includes(value) ? value : "jogger";
    selectedRunner = runner;
    setRunnerSetting(runner);
    if (runnerSelect) runnerSelect.value = runner;
  }

  function getBackgroundSetting() {
    try {
      const v = (localStorage.getItem(BACKGROUND_KEY) || "").toLowerCase();
      if (v === "normal" || v === "beach" || v === "airport" || v === "waterway") return v;
    } catch (_err) {
      // Ignore storage errors.
    }
    return "normal";
  }

  function setBackgroundSetting(value) {
    try {
      localStorage.setItem(BACKGROUND_KEY, value);
    } catch (_err) {
      // Ignore storage errors.
    }
  }

  function applyBackgroundSetting(value) {
    const bg = ["normal", "beach", "airport", "waterway"].includes(value) ? value : "normal";
    selectedBackground = bg;
    setBackgroundSetting(bg);
    if (bgSelect) bgSelect.value = bg;
  }

  function getStyleSetting() {
    try {
      const v = (localStorage.getItem(STYLE_KEY) || "").toLowerCase();
      if (v === "default" || v === "realistic" || v === "cartoony" || v === "neon") return v;
    } catch (_err) {
      // Ignore storage errors.
    }
    return "default";
  }

  function setStyleSetting(value) {
    try {
      localStorage.setItem(STYLE_KEY, value);
    } catch (_err) {
      // Ignore storage errors.
    }
  }

  function applyStyleSetting(value) {
    const style = ["default", "realistic", "cartoony", "neon"].includes(value) ? value : "default";
    selectedStyle = style;
    setStyleSetting(style);
    document.body.dataset.visualStyle = style;
    if (styleSelect) styleSelect.value = style;
  }

  function getVisualProfile() {
    if (selectedStyle === "realistic") {
      return {
        contrast: 0.94,
        saturation: 0.88,
        roadGlow: 0.03,
        obstaclePulse: 0.08,
        skylineSpeed: 0.65,
        playerTrail: false,
        lineWidthMul: 0.95,
      };
    }
    if (selectedStyle === "cartoony") {
      return {
        contrast: 1.08,
        saturation: 1.18,
        roadGlow: 0.11,
        obstaclePulse: 0.2,
        skylineSpeed: 1.25,
        playerTrail: true,
        lineWidthMul: 1.18,
      };
    }
    if (selectedStyle === "neon") {
      return {
        contrast: 1.22,
        saturation: 1.28,
        roadGlow: 0.18,
        obstaclePulse: 0.3,
        skylineSpeed: 1.45,
        playerTrail: true,
        lineWidthMul: 1.1,
      };
    }
    return {
      contrast: 1,
      saturation: 1,
      roadGlow: 0.06,
      obstaclePulse: 0.14,
      skylineSpeed: 1,
      playerTrail: true,
      lineWidthMul: 1,
    };
  }

  function getEffectQuality() {
    const px = W * H;
    let quality = px > 1600000 ? 0.45 : px > 1000000 ? 0.62 : px > 700000 ? 0.78 : 1;
    if (selectedStyle === "neon") quality *= 0.86;
    return Math.max(0.35, Math.min(1, quality));
  }

  function getRenderModeSetting() {
    try {
      const v = (localStorage.getItem(RENDER_MODE_KEY) || "").toLowerCase();
      if (v === "fixed" || v === "fullscreen") return v;
    } catch (_err) {
      // Ignore storage errors.
    }
    return "fixed";
  }

  function setRenderModeSetting(value) {
    try {
      localStorage.setItem(RENDER_MODE_KEY, value);
    } catch (_err) {
      // Ignore storage errors.
    }
  }

  function recalcLayoutFromCanvas() {
    W = canvas.width;
    H = canvas.height;
    laneX = [W * 0.35, W * 0.5, W * 0.65];
  }

  function applyRenderModeSetting(value, shouldReset = true) {
    const mode = value === "fullscreen" ? "fullscreen" : "fixed";
    selectedRenderMode = mode;
    setRenderModeSetting(mode);
    if (renderModeSelect) renderModeSelect.value = mode;
    document.body.classList.toggle("render-fullscreen", mode === "fullscreen");

    if (mode === "fullscreen") {
      const vw = Math.max(360, window.innerWidth || 960);
      const vh = Math.max(320, window.innerHeight || 540);
      canvas.width = vw;
      canvas.height = vh;
    } else {
      canvas.width = 960;
      canvas.height = 540;
    }
    recalcLayoutFromCanvas();
    if (shouldReset) reset();
  }

  function hasShownHelp() {
    try {
      return localStorage.getItem(HELP_SHOWN_KEY) === "1";
    } catch (_err) {
      return false;
    }
  }

  function markHelpShown() {
    try {
      localStorage.setItem(HELP_SHOWN_KEY, "1");
    } catch (_err) {
      // Ignore storage errors.
    }
  }

  function maybeShowHelpOnce() {
    if (!helpEl) return;
    if (hasShownHelp()) {
      helpEl.classList.add("hidden");
      return;
    }
    // First-launch onboarding: show briefly once, then persist dismissal.
    helpEl.classList.remove("hidden");
    markHelpShown();
    setTimeout(() => {
      helpEl.classList.add("hidden");
    }, 3000);
  }

  function applyNativeOrientation(mode) {
    if (window.AndroidApp && typeof window.AndroidApp.setOrientation === "function") {
      window.AndroidApp.setOrientation(mode);
    }
  }

  async function applyBrowserOrientation(mode) {
    if (!screen.orientation || typeof screen.orientation.lock !== "function") return;
    const lockMode = mode === "auto" ? "any" : mode;
    try {
      await screen.orientation.lock(lockMode);
    } catch (_err) {
      // lock() commonly fails outside fullscreen/user-gesture contexts.
    }
  }

  function applyOrientationSetting(value) {
    const mode = value === "portrait" || value === "landscape" ? value : "auto";
    setOrientationSetting(mode);
    if (orientationSelect) orientationSelect.value = mode;
    applyNativeOrientation(mode);
    applyBrowserOrientation(mode);
  }

  function getBestRecord() {
    const local = getLocalRecord();
    const remote = normalizeRecord(remoteRecord);
    if (remote.high_score > local.high_score) return remote;
    if (local.high_score > remote.high_score) return local;
    return {
      high_score: local.high_score,
      high_score_user: local.high_score_user !== "-" ? local.high_score_user : remote.high_score_user,
    };
  }

  function setSyncStatus(ok, text) {
    if (!syncStatusEl) return;
    syncStatusEl.textContent = text;
    syncStatusEl.classList.remove("ok", "warn");
    syncStatusEl.classList.add(ok ? "ok" : "warn");
  }

  async function fetchRemoteHighScore() {
    if (!isHttpMode) {
      remoteSyncOk = false;
      setSyncStatus(false, "Local only");
      return;
    }
    try {
      const res = await fetch(REMOTE_API_URL, { cache: "no-store" });
      if (!res.ok) {
        remoteSyncOk = false;
        setSyncStatus(false, "Server unavailable");
        return;
      }
      const data = await res.json();
      remoteRecord = normalizeRecord(data);
      remoteSyncOk = true;
      setSyncStatus(true, "Shared");
      updateHud();
    } catch (_err) {
      remoteSyncOk = false;
      setSyncStatus(false, "Server unavailable");
    }
  }

  async function pushRemoteHighScore(record) {
    if (!isHttpMode) return;
    try {
      const res = await fetch(REMOTE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizeRecord(record)),
      });
      if (!res.ok) {
        remoteSyncOk = false;
        setSyncStatus(false, "Server unavailable");
        return;
      }
      const data = await res.json();
      remoteRecord = normalizeRecord(data);
      remoteSyncOk = true;
      setSyncStatus(true, "Shared");
      updateHud();
    } catch (_err) {
      remoteSyncOk = false;
      setSyncStatus(false, "Server unavailable");
    }
  }

  function reset() {
    state = {
      running: true,
      score: 0,
      coins: 0,
      speed: 340,
      time: 0,
      lane: 1,
      targetLane: 1,
      x: laneX[1],
      y: H - 110,
      baseY: H - 110,
      vy: 0,
      gravity: 2100,
      jumping: false,
      sliding: false,
      slideTimer: 0,
      obstacles: [],
      coinRows: [],
      spawnTimer: 0,
      coinSpawnTimer: 0,
      roadTick: 0,
      hitFlash: 0,
      gameOverStyle: null,
      cinematicTimer: 0,
      cinematicDuration: 1.5,
    };
    overlay.classList.add("hidden");
    overlay.classList.remove("cinematic-win", "cinematic-loss");
    setSettingsUiVisible(false);
    updateHud();
  }

  function setSettingsUiVisible(visible) {
    const method = visible ? "remove" : "add";
    settingsBtn.classList[method]("hidden");
    runnerBtn.classList[method]("hidden");
    screenBtn.classList[method]("hidden");
    bgBtn.classList[method]("hidden");
    styleBtn.classList[method]("hidden");
    hudEl.classList.toggle("overlay-mode", visible);
    if (visible) positionSettingsPanel();
    if (!visible) settingsPanel.classList.add("hidden");
  }

  function positionSettingsPanel() {
    if (!hudEl || !settingsPanel) return;
    const portrait = window.innerHeight > window.innerWidth;
    settingsPanel.classList.toggle("portrait-mode", portrait);
    if (portrait) {
      const hudRect = hudEl.getBoundingClientRect();
      settingsPanel.style.top = `${Math.ceil(hudRect.bottom + 8)}px`;
      settingsPanel.style.left = "14px";
      settingsPanel.style.right = "14px";
      settingsPanel.style.maxHeight = `${Math.max(120, Math.floor(window.innerHeight - hudRect.bottom - 24))}px`;
    } else {
      settingsPanel.style.top = "";
      settingsPanel.style.left = "";
      settingsPanel.style.right = "";
      settingsPanel.style.maxHeight = "";
    }
  }

  function updateHud() {
    const best = getBestRecord();
    scoreEl.textContent = Math.floor(state.score);
    coinsEl.textContent = state.coins;
    highScoreEl.textContent = best.high_score;
    highScoreUserEl.textContent = best.high_score_user;
    speedEl.textContent = `${(state.speed / 340).toFixed(1)}x`;
  }

  function spawnObstacle() {
    const typeRoll = Math.random();
    let type = "barrier";
    if (typeRoll > 0.72) type = "train";
    else if (typeRoll > 0.58) type = "duckbar";
    else if (typeRoll > 0.5) type = "bush";
    else if (typeRoll > 0.28) type = "lowbar";

    const lane = rand(3);
    state.obstacles.push({
      type,
      lane,
      x: laneX[lane],
      z: -90,
      w: type === "train" ? 78 : type === "bush" ? 62 : type === "duckbar" ? 78 : 58,
      h: type === "lowbar" ? 44 : type === "train" ? 126 : type === "bush" ? 54 : type === "duckbar" ? 26 : 72,
    });
  }

  function spawnCoins() {
    const lane = rand(3);
    const count = 3 + rand(4);
    for (let i = 0; i < count; i += 1) {
      state.coinRows.push({ lane, x: laneX[lane], z: -80 - i * 70, yOff: i % 2 ? 20 : 0, r: 13 });
    }
  }

  function moveLeft() {
    state.targetLane = Math.max(0, state.targetLane - 1);
  }

  function moveRight() {
    state.targetLane = Math.min(2, state.targetLane + 1);
  }

  function jump() {
    if (!state.jumping && !state.sliding) {
      state.jumping = true;
      state.vy = -920;
    }
  }

  function slide() {
    if (!state.jumping && !state.sliding) {
      state.sliding = true;
      state.slideTimer = 0.45;
    }
  }

  function input(e) {
    if (!state.running) return;
    const k = e.key.toLowerCase();
    let handled = false;
    if (k === "a" || k === "arrowleft") {
      moveLeft();
      handled = true;
    }
    if (k === "d" || k === "arrowright") {
      moveRight();
      handled = true;
    }
    if (k === "w" || k === "arrowup" || k === " ") {
      jump();
      handled = true;
    }
    if (k === "s" || k === "arrowdown") {
      slide();
      handled = true;
    }
    if (handled) e.preventDefault();
  }

  function onTouchStart(e) {
    if (!state.running || e.touches.length === 0) return;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = performance.now();
  }

  function onTouchEnd(e) {
    if (!state.running || e.changedTouches.length === 0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const elapsed = performance.now() - touchStartTime;

    // Tap -> jump (quick short touch)
    if (adx < 18 && ady < 18 && elapsed < 260) {
      jump();
      return;
    }

    // Swipe handling
    if (adx > ady) {
      if (dx > 24) moveRight();
      else if (dx < -24) moveLeft();
    } else {
      if (dy < -26) jump();
      else if (dy > 26) slide();
    }
  }

  function playerBox() {
    const height = state.sliding ? 34 : 62;
    return {
      x: state.x - 22,
      y: state.y - height,
      w: 44,
      h: height,
    };
  }

  function intersects(a, b) {
    return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
  }

  function depthProgress(z) {
    const farZ = -120;
    const nearZ = 520;
    return Math.max(0, Math.min(1, (z - farZ) / (nearZ - farZ)));
  }

  function obstacleBox(o) {
    const p = depthProgress(o.z);
    const scale = 0.2 + p * 0.95;
    const w = o.w * scale;
    const h = o.h * scale;
    const horizonY = H * 0.42;
    const groundY = state.baseY + 20;
    const yBase = horizonY + p * (groundY - horizonY);
    const yShift = o.type === "duckbar" ? (12 + p * 34) : 0;
    return {
      x: o.x - w / 2,
      y: yBase - h - yShift,
      w,
      h,
    };
  }

  function coinBox(c) {
    const p = depthProgress(c.z);
    const scale = 0.18 + p * 0.8;
    const r = c.r * scale;
    const horizonY = H * 0.42;
    const groundY = state.baseY - 58;
    const y = horizonY + p * (groundY - horizonY) - c.yOff * (0.35 + p * 0.65);
    return { x: c.x - r, y: y - r, w: 2 * r, h: 2 * r };
  }

  function obstacleScreenBox(o) {
    const projectedX = lanePerspectiveX(o.x, o.z);
    return obstacleBox({ ...o, x: projectedX });
  }

  function coinScreenBox(c) {
    const projectedX = lanePerspectiveX(c.x, c.z);
    return coinBox({ ...c, x: projectedX });
  }

  function obstacleHitBox(o) {
    // Rendered obstacle art is intentionally wider than logical hit area to avoid unfair side hits.
    const b = obstacleScreenBox(o);
    const scaleByType = o.type === "train" ? 0.56 : o.type === "duckbar" ? 0.46 : o.type === "lowbar" ? 0.52 : 0.68;
    const w = b.w * scaleByType;
    return {
      x: b.x + (b.w - w) / 2,
      y: b.y,
      w,
      h: b.h,
    };
  }

  function update(dt) {
    if (!state.running) return;

    state.time += dt;
    state.score += dt * 65;
    state.speed = Math.min(700, state.speed + dt * 5.5);
    state.roadTick += dt * state.speed;

    const targetX = laneX[state.targetLane];
    state.x += (targetX - state.x) * Math.min(1, dt * 15);

    if (state.jumping) {
      state.vy += state.gravity * dt;
      state.y += state.vy * dt;
      if (state.y >= state.baseY) {
        state.y = state.baseY;
        state.vy = 0;
        state.jumping = false;
      }
    }

    if (state.sliding) {
      state.slideTimer -= dt;
      if (state.slideTimer <= 0) state.sliding = false;
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnObstacle();
      state.spawnTimer = Math.max(0.48, 1.25 - (state.speed - 340) / 560);
    }

    state.coinSpawnTimer -= dt;
    if (state.coinSpawnTimer <= 0) {
      spawnCoins();
      state.coinSpawnTimer = 1.4 + Math.random() * 0.8;
    }

    for (const o of state.obstacles) o.z += dt * state.speed;
    for (const c of state.coinRows) c.z += dt * state.speed;

    state.obstacles = state.obstacles.filter((o) => o.z < 520);
    state.coinRows = state.coinRows.filter((c) => c.z < 520);

    const p = playerBox();
    const playerLane = laneX.reduce(
      (bestIdx, lanePos, idx) => (Math.abs(state.x - lanePos) < Math.abs(state.x - laneX[bestIdx]) ? idx : bestIdx),
      0,
    );
    for (const o of state.obstacles) {
      if (o.lane !== playerLane) continue;
      // Depth gate keeps perspective overlap from triggering early collisions.
      if (o.z < 410) continue;
      const b = obstacleHitBox(o);
      if (!intersects(p, b)) continue;

      const overlapLeft = Math.max(p.x, b.x);
      const overlapRight = Math.min(p.x + p.w, b.x + b.w);
      const overlapW = overlapRight - overlapLeft;
      const minBodyW = Math.min(p.w, b.w);
      if (overlapW <= 0 || overlapW / minBodyW < 0.62) continue;

      if ((o.type === "lowbar" || o.type === "duckbar") && state.sliding) continue;

      // Ground obstacles should only collide when feet are near the ground.
      // This avoids "head hit" deaths while jumping over bushes/barriers.
      if (o.type === "barrier" || o.type === "bush") {
        const feetY = p.y + p.h;
        const feetNearGround = feetY >= state.baseY - 16;
        if (!feetNearGround) continue;
      }

      gameOver();
      return;
    }

    for (let i = state.coinRows.length - 1; i >= 0; i -= 1) {
      const c = state.coinRows[i];
      if (intersects(p, coinScreenBox(c))) {
        state.coinRows.splice(i, 1);
        state.coins += 1;
        state.score += 40;
      }
    }

    updateHud();
  }

  function drawRoad() {
    const visual = activeVisual || getVisualProfile();
    const fx = activeFx;
    const isRealistic = selectedStyle === "realistic";
    const isCartoony = selectedStyle === "cartoony";
    const isNeon = selectedStyle === "neon";
    const scheme = selectedBackground === "beach"
      ? { ground: "#d9b57a", road: "#8d99ae", lane: "#f8f9fa", stripe: "#fff3b0" }
      : selectedBackground === "airport"
        ? { ground: "#7f8c8d", road: "#495057", lane: "#ced4da", stripe: "#ffd43b" }
        : selectedBackground === "waterway"
          ? { ground: "#0b4f6c", road: "#274c77", lane: "#9bd1ff", stripe: "#caf0f8" }
          : { ground: "#13233f", road: "#0e1a30", lane: "#7d8597", stripe: "#f4f4f4" };
    const shimmer = visual.roadGlow + 0.04 * Math.sin(state.time * 1.7);
    if (isCartoony) {
      ctx.fillStyle = scheme.ground;
    } else {
      const groundGrad = ctx.createLinearGradient(0, H * 0.38, 0, H);
      groundGrad.addColorStop(0, scheme.ground);
      groundGrad.addColorStop(1, selectedBackground === "beach" ? "#c9a46e" : selectedBackground === "waterway" ? "#083f57" : "#0f1a2d");
      ctx.fillStyle = groundGrad;
    }
    ctx.fillRect(0, H * 0.38, W, H * 0.62);

    if (isCartoony) {
      ctx.fillStyle = scheme.road;
    } else {
      const roadGrad = ctx.createLinearGradient(0, H * 0.42, 0, H);
      roadGrad.addColorStop(0, scheme.road);
      roadGrad.addColorStop(1, selectedBackground === "airport" ? "#2f3a44" : "#08111f");
      ctx.fillStyle = roadGrad;
    }
    ctx.beginPath();
    ctx.moveTo(W * 0.18, H);
    ctx.lineTo(W * 0.82, H);
    ctx.lineTo(W * 0.62, H * 0.42);
    ctx.lineTo(W * 0.38, H * 0.42);
    ctx.closePath();
    ctx.fill();

    if (isRealistic) {
      ctx.fillStyle = "rgba(20, 28, 36, 0.32)";
      ctx.beginPath();
      ctx.moveTo(W * 0.18, H);
      ctx.lineTo(W * 0.23, H);
      ctx.lineTo(W * 0.41, H * 0.42);
      ctx.lineTo(W * 0.38, H * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(W * 0.82, H);
      ctx.lineTo(W * 0.77, H);
      ctx.lineTo(W * 0.59, H * 0.42);
      ctx.lineTo(W * 0.62, H * 0.42);
      ctx.closePath();
      ctx.fill();
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(W * 0.18, H);
    ctx.lineTo(W * 0.82, H);
    ctx.lineTo(W * 0.62, H * 0.42);
    ctx.lineTo(W * 0.38, H * 0.42);
    ctx.closePath();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(W * 0.18, H);
    ctx.lineTo(W * 0.82, H);
    ctx.lineTo(W * 0.62, H * 0.42);
    ctx.lineTo(W * 0.38, H * 0.42);
    ctx.closePath();

    ctx.strokeStyle = isNeon ? "#8ff9ff" : scheme.lane;
    ctx.lineWidth = 3 * visual.lineWidthMul;
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H);
    ctx.lineTo(W * 0.5, H * 0.42);
    ctx.moveTo(W * 0.35, H);
    ctx.lineTo(W * 0.43, H * 0.42);
    ctx.moveTo(W * 0.65, H);
    ctx.lineTo(W * 0.57, H * 0.42);
    ctx.stroke();

    ctx.strokeStyle = isNeon ? `rgba(0, 255, 255, ${0.3 + shimmer * 2})` : `rgba(255, 255, 255, ${shimmer})`;
    ctx.lineWidth = 2 * visual.lineWidthMul;
    ctx.beginPath();
    ctx.moveTo(W * 0.2, H);
    ctx.lineTo(W * 0.4, H * 0.42);
    ctx.moveTo(W * 0.8, H);
    ctx.lineTo(W * 0.6, H * 0.42);
    ctx.stroke();

    ctx.fillStyle = isNeon ? "#ff4dff" : scheme.stripe;
    const stripeCount = Math.max(8, Math.floor(20 * fx));
    for (let i = 0; i < stripeCount; i += 1) {
      const y = (state.roadTick * 0.55 + i * 50) % (H + 50);
      const p = y / H;
      const x1 = W * 0.5 - 2 - p * 8;
      const x2 = W * 0.5 + 2 + p * 8;
      const yy = H - y;
      ctx.fillRect(x1, yy, x2 - x1, 14 * (1 - p * 0.6));
    }

    ctx.fillStyle = isNeon ? `rgba(0, 255, 255, ${0.12 + shimmer * 1.6})` : `rgba(255, 255, 255, ${0.04 + shimmer})`;
    const sheenCount = Math.max(4, Math.floor(12 * fx));
    for (let i = 0; i < sheenCount; i += 1) {
      const y = (state.roadTick * 0.3 + i * 95) % (H + 60);
      const p = y / H;
      const ww = 44 * (1 - p * 0.5);
      const yy = H - y;
      ctx.fillRect(W * 0.5 - ww * 0.5, yy, ww, 2);
    }

    if (isNeon) {
      const pulse = 0.25 + Math.abs(Math.sin(state.time * 6.8)) * 0.55;
      ctx.fillStyle = `rgba(255, 0, 210, ${0.16 + pulse * 0.25})`;
      for (let i = 0; i < 18; i += 1) {
        const y = (state.roadTick * 0.75 + i * 60) % (H + 50);
        const p = y / H;
        const yy = H - y;
        const ww = 20 + (1 - p) * 18;
        ctx.fillRect(W * 0.22 - ww * 0.5, yy, ww, 2.4);
        ctx.fillRect(W * 0.78 - ww * 0.5, yy, ww, 2.4);
      }
    }
    ctx.restore();

    if (isCartoony) {
      ctx.strokeStyle = "#1f1f1f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W * 0.18, H);
      ctx.lineTo(W * 0.82, H);
      ctx.lineTo(W * 0.62, H * 0.42);
      ctx.lineTo(W * 0.38, H * 0.42);
      ctx.closePath();
      ctx.stroke();
    }
  }

  function lanePerspectiveX(x, z) {
    const p = 0.22 + depthProgress(z) * 0.78;
    const center = W * 0.5;
    return center + (x - center) * p;
  }

  function drawObstacle(o) {
    const visual = activeVisual || getVisualProfile();
    const fx = activeFx;
    const isRealistic = selectedStyle === "realistic";
    const isCartoony = selectedStyle === "cartoony";
    const isNeon = selectedStyle === "neon";
    const b = obstacleScreenBox(o);
    const t = state.time + o.z * 0.004;
    const glow = 0.12 + Math.max(0, Math.sin(t * 5)) * (0.2 + visual.obstaclePulse);

    if (isRealistic) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.beginPath();
      ctx.ellipse(b.x + b.w * 0.5, b.y + b.h + 5, b.w * 0.42, Math.max(2, b.h * 0.08), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (o.type === "train") {
      ctx.fillStyle = "#b91c1c";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#e63946";
      ctx.fillRect(b.x + b.w * 0.08, b.y + b.h * 0.18, b.w * 0.84, b.h * 0.62);
      ctx.fillStyle = "#f77f00";
      ctx.fillRect(b.x, b.y, b.w, b.h * 0.14);
      ctx.fillStyle = "#90e0ef";
      const winW = b.w * 0.2;
      const winGap = b.w * 0.08;
      const wy = b.y + b.h * 0.26;
      for (let i = 0; i < 3; i += 1) {
        ctx.fillRect(b.x + winGap + i * (winW + winGap), wy, winW, b.h * 0.22);
      }
      if (fx > 0.52) {
        ctx.fillStyle = `rgba(255, 240, 170, ${0.12 + glow * 0.35})`;
        ctx.beginPath();
        ctx.arc(b.x + b.w * 0.18, b.y + b.h * 0.86, b.w * 0.08, 0, Math.PI * 2);
        ctx.arc(b.x + b.w * 0.82, b.y + b.h * 0.86, b.w * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      if (isRealistic) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.fillRect(b.x + b.w * 0.06, b.y + b.h * 0.18, b.w * 0.08, b.h * 0.62);
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(b.x + b.w * 0.86, b.y + b.h * 0.16, b.w * 0.1, b.h * 0.68);
      }
      ctx.fillStyle = "#2b2d42";
      ctx.fillRect(b.x, b.y + b.h * 0.88, b.w, b.h * 0.12);
      if (isCartoony) {
        ctx.strokeStyle = "#202020";
        ctx.lineWidth = Math.max(1.6, b.w * 0.045);
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      }
      return;
    }

    if (o.type === "bush") {
      const r1 = b.w * 0.22;
      const r2 = b.w * 0.28;
      const r3 = b.w * 0.24;
      const baseY = b.y + b.h * 0.82;
      ctx.fillStyle = "#2a9d8f";
      ctx.beginPath();
      ctx.arc(b.x + b.w * 0.28, baseY, r1, 0, Math.PI * 2);
      ctx.arc(b.x + b.w * 0.5, b.y + b.h * 0.55, r2, 0, Math.PI * 2);
      ctx.arc(b.x + b.w * 0.72, baseY, r3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1b7f73";
      ctx.fillRect(b.x + b.w * 0.42, b.y + b.h * 0.72, b.w * 0.16, b.h * 0.18);
      if (fx > 0.58) {
        ctx.fillStyle = `rgba(210, 255, 210, ${0.1 + glow * 0.2})`;
        ctx.beginPath();
        ctx.arc(b.x + b.w * 0.52, b.y + b.h * 0.48, b.w * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      if (isRealistic) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
        ctx.beginPath();
        ctx.ellipse(b.x + b.w * 0.5, b.y + b.h * 0.82, b.w * 0.36, b.h * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (isCartoony) {
        ctx.strokeStyle = "#1c3b30";
        ctx.lineWidth = Math.max(1.5, b.w * 0.04);
        ctx.strokeRect(b.x + b.w * 0.08, b.y + b.h * 0.28, b.w * 0.84, b.h * 0.58);
      }
      return;
    }

    if (o.type === "lowbar") {
      ctx.fillStyle = "#59636b";
      ctx.fillRect(b.x, b.y + b.h * 0.35, b.w, b.h * 0.2);
      ctx.fillRect(b.x + b.w * 0.08, b.y + b.h * 0.15, b.w * 0.12, b.h * 0.55);
      ctx.fillRect(b.x + b.w * 0.8, b.y + b.h * 0.15, b.w * 0.12, b.h * 0.55);
      ctx.fillStyle = "#f4a261";
      ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.4, b.w * 0.6, b.h * 0.1);
      if (isRealistic) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.fillRect(b.x + b.w * 0.1, b.y + b.h * 0.18, b.w * 0.08, b.h * 0.5);
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(b.x + b.w * 0.83, b.y + b.h * 0.18, b.w * 0.08, b.h * 0.5);
      }
      if (isCartoony) {
        ctx.strokeStyle = "#1f1f1f";
        ctx.lineWidth = Math.max(1.5, b.w * 0.04);
        ctx.strokeRect(b.x, b.y + b.h * 0.15, b.w, b.h * 0.55);
      }
      return;
    }

    if (o.type === "duckbar") {
      ctx.fillStyle = "#495057";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#fca311";
      const stripeW = Math.max(4, b.w * 0.12);
      for (let x = b.x; x < b.x + b.w; x += stripeW * 2) {
        ctx.fillRect(x, b.y, stripeW, b.h);
      }
      if (fx > 0.5) {
        ctx.fillStyle = `rgba(255, 90, 90, ${0.16 + glow * 0.25})`;
        ctx.beginPath();
        ctx.arc(b.x + b.w * 0.5, b.y + b.h * 0.5, b.h * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = Math.max(1, b.w * 0.035);
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.5, b.y + b.h * 0.34);
      ctx.lineTo(b.x + b.w * 0.5, b.y + b.h * 0.58);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x + b.w * 0.5, b.y + b.h * 0.68, b.h * 0.03, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      if (isRealistic) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.fillRect(b.x + b.w * 0.06, b.y, b.w * 0.08, b.h);
        ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
        ctx.fillRect(b.x + b.w * 0.86, b.y, b.w * 0.08, b.h);
      }
      if (isCartoony) {
        ctx.strokeStyle = "#1f1f1f";
        ctx.lineWidth = Math.max(1.5, b.w * 0.04);
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      }
      return;
    }

    // barrier/cone style obstacle
    ctx.fillStyle = "#ff7f11";
    ctx.beginPath();
    ctx.moveTo(b.x + b.w * 0.5, b.y);
    ctx.lineTo(b.x + b.w * 0.9, b.y + b.h);
    ctx.lineTo(b.x + b.w * 0.1, b.y + b.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffe8a1";
    ctx.fillRect(b.x + b.w * 0.3, b.y + b.h * 0.45, b.w * 0.4, b.h * 0.13);
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.86, b.w * 0.6, b.h * 0.14);
    if (fx > 0.55) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.14 + glow * 0.2})`;
      ctx.fillRect(b.x + b.w * 0.44, b.y + b.h * 0.18, b.w * 0.12, b.h * 0.22);
    }
    if (isRealistic) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.5, b.y);
      ctx.lineTo(b.x + b.w * 0.78, b.y + b.h);
      ctx.lineTo(b.x + b.w * 0.9, b.y + b.h);
      ctx.closePath();
      ctx.fill();
    }
    if (isCartoony || isNeon) {
      ctx.strokeStyle = isNeon ? "#00f5ff" : "#202020";
      ctx.lineWidth = Math.max(1.4, b.w * 0.038);
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.5, b.y);
      ctx.lineTo(b.x + b.w * 0.9, b.y + b.h);
      ctx.lineTo(b.x + b.w * 0.1, b.y + b.h);
      ctx.closePath();
      ctx.stroke();
    }
  }

  function drawCoin(c) {
    const isRealistic = selectedStyle === "realistic";
    const isCartoony = selectedStyle === "cartoony";
    const isNeon = selectedStyle === "neon";
    const b = coinScreenBox(c);
    const r = b.w / 2;
    if (isRealistic) {
      const grad = ctx.createRadialGradient(b.x + r * 0.65, b.y + r * 0.6, r * 0.15, b.x + r, b.y + r, r);
      grad.addColorStop(0, "#fff0b3");
      grad.addColorStop(1, "#d48a00");
      ctx.beginPath();
      ctx.arc(b.x + r, b.y + r, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "#8c5a00";
      ctx.lineWidth = Math.max(1, r * 0.25);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath();
      ctx.arc(b.x + r, b.y + r, r * 0.62, 0.3, Math.PI + 0.2);
      ctx.stroke();
      return;
    }

    if (isCartoony) {
      ctx.beginPath();
      ctx.arc(b.x + r, b.y + r, r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd166";
      ctx.fill();
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = Math.max(1.4, r * 0.2);
      ctx.stroke();
      ctx.fillStyle = "#fff5d1";
      ctx.fillRect(b.x + r * 0.84, b.y + r * 0.36, r * 0.22, r * 0.22);
      return;
    }

    ctx.beginPath();
    ctx.arc(b.x + r, b.y + r, r, 0, Math.PI * 2);
    ctx.fillStyle = isNeon ? "#21ffd4" : "#ffd166";
    ctx.fill();
    ctx.strokeStyle = isNeon ? "#ff00dd" : "#fca311";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawPlayer() {
    const visual = activeVisual || getVisualProfile();
    const box = playerBox();
    const styleMotion = selectedStyle === "cartoony"
      ? { cadence: 0.028, stride: 7.8, arm: 6.8, bob: 1.15, hop: 0.25, duckLean: 0.13, torsoBend: 0.026 }
      : selectedStyle === "realistic"
        ? { cadence: 0.025, stride: 7.2, arm: 6.2, bob: 0.95, hop: 0.12, duckLean: 0.12, torsoBend: 0.022 }
        : selectedStyle === "neon"
          ? { cadence: 0.026, stride: 7.5, arm: 6.5, bob: 1.05, hop: 0.16, duckLean: 0.12, torsoBend: 0.023 }
          : { cadence: 0.0255, stride: 7.4, arm: 6.4, bob: 1, hop: 0.14, duckLean: 0.12, torsoBend: 0.022 };

    const phase = state.time * (state.speed * styleMotion.cadence);
    const leftStride = Math.sin(phase);
    const rightStride = Math.sin(phase + Math.PI);
    const jumpLift = Math.max(0, Math.min(1, (state.baseY - state.y) / 88));
    const duckBlend = state.sliding ? 1 : 0;
    const cartoonyBoost = selectedStyle === "cartoony" ? 0.08 : 0;
    const bounce = Math.sin(phase * 2) * styleMotion.bob + Math.sin(phase * 4) * (styleMotion.hop * 0.2);

    const hipX = box.x + box.w * 0.5;
    const hipY = box.y + box.h * 0.62 + bounce * 0.12 + duckBlend * 7 - jumpLift * 9;
    const shoulderY = box.y + box.h * 0.28 + bounce * 0.14 + duckBlend * 6 - jumpLift * 10;
    // Character profiles intentionally vary palette/details while keeping one shared rig.
    const profile = selectedRunner === "businessman"
      ? { outfit: "#1d3557", outfitSlide: "#14213d", skin: "#edc4a0", hair: "#1b263b", arm: "#edc4a0", accent: "#e63946" }
      : selectedRunner === "joker"
        ? { outfit: "#5a189a", outfitSlide: "#7b2cbf", skin: "#d8ffd8", hair: "#2dc653", arm: "#d8ffd8", accent: "#ffd166" }
        : selectedRunner === "mechanic"
          ? { outfit: "#264653", outfitSlide: "#1f3b4d", skin: "#d7a680", hair: "#3d405b", arm: "#d7a680", accent: "#f4a261" }
          : { outfit: "#4cc9f0", outfitSlide: "#0fa3b1", skin: "#f1c27d", hair: "#0b132b", arm: "#f4a261", accent: "#90e0ef" };

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(hipX, state.baseY + 7, box.w * (0.43 - jumpLift * 0.1), 7 - jumpLift * 2, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!state.sliding && visual.playerTrail && selectedStyle !== "realistic") {
      const trailAlpha = 0.04 + Math.abs(Math.sin(phase)) * 0.025;
      ctx.fillStyle = `rgba(255, 255, 255, ${trailAlpha})`;
      ctx.fillRect(box.x + 6, box.y + box.h * 0.28, box.w - 12, 4);
    }

    const legUpper = 16 + duckBlend * 1.5 + cartoonyBoost;
    const legLower = 16 + duckBlend * 2.2 + cartoonyBoost * 0.6;
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 4.6 + cartoonyBoost * 0.5;
    ctx.lineCap = "round";
    for (const leg of [{ side: -1, stride: leftStride }, { side: 1, stride: rightStride }]) {
      const stepForward = Math.max(0, leg.stride);
      const stepBack = Math.max(0, -leg.stride);
      const hipJointX = hipX + leg.side * 2;
      const kneeX = hipJointX + leg.side * 1.5 + leg.stride * (styleMotion.stride * 0.22 + jumpLift * 0.8);
      const kneeY = hipY + legUpper - stepForward * (4.2 + cartoonyBoost * 0.5) + stepBack * 1.6 - jumpLift * 6;
      const footX = hipJointX + leg.side * 1.8 + leg.stride * (styleMotion.stride * 0.28 + duckBlend * 0.6);
      const footY = kneeY + legLower - stepForward * (5.5 + cartoonyBoost) + stepBack * 3.2 - jumpLift * 8 + duckBlend * 3.4;
      ctx.beginPath();
      ctx.moveTo(hipJointX, hipY);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
      ctx.fillStyle = "#111827";
      ctx.fillRect(footX - (4 + cartoonyBoost), footY - 1, 8 + cartoonyBoost * 2, 4 + cartoonyBoost * 0.4);
    }

    const torsoTopY = box.y + 12 + bounce * 0.02 + duckBlend * 4 - jumpLift * 8;
    const torsoHeight = box.h * (0.5 - duckBlend * 0.15);
    const torsoWidth = (box.w - 18) * (1 + cartoonyBoost * 0.02);
    const torsoLean = leftStride * styleMotion.torsoBend * 0.35 + duckBlend * styleMotion.duckLean - jumpLift * 0.015;

    // Slightly larger hip/pelvis mass for a fuller lower-body silhouette.
    ctx.fillStyle = state.sliding ? profile.outfitSlide : profile.outfit;
    ctx.beginPath();
    ctx.ellipse(hipX, hipY - 1, torsoWidth * 0.34, 5.5 + duckBlend * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(hipX, torsoTopY + torsoHeight * 0.5);
    ctx.rotate(torsoLean);
    ctx.fillStyle = state.sliding ? profile.outfitSlide : profile.outfit;
    // Rounded torso silhouette to keep the character human-like instead of boxy.
    const shoulderW = torsoWidth * 0.46;
    const waistW = torsoWidth * 0.34;
    const topY = -torsoHeight * 0.48;
    const midY = -torsoHeight * 0.08;
    const botY = torsoHeight * 0.44;
    ctx.beginPath();
    ctx.moveTo(-shoulderW, topY + 4);
    ctx.quadraticCurveTo(0, topY - 6, shoulderW, topY + 4);
    ctx.quadraticCurveTo(waistW + 3, midY, waistW, botY - 2);
    ctx.quadraticCurveTo(0, botY + 6, -waistW, botY - 2);
    ctx.quadraticCurveTo(-(waistW + 3), midY, -shoulderW, topY + 4);
    ctx.closePath();
    ctx.fill();

    // Shoulders and neck add natural upper-body volume.
    ctx.fillStyle = state.sliding ? profile.outfitSlide : profile.outfit;
    ctx.beginPath();
    ctx.ellipse(-shoulderW * 0.74, topY + 6, torsoWidth * 0.11, torsoHeight * 0.11, 0, 0, Math.PI * 2);
    ctx.ellipse(shoulderW * 0.74, topY + 6, torsoWidth * 0.11, torsoHeight * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = profile.skin;
    ctx.beginPath();
    ctx.ellipse(0, topY - 2, torsoWidth * 0.11, torsoHeight * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    if (selectedRunner === "businessman") {
      ctx.fillStyle = profile.accent;
      ctx.fillRect(-2, -(torsoHeight * 0.4), 4, torsoHeight * 0.62);
    } else if (selectedRunner === "mechanic") {
      ctx.fillStyle = profile.accent;
      ctx.fillRect(-(torsoWidth * 0.36), -(torsoHeight * 0.06), torsoWidth * 0.72, 4);
    } else if (selectedRunner === "joker") {
      ctx.fillStyle = profile.accent;
      ctx.fillRect(-(torsoWidth * 0.36), -(torsoHeight * 0.24), torsoWidth * 0.72, 5);
    }
    ctx.restore();

    const armUpper = 11 + cartoonyBoost * 0.4;
    const armLower = 11 + cartoonyBoost * 0.3;
    ctx.strokeStyle = profile.arm;
    ctx.lineWidth = 3.7 + cartoonyBoost * 0.4;
    for (const arm of [{ side: -1, stride: rightStride }, { side: 1, stride: leftStride }]) {
      const armForward = Math.max(0, arm.stride);
      const armBack = Math.max(0, -arm.stride);
      const shoulderX = hipX + arm.side * 8;
      const elbowX = shoulderX + arm.stride * (styleMotion.arm * 0.3);
      const elbowY = shoulderY + armUpper + armBack * (1.1 + cartoonyBoost * 0.2) + armForward * 0.3 - jumpLift * 3;
      const handX = elbowX + arm.stride * (styleMotion.arm * 0.24) + arm.side * duckBlend * 1.2;
      const handY = elbowY + armLower + armBack * 1.6 - armForward * 1.2 - jumpLift * (6 + cartoonyBoost) + duckBlend * 2.6;
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(handX, handY);
      ctx.stroke();
    }

    const headY = box.y + 6 + bounce * 0.04 - jumpLift * 8 + duckBlend * 4;
    const headR = 9 + cartoonyBoost * 0.1;
    ctx.fillStyle = profile.skin;
    ctx.beginPath();
    ctx.arc(hipX, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.fillRect(hipX - 4, headY - 1, 2, 2);
    ctx.fillRect(hipX + 2, headY - 1, 2, 2);
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(hipX - 2, headY + 4, 4, 1.5);
    ctx.fillStyle = profile.hair;
    if (selectedRunner === "mechanic") {
      ctx.fillRect(hipX - 9, headY - 9, 18, 5);
      ctx.fillStyle = "#457b9d";
      ctx.fillRect(hipX - 7, headY - 13, 14, 4);
    } else if (selectedRunner === "joker") {
      ctx.fillRect(hipX - 8, headY - 9, 16, 3);
      ctx.fillRect(hipX - 5, headY - 14, 10, 5);
    } else if (selectedRunner === "businessman") {
      ctx.fillRect(hipX - 8, headY - 9, 16, 5);
    } else {
      ctx.fillRect(hipX - 8, headY - 8, 16, 4);
    }
  }

  function drawSkyline() {
    const visual = activeVisual || getVisualProfile();
    const fx = activeFx;
    const isRealistic = selectedStyle === "realistic";
    const isCartoony = selectedStyle === "cartoony";
    const isNeon = selectedStyle === "neon";
    const sky = selectedBackground === "beach"
      ? { top: "#87ceeb", bottom: "#f4d58d", building: "#c97b63" }
      : selectedBackground === "airport"
        ? { top: "#adb5bd", bottom: "#6c757d", building: "#495057" }
        : selectedBackground === "waterway"
          ? { top: "#3a86ff", bottom: "#023e8a", building: "#0077b6" }
          : { top: "#2a3d66", bottom: "#13233f", building: "#27496d" };
    if (isCartoony) {
      ctx.fillStyle = sky.top;
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, H * 0.42);
      grad.addColorStop(0, sky.top);
      grad.addColorStop(1, sky.bottom);
      ctx.fillStyle = grad;
    }
    ctx.fillRect(0, 0, W, H * 0.42);

    if (isNeon) {
      const neon = ctx.createLinearGradient(0, 0, W, H * 0.42);
      neon.addColorStop(0, "rgba(0, 245, 255, 0.26)");
      neon.addColorStop(0.5, "rgba(255, 0, 170, 0.2)");
      neon.addColorStop(1, "rgba(255, 255, 0, 0.16)");
      ctx.fillStyle = neon;
      ctx.fillRect(0, 0, W, H * 0.42);
    }

    if (fx > 0.55) {
      const haze = ctx.createLinearGradient(0, H * 0.24, 0, H * 0.42);
      haze.addColorStop(0, "rgba(255, 255, 255, 0)");
      haze.addColorStop(1, "rgba(255, 255, 255, 0.1)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, H * 0.24, W, H * 0.18);
    }

    const farShift = (state.time * 18 * visual.skylineSpeed) % 86;
    ctx.fillStyle = selectedBackground === "airport" ? "#3a454d" : selectedBackground === "waterway" ? "#065f86" : "#1d3557";
    for (let i = -1; i < 13; i += 1) {
      const bw = 60 + ((i * 19) % 42);
      const bh = 28 + ((i * 13) % 42);
      const x = i * 86 - farShift;
      ctx.fillRect(x, H * 0.42 - bh, bw, bh);
      if (isRealistic) {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x + 2, H * 0.42 - bh + 2, Math.max(1, bw * 0.14), bh - 4);
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(x + bw * 0.82, H * 0.42 - bh, bw * 0.18, bh);
        ctx.fillStyle = selectedBackground === "airport" ? "#3a454d" : selectedBackground === "waterway" ? "#065f86" : "#1d3557";
      }
      if (isCartoony) {
        ctx.strokeStyle = "#1f1f1f";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, H * 0.42 - bh, bw, bh);
      }
    }

    const nearShift = (state.time * 34 * visual.skylineSpeed) % 86;
    ctx.fillStyle = sky.building;
    for (let i = 0; i < 12; i += 1) {
      const bw = 36 + ((i * 17) % 58);
      const bh = 70 + ((i * 31) % 120);
      const x = i * 86 - nearShift;
      ctx.fillRect(x, H * 0.42 - bh, bw, bh);
      if (isRealistic) {
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(x + 3, H * 0.42 - bh + 3, Math.max(1, bw * 0.16), bh - 8);
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(x + bw * 0.84, H * 0.42 - bh, bw * 0.16, bh);
        ctx.fillStyle = sky.building;
      }
      if (isCartoony) {
        ctx.strokeStyle = "#1f1f1f";
        ctx.lineWidth = 2.2;
        ctx.strokeRect(x, H * 0.42 - bh, bw, bh);
      }
      if (isNeon) {
        const flash = 0.14 + Math.abs(Math.sin(state.time * 7 + i * 0.7)) * 0.28;
        ctx.fillStyle = `rgba(0,255,255,${flash})`;
        ctx.fillRect(x + bw * 0.18, H * 0.42 - bh + bh * 0.2, bw * 0.12, bh * 0.55);
        ctx.fillStyle = `rgba(255,0,170,${flash * 0.7})`;
        ctx.fillRect(x + bw * 0.58, H * 0.42 - bh + bh * 0.28, bw * 0.12, bh * 0.48);
        ctx.fillStyle = sky.building;
      }
    }
    if (selectedBackground === "beach") {
      const sunPulse = 0.58 + Math.sin(state.time * 1.3) * 0.08;
      const sun = ctx.createRadialGradient(W * 0.82, H * 0.16, 10, W * 0.82, H * 0.16, 64);
      sun.addColorStop(0, `rgba(255, 248, 200, ${sunPulse})`);
      sun.addColorStop(1, "rgba(255, 230, 170, 0)");
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(W * 0.82, H * 0.16, 64, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.beginPath();
      ctx.arc(W * 0.82, H * 0.16, 34, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
      const cloudCount = Math.max(2, Math.floor(4 * fx));
      for (let i = 0; i < cloudCount; i += 1) {
        const cx = (i * 230 - state.time * 20) % (W + 120) - 60;
        const cy = H * (0.1 + (i % 2) * 0.05);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 28, 9, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 18, cy + 2, 22, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (selectedBackground === "waterway") {
      ctx.strokeStyle = "rgba(173, 216, 230, 0.55)";
      ctx.lineWidth = 2;
      const waveCount = Math.max(3, Math.floor(6 * fx));
      for (let i = 0; i < waveCount; i += 1) {
        const y = H * 0.28 + i * 12;
        const waveOffset = Math.sin(state.time * 2.2 + i) * 7;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(W * 0.5, y + 6 + waveOffset, W, y);
        ctx.stroke();
      }
    } else if (selectedBackground === "airport") {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 2;
      const planeX = (state.time * 120) % (W + 140) - 70;
      const planeY = H * 0.12 + Math.sin(state.time * 1.5) * 6;
      ctx.beginPath();
      ctx.moveTo(planeX, planeY);
      ctx.lineTo(planeX + 20, planeY + 3);
      ctx.lineTo(planeX + 8, planeY + 7);
      ctx.lineTo(planeX + 6, planeY + 3);
      ctx.lineTo(planeX, planeY);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
      const starCount = Math.max(8, Math.floor(22 * fx));
      for (let i = 0; i < starCount; i += 1) {
        const sx = (i * 51) % W;
        const sy = (i * 37 + state.time * 6) % (H * 0.26);
        const tw = (i % 3) + 1;
        ctx.fillRect(sx, sy, tw, tw);
      }
    }

    if (isNeon) {
      const scan = 0.09 + Math.abs(Math.sin(state.time * 9)) * 0.08;
      ctx.fillStyle = `rgba(0, 255, 255, ${scan})`;
      for (let i = 0; i < 7; i += 1) {
        const y = ((i * 48 + state.time * 140) % (H * 0.42 + 30)) - 15;
        ctx.fillRect(0, y, W, 2);
      }
    }
  }

  function render() {
    activeVisual = getVisualProfile();
    activeFx = getEffectQuality();
    ctx.clearRect(0, 0, W, H);
    drawSkyline();
    drawRoad();

    const all = [...state.obstacles.map((o) => ({ kind: "obs", z: o.z, o })), ...state.coinRows.map((c) => ({ kind: "coin", z: c.z, c }))]
      .sort((a, b) => a.z - b.z);

    for (const item of all) {
      if (item.kind === "obs") drawObstacle(item.o);
      else drawCoin(item.c);
    }

    drawPlayer();

    if (selectedStyle === "neon") {
      const glow = 0.08 + Math.sin(state.time * 2.4) * 0.03;
      ctx.fillStyle = `rgba(0, 255, 255, ${Math.max(0.03, glow)})`;
      ctx.fillRect(0, H * 0.4, W, H * 0.18);
    }

    if (!state.running && state.gameOverStyle) {
      const t = Math.min(1, state.cinematicTimer / state.cinematicDuration);
      if (state.gameOverStyle === "win") {
        const pulse = 0.35 + 0.25 * Math.sin(state.cinematicTimer * 18);
        const grad = ctx.createRadialGradient(W * 0.5, H * 0.45, 20, W * 0.5, H * 0.45, W * 0.75);
        grad.addColorStop(0, `rgba(255, 225, 120, ${0.22 + pulse * (1 - t)})`);
        grad.addColorStop(1, "rgba(255, 180, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = `rgba(255, 245, 200, ${0.14 * (1 - t)})`;
        for (let i = 0; i < 9; i += 1) {
          const y = (i * 58 + state.cinematicTimer * 220) % (H + 40) - 20;
          ctx.fillRect(0, y, W, 6);
        }
      } else {
        const vignette = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.15, W * 0.5, H * 0.5, W * 0.85);
        vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
        vignette.addColorStop(1, `rgba(0, 0, 0, ${0.45 + 0.3 * (1 - t)})`);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, W, H);

        const flash = 0.18 + Math.max(0, Math.sin(state.cinematicTimer * 16)) * 0.22;
        ctx.fillStyle = `rgba(200, 24, 24, ${flash * (1 - t * 0.8)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  function gameOver() {
    state.running = false;
    const finalScore = Math.floor(state.score);
    const previousBest = getBestRecord();
    const isNewRecord = finalScore > previousBest.high_score;

    if (!isNewRecord && remoteSyncOk) {
      // Keep synced value fresh across browsers even when no new record was set.
      fetchRemoteHighScore();
    }

    finalScoreEl.textContent = finalScore;
    finalCoinsEl.textContent = state.coins;
    finalHighScoreEl.textContent = isNewRecord ? finalScore : previousBest.high_score;
    finalHighScoreUserEl.textContent = isNewRecord ? "Pending..." : previousBest.high_score_user;

    if (isNewRecord) {
      pendingHighScore = { high_score: finalScore, high_score_user: "-" };
      state.gameOverStyle = "win";
      newRecordBox.classList.remove("hidden");
      nameInput.value = "";
      setTimeout(() => nameInput.focus(), 0);
    } else {
      pendingHighScore = null;
      state.gameOverStyle = "loss";
      newRecordBox.classList.add("hidden");
    }
    state.cinematicTimer = 0;
    state.cinematicDuration = 1.65;
    // Overlay class controls the CSS cinematic treatment; canvas effect runs in render().
    overlay.classList.remove("cinematic-win", "cinematic-loss");
    overlay.classList.add(state.gameOverStyle === "win" ? "cinematic-win" : "cinematic-loss");

    overlay.classList.remove("hidden");
    setSettingsUiVisible(true);
    updateHud();
  }

  function savePendingHighScore() {
    if (!pendingHighScore) return;
    const username = (nameInput.value || "").trim() || "Anonymous";
    const recordToSave = {
      high_score: pendingHighScore.high_score,
      high_score_user: username,
    };
    setLocalRecord(recordToSave);
    pushRemoteHighScore(recordToSave);
    finalHighScoreUserEl.textContent = username;
    pendingHighScore = null;
    newRecordBox.classList.add("hidden");
    updateHud();
  }

  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.033, (t - last) / 1000);
    last = t;
    update(dt);
    if (!state.running && state.gameOverStyle) {
      state.cinematicTimer = Math.min(state.cinematicDuration, state.cinematicTimer + dt);
    }
    render();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", input);
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchend", onTouchEnd, { passive: true });
  restartBtn.addEventListener("click", () => {
    if (pendingHighScore) savePendingHighScore();
    reset();
  });
  saveNameBtn.addEventListener("click", savePendingHighScore);
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") savePendingHighScore();
  });
  settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.toggle("hidden");
    if (!settingsPanel.classList.contains("hidden")) positionSettingsPanel();
  });
  runnerBtn.addEventListener("click", () => {
    settingsPanel.classList.remove("hidden");
    positionSettingsPanel();
    if (runnerSelect) runnerSelect.focus();
  });
  screenBtn.addEventListener("click", () => {
    settingsPanel.classList.remove("hidden");
    positionSettingsPanel();
    if (renderModeSelect) renderModeSelect.focus();
  });
  bgBtn.addEventListener("click", () => {
    settingsPanel.classList.remove("hidden");
    positionSettingsPanel();
    if (bgSelect) bgSelect.focus();
  });
  styleBtn.addEventListener("click", () => {
    settingsPanel.classList.remove("hidden");
    positionSettingsPanel();
    if (styleSelect) styleSelect.focus();
  });
  closeSettingsBtn.addEventListener("click", () => {
    settingsPanel.classList.add("hidden");
  });
  orientationSelect.addEventListener("change", (e) => {
    applyOrientationSetting(e.target.value);
  });
  runnerSelect.addEventListener("change", (e) => {
    applyRunnerSetting(e.target.value);
  });
  renderModeSelect.addEventListener("change", (e) => {
    applyRenderModeSetting(e.target.value);
  });
  bgSelect.addEventListener("change", (e) => {
    applyBackgroundSetting(e.target.value);
  });
  styleSelect.addEventListener("change", (e) => {
    applyStyleSetting(e.target.value);
  });
  window.addEventListener("resize", () => {
    if (selectedRenderMode === "fullscreen") {
      applyRenderModeSetting("fullscreen", false);
    }
    positionSettingsPanel();
  });

  applyRenderModeSetting(getRenderModeSetting(), false);
  reset();
  maybeShowHelpOnce();
  applyOrientationSetting(getOrientationSetting());
  applyRunnerSetting(getRunnerSetting());
  applyBackgroundSetting(getBackgroundSetting());
  applyStyleSetting(getStyleSetting());
  setSyncStatus(false, "Checking...");
  fetchRemoteHighScore();
  requestAnimationFrame(frame);
})();
