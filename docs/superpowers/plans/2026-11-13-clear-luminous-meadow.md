# Clear luminous meadow correction

**Goal:** Correct the flat, grey, visually noisy result shown in the user's screenshot while retaining the approved original flower colors and device-time behavior.

**Scope:** A correction to the already approved reference-lighting design, not a new color palette. Existing Three.js r160; meadow-only changes. No fog, flower texture recoloring, gesture work or downloadable bundle.

**Evidence:** Day fill 2.15 versus key 2.05 flattens directionality. Yellow-green ground and green hemisphere bounce dominate. The background sky is compressed through the same ACES transform as lit surfaces. Ground species alternate independently, creating multicolored high-frequency noise. Depth filtering has a maximum radius of only 1.35px, and the default wide shot has no close subject.

**Approach:** Retune directional/fill balance and neutralize green bounce; preserve the authored sky chroma by excluding the unlit sky from surface tone mapping in both direct and composed output. Keep shadows colored and readable. Cluster original species into coherent beds using existing source color metadata without changing any plant's geometry or texture. Start from a closer flower-level view; use selective highlight bloom and actual depth separation without a white overlay. Retain all 83 species, ecological layers, continuous poses and exact device-time sync.

## Tasks

- [x] Add regressions for same-color neighborhood coherence, complete species/layer coverage, sky/surface tone-mapping parity, and default close-view wiring.
- [x] Group source-colored species into deterministic patches, retaining counts, stage allocation, normalized scales and reproducible seeds.
- [x] Retune sunlight, fill, vegetation and material finish; preserve source textures and photograph hashes.
- [x] Replace tiny cross blur with depth-aware lens filtering and highlight-only glow; avoid foreground/sky color bleeding.
- [x] Verify the meadow contracts and actual browser availability. Clearly distinguish numerical/source checks from GPU visual acceptance. Publish the tested commit through the native existing-site deployment; that deployment record is authoritative.

## Review focus

Day/night continuity; hue preservation of the unlit sky in post-processing and direct modes; no halo bleeding across foreground edges; all species still represented in their original ecological layer; resource cleanup and unsupported GPU fallback.
