# Contributing to Asset Palace

Thank you for helping build a comprehensive catalog of CC0 game assets!

## Adding a New Sprite Pack

### 1. Verify the License

Only CC0 (Creative Commons Zero / Public Domain) assets are accepted. Check that:
- The source explicitly states CC0/public domain
- Commercial use is allowed without attribution
- No restrictions on modification

### 2. Download and Inspect the Pack

Download the asset pack and document the sprite sheet layouts:
- Open sprite sheets in an image editor
- Note the grid size (e.g., 16x16, 32x32 pixels)
- Identify individual sprites and animations
- Map semantic names to coordinates

### 3. Create the Definition File

Create `sprites/<source>/<pack-id>.json`:

```json
{
  "$schema": "../../schema/sprite-pack.schema.json",
  "id": "pack-id",
  "name": "Pack Display Name",
  "source": "source-name",
  "license": "CC0",
  "homepage": "https://source.com/pack-page",
  "downloadUrl": "https://source.com/pack.zip",

  "tileSize": 16,
  "primarySheet": "relative/path/to/sheet.png",

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

### 4. Validate Your Definition

```bash
# Install ajv-cli for JSON Schema validation
npm install -g ajv-cli

# Validate against schema
ajv validate -s schema/sprite-pack.schema.json -d sprites/source/pack.json
```

### 5. Update the Index

Add your pack to `sprites/<source>/_index.json`:

```json
{
  "packs": [
    {
      "id": "pack-id",
      "name": "Pack Name",
      "tags": ["category1", "category2"]
    }
  ]
}
```

### 6. Submit a Pull Request

- Fork the repository
- Create a branch: `add-<source>-<pack-id>`
- Commit your changes
- Open a PR with a description of what the pack contains

## Naming Conventions

### Sprite Names

Use lowercase kebab-case with semantic meaning:
- `hero-idle`, `hero-walk`, `hero-attack` (character states)
- `coin-gold`, `gem-red`, `potion-health` (item variants)
- `tile-grass`, `tile-water`, `tile-stone` (terrain)
- `enemy-slime`, `enemy-skeleton` (enemy types)

### Animation Names

Append state to base name:
- `hero-idle` (static or looping idle)
- `hero-walk` (looping walk cycle)
- `hero-attack` (one-shot attack)
- `hero-die` (one-shot death)

### Tags

Use broad categories:
- `player`, `enemy`, `npc` (characters)
- `item`, `weapon`, `armor`, `consumable` (objects)
- `terrain`, `decoration`, `building` (environment)
- `effect`, `projectile`, `particle` (visual effects)
- `ui`, `icon`, `button` (interface)

## File Organization

```
sprites/
├── kenney/           # Assets from kenney.nl
├── opengameart/      # Assets from opengameart.org
├── itch/             # Assets from itch.io creators
└── custom/           # Original contributions
```

## Sound Pack Guidelines

Sound packs follow similar conventions. Key differences:
- Use `sounds/<source>/<pack-id>.json`
- Reference `.ogg`, `.wav`, or `.mp3` files
- Include duration if known
- Tag by use case: `movement`, `combat`, `ui`, `ambient`, `music`

## Questions?

Open an issue for guidance on:
- Whether an asset qualifies as CC0
- How to handle complex sprite sheets
- Suggestions for pack organization
