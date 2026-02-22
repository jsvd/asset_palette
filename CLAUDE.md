# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Asset Palette is a metadata-only catalog of CC0 game assets. It contains JSON definitions describing sprite sheets and sound packs — not the assets themselves. Definitions map semantic names to pixel coordinates in sprite sheets, making assets machine-readable for LLMs and game engines.

## Commands

```bash
npm install                                    # Install dependencies (tsx, sharp, ajv-cli)
npm run verify sprites/kenney/pack-id.json     # Verify a single pack (downloads, checks bounds, generates preview)
npm run verify:all                             # Verify all sprite packs
npm run validate:schema                        # Validate JSON against schema (append -d <file>)
```

The verify script downloads packs to `.cache/`, validates sprite coordinates against actual image dimensions, and generates preview PNG grids alongside the definition file.

## Architecture

**Data layer:** JSON files validated against JSON Schema definitions in `schema/`. Two schemas exist: `sprite-pack.schema.json` and `sound-pack.schema.json`.

**Organization by source:** Packs live under `sprites/<source>/` or `sounds/<source>/` where source is `kenney`, `opengameart`, `itch`, or `custom`. Each source directory has a `_index.json` catalog.

**Starter kits** in `starters/` bundle multiple packs for specific game genres (e.g., tower-defense, gardening-sim) with suggested sprite mappings and placeholder fallbacks.

**Tooling:** `scripts/verify-pack.ts` is the main verification tool (TypeScript, run via tsx). It uses Sharp for image processing.

## Sprite Pack Definition Structure

Every sprite pack requires: `id`, `name`, `source`, `license` (must be "CC0"), `downloadUrl`, and `sprites`. Optional: `tileSize`, `primarySheet`, `tags`, `metadata`.

Sprites are either static (`{ "x": 0, "y": 0 }`) or animated (`{ "frames": [...], "fps": 8, "loop": true }`). Coordinates are in pixels. Width/height default to `tileSize` if omitted.

## How Agents Fetch and Use Sprites

**Discovery:** Read `sprites/<source>/_index.json` to browse available packs and their tags. Use `starters/*.json` to find curated bundles for a specific game genre — these include `suggestedSprites` that map gameplay roles (e.g., `enemy_basic`, `path_tile`) to specific pack/sprite pairs, plus `placeholderFallbacks` with shape/color definitions to use before assets are downloaded.

**Downloading:** Each pack definition has a `downloadUrl` (usually a .zip). Download and extract it. The `primarySheet` field gives the relative path to the main sprite sheet image inside the extracted archive.

**Resolving a sprite to pixels:** Given a sprite name, look it up in the pack's `sprites` object. For a static sprite, use `x`, `y` as the top-left corner and `w`, `h` (or `tileSize` if omitted) as dimensions. If the sprite has a `file` field, use that sheet instead of `primarySheet`.

**Animations:** Animated sprites have a `frames` array of `{x, y}` positions instead of a single position. Use `fps` for playback speed and `loop` to determine if the animation repeats.

**Finding sprites by category:** The `tags` object maps categories (e.g., `"enemy"`, `"terrain"`) to arrays of sprite names, allowing lookup by semantic role rather than browsing every sprite.

## Conventions

- **Pack IDs and sprite names:** kebab-case (`tiny-dungeon`, `hero-idle`, `coin-gold`)
- **Sprite naming:** semantic prefixes — `hero-walk`, `enemy-slime`, `floor-stone`, `potion-health`
- **Animation naming:** base name + state — `hero-idle`, `hero-walk`, `hero-attack`, `hero-die`
- **Tags:** broad categories — `player`, `enemy`, `terrain`, `item`, `weapon`, `decoration`, `ui`
- **Commit messages:** `Add PACK_NAME sprite definitions (N sprites validated)`
- **Branch naming for PRs:** `add-<source>-<pack-id>`

## Workflow for Adding a Pack

1. Download and inspect the sprite sheet (note dimensions, grid size)
2. Create `sprites/<source>/<pack-id>.json` with `$schema` reference
3. Run `npm run verify sprites/<source>/<pack-id>.json` — fixes any out-of-bounds coordinates
4. Check the generated preview PNG to visually confirm sprite extraction
5. Update `sprites/<source>/_index.json` with the new pack entry

See `AGENT_WORKFLOW.md` for detailed step-by-step instructions and `PACK_INVENTORY.md` for the master list of packs to document.
