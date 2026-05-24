const assert = require("node:assert/strict");
const Core = require("../src/game-core.js");

const WORLD_KEYS = Core.METERS.map((meter) => meter.key);

function assertRequiredText(value, label) {
  assert.equal(typeof value, "string", `${label} should be a string`);
  assert.ok(value.trim().length > 0, `${label} should not be empty`);
}

function assertDilemmaData() {
  assert.equal(Core.DILEMMAS.length, 5);

  const ids = new Set();
  Core.DILEMMAS.forEach((dilemma) => {
    assertRequiredText(dilemma.id, "dilemma.id");
    assert.ok(!ids.has(dilemma.id), `duplicate dilemma id: ${dilemma.id}`);
    ids.add(dilemma.id);

    assertRequiredText(dilemma.name, `${dilemma.id}.name`);
    assert.ok(["care", "agency", "bond"].includes(dilemma.axis), `${dilemma.id}.axis should be valid`);
    assertRequiredText(dilemma.color, `${dilemma.id}.color`);
    assert.equal(typeof dilemma.location.x, "number", `${dilemma.id}.location.x should be a number`);
    assert.equal(typeof dilemma.location.y, "number", `${dilemma.id}.location.y should be a number`);
    assertRequiredText(dilemma.prompt, `${dilemma.id}.prompt`);
    assertRequiredText(dilemma.unresolved, `${dilemma.id}.unresolved`);

    assert.equal(dilemma.options.length, 2, `${dilemma.id} should have two options`);
    assert.deepEqual(
      dilemma.options.map((option) => option.pole).sort(),
      ["left", "right"],
      `${dilemma.id} should have left/right options`,
    );

    dilemma.options.forEach((option) => {
      assertRequiredText(option.id, `${dilemma.id}.option.id`);
      assertRequiredText(option.title, `${option.id}.title`);
      assertRequiredText(option.tag, `${option.id}.tag`);
      assertRequiredText(option.body, `${option.id}.body`);
      assertRequiredText(option.outcome, `${option.id}.outcome`);
      assertRequiredText(option.npc, `${option.id}.npc`);
      assert.ok(option.worldDelta, `${option.id}.worldDelta should exist`);
      WORLD_KEYS.forEach((key) => {
        assert.equal(typeof option.worldDelta[key], "number", `${option.id}.worldDelta.${key} should be a number`);
      });
    });
  });

  assert.ok(ids.has("archive"));
  assert.ok(ids.has("harbor"));
}

function assertIdentityProfiles() {
  const state = Core.createInitialState({
    care: "left",
    agency: "right",
    bond: "left",
  });

  assert.equal(state.playerProfile.getLabel("care"), "자비");
  assert.equal(state.rivalProfile.getLabel("care"), "효율");
  assert.equal(state.rivalProfile.getLabel("agency"), "자유");
  assert.equal(state.rivalProfile.getLabel("bond"), "통제");
}

function assertProgression() {
  const state = Core.createInitialState({
    care: "left",
    agency: "right",
    bond: "left",
  });

  assert.equal(Object.keys(state.regions).length, 5);

  const first = Core.resolveDilemma(state, "village", "mercy-water");
  assert.equal(first.resolved, true);
  assert.equal(state.regions.village.resolved, true);
  assert.equal(state.rivalMoves.length, 1);
  assert.equal(state.rivalMoves[0].targetDilemmaId, "gate");
  assert.equal(state.regions.gate.rivalInfluences.length, 1);

  const duplicate = Core.resolveDilemma(state, "village", "ration-water");
  assert.equal(duplicate.resolved, false);
  assert.equal(state.rivalMoves.length, 1);

  Core.resolveDilemma(state, "gate", "charter-gate");
  Core.resolveDilemma(state, "forest", "shared-cure");
  Core.resolveDilemma(state, "archive", "sealed-archive");
  assert.equal(state.completedCount, 4);
  assert.equal(state.phase, "exploring");

  const final = Core.resolveDilemma(state, "harbor", "free-sailing");
  assert.equal(final.resolved, true);
  assert.equal(final.rivalMove.targetDilemmaId, "village");
  assert.equal(state.completedCount, 5);
  assert.equal(state.phase, "integration");
  assert.equal(state.rivalMoves.length, 5);

  const ending = Core.buildEndingText(state, final.rivalMove);
  assert.match(ending, /대칭자/);
  assert.match(ending, /섬/);
  assert.match(ending, new RegExp(final.rivalMove.tag));
  assert.match(ending, new RegExp(state.world.verdict()));
}

function run() {
  assertDilemmaData();
  assertIdentityProfiles();
  assertProgression();
}

run();
console.log("core tests passed");
