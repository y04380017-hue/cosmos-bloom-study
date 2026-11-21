# Device-time meadow validation — 2026-11-13

## Scope

V11 changes the meadow only. The accepted 83 single-flower studies, original near-stage mesh packs and photograph atlases remain unchanged. The reference images inform soft highlights, gentle depth filtering and clear detail, not flower recoloring. No gesture recognition or offline user bundle is included.

The meadow follows the viewing device's local clock and timezone by default. Manual controls provide 11:00, 16:30 and 18:30 presets plus a 24-hour slider. Sunlight, sky, wind strength and continuous petal opening share one clock. Device mode resynchronizes directly after a hidden tab or manual override. Night is a readable resting state, and dawn reopens the flowers. Sun position and plant behavior are artistic mappings, not geographic astronomy or a botanical claim for all species.

## Implementation checks

- No scene fog; a clear procedural sky contains a visible sun. A projection regression keeps the noon sun inside the default overview frame.
- Near geometry uses the original corresponding Bud/Half/Full vertices. Far and horizon geometry have common indices, photo UVs and vertex colors across all three poses. Positions and normals interpolate together.
- Roots remain anchored. Upper flower heads tilt slightly as petals close; wind and depth-shadow geometry use the same deformation. Picking evaluates the current pose rather than a stale Full-stage hitbox.
- A 900m-wide continuation surrounds the original 300m field. Stable world-coordinate sampling reduces subpixel distant plants gradually; there is no fixed 90m cutoff or fog-covered edge. Sizes remain normalized.
- The HDR path checks float render-target support; MSAA and depth resolve follow the installed Three.js r160 implementation. Highlight bloom and mild depth filtering are switchable. Original photo textures remain sRGB.
- Independent review found and closed two issues: projection changes now invalidate frustum culling; devices with fewer than 12 vertex attribute slots receive a readable fallback and renderer cleanup.

## Asset results

The final asset check covers 83 species × 2 reduced levels × 3 poses = 498 poses. Combined compressed cycle packs are 1,201,606 bytes. Average triangles are 464.76 at the far level and 150.46 at the horizon level. Ordinary single-head flowers stay within 480/160 triangles; explicit multihead exceptions preserve heads and connected stems, with maxima 1,100/541. Phlox head separation, spiraea main-branch continuity and lobularia branch-tip attachment have regression checks.

## Verification

The final full run of `node tests/verify-all.cjs` exited 0: 20/20 suites passed. Targeted clock, rendering contracts, asset and UI tests also pass. Clock tests also pass with Asia/Tokyo and America/New_York process timezones. UI tests load all real packs and use real Three.js geometry, while stubbing only DOM/GPU rendering. They cover manual transitions, device-mode return, wind pause, seed replay, layer/view/density controls, context loss, back-forward cache and cleanup. The legacy 83-study tests are included in the full regression runner.

The managed browser displayed the new controls and catalogue, but its WebGL context was unavailable. Actual shader linking, rendered lighting, perceived distant density, GPU memory use and FPS have not been observed. CPU source/LOD projections support geometry checks only; they are not GPU art approval.

Deployment is to the existing owner-private site. No access-policy changes.
