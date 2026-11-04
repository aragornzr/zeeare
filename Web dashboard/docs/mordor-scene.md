# Mordor regional scene

The scene is an interpretive, compressed regional model derived from the supplied Mordor brief. North is negative Z. Model units, fortress plans, cliff profiles, crops and roads are artistic reconstruction, not canonical measurements or a geological survey.

`MordorWorld` extends `DestinationWorld`, exports `isMordor`, and uses `MordorTerrain` for the same deterministic relief in cinematic and explore modes. Eight five-second chapters form the forty-second tour. Landmarks include suggested focus distances. Region camera movement can use approximately ±900 units and 120–1400 unit viewing distances.

The geographic sequence is Morannon → Udûn → Isenmouthe → Gorgoroth. Three mountain walls leave the east/southeast open. Doom stands separately northwest of the many-walled Barad-dûr. The western high stairs, tower and webbed lair entrance represent Cirith Ungol. Cultivated southern Nurn and the Sea of Núrnen contrast with Gorgoroth. Lava is restricted to the volcanic opening and short local channels. No permanent literal flaming eye is included.

Photographic rock, earth and masonry textures are supplied by the existing `RealismAssets` library. Native 4K terrain has 417,091 vertices; High quality has approximately 185,000 vertices; fortress trim, camps, crops and rubble use instancing. Smoke movement is deterministic for offline video rendering. This is actual geometry rather than a panorama or background image.

Verification: `node --test tests/mordor-layout.test.cjs` checks the brief's spatial relations, open eastern terrain, distinct lake basin, deterministic height, scene construction, camera clearance and complete scene-object disposal. Browser checks cover native 4K export/playback, all ten landmark controls, phone-width layout and switching back to other destinations. Resolution is controlled by the parent renderer/exporter; 4K output alone does not imply scanned or film-quality assets.

## Brief coverage

Source: [the supplied description](mordor-brief.md). Both attachments matched.

| Requested feature | Scene implementation |
| --- | --- |
| Ephel Dúath west/south, Ered Lithui north; open east | Three irregular mountain walls with an open southeastern horizon |
| Morannon, Carchost/Narchost, Dagorlad approach | Iron gate, paired stone towers, mountain opening and approach road |
| Udûn and Isenmouthe | Uneven staging basin behind the gate, transverse ridges and fortified southern opening |
| Gorgoroth | Stony relief, hummocks, rubble, fissures, roads and camps |
| Solitary Orodruin | Separate volcanic mass, crater, ash plume, local lava and constructed winding road to Sammath Naur |
| Barad-dûr | Multiple curtain walls, subsidiary towers, keep and access roads; no literal flaming Eye |
| Cirith Ungol | Western high passage, narrow stairs, guarded tower and webbed dark tunnel entrance |
| Supply infrastructure | Connected roads, tents, crates and staging camps |
| Nurn and Sea of Núrnen | Southern crop parcels, lower relief, subdued greens and a distinct inland lake |

The bundled forty-second movie contains 960 native 4K frames at 24 fps, encoded offline as VP9. It has no audio track. Cinematic and exploration use the same real 3D scene. These are procedural terrain and buildings with photographic materials, not photogrammetric assets or movie footage. Regional compression and artistic measurements are explicitly labelled in the interface.
