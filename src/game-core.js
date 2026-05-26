(function attachCore(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.RivalEverythingCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function buildCore() {
  "use strict";

  const MAP = Object.freeze({ width: 1024, height: 704 });
  const SAVE_VERSION = 1;

  const AXES = Object.freeze([
    {
      key: "care",
      name: "상처를 다루는 방식",
      left: {
        label: "자비",
        title: "먼저 살린다",
        copy: "느리고 불안정해도 누군가를 버리지 않는다.",
      },
      right: {
        label: "효율",
        title: "먼저 굴린다",
        copy: "차갑게 보여도 더 많은 생존 가능성을 계산한다.",
      },
    },
    {
      key: "agency",
      name: "길을 여는 방식",
      left: {
        label: "자유",
        title: "스스로 선택한다",
        copy: "사람들이 실패할 권리까지 품고 길을 연다.",
      },
      right: {
        label: "질서",
        title: "흔들림을 묶는다",
        copy: "혼란을 줄이기 위해 규칙과 책임을 먼저 세운다.",
      },
    },
    {
      key: "bond",
      name: "믿음을 쓰는 방식",
      left: {
        label: "신뢰",
        title: "마음을 맡긴다",
        copy: "불확실해도 약속과 선의를 자원으로 삼는다.",
      },
      right: {
        label: "통제",
        title: "결과를 붙든다",
        copy: "위험을 낮추기 위해 정보와 권한을 모은다.",
      },
    },
  ]);

  const DILEMMAS = Object.freeze([
    {
      id: "village",
      name: "물 부족 마을",
      axis: "care",
      color: "#d6a348",
      location: Object.freeze({ x: 232, y: 222 }),
      prompt:
        "우물이 말랐고, 남은 물은 하루치뿐이다. 아이들은 광장에 모여 있고, 장로들은 창고 문 앞에서 말이 없다.",
      unresolved:
        "빈 항아리가 광장에 놓여 있다. 마을은 아직 네 선택을 기다린다.",
      options: Object.freeze([
        {
          id: "mercy-water",
          pole: "left",
          title: "나눔의 물길",
          tag: "자비",
          body:
            "남은 물을 모두에게 나누고, 가장 약한 사람들을 먼저 샘터로 보낸다.",
          outcome:
            "마을 사람들은 밤새 샘터를 찾았다. 창고는 비었지만 광장에는 서로의 이름을 부르는 목소리가 남았다.",
          npc:
            "한 아이가 빈 컵을 들고 웃는다. '오늘은 모두가 조금씩 살았어.'",
          worldDelta: Object.freeze({ warmth: 3, order: -1, breath: 1, tension: 0 }),
        },
        {
          id: "ration-water",
          pole: "right",
          title: "배급의 우물",
          tag: "효율",
          body:
            "노동 가능한 사람에게 우선 배급하고, 물 찾기와 방어를 엄격히 나눈다.",
          outcome:
            "마을은 빠르게 안정됐다. 창고에는 물이 남았지만 광장에는 줄을 세우는 끈이 남았다.",
          npc:
            "장로가 젖은 장부를 접는다. '살아남았지. 모두가 납득한 건 아니지만.'",
          worldDelta: Object.freeze({ warmth: -1, order: 3, breath: 0, tension: 1 }),
        },
      ]),
    },
    {
      id: "gate",
      name: "폐쇄된 관문",
      axis: "agency",
      color: "#b85b55",
      location: Object.freeze({ x: 774, y: 218 }),
      prompt:
        "북쪽 관문은 봉인되어 있다. 안쪽 사람들은 안전을 말하고, 바깥 사람들은 길을 요구한다.",
      unresolved:
        "관문 위 깃발이 움직이지 않는다. 안과 밖의 발소리가 같은 리듬으로 멈춰 있다.",
      options: Object.freeze([
        {
          id: "open-gate",
          pole: "left",
          title: "열린 길",
          tag: "자유",
          body:
            "관문을 열고 통행권을 사람들에게 돌려준다. 위험은 각자가 감당한다.",
          outcome:
            "길은 다시 사람들의 것이 됐다. 낯선 노래와 낯선 병이 같은 바람을 탔다.",
          npc:
            "문지기가 열쇠를 내려놓는다. '닫힌 문은 우리도 가둬두고 있었군.'",
          worldDelta: Object.freeze({ warmth: 1, order: -2, breath: 3, tension: 0 }),
        },
        {
          id: "charter-gate",
          pole: "right",
          title: "서약의 문",
          tag: "질서",
          body:
            "관문을 유지하되 통행 서약과 감시 조를 만든다. 길은 규칙 아래 열린다.",
          outcome:
            "관문은 조금씩 열린다. 사람들은 안전해졌지만, 통행 도장은 새 신분이 됐다.",
          npc:
            "젊은 상인이 도장을 바라본다. '길이 생겼는데, 문도 더 커졌어.'",
          worldDelta: Object.freeze({ warmth: 0, order: 3, breath: -1, tension: 1 }),
        },
      ]),
    },
    {
      id: "forest",
      name: "병든 숲",
      axis: "bond",
      color: "#4f8b5f",
      location: Object.freeze({ x: 514, y: 524 }),
      prompt:
        "숲의 심장이 검게 물들었다. 치료법은 마을들이 나눠 가진 기록에 흩어져 있다.",
      unresolved:
        "검은 잎이 바람보다 먼저 떨어진다. 숲은 아직 누구의 약속도 믿지 못한다.",
      options: Object.freeze([
        {
          id: "shared-cure",
          pole: "left",
          title: "공유된 치료",
          tag: "신뢰",
          body:
            "기록을 공개하고 각 마을이 가진 치료법을 함께 검증하게 한다.",
          outcome:
            "느린 치료가 시작됐다. 숲길마다 서로 다른 필체의 표식이 묶였다.",
          npc:
            "약초사가 손에 묻은 흙을 턴다. '내 비밀보다 숲의 숨이 컸어.'",
          worldDelta: Object.freeze({ warmth: 2, order: -1, breath: 3, tension: 0 }),
        },
        {
          id: "sealed-cure",
          pole: "right",
          title: "봉인된 치료",
          tag: "통제",
          body:
            "기록을 회수해 하나의 치료단만 접근하게 한다. 실패 가능성을 줄인다.",
          outcome:
            "병의 확산은 멈췄다. 숲 입구에는 약초보다 먼저 허가패가 자랐다.",
          npc:
            "치료단장이 낮게 말한다. '살릴 수 있다면, 모두가 알 필요는 없다.'",
          worldDelta: Object.freeze({ warmth: -1, order: 3, breath: -1, tension: 2 }),
        },
      ]),
    },
    {
      id: "archive",
      name: "불타는 기록관",
      axis: "bond",
      color: "#6f7fb8",
      location: Object.freeze({ x: 318, y: 484 }),
      prompt:
        "기록관에 불이 번지고 있다. 안에는 전염병 치료 기록과 전쟁을 부른 금지 주문 기록이 함께 남아 있다.",
      unresolved:
        "연기가 지붕 틈으로 새고 있다. 사람들은 지식을 구할지 봉인할지 결정을 기다린다.",
      options: Object.freeze([
        {
          id: "open-archive",
          pole: "left",
          title: "공개된 기록",
          tag: "신뢰",
          body:
            "치료 기록과 금지 주문 기록을 모두 공개하고, 공동 검토를 맡긴다.",
          outcome:
            "치료법은 살아남았지만 위험한 주문도 사람들 손에 들어갔다. 기록관 앞에는 감사와 두려움이 함께 모였다.",
          npc:
            "기록관장이 탄 장갑을 내려다본다. '숨긴 지식은 안전했지만, 죽어가던 사람들에게는 닿지 않았지.'",
          worldDelta: Object.freeze({ warmth: 1, order: -1, breath: 3, tension: 1 }),
        },
        {
          id: "sealed-archive",
          pole: "right",
          title: "봉인된 서고",
          tag: "통제",
          body:
            "치료 기록만 선별하고, 금지 주문 기록은 봉인한다.",
          outcome:
            "위험한 지식은 막혔다. 그러나 어떤 치료법이 사라졌는지는 아무도 확인할 수 없게 됐다.",
          npc:
            "기록관장이 열쇠를 쥔다. '살릴 지식과 죽일 지식을 내가 구분했다. 그 책임도 내게 남겠지.'",
          worldDelta: Object.freeze({ warmth: -1, order: 3, breath: -1, tension: 1 }),
        },
      ]),
    },
    {
      id: "harbor",
      name: "떠나는 항구",
      axis: "agency",
      color: "#4f9aa0",
      location: Object.freeze({ x: 814, y: 492 }),
      prompt:
        "폭풍 전 마지막 배가 항구에 묶여 있다. 피난민들은 지금 떠나자고 하고, 선장은 질서 없는 출항이 모두를 죽일 수 있다고 말한다.",
      unresolved:
        "밧줄이 젖은 나무 말뚝을 긁는다. 항구는 떠남과 기다림 사이에서 흔들린다.",
      options: Object.freeze([
        {
          id: "free-sailing",
          pole: "left",
          title: "열린 출항",
          tag: "자유",
          body:
            "배를 열고 원하는 사람부터 떠나게 한다. 위험은 각자가 감당한다.",
          outcome:
            "일부는 바다로 나갔고 일부는 남겨졌다. 항구에는 빈 짐과 살아난 이름이 함께 남았다.",
          npc:
            "선장이 젖은 밧줄을 놓는다. '명령은 없었지만, 누군가는 오늘 자기 삶을 되찾았군.'",
          worldDelta: Object.freeze({ warmth: 1, order: -2, breath: 3, tension: 1 }),
        },
        {
          id: "ordered-boarding",
          pole: "right",
          title: "명부의 승선",
          tag: "질서",
          body:
            "명부를 만들고 어린이, 환자, 항해 인력을 우선 태운다.",
          outcome:
            "배는 안전하게 떠났다. 하지만 명부 밖의 사람들은 자신이 버려졌다는 사실을 정확히 알게 됐다.",
          npc:
            "피난민이 젖은 종이를 움켜쥔다. '질서가 있어서 살았겠지. 질서 때문에 남았고.'",
          worldDelta: Object.freeze({ warmth: -1, order: 3, breath: 0, tension: 2 }),
        },
      ]),
    },
  ]);

  const METERS = Object.freeze([
    { key: "warmth", label: "온기", color: "#b85b55" },
    { key: "order", label: "균형", color: "#d6a348" },
    { key: "breath", label: "숨결", color: "#4f8b5f" },
    { key: "tension", label: "균열", color: "#65507a" },
  ]);

  class IdentityProfile {
    constructor(selections) {
      this.selections = {};
      AXES.forEach((axis) => {
        const value = selections && selections[axis.key] === "right" ? "right" : "left";
        this.selections[axis.key] = value;
      });
    }

    getPole(axisKey) {
      return this.selections[axisKey] || "left";
    }

    getLabel(axisKey) {
      const axis = getAxis(axisKey);
      return axis[this.getPole(axisKey)].label;
    }

    labels() {
      return AXES.map((axis) => axis[this.getPole(axis.key)].label);
    }

    opposite() {
      const oppositeSelections = {};
      AXES.forEach((axis) => {
        oppositeSelections[axis.key] = this.getPole(axis.key) === "left" ? "right" : "left";
      });
      return new IdentityProfile(oppositeSelections);
    }

    title() {
      const labels = this.labels().join("/");
      if (labels === "자비/자유/신뢰") return "따뜻한 방랑자";
      if (labels === "효율/질서/통제") return "차가운 설계자";
      if (this.getPole("care") === "left" && this.getPole("bond") === "left") return "약속의 수호자";
      if (this.getPole("care") === "right" && this.getPole("agency") === "right") return "질서의 계산자";
      if (this.getPole("agency") === "left" && this.getPole("bond") === "right") return "위험한 해방자";
      return "경계 위의 여행자";
    }

    summary() {
      return AXES.map((axis) => {
        const pole = axis[this.getPole(axis.key)];
        return `${pole.label}: ${pole.title}`;
      }).join(" · ");
    }
  }

  class RegionState {
    constructor(dilemma) {
      this.id = dilemma.id;
      this.resolved = false;
      this.choiceId = null;
      this.outcome = dilemma.unresolved;
      this.npc = "";
      this.rivalInfluences = [];
    }
  }

  class RivalMove {
    constructor(params) {
      this.milestone = params.milestone;
      this.sourceDilemmaId = params.sourceDilemmaId;
      this.targetDilemmaId = params.targetDilemmaId;
      this.choiceId = params.choiceId;
      this.title = params.title;
      this.tag = params.tag;
      this.summary = params.summary;
      this.worldDelta = params.worldDelta;
    }
  }

  class WorldResponse {
    constructor() {
      this.metrics = {
        warmth: 5,
        order: 5,
        breath: 5,
        tension: 2,
      };
    }

    applyDelta(delta, weight) {
      const strength = typeof weight === "number" ? weight : 1;
      Object.keys(this.metrics).forEach((key) => {
        const next = this.metrics[key] + (delta[key] || 0) * strength;
        this.metrics[key] = clamp(next, 0, 10);
      });
    }

    score(key) {
      return Math.round(this.metrics[key]);
    }

    verdict() {
      const { warmth, order, breath, tension } = this.metrics;
      if (tension >= 7) return "섬이 갈라진다";
      if (warmth >= 7 && breath >= 7) return "섬이 숨을 고른다";
      if (order >= 8 && warmth <= 4) return "섬이 침묵한다";
      if (order >= 7 && breath >= 6) return "섬이 균형을 세운다";
      return "섬이 지켜본다";
    }
  }

  function createInitialState(selections) {
    const playerProfile = new IdentityProfile(selections);
    const rivalProfile = playerProfile.opposite();
    const regions = {};
    DILEMMAS.forEach((dilemma) => {
      regions[dilemma.id] = new RegionState(dilemma);
    });

    return {
      phase: "exploring",
      playerProfile,
      rivalProfile,
      player: { x: 512, y: 352 },
      regions,
      world: new WorldResponse(),
      rivalMoves: [],
      completedCount: 0,
    };
  }

  function resolveDilemma(state, dilemmaId, choiceId) {
    const dilemma = getDilemma(dilemmaId);
    const region = state.regions[dilemmaId];
    if (!region || region.resolved) {
      return { resolved: false, rivalMove: null };
    }

    const choice = dilemma.options.find((option) => option.id === choiceId);
    if (!choice) {
      throw new Error(`Unknown choice: ${choiceId}`);
    }

    region.resolved = true;
    region.choiceId = choice.id;
    region.outcome = choice.outcome;
    region.npc = choice.npc;
    state.world.applyDelta(choice.worldDelta, 1);
    state.completedCount += 1;

    const rivalMove = generateRivalMove(state, dilemma);
    state.rivalMoves.push(rivalMove);
    state.regions[rivalMove.targetDilemmaId].rivalInfluences.push(rivalMove);
    state.world.applyDelta(rivalMove.worldDelta, 0.55);
    state.world.applyDelta({ tension: 1 }, 1);

    if (state.completedCount >= DILEMMAS.length) {
      state.phase = "integration";
    }

    return { resolved: true, rivalMove };
  }

  function generateRivalMove(state, sourceDilemma) {
    const sourceIndex = DILEMMAS.findIndex((dilemma) => dilemma.id === sourceDilemma.id);
    const targetDilemma = DILEMMAS[(sourceIndex + 1) % DILEMMAS.length];
    const rivalPole = state.rivalProfile.getPole(targetDilemma.axis);
    const rivalChoice = targetDilemma.options.find((option) => option.pole === rivalPole);
    const sourceName = sourceDilemma.name;
    const targetName = targetDilemma.name;

    return new RivalMove({
      milestone: state.rivalMoves.length + 1,
      sourceDilemmaId: sourceDilemma.id,
      targetDilemmaId: targetDilemma.id,
      choiceId: rivalChoice.id,
      title: `${targetName}: ${rivalChoice.title}`,
      tag: rivalChoice.tag,
      summary:
        `네가 ${sourceName}에 답하는 사이, 대칭자는 ${targetName}에서 ${rivalChoice.tag}의 흔적을 남겼다.`,
      worldDelta: rivalChoice.worldDelta,
    });
  }

  function buildEndingText(state, integratedMove) {
    const playerName = state.playerProfile.title();
    const rivalName = state.rivalProfile.title();
    const labels = state.playerProfile.labels().join(", ");
    const adopted = integratedMove ? integratedMove.tag : "대칭자의 방식";
    const verdict = state.world.verdict();

    return [
      `${playerName}는 ${labels}로 섬을 설득했다.`,
      `하지만 대칭자인 ${rivalName}가 남긴 ${adopted}의 흔적을 지우지 않았다.`,
      `세계 판정: ${verdict}. 세계는 승자를 고르는 대신, 네 정체성이 반대의 진실을 품어도 무너지지 않는지 바라본다.`,
    ].join(" ");
  }

  function getIntegrationMoves(state) {
    if (!state || !Array.isArray(state.rivalMoves)) return [];
    return state.rivalMoves.slice(0, DILEMMAS.length);
  }

  function serializeState(state) {
    return {
      version: SAVE_VERSION,
      phase: state.phase,
      playerSelections: Object.assign({}, state.playerProfile.selections),
      playerPosition: {
        x: state.player.x,
        y: state.player.y,
      },
      regions: serializeRegions(state.regions),
      worldMetrics: Object.assign({}, state.world.metrics),
      rivalMoves: state.rivalMoves.map(serializeRivalMove),
      completedCount: state.completedCount,
      savedAt: new Date().toISOString(),
    };
  }

  function restoreState(savedData) {
    const data = typeof savedData === "string" ? JSON.parse(savedData) : savedData;
    if (!data || data.version !== SAVE_VERSION) {
      throw new Error("Unsupported save data");
    }

    const state = createInitialState(data.playerSelections || {});
    state.phase = data.phase === "integration" ? "integration" : "exploring";
    state.player.x = readNumber(data.playerPosition && data.playerPosition.x, state.player.x, 92, MAP.width - 92);
    state.player.y = readNumber(data.playerPosition && data.playerPosition.y, state.player.y, 86, MAP.height - 86);
    state.completedCount = readNumber(data.completedCount, 0, 0, DILEMMAS.length);

    restoreRegions(state, data.regions || {});
    restoreWorldMetrics(state, data.worldMetrics || {});
    state.rivalMoves = restoreRivalMoves(data.rivalMoves || []);
    rebuildRivalInfluences(state);

    return state;
  }

  function serializeRegions(regions) {
    const savedRegions = {};
    DILEMMAS.forEach((dilemma) => {
      const region = regions[dilemma.id];
      savedRegions[dilemma.id] = {
        resolved: Boolean(region && region.resolved),
        choiceId: region ? region.choiceId : null,
        outcome: region ? region.outcome : dilemma.unresolved,
        npc: region ? region.npc : "",
        rivalInfluenceMilestones: region
          ? region.rivalInfluences.map((move) => move.milestone)
          : [],
      };
    });
    return savedRegions;
  }

  function serializeRivalMove(move) {
    return {
      milestone: move.milestone,
      sourceDilemmaId: move.sourceDilemmaId,
      targetDilemmaId: move.targetDilemmaId,
      choiceId: move.choiceId,
      title: move.title,
      tag: move.tag,
      summary: move.summary,
      worldDelta: Object.assign({}, move.worldDelta),
    };
  }

  function restoreRegions(state, savedRegions) {
    DILEMMAS.forEach((dilemma) => {
      const savedRegion = savedRegions[dilemma.id];
      if (!savedRegion) return;
      const region = state.regions[dilemma.id];
      region.resolved = Boolean(savedRegion.resolved);
      region.choiceId = typeof savedRegion.choiceId === "string" ? savedRegion.choiceId : null;
      region.outcome = typeof savedRegion.outcome === "string" ? savedRegion.outcome : dilemma.unresolved;
      region.npc = typeof savedRegion.npc === "string" ? savedRegion.npc : "";
      region.rivalInfluences = [];
    });
  }

  function restoreWorldMetrics(state, metrics) {
    Object.keys(state.world.metrics).forEach((key) => {
      state.world.metrics[key] = readNumber(metrics[key], state.world.metrics[key], 0, 10);
    });
  }

  function restoreRivalMoves(savedMoves) {
    return savedMoves.map((move) => new RivalMove({
      milestone: move.milestone,
      sourceDilemmaId: move.sourceDilemmaId,
      targetDilemmaId: move.targetDilemmaId,
      choiceId: move.choiceId,
      title: move.title,
      tag: move.tag,
      summary: move.summary,
      worldDelta: Object.assign({}, move.worldDelta),
    }));
  }

  function rebuildRivalInfluences(state) {
    Object.keys(state.regions).forEach((id) => {
      state.regions[id].rivalInfluences = [];
    });
    state.rivalMoves.forEach((move) => {
      const region = state.regions[move.targetDilemmaId];
      if (region) region.rivalInfluences.push(move);
    });
  }

  function readNumber(value, fallback, min, max) {
    return typeof value === "number" && Number.isFinite(value)
      ? clamp(value, min, max)
      : fallback;
  }

  function getAxis(axisKey) {
    const axis = AXES.find((item) => item.key === axisKey);
    if (!axis) throw new Error(`Unknown axis: ${axisKey}`);
    return axis;
  }

  function getDilemma(dilemmaId) {
    const dilemma = DILEMMAS.find((item) => item.id === dilemmaId);
    if (!dilemma) throw new Error(`Unknown dilemma: ${dilemmaId}`);
    return dilemma;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  return {
    AXES,
    DILEMMAS,
    MAP,
    METERS,
    SAVE_VERSION,
    IdentityProfile,
    RegionState,
    RivalMove,
    WorldResponse,
    buildEndingText,
    clamp,
    createInitialState,
    getAxis,
    getDilemma,
    getIntegrationMoves,
    restoreState,
    resolveDilemma,
    serializeState,
  };
});
