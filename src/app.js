(function startApp() {
  "use strict";

  const Core = window.RivalEverythingCore;
  const {
    AXES,
    DILEMMAS,
    MAP,
    METERS,
    buildEndingText,
    clamp,
    createInitialState,
    resolveDilemma,
  } = Core;

  const creator = document.querySelector("#creator");
  const game = document.querySelector("#game");
  const axisControls = document.querySelector("#axisControls");
  const playerTitle = document.querySelector("#playerTitle");
  const rivalTitle = document.querySelector("#rivalTitle");
  const playerProfileText = document.querySelector("#playerProfileText");
  const rivalProfileText = document.querySelector("#rivalProfileText");
  const startButton = document.querySelector("#startButton");
  const resetButton = document.querySelector("#resetButton");
  const canvas = document.querySelector("#worldCanvas");
  const ctx = canvas.getContext("2d");
  const nearPrompt = document.querySelector("#nearPrompt");
  const interactButton = document.querySelector("#interactButton");
  const meterList = document.querySelector("#meterList");
  const worldVerdict = document.querySelector("#worldVerdict");
  const regionName = document.querySelector("#regionName");
  const regionStatus = document.querySelector("#regionStatus");
  const rivalCount = document.querySelector("#rivalCount");
  const rivalLog = document.querySelector("#rivalLog");
  const choiceOverlay = document.querySelector("#choiceOverlay");
  const choiceRegion = document.querySelector("#choiceRegion");
  const choiceTitle = document.querySelector("#choiceTitle");
  const choicePrompt = document.querySelector("#choicePrompt");
  const choiceOptions = document.querySelector("#choiceOptions");
  const closeChoiceButton = document.querySelector("#closeChoiceButton");
  const endingOverlay = document.querySelector("#endingOverlay");
  const endingCopy = document.querySelector("#endingCopy");
  const integrationChoices = document.querySelector("#integrationChoices");
  const finalText = document.querySelector("#finalText");
  const restartFromEndingButton = document.querySelector("#restartFromEndingButton");

  const selections = {};
  const keyState = new Set();
  const heldDirections = new Set();
  const starSeeds = Array.from({ length: 42 }, (_, index) => ({
    x: (index * 181 + 97) % MAP.width,
    y: (index * 113 + 53) % MAP.height,
    r: 1.6 + (index % 4) * 0.8,
    phase: index * 0.61,
  }));
  const grassSeeds = Array.from({ length: 76 }, (_, index) => ({
    x: 142 + ((index * 73) % 740),
    y: 118 + ((index * 47) % 480),
    size: 5 + (index % 5),
    lean: (index % 3) - 1,
  }));
  let state = null;
  let nearestDilemma = null;
  let targetPoint = null;
  let impactFlash = null;
  let lastTime = performance.now();
  let canvasMetrics = {
    width: MAP.width,
    height: MAP.height,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };

  AXES.forEach((axis) => {
    selections[axis.key] = "left";
  });

  buildCreator();
  updateCreatorPreview();
  buildMeters();

  startButton.addEventListener("click", startGame);
  resetButton.addEventListener("click", restart);
  interactButton.addEventListener("click", interact);
  closeChoiceButton.addEventListener("click", closeChoice);
  restartFromEndingButton.addEventListener("click", restart);
  window.addEventListener("resize", resizeCanvas);

  canvas.addEventListener("pointerdown", (event) => {
    if (!state || !choiceOverlay.classList.contains("is-hidden")) return;
    const point = screenToWorld(event);
    targetPoint = point;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state || !canvas.hasPointerCapture(event.pointerId)) return;
    targetPoint = screenToWorld(event);
  });

  canvas.addEventListener("pointerup", (event) => {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "enter", " "].includes(key)) {
      event.preventDefault();
    }
    keyState.add(key);
    if ((key === "enter" || key === " ") && state) interact();
  });

  document.addEventListener("keyup", (event) => {
    keyState.delete(event.key.toLowerCase());
  });

  document.querySelectorAll(".move-button").forEach((button) => {
    const direction = button.dataset.dir;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      heldDirections.add(direction);
      targetPoint = null;
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener("pointerup", (event) => {
      heldDirections.delete(direction);
      if (button.hasPointerCapture(event.pointerId)) {
        button.releasePointerCapture(event.pointerId);
      }
    });
    button.addEventListener("pointercancel", () => {
      heldDirections.delete(direction);
    });
    button.addEventListener("pointerleave", () => {
      heldDirections.delete(direction);
    });
  });

  requestAnimationFrame(tick);

  function buildCreator() {
    axisControls.innerHTML = "";
    AXES.forEach((axis) => {
      const card = document.createElement("article");
      card.className = "axis-card";
      card.innerHTML = `
        <header>
          <h2>${axis.name}</h2>
          <p>${axis.left.label} / ${axis.right.label}</p>
        </header>
        <div class="segmented" role="group" aria-label="${axis.name}">
          ${["left", "right"].map((pole) => `
            <button class="axis-option" type="button" data-axis="${axis.key}" data-pole="${pole}">
              <strong>${axis[pole].label}</strong>
              <span>${axis[pole].copy}</span>
            </button>
          `).join("")}
        </div>
      `;
      axisControls.appendChild(card);
    });

    axisControls.addEventListener("click", (event) => {
      const button = event.target.closest(".axis-option");
      if (!button) return;
      selections[button.dataset.axis] = button.dataset.pole;
      updateCreatorPreview();
    });
  }

  function updateCreatorPreview() {
    const player = new Core.IdentityProfile(selections);
    const rival = player.opposite();
    playerTitle.textContent = player.title();
    rivalTitle.textContent = rival.title();
    playerProfileText.textContent = player.summary();
    rivalProfileText.textContent = rival.summary();

    document.querySelectorAll(".axis-option").forEach((button) => {
      const selected = selections[button.dataset.axis] === button.dataset.pole;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function startGame() {
    state = createInitialState(selections);
    creator.classList.add("is-hidden");
    game.classList.remove("is-hidden");
    window.scrollTo(0, 0);
    resizeCanvas();
    updatePanels();
  }

  function restart() {
    state = null;
    targetPoint = null;
    impactFlash = null;
    keyState.clear();
    heldDirections.clear();
    nearestDilemma = null;
    choiceOverlay.classList.add("is-hidden");
    endingOverlay.classList.add("is-hidden");
    finalText.classList.add("is-hidden");
    restartFromEndingButton.classList.add("is-hidden");
    game.classList.add("is-hidden");
    creator.classList.remove("is-hidden");
    window.scrollTo(0, 0);
    updateCreatorPreview();
  }

  function buildMeters() {
    meterList.innerHTML = METERS.map((meter) => `
      <div class="meter">
        <div class="meter-row">
          <span>${meter.label}</span>
          <strong id="meter-${meter.key}">0</strong>
        </div>
        <div class="meter-track">
          <div class="meter-fill" id="meter-fill-${meter.key}" style="background:${meter.color}"></div>
        </div>
      </div>
    `).join("");
  }

  function tick(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (state && game.classList.contains("is-hidden") === false) {
      updatePlayer(dt);
      updateNearestDilemma();
      drawWorld(now);
    }
    requestAnimationFrame(tick);
  }

  function updatePlayer(dt) {
    if (choiceOverlay.classList.contains("is-hidden") === false || endingOverlay.classList.contains("is-hidden") === false) {
      return;
    }

    const vector = getMovementVector();
    const speed = 238;
    if (Math.abs(vector.x) > 0 || Math.abs(vector.y) > 0) {
      targetPoint = null;
      const length = Math.hypot(vector.x, vector.y) || 1;
      state.player.x += (vector.x / length) * speed * dt;
      state.player.y += (vector.y / length) * speed * dt;
    } else if (targetPoint) {
      const dx = targetPoint.x - state.player.x;
      const dy = targetPoint.y - state.player.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 6) {
        targetPoint = null;
      } else {
        state.player.x += (dx / distance) * speed * dt;
        state.player.y += (dy / distance) * speed * dt;
      }
    }

    state.player.x = clamp(state.player.x, 92, MAP.width - 92);
    state.player.y = clamp(state.player.y, 86, MAP.height - 86);
  }

  function getMovementVector() {
    const vector = { x: 0, y: 0 };
    if (keyState.has("arrowleft") || keyState.has("a") || heldDirections.has("left")) vector.x -= 1;
    if (keyState.has("arrowright") || keyState.has("d") || heldDirections.has("right")) vector.x += 1;
    if (keyState.has("arrowup") || keyState.has("w") || heldDirections.has("up")) vector.y -= 1;
    if (keyState.has("arrowdown") || keyState.has("s") || heldDirections.has("down")) vector.y += 1;
    return vector;
  }

  function updateNearestDilemma() {
    let closest = null;
    let closestDistance = Infinity;
    DILEMMAS.forEach((dilemma) => {
      const distance = Math.hypot(dilemma.location.x - state.player.x, dilemma.location.y - state.player.y);
      if (distance < closestDistance) {
        closest = dilemma;
        closestDistance = distance;
      }
    });

    nearestDilemma = closestDistance <= 108 ? closest : null;
    interactButton.disabled = !nearestDilemma || state.regions[nearestDilemma.id].resolved;

    if (!nearestDilemma) {
      nearPrompt.textContent = state.phase === "integration" ? "섬의 심장이 마지막 답을 기다린다." : "섬의 길들이 서로를 바라본다.";
      return;
    }

    const region = state.regions[nearestDilemma.id];
    nearPrompt.textContent = region.resolved
      ? `${nearestDilemma.name}: ${region.npc || "결과가 남아 있다."}`
      : `${nearestDilemma.name}: 선택이 기다린다.`;
    updateRegionPanel(nearestDilemma);
  }

  function interact() {
    if (!state) return;
    if (state.phase === "integration") {
      openEnding();
      return;
    }
    if (!nearestDilemma) return;
    const region = state.regions[nearestDilemma.id];
    if (region.resolved) return;
    openChoice(nearestDilemma);
  }

  function openChoice(dilemma) {
    const axisPole = state.playerProfile.getPole(dilemma.axis);
    const axisLabel = state.playerProfile.getLabel(dilemma.axis);
    choiceRegion.textContent = dilemma.name;
    choiceTitle.textContent = `${axisLabel}의 답을 남길까`;
    choicePrompt.textContent = `${dilemma.prompt} 섬은 이 선택을 지도 위에 새긴다.`;
    choiceOptions.innerHTML = dilemma.options.map((option) => {
      const affinity = option.pole === axisPole ? "나의 축" : "대칭자의 축";
      return `
        <button class="choice-card choice-card-${option.pole}" type="button" data-choice="${option.id}">
          <small>${affinity} · ${option.tag}</small>
          <strong>${option.title}</strong>
          <span>${option.body}</span>
        </button>
      `;
    }).join("");

    choiceOptions.querySelectorAll(".choice-card").forEach((button) => {
      button.addEventListener("click", () => {
        const result = resolveDilemma(state, dilemma.id, button.dataset.choice);
        impactFlash = result.resolved
          ? {
              startedAt: performance.now(),
              sourceId: dilemma.id,
              targetId: result.rivalMove.targetDilemmaId,
            }
          : null;
        closeChoice();
        window.scrollTo({ top: 0, behavior: "smooth" });
        updatePanels();
        if (result.resolved && state.phase === "integration") {
          setTimeout(openEnding, 360);
        }
      });
    });

    choiceOverlay.classList.remove("is-hidden");
  }

  function closeChoice() {
    choiceOverlay.classList.add("is-hidden");
  }

  function openEnding() {
    endingCopy.textContent =
      "섬은 네가 고른 답들을 받아들였다. 이제 대칭자가 남긴 흔적 하나를 지우지 않고 가져가야 한다.";
    integrationChoices.innerHTML = state.rivalMoves.map((move) => `
      <button class="choice-card rival-choice-card" type="button" data-milestone="${move.milestone}">
        <small>${move.tag}</small>
        <strong>${move.title}</strong>
        <span>${move.summary}</span>
      </button>
    `).join("");
    finalText.classList.add("is-hidden");
    restartFromEndingButton.classList.add("is-hidden");
    endingOverlay.classList.remove("is-hidden");

    integrationChoices.querySelectorAll(".choice-card").forEach((button) => {
      button.addEventListener("click", () => {
        const move = state.rivalMoves.find((item) => item.milestone === Number(button.dataset.milestone));
        finalText.textContent = buildEndingText(state, move);
        finalText.classList.remove("is-hidden");
        restartFromEndingButton.classList.remove("is-hidden");
      });
    });
  }

  function updatePanels() {
    if (!state) return;
    worldVerdict.textContent = state.world.verdict();
    METERS.forEach((meter) => {
      const score = state.world.score(meter.key);
      document.querySelector(`#meter-${meter.key}`).textContent = String(score);
      document.querySelector(`#meter-fill-${meter.key}`).style.width = `${score * 10}%`;
    });

    if (nearestDilemma) {
      updateRegionPanel(nearestDilemma);
    } else {
      regionName.textContent = "섬의 심장";
      regionStatus.textContent =
        `${state.playerProfile.title()}와 ${state.rivalProfile.title()}의 선택이 같은 섬에 겹쳐지고 있다.`;
    }

    rivalCount.textContent = String(state.rivalMoves.length);
    rivalLog.innerHTML = state.rivalMoves.length
      ? state.rivalMoves.slice().reverse().map((move) => `
          <li><strong>${move.milestone}. ${move.title}</strong><br>${move.summary}</li>
        `).join("")
      : "<li>아직 대칭자의 흔적은 없다.</li>";
  }

  function updateRegionPanel(dilemma) {
    const region = state.regions[dilemma.id];
    const traces = region.rivalInfluences.map((move) => `대칭자의 ${move.tag}`).join(", ");
    regionName.textContent = dilemma.name;
    regionStatus.textContent = [
      region.outcome,
      region.npc,
      traces ? `남은 흔적: ${traces}.` : "",
    ].filter(Boolean).join(" ");
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvasMetrics.width = rect.width;
    canvasMetrics.height = rect.height;
    canvasMetrics.scale = Math.min(rect.width / MAP.width, rect.height / MAP.height);
    canvasMetrics.offsetX = (rect.width - MAP.width * canvasMetrics.scale) / 2;
    canvasMetrics.offsetY = (rect.height - MAP.height * canvasMetrics.scale) / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function screenToWorld(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - canvasMetrics.offsetX) / canvasMetrics.scale;
    const y = (event.clientY - rect.top - canvasMetrics.offsetY) / canvasMetrics.scale;
    return {
      x: clamp(x, 92, MAP.width - 92),
      y: clamp(y, 86, MAP.height - 86),
    };
  }

  function drawWorld(now) {
    ctx.clearRect(0, 0, canvasMetrics.width, canvasMetrics.height);
    ctx.save();
    ctx.translate(canvasMetrics.offsetX, canvasMetrics.offsetY);
    ctx.scale(canvasMetrics.scale, canvasMetrics.scale);

    drawWater(now);
    drawIsland();
    drawTerrainDetails(now);
    drawPaths();
    drawWorldCondition(now);
    drawRegions(now);
    drawTarget();
    drawPlayer(now);
    drawImpactFlash(now);
    drawVignette();

    ctx.restore();
  }

  function drawWater(now) {
    const waterGradient = ctx.createLinearGradient(0, 0, MAP.width, MAP.height);
    waterGradient.addColorStop(0, "#355f79");
    waterGradient.addColorStop(0.48, "#71aab0");
    waterGradient.addColorStop(1, "#1f4f55");
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, 0, MAP.width, MAP.height);

    ctx.strokeStyle = "rgba(255, 248, 233, 0.22)";
    ctx.lineWidth = 2;
    for (let x = -160; x < MAP.width + 160; x += 88) {
      const drift = Math.sin(now / 1100 + x * 0.02) * 18;
      ctx.beginPath();
      ctx.moveTo(x + drift, -20);
      ctx.quadraticCurveTo(x + 54 + drift, 56, x + 4 + drift, 126);
      ctx.quadraticCurveTo(x - 42 + drift, 192, x + 44 + drift, 282);
      ctx.quadraticCurveTo(x + 118 + drift, 362, x + 18 + drift, 452);
      ctx.quadraticCurveTo(x - 42 + drift, 522, x + 46 + drift, MAP.height + 24);
      ctx.stroke();
    }

    starSeeds.forEach((seed) => {
      const alpha = 0.22 + Math.sin(now / 720 + seed.phase) * 0.12;
      ctx.fillStyle = `rgba(255, 248, 233, ${alpha})`;
      ctx.beginPath();
      ctx.arc(seed.x, seed.y, seed.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawIsland() {
    ctx.fillStyle = "rgba(14, 24, 21, 0.28)";
    ctx.beginPath();
    ctx.ellipse(516, 378, 444, 296, -0.02, 0, Math.PI * 2);
    ctx.fill();

    const sand = ctx.createLinearGradient(120, 80, 900, 620);
    sand.addColorStop(0, "#f0c77b");
    sand.addColorStop(0.55, "#d6a348");
    sand.addColorStop(1, "#b98b48");
    ctx.fillStyle = sand;
    ctx.beginPath();
    ctx.moveTo(148, 108);
    ctx.quadraticCurveTo(352, 38, 534, 84);
    ctx.quadraticCurveTo(804, 42, 902, 214);
    ctx.quadraticCurveTo(974, 374, 840, 554);
    ctx.quadraticCurveTo(680, 692, 454, 646);
    ctx.quadraticCurveTo(238, 678, 108, 498);
    ctx.quadraticCurveTo(18, 318, 148, 108);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 248, 233, 0.6)";
    ctx.lineWidth = 8;
    ctx.stroke();

    const grass = ctx.createRadialGradient(470, 340, 70, 500, 350, 470);
    grass.addColorStop(0, "#a9c77a");
    grass.addColorStop(0.62, "#76a965");
    grass.addColorStop(1, "#4e7f55");
    ctx.fillStyle = grass;
    ctx.beginPath();
    ctx.moveTo(180, 134);
    ctx.quadraticCurveTo(360, 78, 548, 126);
    ctx.quadraticCurveTo(762, 88, 858, 242);
    ctx.quadraticCurveTo(922, 382, 794, 522);
    ctx.quadraticCurveTo(650, 632, 462, 588);
    ctx.quadraticCurveTo(274, 622, 154, 470);
    ctx.quadraticCurveTo(78, 318, 180, 134);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(48, 84, 54, 0.2)";
    ctx.beginPath();
    ctx.ellipse(512, 522, 168, 96, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(178, 84, 86, 0.18)";
    ctx.beginPath();
    ctx.ellipse(760, 224, 134, 82, -0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(226, 188, 89, 0.22)";
    ctx.beginPath();
    ctx.ellipse(236, 226, 126, 88, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTerrainDetails(now) {
    ctx.strokeStyle = "rgba(23, 32, 29, 0.12)";
    ctx.lineWidth = 2;
    grassSeeds.forEach((seed) => {
      const sway = Math.sin(now / 800 + seed.x) * 2;
      ctx.beginPath();
      ctx.moveTo(seed.x, seed.y + seed.size);
      ctx.quadraticCurveTo(seed.x + seed.lean * 3 + sway, seed.y, seed.x + seed.lean * 8 + sway, seed.y - seed.size);
      ctx.stroke();
    });

    drawTinyHouse(188, 236, "#f2dba0", "#b85b55");
    drawTinyHouse(278, 190, "#fff1bf", "#d6a348");
    drawTinyHouse(246, 270, "#eac37c", "#23645d");
    drawGateWall(756, 208);
    drawTreeCluster(492, 488, "#356940");
    drawTreeCluster(548, 538, "#244f3c");
    drawTreeCluster(460, 552, "#2f6141");
  }

  function drawPaths() {
    ctx.strokeStyle = "rgba(75, 56, 39, 0.18)";
    ctx.lineWidth = 26;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(232, 222);
    ctx.quadraticCurveTo(480, 312, 774, 218);
    ctx.quadraticCurveTo(690, 374, 514, 524);
    ctx.quadraticCurveTo(392, 416, 232, 222);
    ctx.stroke();

    ctx.strokeStyle = "rgba(247, 238, 219, 0.72)";
    ctx.lineWidth = 13;
    ctx.stroke();

    ctx.setLineDash([18, 18]);
    ctx.strokeStyle = "rgba(22, 59, 54, 0.22)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawWorldCondition(now) {
    if (!state) return;
    const tension = state.world.metrics.tension;
    if (tension <= 3 && !state.rivalMoves.length) return;

    const alpha = clamp((tension - 2) / 9, 0.08, 0.38);
    ctx.strokeStyle = `rgba(83, 58, 111, ${alpha})`;
    ctx.lineWidth = 3;
    state.rivalMoves.forEach((move, index) => {
      const target = DILEMMAS.find((dilemma) => dilemma.id === move.targetDilemmaId);
      const source = DILEMMAS.find((dilemma) => dilemma.id === move.sourceDilemmaId);
      const wobble = Math.sin(now / 420 + index) * 14;
      ctx.beginPath();
      ctx.moveTo(source.location.x, source.location.y);
      ctx.quadraticCurveTo(512 + wobble, 352 - wobble, target.location.x, target.location.y);
      ctx.stroke();
    });
  }

  function drawRegions(now) {
    DILEMMAS.forEach((dilemma) => {
      const region = state.regions[dilemma.id];
      const { x, y } = dilemma.location;
      const pulse = 1 + Math.sin(now / 420 + x) * 0.06;
      const isNear = nearestDilemma && nearestDilemma.id === dilemma.id;
      const hasRival = region.rivalInfluences.length > 0;

      ctx.save();
      ctx.translate(x, y);

      if (hasRival) {
        const crackGlow = ctx.createRadialGradient(0, 0, 18, 0, 0, 92);
        crackGlow.addColorStop(0, "rgba(101, 80, 122, 0.44)");
        crackGlow.addColorStop(1, "rgba(101, 80, 122, 0)");
        ctx.fillStyle = crackGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 92 + Math.sin(now / 300) * 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(14, 24, 21, 0.22)";
      ctx.beginPath();
      ctx.ellipse(0, 17, 72, 28, 0, 0, Math.PI * 2);
      ctx.fill();

      const nodeGradient = ctx.createRadialGradient(-18, -22, 8, 0, 0, 62);
      nodeGradient.addColorStop(0, "#fff8e9");
      nodeGradient.addColorStop(0.58, region.resolved ? dilemma.color : "#f7eedb");
      nodeGradient.addColorStop(1, region.resolved ? "#5b6b52" : "#d8cba9");
      ctx.fillStyle = nodeGradient;
      ctx.strokeStyle = isNear ? "#fff8e9" : region.resolved ? "#17201d" : dilemma.color;
      ctx.lineWidth = isNear ? 7 : 5;
      ctx.beginPath();
      ctx.arc(0, 0, (52 + (isNear ? 5 : 0)) * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      drawRegionScene(dilemma.id, region, now);

      ctx.fillStyle = "#17201d";
      ctx.font = "900 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(255, 248, 233, 0.84)";
      ctx.strokeText(dilemma.name, 0, 86);
      ctx.fillText(dilemma.name, 0, 80);

      if (region.rivalInfluences.length) {
        region.rivalInfluences.forEach((move, index) => {
          drawRivalMark(58 + index * 20, -46 + index * 18, move.tag);
        });
      }
      ctx.restore();
    });
  }

  function drawRegionScene(id, region, now) {
    if (id === "village") {
      drawRegionVillage(region);
      return;
    }
    if (id === "gate") {
      drawRegionGate(region);
      return;
    }
    drawRegionForest(region, now);
  }

  function drawRegionVillage(region) {
    ctx.save();
    ctx.strokeStyle = "#6d4b31";
    ctx.lineWidth = 5;
    drawTinyHouse(-24, 5, "#fff1bf", "#b85b55");
    drawTinyHouse(20, 10, "#f2dba0", "#23645d");
    ctx.fillStyle = region.resolved ? "#6db4bd" : "#d6a348";
    ctx.beginPath();
    ctx.ellipse(0, -20, 17, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-17, -20);
    ctx.quadraticCurveTo(0, -7, 17, -20);
    ctx.stroke();
    ctx.restore();
  }

  function drawRegionGate(region) {
    ctx.save();
    ctx.translate(0, 2);
    ctx.fillStyle = region.resolved ? "#513f48" : "#7b5d58";
    ctx.strokeStyle = "#fff8e9";
    ctx.lineWidth = 4;
    ctx.fillRect(-34, -26, 68, 52);
    ctx.strokeRect(-34, -26, 68, 52);
    ctx.fillStyle = "#f0c77b";
    ctx.fillRect(-22, -14, 16, 40);
    ctx.fillRect(6, -14, 16, 40);
    ctx.strokeStyle = "#17201d";
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(0, 28);
    ctx.moveTo(-34, -2);
    ctx.lineTo(34, -2);
    ctx.stroke();
    ctx.restore();
  }

  function drawRegionForest(region, now) {
    ctx.save();
    const sick = !region.resolved;
    drawTree(-25, 4, sick ? "#31443b" : "#3f7d4b", 1.05);
    drawTree(0, -16, sick ? "#263a39" : "#4f8b5f", 1.25);
    drawTree(27, 8, sick ? "#31443b" : "#6aa260", 1.05);
    if (sick) {
      ctx.strokeStyle = "rgba(23, 32, 29, 0.45)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-26 + i * 16, -4);
        ctx.quadraticCurveTo(-18 + i * 18, 8 + Math.sin(now / 240 + i) * 4, -4 + i * 12, 24);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawRegionIcon(id) {
    ctx.lineWidth = 6;
    ctx.strokeStyle = ctx.fillStyle;
    if (id === "village") {
      ctx.beginPath();
      ctx.moveTo(-22, 8);
      ctx.lineTo(0, -18);
      ctx.lineTo(22, 8);
      ctx.lineTo(22, 26);
      ctx.lineTo(-22, 26);
      ctx.closePath();
      ctx.stroke();
      return;
    }
    if (id === "gate") {
      ctx.strokeRect(-24, -20, 48, 46);
      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.lineTo(24, 0);
      ctx.moveTo(0, -20);
      ctx.lineTo(0, 26);
      ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.arc(0, -10, 22, 0, Math.PI * 2);
    ctx.moveTo(0, 12);
    ctx.lineTo(0, 30);
    ctx.moveTo(-18, 24);
    ctx.lineTo(18, 24);
    ctx.stroke();
  }

  function drawRivalMark(x, y, tag) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 9);
    ctx.fillStyle = "rgba(101, 80, 122, 0.95)";
    ctx.strokeStyle = "#fff8e9";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(18, -3);
    ctx.lineTo(8, 21);
    ctx.lineTo(-15, 11);
    ctx.lineTo(-18, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 248, 233, 0.82)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -12);
    ctx.lineTo(4, 1);
    ctx.lineTo(-2, 15);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#fff8e9";
    ctx.strokeStyle = "#17201d";
    ctx.lineWidth = 4;
    ctx.font = "900 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.strokeText(tag, x, y + 39);
    ctx.fillText(tag, x, y + 37);
  }

  function drawTarget() {
    if (!targetPoint) return;
    ctx.strokeStyle = "#b85b55";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(targetPoint.x, targetPoint.y, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(targetPoint.x - 22, targetPoint.y);
    ctx.lineTo(targetPoint.x + 22, targetPoint.y);
    ctx.moveTo(targetPoint.x, targetPoint.y - 22);
    ctx.lineTo(targetPoint.x, targetPoint.y + 22);
    ctx.stroke();
  }

  function drawPlayer(now) {
    const { x, y } = state.player;
    const bob = Math.sin(now / 180) * 2;
    const colors = getPlayerColors();
    ctx.save();
    ctx.translate(x, y + bob);

    ctx.fillStyle = "rgba(14, 24, 21, 0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 35, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = colors.halo;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.52;
    ctx.beginPath();
    ctx.arc(0, 5, 34 + Math.sin(now / 260) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#17201d";
    ctx.beginPath();
    ctx.arc(0, -18, 13, 0, Math.PI * 2);
    ctx.fill();

    const cloak = ctx.createLinearGradient(-24, -4, 24, 34);
    cloak.addColorStop(0, colors.primary);
    cloak.addColorStop(0.55, "#fff8e9");
    cloak.addColorStop(1, colors.secondary);
    ctx.fillStyle = cloak;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(24, 34);
    ctx.lineTo(-24, 34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#17201d";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = colors.gem;
    ctx.beginPath();
    ctx.arc(0, 16, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawImpactFlash(now) {
    if (!impactFlash) return;
    const age = now - impactFlash.startedAt;
    if (age > 1200) {
      impactFlash = null;
      return;
    }

    const progress = age / 1200;
    const source = DILEMMAS.find((dilemma) => dilemma.id === impactFlash.sourceId);
    const target = DILEMMAS.find((dilemma) => dilemma.id === impactFlash.targetId);
    const alpha = 1 - progress;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 248, 233, ${0.75 * alpha})`;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(source.location.x, source.location.y, 48 + progress * 96, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(101, 80, 122, ${0.85 * alpha})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(source.location.x, source.location.y);
    ctx.quadraticCurveTo(512, 344 - progress * 80, target.location.x, target.location.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(target.location.x, target.location.y, 30 + progress * 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawVignette() {
    const vignette = ctx.createRadialGradient(512, 352, 260, 512, 352, 660);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(14, 24, 21, 0.28)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, MAP.width, MAP.height);
  }

  function drawTinyHouse(x, y, wall, roof) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = wall;
    ctx.strokeStyle = "rgba(23, 32, 29, 0.45)";
    ctx.lineWidth = 2;
    ctx.fillRect(-13, -3, 26, 20);
    ctx.strokeRect(-13, -3, 26, 20);
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(-17, -3);
    ctx.lineTo(0, -20);
    ctx.lineTo(17, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawGateWall(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(99, 73, 77, 0.72)";
    ctx.fillRect(-64, -20, 128, 34);
    ctx.fillStyle = "rgba(247, 238, 219, 0.45)";
    for (let i = -54; i <= 54; i += 24) {
      ctx.fillRect(i, -16, 15, 26);
    }
    ctx.restore();
  }

  function drawTreeCluster(x, y, color) {
    drawTree(x - 22, y + 8, color, 0.8);
    drawTree(x, y - 12, color, 1);
    drawTree(x + 24, y + 8, color, 0.82);
  }

  function drawTree(x, y, color, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#6d4b31";
    ctx.fillRect(-4, 12, 8, 16);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(23, 17);
    ctx.lineTo(-23, 17);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 248, 233, 0.16)";
    ctx.beginPath();
    ctx.moveTo(-4, -18);
    ctx.lineTo(10, 10);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function getPlayerColors() {
    return {
      primary: state.playerProfile.getPole("care") === "left" ? "#b85b55" : "#d6a348",
      secondary: state.playerProfile.getPole("agency") === "left" ? "#4f8b5f" : "#65507a",
      halo: state.playerProfile.getPole("bond") === "left" ? "rgba(255, 248, 233, 0.9)" : "rgba(101, 80, 122, 0.78)",
      gem: state.playerProfile.getPole("bond") === "left" ? "#4f8b5f" : "#65507a",
    };
  }
})();
