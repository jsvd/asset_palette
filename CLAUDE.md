# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## What This Is

Asset Palette is a visual sprite selector for CC0 game assets. It provides:
- A catalog of known-working CC0 asset pack download URLs
- A browser UI to visually browse and select sprites
- On-demand downloading of packs when clicked
- JSON output with sprite coordinates returned to the agent

## Commands

```bash
npm start                    # Open the sprite selector UI (same as npm run catalog)
npm run catalog              # Browse all packs
npm run catalog <pack-id>    # Open a specific pack directly
```

## How It Works

1. **Agent invokes** `/sprite-catalog` or runs `npm run catalog`
2. **Browser opens** showing all available packs from `catalog.json`
3. **User clicks a pack** - downloads if not cached, then opens sprite view
4. **User selects sprites** by clicking on the sheet (adjustable grid)
5. **User clicks "Copy & Close"** - JSON is copied to clipboard and returned to agent

## Output Format

When user clicks "Copy & Close", JSON is output to stdout:

```json
{
  "packId": "tiny-dungeon",
  "packName": "Tiny Dungeon",
  "source": "kenney",
  "sheetPath": "Tilemap/tilemap.png",
  "sheetWidth": 192,
  "sheetHeight": 176,
  "tileSize": 16,
  "spacing": 0,
  "gridOffset": { "x": 0, "y": 0 },
  "sprites": {
    "hero-knight": { "x": 16, "y": 96, "w": 16, "h": 16 },
    "skeleton": { "x": 32, "y": 96, "w": 16, "h": 16 }
  },
  "cachePath": "/absolute/path/to/.cache/tiny-dungeon"
}
```

**Key fields for code generation:**
- `sheetPath`: Relative path to sprite sheet within pack
- `sheetWidth/sheetHeight`: Image dimensions (for UV normalization)
- `sprites`: Object mapping names to coordinates (ready for atlas definition)
- `cachePath`: Absolute path to downloaded pack (copy to your project's assets/)

## Project Structure

```
asset_palette/
├── catalog.json                 # Pack metadata (id, name, downloadUrl, tileSize, tags)
├── .cache/                      # Downloaded packs (gitignored)
├── sounds/                      # Sound pack definitions (separate from sprites)
├── scripts/
│   └── sprite-catalog-server.ts # The sprite selector tool
├── .claude/
│   └── commands/
│       └── sprite-catalog.md    # Skill definition for /sprite-catalog
└── package.json
```

## Adding New Packs

Edit `catalog.json` and add a new entry to the `packs` array:

```json
{
  "id": "pack-id",
  "name": "Pack Name",
  "source": "kenney",
  "downloadUrl": "https://...",
  "tileSize": 16,
  "tags": ["pixel-art", "characters"]
}
```

The pack will automatically appear in the UI and download on first click.

## For Agents

When the user needs sprites:
1. Run `npm run catalog` (or `npm run catalog <pack-id>`) to open the visual selector
2. Tell user: "Select sprites in browser, name them, click Copy & Close when done"
3. Capture JSON from stdout
4. Copy pack from `cachePath` to project's `assets/<packId>/`
5. Generate `loadAtlasFromDef()` code using the JSON fields:
   - `packId` → `id`
   - `sheetPath` → `primarySheet`
   - `sheetWidth/sheetHeight` → same
   - `sprites` → copy verbatim
   - `basePath: "assets/<packId>/"`
