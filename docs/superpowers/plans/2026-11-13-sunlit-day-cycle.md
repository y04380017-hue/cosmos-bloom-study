# Sunlit device-time meadow implementation plan

**Goal:** Implement the design explicitly approved in conversation: preserve 83 original flower colors; borrow reference lighting, soft filtering and clear detail only; remove fog; synchronize sun, illumination and continuous bloom/rest posture with local device time, with manual daytime/afternoon/dusk overrides. Online-only. Gesture interaction is deferred until art acceptance.

**Architecture:** Existing Three.js r160 and photo atlases. All 83 near stage meshes have identical topology; interpolate Bud/Half/Full vertices on GPU, adding slight upper-head rest tilt. Source-derived far and horizon geometries receive corresponding morph positions. A pure local-clock controller drives shared shader uniforms and artistic sun/sky lighting. Distant repeated source meshes replace fog-hidden culling.

**Spec:** User-approved plan and clarification in conversation, 2026-11-13. No recoloring to reference palette, no camera/gesture work in this iteration.

## Decisions
- Automatic mode uses new Date() local hours/minutes/seconds and device timezone, including after tab resume, clock/timezone changes and return from manual mode. Sun path is an artistic clock mapping, not location-based astronomy.
- Day fully open, afternoon progressively closes, dusk rests with slight nod. Night remains in visible moonlit rest; dawn reopens, for a continuous 24-hour cycle. Manual presets 11:00 / 16:30 / 18:30 and a full-day slider.
- Preserve current normalized plant heights, seeds, classifications and original photo textures. Display time-driven opening rather than the old fixed stage population percentages.
- Near/mid/horizon LODs use common-topology morph data. No flattened flower sprites. No scene fog or substitute white haze.
- Soft highlight bloom plus modest depth-based defocus must preserve focused petals. Day lighting neutral/warm, source colors unchanged.

## Review focus
- Local-time vs UTC, midnight continuity, tab suspension and mode switching.
- Morph vertex correspondence, normals, roots, original UV/color, and matching shadow deformation.
- No naked 90m culling ring after fog removal, no giant horizon flowers.
- Lifecycle and disposal across regeneration, loading failure and BFcache.
- Correct linear/HDR/antialias pipeline, restrained defocus and useful fallback on unsupported hardware.

## Tasks
- [x] Verify failing clock/morph/UI contracts; implement clock controller and controls.
- [x] Build source-derived mid/horizon morph assets and verify all 83 stages/colors.
- [x] Integrate GPU opening/closing with wind and shadows; extend clear-distance scenery.
- [x] Add visible sun, directional daylight, clear sky, subtle bloom/defocus, and manual/auto UI.
- [x] Run targeted and full suite (20/20), independent review, and fix important issues.
- Deployment: publish the tested commit to the existing private Site; the native deployment record is authoritative.
