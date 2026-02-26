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
  const settingsPanel = document.getElementById("settingsPanel");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const orientationSelect = document.getElementById("orientationSelect");
  const runnerSelect = document.getElementById("runnerSelect");
  const renderModeSelect = document.getElementById("renderModeSelect");
  const bgSelect = document.getElementById("bgSelect");

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
  const REMOTE_API_URL = "/api/highscore";
  const isHttpMode = window.location.protocol.startsWith("http");
  let remoteRecord = { high_score: 0, high_score_user: "-" };
  let pendingHighScore = null;
  let remoteSyncOk = false;
  let selectedRunner = "jogger";
  let selectedRenderMode = "fixed";
  let selectedBackground = "normal";
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
    const scheme = selectedBackground === "beach"
      ? { ground: "#d9b57a", road: "#8d99ae", lane: "#f8f9fa", stripe: "#fff3b0" }
      : selectedBackground === "airport"
        ? { ground: "#7f8c8d", road: "#495057", lane: "#ced4da", stripe: "#ffd43b" }
        : selectedBackground === "waterway"
          ? { ground: "#0b4f6c", road: "#274c77", lane: "#9bd1ff", stripe: "#caf0f8" }
          : { ground: "#13233f", road: "#0e1a30", lane: "#7d8597", stripe: "#f4f4f4" };
    ctx.fillStyle = scheme.ground;
    ctx.fillRect(0, H * 0.38, W, H * 0.62);

    ctx.fillStyle = scheme.road;
    ctx.beginPath();
    ctx.moveTo(W * 0.18, H);
    ctx.lineTo(W * 0.82, H);
    ctx.lineTo(W * 0.62, H * 0.42);
    ctx.lineTo(W * 0.38, H * 0.42);
    ctx.closePath();
    ctx.fill();

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

    ctx.strokeStyle = scheme.lane;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H);
    ctx.lineTo(W * 0.5, H * 0.42);
    ctx.moveTo(W * 0.35, H);
    ctx.lineTo(W * 0.43, H * 0.42);
    ctx.moveTo(W * 0.65, H);
    ctx.lineTo(W * 0.57, H * 0.42);
    ctx.stroke();

    ctx.fillStyle = scheme.stripe;
    for (let i = 0; i < 20; i += 1) {
      const y = (state.roadTick * 0.55 + i * 50) % (H + 50);
      const p = y / H;
      const x1 = W * 0.5 - 2 - p * 8;
      const x2 = W * 0.5 + 2 + p * 8;
      const yy = H - y;
      ctx.fillRect(x1, yy, x2 - x1, 14 * (1 - p * 0.6));
    }
    ctx.restore();
  }

  function lanePerspectiveX(x, z) {
    const p = 0.22 + depthProgress(z) * 0.78;
    const center = W * 0.5;
    return center + (x - center) * p;
  }

  function drawObstacle(o) {
    const b = obstacleScreenBox(o);

    if (o.type === "train") {
      ctx.fillStyle = "#d62828";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#f77f00";
      ctx.fillRect(b.x, b.y, b.w, b.h * 0.14);
      ctx.fillStyle = "#90e0ef";
      const winW = b.w * 0.2;
      const winGap = b.w * 0.08;
      const wy = b.y + b.h * 0.26;
      for (let i = 0; i < 3; i += 1) {
        ctx.fillRect(b.x + winGap + i * (winW + winGap), wy, winW, b.h * 0.22);
      }
      ctx.fillStyle = "#2b2d42";
      ctx.fillRect(b.x, b.y + b.h * 0.88, b.w, b.h * 0.12);
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
      return;
    }

    if (o.type === "lowbar") {
      ctx.fillStyle = "#6c757d";
      ctx.fillRect(b.x, b.y + b.h * 0.35, b.w, b.h * 0.2);
      ctx.fillRect(b.x + b.w * 0.08, b.y + b.h * 0.15, b.w * 0.12, b.h * 0.55);
      ctx.fillRect(b.x + b.w * 0.8, b.y + b.h * 0.15, b.w * 0.12, b.h * 0.55);
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
  }

  function drawCoin(c) {
    const b = coinScreenBox(c);
    const r = b.w / 2;
    ctx.beginPath();
    ctx.arc(b.x + r, b.y + r, r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd166";
    ctx.fill();
    ctx.strokeStyle = "#fca311";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawPlayer() {
    const box = playerBox();
    const runningPhase = state.time * (state.speed * 0.02);
    const swing = Math.sin(runningPhase) * (state.sliding ? 0.15 : 0.55);
    const bob = state.sliding ? 2 : Math.sin(runningPhase * 2) * 3;

    const hipX = box.x + box.w * 0.5;
    const hipY = box.y + box.h * 0.62 + bob;
    const shoulderY = box.y + box.h * 0.28 + bob;
    // Character profiles intentionally vary palette/details while keeping one shared rig.
    const profile = selectedRunner === "businessman"
      ? { outfit: "#1d3557", outfitSlide: "#14213d", skin: "#edc4a0", hair: "#1b263b", arm: "#edc4a0", accent: "#e63946" }
      : selectedRunner === "joker"
        ? { outfit: "#5a189a", outfitSlide: "#7b2cbf", skin: "#d8ffd8", hair: "#2dc653", arm: "#d8ffd8", accent: "#ffd166" }
        : selectedRunner === "mechanic"
          ? { outfit: "#264653", outfitSlide: "#1f3b4d", skin: "#d7a680", hair: "#3d405b", arm: "#d7a680", accent: "#f4a261" }
          : { outfit: "#4cc9f0", outfitSlide: "#0fa3b1", skin: "#f1c27d", hair: "#0b132b", arm: "#f4a261", accent: "#90e0ef" };

    // legs
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(hipX - 12 * swing, hipY + 20);
    ctx.lineTo(hipX - 15 * swing, hipY + 38);
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(hipX + 12 * swing, hipY + 20);
    ctx.lineTo(hipX + 15 * swing, hipY + 38);
    ctx.stroke();

    // body
    ctx.fillStyle = state.sliding ? profile.outfitSlide : profile.outfit;
    ctx.fillRect(box.x + 10, box.y + 12 + bob, box.w - 20, box.h * 0.48);
    if (selectedRunner === "businessman") {
      ctx.fillStyle = profile.accent;
      ctx.fillRect(hipX - 2, box.y + 16 + bob, 4, box.h * 0.28);
    } else if (selectedRunner === "mechanic") {
      ctx.fillStyle = profile.accent;
      ctx.fillRect(box.x + 12, box.y + 22 + bob, box.w - 24, 4);
    } else if (selectedRunner === "joker") {
      ctx.fillStyle = profile.accent;
      ctx.fillRect(box.x + 12, box.y + 18 + bob, box.w - 24, 5);
    }

    // arms
    const shoulderX = hipX;
    ctx.strokeStyle = profile.arm;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(shoulderX - 8, shoulderY);
    ctx.lineTo(shoulderX - 18 * swing, shoulderY + 12);
    ctx.moveTo(shoulderX + 8, shoulderY);
    ctx.lineTo(shoulderX + 18 * swing, shoulderY + 12);
    ctx.stroke();

    // head
    ctx.fillStyle = profile.skin;
    ctx.beginPath();
    ctx.arc(hipX, box.y + 6 + bob, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = profile.hair;
    if (selectedRunner === "mechanic") {
      ctx.fillRect(hipX - 9, box.y - 3 + bob, 18, 5);
      ctx.fillStyle = "#457b9d";
      ctx.fillRect(hipX - 7, box.y - 7 + bob, 14, 4);
    } else if (selectedRunner === "joker") {
      ctx.fillRect(hipX - 8, box.y - 3 + bob, 16, 3);
      ctx.fillRect(hipX - 5, box.y - 8 + bob, 10, 5);
    } else if (selectedRunner === "businessman") {
      ctx.fillRect(hipX - 8, box.y - 3 + bob, 16, 5);
    } else {
      ctx.fillRect(hipX - 8, box.y - 2 + bob, 16, 4);
    }
  }

  function drawSkyline() {
    const sky = selectedBackground === "beach"
      ? { top: "#87ceeb", bottom: "#f4d58d", building: "#c97b63" }
      : selectedBackground === "airport"
        ? { top: "#adb5bd", bottom: "#6c757d", building: "#495057" }
        : selectedBackground === "waterway"
          ? { top: "#3a86ff", bottom: "#023e8a", building: "#0077b6" }
          : { top: "#2a3d66", bottom: "#13233f", building: "#27496d" };
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.42);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(1, sky.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.42);

    ctx.fillStyle = sky.building;
    for (let i = 0; i < 12; i += 1) {
      const bw = 36 + ((i * 17) % 58);
      const bh = 70 + ((i * 31) % 120);
      const x = i * 86;
      ctx.fillRect(x, H * 0.42 - bh, bw, bh);
    }
    if (selectedBackground === "beach") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.beginPath();
      ctx.arc(W * 0.82, H * 0.16, 34, 0, Math.PI * 2);
      ctx.fill();
    } else if (selectedBackground === "waterway") {
      ctx.strokeStyle = "rgba(173, 216, 230, 0.55)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i += 1) {
        const y = H * 0.28 + i * 12;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(W * 0.5, y + 6, W, y);
        ctx.stroke();
      }
    }
  }

  function render() {
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
  setSyncStatus(false, "Checking...");
  fetchRemoteHighScore();
  requestAnimationFrame(frame);
})();
