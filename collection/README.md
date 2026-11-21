# Twelve reference-guided flower studies — V3 (online only)

The original 12 photographs and their attribution/license metadata are retained.
The build verifies the original SHA-256 of each JPEG. Existing page routes 01–11,
12-cosmos.html and the historical Cosmos root remain available.

V3 replaces the single-surface petals with deformable closed thin shells in
`petal-surface.js`: upper and lower grids, connected edge walls, local normal
thickness, consistent triangle winding, and root-to-tip UV coordinates. Positive
centerline rise, upward distal curls and rolled spoon-shaped margins replace the
old downward bends. Species petal counts, clusters and center structures are
retained. Gaillardia has broader connected bodies with three distal lobes; Cosmos
keeps eight adjacent broad petals with visible narrow separations.

`build_photo_maps.py` extracts two directional ribbons per flower from explicitly
recorded points on the unchanged source photograph. Each map is 128×256 RGBA,
with small masked boundary gaps filled from the nearest valid petal pixel.
Color maps contain observed photographic pigment/lighting, not recovered albedo.
Grayscale high-pass maps infer fine relief; they are not measured depth. Separate
64×64 center maps add relief to the disk/stamens. All maps are embedded in pages.

Petals use MeshPhysicalMaterial with sRGB photo maps, linear bump maps,
roughness 0.59–0.65, metalness 0, subtle clearcoat and mapped emissive fill 0.018.
The scene has a shadow-casting key DirectionalLight, weaker fill and rear rim
DirectionalLight, plus moderate hemisphere light and ACES highlight compression.
Only the ground uses PlaneGeometry; the flower petals are custom closed meshes.

## Build

1. `python3 collection/refine_appearance.py`
2. `python3 collection/make_specimens.py`
3. `python3 collection/build_photo_maps.py` (Pillow, NumPy, SciPy; only when maps change)
4. `python3 build.py`

The current build writes only the online HTML pages and catalogue. It does not
create/update a downloadable ZIP or offline README. Previously published V1/V2
ZIP files retain their original bytes and are no longer promoted by the current
gallery. `prototype.html` is the Cosmos source template; its final script is
embedded with the shared surface helper and photo config by the build.

## Verification

- `node tests/verify-collection.cjs`: finite vertices/normals at five progress
  values, reversible reset, half-stage continuity, head/petal counts and special
  stigma, teeth and three-lobe structures.
- `node tests/verify-v3-surface.cjs`: closed two-manifold topology, edge winding,
  shell thickness, upward tips/cup margins, physical material, color spaces,
  nonuniform photo-derived bump data and original source hashes for all 12.
  Includes the Cosmos timeline/control/gap regression.
- `node tests/verify-collection-ui.cjs`: 12 embedded script bundles including map
  decoding, source-photo hash, navigation, stage controls, play/pause, slider,
  view changes, photo dialog and lost-context feedback with a renderer stub.
- `verify-v2-refinement.cjs` now runs V3 checks: V2's identical single-surface
  vertex-layout contract is explicitly superseded by the requested shell rebuild.

All checks passed for V3. CPU projections of the actual geometry and mapped
photo colors were inspected at bud, half, full and side views for all 12 species.
These do not verify GPU bump/specular/shadow rendering. The cloud browser's
WebGL context creation is disabled (`GL_VENDOR = Disabled`); the V3 catalogue
and fallback UI were inspected, but real GPU lighting and browser frame rate
remain unverified. Photo resemblance still requires the user's visual review.

A single photograph cannot establish hidden surfaces or a true growth sequence.
Bud construction, backs of petals and motion remain labeled modeling inferences.
