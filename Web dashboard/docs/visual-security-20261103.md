# Visual and transport improvements — 3 November 2026

Local source changes; no deployment or cloud provisioning performed.

- Shared world-space material normals now fade at subpixel scale to reduce distant surface shimmer in camera tours across the destination renderer.
- The finishing pass bounds sharpening corrections to reduce bright edge halos while retaining deep-focus scene detail.
- Offline native UHD VP9 export requests 60 Mbps variable bitrate (previously 18 Mbps); live recording requests 60 Mbps (previously 16 Mbps). Encoders may vary actual bitrate. Existing bundled movies are unchanged; new exports are needed. Larger downloads and higher encoding costs are expected.
- Flutter shared theme adds consistent typography, navigation selection, field focus borders, and hero depth. Admin callable requests have a 30-second timeout and validate response map shape.
- Local dashboard server denies hidden files, resolved paths outside its root and directory listing; blocks external framing while allowing the atlas’s same-origin destination frames; adds MIME sniffing, referrer and browser capability headers. Private no-store caching remains enabled for page/code responses. A production host must configure equivalent headers and HTTPS itself.

Data handling retains existing Firebase Auth and backend permission checks, Firestore ownership rules, owner-scoped photo paths and offline tourism records. No rule changes, migrations, password handling changes or assertions about live deployed configuration are included. Client validation is resilience, not an authorization boundary.

Verification: 83 dashboard tests, 52 backend tests, four server security tests pass. Flutter analysis of changed files passes. Targeted Flutter widget tests could not start because dartcv4 could not resolve its native CMake toolchain. Browser/GPU shader compilation, visual review, actual WebCodecs output and signed-in live sync remain unverified.

Procedural geometry and existing photographic textures remain the source assets. These changes do not supply individually authored photorealistic characters, tissue simulation, botanical growth simulation or surveyed geography for 118 locations. Existing saved videos have not been regenerated.

## Second visual pass

Thin foliage and character skin now use a shadow-aware directional backlighting approximation. It preserves existing pore, weave and wind hooks; it is not volumetric tissue simulation. Hobbit faces no longer receive constant artificial emissive light. Gandalf uses the same light-responsive skin treatment. Understory leaflets now have curved three-facet surfaces rather than single flat triangles, retaining seeded placement, slope, water and path exclusions. Terrain normals fade below pixel scale alongside architectural surfaces.

Destination controls use softened panels, larger touch targets and restrained landmark hover states; reduced-motion preferences disable card movement. Flutter service cards have department color accents and a subtle surface gradient.
