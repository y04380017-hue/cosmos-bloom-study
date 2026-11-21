# Online meadow V10 — validation record

Request: harmonize flower size, extend the horizon, add sky-colored exponential fog, gentle bloom and rooted organic wind. Only the online Site is delivered.

## Implementation

- Seeded 300 × 300 m field; 600 × 600 m grass substrate.
- Full-pose height is the common unit: ground 1.0 (0.90–1.10), cluster 1.3 (1.20–1.40), focus 1.5 (1.40–1.60), truncated Gaussian.
- Standard layout 119,250 plants: 90,000 / 27,000 / 2,250. Stages 17,888 / 41,737 / 59,625 (15% / 35% / 50%, integer allocation). Existing exposed early-bud poses and all 83 source identities retained.
- Original near meshes, source-derived far meshes: 83 × 3 poses, 417.7 mean / 479 maximum triangles each. Original photo atlases shared; no flower sprites.
- Near LOD threshold 20 m with 2 m hysteresis; far instances stop at 90 m, where FogExp2 density 0.029 is nearly opaque. Camera view follows the neighborhood.
- Default camera submits 1,679 detailed and 32,548 distant flowers, about 25.56 million flower triangles/frame, excluding grass/shadows. This is a workload count, not a frame-rate measurement.
- Shared vertex shader fixes roots and varies upper-plant deflection by world-space position and time. Same deformation drives directional-light shadow depth. Hidden tabs pause wind time; back-forward cache preserves resources.
- Quarter-resolution separable bloom with restrained 0.14 blend; HDR only when EXT_color_buffer_float is supported. Otherwise use renderable unsigned-byte buffers. Offscreen scene MSAA is bounded by device maxSamples (up to 4).

## Review decisions

- Use distance-dependent geometry to keep the larger field practical; the original individual study pages remain unchanged. Far silhouettes become coarser and must be judged at their intended distance.
- Review identified missing HDR capability gating: reproduced by a failing capability test, then fixed.
- Review also identified loss of offscreen antialiasing; treated as relevant to the user's petal-edge quality request and fixed with device-bounded MSAA.

## Evidence and limits

- Full project verification: 17/17 suites passed on 2026-11-13, including preserved geometry and UI checks for the original 83 study pages.

- Scatter, real geometry/atlas, far asset, dynamic wind/shadow/LOD/resource, and shipped-page control tests run with actual Three.js objects. GPU rendering alone is stubbed in the page integration test.
- Browser preview reached the new meadow page and its V10 controls. Browser reports GL_VENDOR=Disabled / GL_RENDERER=Disabled and cannot create WebGL. Actual driver shader execution, final appearance, perceived LOD transition, shadow quality and frame rate remain unverified.
- CPU projected far-model examples inspected for six contrasting flower structures. They are geometry checks, not WebGL screenshots.
