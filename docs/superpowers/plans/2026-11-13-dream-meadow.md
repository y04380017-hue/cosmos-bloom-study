# Dream meadow implementation plan

**Goal:** Online-only meadow revision matching the user's explicit scale, horizon, fog and organic wind specification.
**Architecture:** Keep the accepted 83 source models and three stages. Use a seeded 300 m square layout, original near geometry plus source-derived far geometry, view-distance instance filtering, shared world-space wind uniforms and a gentle bloom postprocess.
**Tech stack:** Existing vendored Three.js r160, plain JavaScript and Node verification.
**Spec:** User request of 2026-11-13: harmonious baseline, middle/top scale 1.2–1.6, FogExp2 and sky integration, slow spatially phased upper-stem wind. Bud remains exposed early bud.

## Constraints and decisions
- Ground height 0.90–1.10, cluster 1.20–1.40, focus 1.40–1.60; truncated Gaussian within each range. Full reference-model height is the common unit.
- Standard field: 90,000 ground / 27,000 cluster / 2,250 focal flowers; unchanged 15/35/50 stage quotas. Display only the neighbourhood before the fog becomes opaque, selecting detailed geometry nearby.
- Derive far meshes from original curved geometry and reuse original atlases. No flower sprites, no uniform generic flower replacements.
- Original individual-flower study pages remain unchanged; no offline deliverable.
- Native publishing is already authorized by the requested online revision.

## Review focus
- Wind anchored at the root; phase uses world position even for rotated instances; shadows deform consistently.
- Neighbourhood selection follows the camera without gaps; object selection maps to the correct plant after compaction.
- Stage/scale/color/83-species provenance survive near/far simplification.
- Repeated regeneration, tab suspension and back-forward navigation retain correct resource ownership.
- Fog hides the field perimeter and culling boundary; bloom does not wash out petal color.

## Tasks
- [x] 1. Update scatter scale/extent/count tests, observe failure, implement bounded Gaussian heights and expanded seeded placement.
- [x] 2. Produce source-derived far meshes, verify geometry/UV/count budgets and load with shared atlases.
- [x] 3. Add view-distance instancing, world-phase wind, matching depth shader and subtle bloom. Verify root anchoring, spatial/time changes, culling and disposal with real Three objects.
- [x] 4. Update viewer/camera/fog/light/UI, run interaction checks and full project suite, inspect available preview. Document actual GPU test limitation if present.
- [ ] 5. Independent review, fix important findings, package exact tested source and publish privately to the existing Site.

Execution status: all 17 verification suites passed; independent review completed and both HDR fallback and offscreen antialiasing addressed. Source is ready for the existing owner-private Site publication workflow. See docs/dream-meadow-validation.md for evidence and GPU limitations.
