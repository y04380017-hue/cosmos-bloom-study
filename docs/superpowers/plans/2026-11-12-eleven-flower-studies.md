# Eleven Flower Studies Implementation Plan

**Goal:** Deliver eleven individually reviewable 3D bloom studies grounded in the user's remaining reference photographs.
**Architecture:** A shared Three.js scene and timeline hosts species-specific curved-petal models. Individual self-contained HTML pages embed their own photograph, model parameters and engine. A gallery links all eleven, with an offline ZIP.
**Tech Stack:** Existing Three.js 0.160.1, native JavaScript, Python packaging, Node geometry checks.
**Spec:** User request in this conversation: all eleven must be completed before submission; three distinct stages; preserve photographed blossom silhouette, petal form and arrangement.

## Constraints
- Preserve existing Cosmos V1.1 and private site access.
- Use original images and retain attribution; do not rename pink phlox blue or turn single carnation into a double flower.
- Bud/half motion and hidden geometry are inferred, not certified botanical reconstructions.
- Verify every model, not merely shared renderer code; no external runtime requests.
- Existing cloud browser cannot create WebGL; do not claim GPU verification. Inspect independent geometry projections for all eleven.

## Files and tasks
1. `collection/references.json`, `collection/specimens.json`: source identity and separate anatomy specifications for all eleven. Count, layer, edge, center, palette and cluster settings are explicit.
2. `collection/engine.js`: export `createFlowerStudy(THREE, config)` returning `{ group, update(progress), stats }`; actual bud shells, continuous petal deformation, species-specific center/cluster/leaf structures. Tests cover finite geometry, endpoints, expansion, layer/head/petal counts and distinctive edge shapes.
3. `collection/page.template.html`, `collection/viewer.js`: shared stage, original-photo comparison, labeled three-state controls, 0–1 timeline, play/pause/reset, mouse/touch orbit and per-flower review focus.
4. `collection/build_collection.py`: generate eleven fully embedded pages, gallery and an offline ZIP. Verify all local links/assets and original hashes.
5. `tests/verify-collection.cjs`: execute every configuration at 0, 0.25, 0.5, 0.75 and 1; check finite coordinates/normals, distinct states, expansion, complete counts, reversibility, disk/stamen identity and multiple cluster positions. Re-run existing cosmos checks.
6. `qa/` (outside repository): render and inspect bud/half/full projections for every flower; adjust observed mismatches. Publish once all eleven are packaged and checked.

## Review focus
- Multi-layer calendula must remain layered with many narrow rays.
- Poppy stigma is a green cap surrounded by dark stamens, not a yellow daisy disk.
- Phlox/Spiraea must be multiple independently blooming heads with connected branches.
- Carnation needs clearly serrated distal edges; Gaillardia needs three-lobed yellow tips.
- Input reversal/reset must restore every mesh, including bud covers and flower clusters.

User has requested implementation and review only after all eleven are complete; proceed with this approved scope.
