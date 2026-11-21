# Cup / shallow-dish batch validation

Source category: 花瓣层数与几何结构 → 杯状／盘状微凹型, 26 original records. Four already exist (141,159,402,427); 22 added. Final catalog 34 unique taxa. Species 404 is Linum usitatissimum, independent of existing Linum perenne.

Original twelve configurations, textures, Cosmos source and previous ZIP artifacts retain exact SHA-256. Five-stage original-engine position/instance hashes match V3. Existing page navigation now includes the expanded catalog.

All eight checks pass: `verify-baseline12.cjs`, `verify-collection.cjs`, `verify-v3-surface.cjs`, `verify-cup26.cjs`, `verify-cup26-overlap.cjs`, `verify-cup26-buds.cjs`, `verify-cup26-pages.cjs`, `verify-collection-ui.cjs`.

22 added references were visually inspected. Two photo ribbons per specimen preserve source pixels, with nearest valid-pigment replacement only when a crop border reaches outside the petal. Unmodified source photos remain embedded and attributed. Original source-image sampling covers 92.7–100% valid pigment per ribbon. Bump is grayscale high-pass relief, not measured depth.

Inspected software projections of all 22 added flowers: bud, half, open and side. Corrected coincident adjacent surfaces by asymmetric crosswise curvature and separated inner layers; enlarged closed-sepal envelopes to contain folded petals. Original twelve are unaffected.

Managed browser: 26-member directory, labels/order, single-page navigation and source-photo dialog render. WebGL context is unavailable in this environment, so real GPU lighting, shadows, bump detail and frame rate are NOT verified. UI/animation logic tests use renderer stubs, separately from the real geometry checks. Final visual acceptance belongs to the user.

All primary petals are closed curved shells. Growth paths, unseen surfaces and obscured petal counts remain estimates. The source for 360 primarily shows the back; its center is explicitly marked inferred. No new downloadable/offline package is generated.

Fresh independent review identified narrow-screen top-view clipping. The fix fits the bloom bounds to camera aspect on preset selection and resize. Regression projects all new flower petals at stage sizes 335×405, 680×520 and 780×520.
