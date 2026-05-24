# PLAN.md Update: Unity Vision With Web Prototype Grounding

## Summary
- Keep the long-term product as a Unity mobile fantasy RPG.
- Reframe the current JS/Canvas version as a Phase 0 pre-production prototype that validates the “player identity → mirrored rival → world consequences → integration ending” loop.
- Update `PLAN.md` so it no longer implies Unity development has already started; it should clearly separate what exists now from the future Unity build.

## Key Changes
- Add a “Current Development Snapshot” section:
  - Static web prototype using `index.html`, `styles.css`, `src/app.js`, and `src/game-core.js`.
  - Implemented loop: 3 ethical axes, mirrored rival profile, 3 island dilemmas, rival traces, world meters, integration ending.
  - Existing test coverage: `tests/core.test.js` verifies profile mirroring, dilemma resolution, rival moves, and ending text.
- Preserve the Unity RPG goal, but make it a production target after prototype validation:
  - Unity mobile build remains the intended destination.
  - The current prototype informs narrative structure, rival generation, world-state logic, and UI flow.
  - Real-time combat, 3D world, quests, progression, inventory, and mobile packaging are future Unity-phase work, not current shipped features.
- Revise the roadmap:
  - Phase 0: Web prototype validation, currently mostly complete.
  - Phase 1: Tighten prototype feedback loop, add balancing/narrative polish, and define Unity data contracts.
  - Phase 2: Unity vertical slice using the same identity/rival/dilemma model.
  - Phase 3: Expand into RPG systems: combat, quests, progression, equipment.
  - Phase 4: Mobile optimization, QA, store preparation.
- Add an explicit migration bridge:
  - Treat `IdentityProfile`, dilemma definitions, rival move generation, and world meters as the core domain model to port into Unity.
  - Do not require the web prototype to become the final game engine.

## Public Interfaces / Types
- No code interface changes are required for the PLAN update.
- The plan should name these conceptual domain contracts for future Unity parity:
  - `IdentityProfile`: player and rival moral-axis selections.
  - `Dilemma`: location, axis, options, outcomes, and world deltas.
  - `RivalMove`: mirrored rival response attached to another location.
  - `WorldResponse`: global meters and verdict logic.

## Test Plan
- Since this is a documentation update, verify by reading `PLAN.md` for consistency with the current repo.
- Run `node tests/core.test.js` after the doc update to confirm the existing prototype still passes.
- Acceptance check: a new reader should understand that the current build is a web prototype, while Unity remains the long-term implementation target.

## Assumptions
- “Unity 비전 유지” means the Unity/mobile RPG direction stays primary.
- The current web prototype should not be discarded; it becomes the design and mechanics proof-of-concept.
- No implementation changes should be made as part of this PLAN-only update.
