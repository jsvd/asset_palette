# Sprite Catalog

Opens a visual UI for browsing and selecting sprites from CC0 game asset packs.

## Usage

```
/sprite-catalog              # Browse all packs
/sprite-catalog <pack-id>    # Open specific pack directly
```

## Examples

```
/sprite-catalog
/sprite-catalog tiny-dungeon
/sprite-catalog pixel-platformer
```

## Behavior

1. Run the sprite catalog server:
   ```bash
   npm run catalog $ARGUMENTS
   ```

2. This opens a browser UI where the user can:
   - Browse all available packs (with thumbnails for downloaded ones)
   - Click a pack to download it (if needed) and open sprite view
   - Adjust tile size to match the sprite grid
   - Click sprites to select them
   - Name selected sprites
   - Click "Copy & Close" to return selection

3. The server outputs JSON to stdout:
   ```json
   {
     "packId": "tiny-dungeon",
     "packName": "Tiny Dungeon",
     "source": "kenney",
     "sheetPath": "Tilemap/tilemap.png",
     "sheetWidth": 192,
     "sheetHeight": 176,
     "tileSize": 16,
     "sprites": {
       "hero-knight": { "x": 16, "y": 96, "w": 16, "h": 16 }
     },
     "cachePath": "/path/to/.cache/tiny-dungeon"
   }
   ```

4. Copy pack from `cachePath` to project assets and generate atlas code.

## Available Packs

Packs are listed in `catalog.json`. Popular options include:
- `tiny-dungeon` - 16x16 roguelike dungeon tileset
- `tiny-town` - 16x16 town and buildings
- `pixel-platformer` - 18x18 platformer assets
- `space-shooter-redux` - HD space shooter sprites
- `topdown-shooter` - 64x64 topdown shooter
- `ui-pack` - UI elements (buttons, panels, icons)
- `particle-pack` - VFX particles and effects
