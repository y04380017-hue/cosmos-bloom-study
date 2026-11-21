# V12 meadow lighting correction

The user's real V11 screenshot showed a grey sky, yellow-green ground, weak light direction, and fine multicolored noise. This correction follows the already approved instruction to preserve original flower hues while borrowing reference light, filtering and clarity.

## Changes

- Day key/fill changes from 2.05/2.15 to 4.6/0.85, with neutral hemisphere bounce and a soft rim. Source flower photo atlases, vertex colors, geometry and pose data are untouched. The meadow material is less matte and uses less emission. Vegetation uses natural deeper greens rather than yellow-green fill.
- The unlit sky stores zero coverage in the HDR target's alpha; opaque lit surfaces store one. The final pass applies ACES to surfaces and preserves the authored sky color. Direct rendering also leaves the sky untone-mapped. Bloom extraction uses luminance and a highlight threshold; it adds no white overlay or fog.
- Depth filtering uses an eight-sample aperture, a 10px maximum for close views and 6px for wider views, with a sharp focus region. The depth/coverage gate rejects foreground and sky bleeding into distant flower bokeh.
- Devices without floating-point render-target support render directly, avoiding highlight clipping into an 8-bit intermediate. The unavailable effects control is disabled with a readable note.
- Warped seeded flower beds choose existing species using their source color labels. All 83 species retain their original ecological layer, sizes and stage allocation. Neighboring ground-species agreement at roughly 1m rises from 8.84% to 91.68%, replacing per-plant confetti with coherent clumps.
- The initial view stands among flowers and targets the nearest focal plant. Overview and top views remain available. Manual camera motion clears stale preset highlighting. Device-time synchronization, manual day/afternoon/dusk, wind and continuous bloom are retained.

## Verification and limits

Passed: scatter, original meadow assets (83/249 poses), cycle assets (83/498 poses), dynamics/HDR fallback, device clock (including Asia/Tokyo), morph/render contracts, art-direction contracts, and meadow UI with all real model packs. `git diff --check` and JavaScript syntax checks pass. Original single-flower pages, source images, near packs and reduced packs have no diff against V11, so the unchanged expensive single-flower regression suites were not repeated.

Independent review checked r160 alpha writes, sky/surface tone mapping, the HDR fallback, source-color species coverage, camera framing and resource ownership; no blocking finding remains.

The managed browser still reports WebGL unavailable. GPU shader execution, actual lighting/bokeh quality, and FPS have **not** been visually validated. These logic/source checks are not aesthetic acceptance. The user's real-device view remains the art acceptance point.

Online-only update to the existing owner-private Site; no gesture interaction or downloadable bundle.
