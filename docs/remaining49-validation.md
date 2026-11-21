# Remaining 49 flower studies — validation

Scope confirmed as all 49 remaining references: 44 single/flat and five multilayer, bringing the accepted 34 to 83 unique entries. Original materials, photos, configuration data and numerical geometry at five stages remain unchanged for the accepted 34. The historical Cosmos runtime is preserved.

## Reference work

All 49 original photographs were individually inspected. The observation file records visible whorls, outlines, center structures, source-pixel ribbon coordinates, masks and uncertainties. All copied source files are SHA-256 checked against the authoritative 83-record archive. 104 pigment ribbons supply physical sRGB photo maps and linear microrelief maps; valid source sampling is above 90% in every ribbon. Original photos and attribution are embedded in every detail page.

Source 260 is explicitly flagged: its photographed flower differs from the ordinary appearance associated with the supplied species label. Its visible form is followed without claiming botanical identification. Small or distant flowers, hidden backs, buds, stems and growth paths are approximate. Clusters use representative heads rather than literal counts of every flower in a photo. These limitations are shown on the corresponding pages.

## Geometry and visual checks

Each new petal uses a curved closed shell, physical material, photo color and bump maps. Bud, half and full states are distinct and continuous. Optional structures include Passiflora filament bands and raised reproductive structures; a sealed balloon bud and recessed fused throat for Platycodon; deeply split Clarkia petals; claw-specific pigment; an Oxalis reverse surface; and exposed Zinnia disk florets.

All 49 were reviewed in 10 contact sheets with the source, bud, half, full and side projections. These are CPU projections of the actual Three.js geometry and sampled materials, not generated illustrations. Seven texture contact sheets were reviewed. Visual defects corrected include dropped ray tips, overly broad Iris petals, triangular Clarkia lobes, claw pigment on whole blades, a hollow balloon bud, a protruding throat ring, buried Zinnia florets, and insufficient sampling of toothed edges. Contact sheets were regenerated for affected models.

CPU projection is not an equivalent of WebGL material/shadow execution. Final visual likeness, GPU shading and frame rate remain for user inspection on supported hardware.

## Automated checks

Run `python3 collection/build_collection.py`, then `node tests/verify-all.cjs`.

The 12 suites cover the original Cosmos runtime, original collection, shell thickness/materials, accepted34 photo/map/config/geometry hashes, previous26 grouping/overlap/buds/pages, exact49 source coverage and shape contract, unusual structures, all83 routes, ordered49 previous/next links, source-image hashes, playback/slider/reset/photo interactions, context-loss messaging, and petal visibility in three camera presets at three viewport aspect ratios.

The viewer test uses the real geometry and camera with a renderer stub. It does not execute GPU shaders or prove performance.

## Browser and delivery

The managed browser displayed the new catalog, all83 selection, accepted labels and new detail-page links correctly. The browser reported `GL_VENDOR = Disabled, GL_RENDERER = Disabled`; the expected WebGL failure message appeared and the original-photo view remained available. No browser flags or security settings were changed.

Catalog thumbnails reduce all83 HTML from approximately 33 MiB to 2.4 MiB and the new49 catalog from 19 MiB to 1.5 MiB. Detail pages retain original photo bytes. Runtime code and maps remain embedded with no remote CDN dependency. No new downloadable offline edition is created. Publication uses the existing owner-private Site and unchanged access policy.

## Independent review

A fresh read-only reviewer examined `e591336..e71bf7a`, all 10 geometry sheets and all seven texture sheets. No Critical, Important or Minor issue was found. Accepted34, special-anatomy and route checks passed independently. An additional probe checked every petal vertex at bud, half and full, across all three presets and all three viewport aspect ratios for all49. GPU rendering and biological inference remain subject to the stated limitations. Publication status is established separately by the Sites deployment record.
