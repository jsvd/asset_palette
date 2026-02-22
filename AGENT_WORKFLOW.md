# Agent Workflow for Documenting Sprite Packs

Step-by-step process for creating sprite atlas definitions.

## Prerequisites

```bash
cd /Users/arkham/project/asset_palette
npm install
```

## Workflow Per Pack

### Step 1: Download and Inspect

```bash
# Download pack to .cache/
curl -L -o .cache/PACK_ID.zip "DOWNLOAD_URL"
unzip -d .cache/PACK_ID .cache/PACK_ID.zip
```

Open the sprite sheet(s) in an image viewer:
- Note dimensions (e.g., 480×320)
- Identify grid size (e.g., 16×16)
- Count columns/rows (e.g., 30×20 = 600 cells)

### Step 2: Identify Sprites

Look for patterns:
- **Characters**: Usually grouped, with animation frames horizontally
- **Terrain**: Often in a grid, sometimes with variants
- **Items**: Individual sprites or small groups
- **UI**: Buttons, icons, typically in corners

Check for existing metadata:
```bash
# Some packs include JSON/XML metadata
find .cache/PACK_ID -name "*.json" -o -name "*.xml"
```

### Step 3: Create Definition

Create `sprites/SOURCE/PACK_ID.json`:

```json
{
  "$schema": "../../schema/sprite-pack.schema.json",
  "id": "pack-id",
  "name": "Pack Name",
  "source": "kenney",
  "license": "CC0",
  "homepage": "https://kenney.nl/assets/pack-id",
  "downloadUrl": "https://kenney.nl/content/.../pack.zip",

  "tileSize": 16,
  "primarySheet": "Tilemap/tilemap.png",

  "sprites": {
    "sprite-name": { "x": 0, "y": 0 },
    "animated-sprite": {
      "frames": [
        { "x": 0, "y": 0 },
        { "x": 16, "y": 0 },
        { "x": 32, "y": 0 }
      ],
      "fps": 8,
      "loop": true
    }
  },

  "tags": {
    "category": ["sprite1", "sprite2"]
  }
}
```

### Step 4: Verify

```bash
npm run verify sprites/kenney/pack-id.json
```

This will:
1. Download the pack (cached)
2. Check all coordinates are in bounds
3. Generate a preview image grid

Check the preview image to verify sprites are extracted correctly.

### Step 5: Commit

```bash
git add sprites/SOURCE/PACK_ID.json
git commit -m "Add PACK_NAME sprite definitions (N sprites)"
```

## Naming Conventions

### Sprite Names (kebab-case)

```
# Characters
hero-idle, hero-walk, hero-attack, hero-die
enemy-slime, enemy-skeleton, npc-merchant

# Terrain
floor-stone, floor-grass, wall-brick, wall-cave
water-shallow, water-deep, lava

# Items
coin-gold, gem-red, potion-health, key-gold
sword-iron, shield-wood, armor-plate

# Doors/Transitions
door-closed, door-open, stairs-up, stairs-down

# Decorations
torch-wall, chest-closed, chest-open, barrel, crate
```

### Animation Naming

```
# State-based
hero-idle       (static or looping)
hero-walk       (looping walk cycle)
hero-attack     (one-shot)
hero-die        (one-shot)

# Direction variants (if applicable)
hero-walk-down, hero-walk-up, hero-walk-left, hero-walk-right
```

### Tags

```json
{
  "tags": {
    "player": ["hero-idle", "hero-walk", "hero-attack"],
    "enemy": ["slime", "skeleton", "goblin"],
    "terrain": ["floor-stone", "wall-brick"],
    "item": ["coin", "gem", "potion"],
    "weapon": ["sword", "bow", "staff"],
    "container": ["chest-closed", "chest-open", "barrel"],
    "door": ["door-closed", "door-open"],
    "decoration": ["torch", "skull", "cobweb"]
  }
}
```

## Common Grid Layouts

### Kenney Tiny Series (16×16)
- Usually organized by category (characters, terrain, items)
- Animations are horizontal sequences
- Characters often at top, terrain middle, items bottom

### Kenney Platformer Packs (various sizes)
- Often include multiple PNG files per category
- May have individual PNGs per sprite
- Check for spritesheet vs individual files

### Vector Packs
- Usually individual PNG files per sprite
- No grid - document each file separately
- Use `file` field per sprite

## Validation Checklist

- [ ] Schema validates (`npm run validate:schema`)
- [ ] All sprites in bounds (verify script passes)
- [ ] Preview image looks correct
- [ ] Animations have correct frame order
- [ ] Tags cover all sprites
- [ ] Names are semantic and consistent

## File Ownership (Team Mode)

When working in parallel, each agent owns ONE pack file:
- Agent A: `sprites/kenney/tiny-town.json`
- Agent B: `sprites/kenney/pixel-platformer.json`
- Agent C: `sprites/kenney/roguelike-rpg-pack.json`

Never edit another agent's file. Coordinate via task list.
