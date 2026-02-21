# Asset Palace

**LLM-accessible catalog of CC0 game assets with machine-readable sprite/sound definitions.**

This repository contains metadata and sprite atlas definitions for free CC0-licensed game assets. It does **not** contain the assets themselves — only links to download them and structured definitions that make them easy for AI agents and game engines to use.

## Why This Exists

When an LLM helps you build a game, it can find assets easily. But using them requires:
1. Knowing the sprite sheet layout (grid size, frame positions)
2. Understanding which sprites are animations vs static
3. Mapping semantic names ("player-walk") to UV coordinates

Asset Palace solves this by providing JSON definitions with all that metadata pre-documented.

## Quick Start

```typescript
// Example: Using asset_palace definitions with any game engine
import tinyDungeon from "asset_palace/sprites/kenney/tiny-dungeon.json";

// The definition tells you exactly where each sprite is
const hero = tinyDungeon.sprites["hero-idle"];
// { file: "Tilemap/tilemap.png", x: 0, y: 0, w: 16, h: 16 }

const heroWalk = tinyDungeon.sprites["hero-walk"];
// { file: "Tilemap/tilemap.png", frames: [...], fps: 8 }
```

## Directory Structure

```
asset_palace/
├── schema/
│   ├── sprite-pack.schema.json   # JSON Schema for sprite definitions
│   └── sound-pack.schema.json    # JSON Schema for sound definitions
├── sprites/
│   ├── kenney/                   # Kenney.nl asset packs
│   │   ├── _index.json           # Catalog of all Kenney packs
│   │   ├── tiny-dungeon.json
│   │   ├── nature-kit.json
│   │   └── ...
│   └── opengameart/              # OpenGameArt.org packs
│       └── ...
├── sounds/
│   ├── kenney/
│   │   ├── digital-audio.json
│   │   └── ...
│   └── ...
└── starters/                     # Curated bundles by game type
    ├── gardening-sim.json
    ├── tower-defense.json
    └── stealth-puzzle.json
```

## Sprite Pack Definition Format

Each sprite pack has a JSON definition:

```json
{
  "$schema": "../../schema/sprite-pack.schema.json",
  "id": "tiny-dungeon",
  "name": "Tiny Dungeon",
  "source": "kenney",
  "license": "CC0",
  "homepage": "https://kenney.nl/assets/tiny-dungeon",
  "downloadUrl": "https://kenney.nl/content/3-assets/156-tiny-dungeon/tinydungeon.zip",

  "tileSize": 16,
  "primarySheet": "Tilemap/tilemap.png",

  "sprites": {
    "hero-idle": { "x": 0, "y": 0 },
    "hero-walk": {
      "frames": [{ "x": 16, "y": 0 }, { "x": 32, "y": 0 }],
      "fps": 8
    },
    "skeleton": { "x": 64, "y": 0 }
  },

  "tags": {
    "player": ["hero-idle", "hero-walk"],
    "enemy": ["skeleton", "goblin"],
    "item": ["coin", "gem", "potion"]
  }
}
```

## Sound Pack Definition Format

```json
{
  "$schema": "../../schema/sound-pack.schema.json",
  "id": "digital-audio",
  "name": "Digital Audio",
  "source": "kenney",
  "license": "CC0",
  "homepage": "https://kenney.nl/assets/digital-audio",
  "downloadUrl": "https://kenney.nl/media/pages/assets/digital-audio/.../kenney_digital-audio.zip",

  "sounds": {
    "jump": { "file": "Audio/jump.ogg" },
    "coin": { "file": "Audio/coin.ogg" },
    "explosion": { "file": "Audio/explosion.ogg" }
  },

  "tags": {
    "movement": ["jump", "land", "footstep"],
    "combat": ["hit", "explosion", "shoot"],
    "ui": ["click", "select", "error"]
  }
}
```

## Starter Kits

Starter kits bundle multiple packs for specific game genres:

```json
{
  "id": "gardening-sim",
  "name": "Gardening Simulator Starter",
  "description": "Assets for a cozy gardening/farming game",

  "packs": [
    { "type": "sprites", "source": "kenney", "id": "nature-kit" },
    { "type": "sprites", "source": "kenney", "id": "tiny-town" },
    { "type": "sounds", "source": "kenney", "id": "digital-audio" }
  ],

  "suggestedSprites": {
    "plant_seed": { "pack": "nature-kit", "sprite": "seed" },
    "plant_sprout": { "pack": "nature-kit", "sprite": "plant-small" },
    "watering_can": { "pack": "tiny-town", "sprite": "bucket" }
  }
}
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding new pack definitions.

## License

This metadata repository is CC0 (public domain). The assets it links to are also CC0.

## Sources

- [Kenney.nl](https://kenney.nl) — 60,000+ game assets
- [OpenGameArt.org](https://opengameart.org) — Community-contributed art
- [itch.io CC0](https://itch.io/game-assets/assets-cc0) — CC0-tagged asset packs
