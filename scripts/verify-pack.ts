#!/usr/bin/env npx tsx
/**
 * Verify a sprite pack definition by:
 * 1. Downloading the pack (or using cached)
 * 2. Loading sprite sheet images
 * 3. Extracting sprites at defined coordinates
 * 4. Generating a preview grid image
 *
 * Usage: npx tsx scripts/verify-pack.ts sprites/kenney/tiny-dungeon.json
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Dynamic import of sharp for image manipulation
async function loadSharp(): Promise<any> {
  try {
    const mod = await import("sharp");
    return mod.default;
  } catch {
    return null;
  }
}

let sharp: any = null;

interface SpriteFrame {
  x: number;
  y: number;
  w?: number;
  h?: number;
}

interface StaticSprite extends SpriteFrame {
  file?: string;
}

interface AnimatedSprite {
  file?: string;
  frames: SpriteFrame[];
  fps?: number;
  loop?: boolean;
}

type SpriteDef = StaticSprite | AnimatedSprite;

interface SpritePack {
  id: string;
  name: string;
  source: string;
  license: string;
  homepage?: string;
  downloadUrl: string;
  tileSize?: number;
  primarySheet?: string;
  sprites: Record<string, SpriteDef>;
  tags?: Record<string, string[]>;
  metadata?: Record<string, unknown>;
}

function isAnimated(sprite: SpriteDef): sprite is AnimatedSprite {
  return "frames" in sprite;
}

async function downloadPack(pack: SpritePack, cacheDir: string): Promise<string> {
  const packDir = path.join(cacheDir, pack.id);

  if (fs.existsSync(packDir)) {
    console.log(`  Using cached: ${packDir}`);
    return packDir;
  }

  console.log(`  Downloading: ${pack.downloadUrl}`);
  const zipPath = path.join(cacheDir, `${pack.id}.zip`);

  // Download with curl
  execSync(`curl -L -o "${zipPath}" "${pack.downloadUrl}"`, { stdio: "pipe" });

  // Extract
  fs.mkdirSync(packDir, { recursive: true });
  execSync(`unzip -q "${zipPath}" -d "${packDir}"`, { stdio: "pipe" });

  // Clean up zip
  fs.unlinkSync(zipPath);

  console.log(`  Extracted to: ${packDir}`);
  return packDir;
}

function findFile(baseDir: string, relativePath: string): string | null {
  // Try exact path
  const exact = path.join(baseDir, relativePath);
  if (fs.existsSync(exact)) return exact;

  // Try case-insensitive search
  const parts = relativePath.split("/");
  let current = baseDir;

  for (const part of parts) {
    const entries = fs.readdirSync(current);
    const match = entries.find(e => e.toLowerCase() === part.toLowerCase());
    if (!match) return null;
    current = path.join(current, match);
  }

  return fs.existsSync(current) ? current : null;
}

interface VerifyResult {
  valid: boolean;
  spriteCount: number;
  errors: string[];
  warnings: string[];
  previewPath?: string;
}

async function verifyPack(defPath: string): Promise<VerifyResult> {
  const result: VerifyResult = {
    valid: true,
    spriteCount: 0,
    errors: [],
    warnings: [],
  };

  // Load definition
  console.log(`\nVerifying: ${defPath}`);
  const defContent = fs.readFileSync(defPath, "utf-8");
  let pack: SpritePack;

  try {
    pack = JSON.parse(defContent);
  } catch (e) {
    result.valid = false;
    result.errors.push(`Invalid JSON: ${e}`);
    return result;
  }

  // Validate required fields
  if (!pack.id) result.errors.push("Missing 'id' field");
  if (!pack.name) result.errors.push("Missing 'name' field");
  if (!pack.downloadUrl) result.errors.push("Missing 'downloadUrl' field");
  if (!pack.sprites || Object.keys(pack.sprites).length === 0) {
    result.errors.push("No sprites defined");
  }

  if (result.errors.length > 0) {
    result.valid = false;
    return result;
  }

  result.spriteCount = Object.keys(pack.sprites).length;
  console.log(`  Pack: ${pack.name} (${result.spriteCount} sprites)`);

  // Download/cache pack
  const cacheDir = path.join(path.dirname(defPath), "../../.cache");
  fs.mkdirSync(cacheDir, { recursive: true });

  let packDir: string;
  try {
    packDir = await downloadPack(pack, cacheDir);
  } catch (e) {
    result.errors.push(`Download failed: ${e}`);
    result.valid = false;
    return result;
  }

  // Find primary sheet
  const primarySheet = pack.primarySheet;
  if (!primarySheet) {
    result.warnings.push("No primarySheet defined, skipping image verification");
    return result;
  }

  const sheetPath = findFile(packDir, primarySheet);
  if (!sheetPath) {
    result.errors.push(`Primary sheet not found: ${primarySheet}`);
    result.valid = false;
    return result;
  }

  console.log(`  Sheet: ${sheetPath}`);

  // If sharp is available, verify coordinates and generate preview
  if (sharp) {
    try {
      const img = sharp(sheetPath);
      const metadata = await img.metadata();
      const sheetW = metadata.width!;
      const sheetH = metadata.height!;
      const tileSize = pack.tileSize || 16;

      console.log(`  Sheet size: ${sheetW}x${sheetH}, tileSize: ${tileSize}`);

      // Check each sprite's coordinates
      for (const [name, sprite] of Object.entries(pack.sprites)) {
        if (isAnimated(sprite)) {
          for (let i = 0; i < sprite.frames.length; i++) {
            const frame = sprite.frames[i];
            const w = frame.w || tileSize;
            const h = frame.h || tileSize;
            if (frame.x < 0 || frame.y < 0 || frame.x + w > sheetW || frame.y + h > sheetH) {
              result.errors.push(`${name} frame ${i}: out of bounds (${frame.x},${frame.y} ${w}x${h})`);
            }
          }
        } else {
          const w = sprite.w || tileSize;
          const h = sprite.h || tileSize;
          if (sprite.x < 0 || sprite.y < 0 || sprite.x + w > sheetW || sprite.y + h > sheetH) {
            result.errors.push(`${name}: out of bounds (${sprite.x},${sprite.y} ${w}x${h})`);
          }
        }
      }

      // Generate preview grid (first 64 sprites)
      const previewSize = 64;
      const gridCols = 8;
      const spriteNames = Object.keys(pack.sprites).slice(0, 64);
      const gridRows = Math.ceil(spriteNames.length / gridCols);

      const previewCanvas = sharp({
        create: {
          width: gridCols * previewSize,
          height: gridRows * previewSize,
          channels: 4,
          background: { r: 40, g: 40, b: 40, alpha: 1 },
        },
      });

      const composites: any[] = [];

      for (let i = 0; i < spriteNames.length; i++) {
        const name = spriteNames[i];
        const sprite = pack.sprites[name];
        const frame = isAnimated(sprite) ? sprite.frames[0] : sprite;
        const w = frame.w || tileSize;
        const h = frame.h || tileSize;

        const col = i % gridCols;
        const row = Math.floor(i / gridCols);

        try {
          const extracted = await sharp(sheetPath)
            .extract({ left: frame.x, top: frame.y, width: w, height: h })
            .resize(previewSize - 4, previewSize - 4, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();

          composites.push({
            input: extracted,
            left: col * previewSize + 2,
            top: row * previewSize + 2,
          });
        } catch (e) {
          result.warnings.push(`Failed to extract ${name}: ${e}`);
        }
      }

      const previewPath = path.join(path.dirname(defPath), `${pack.id}-preview.png`);
      await previewCanvas.composite(composites).png().toFile(previewPath);
      result.previewPath = previewPath;
      console.log(`  Preview: ${previewPath}`);

    } catch (e) {
      result.warnings.push(`Image verification failed: ${e}`);
    }
  }

  if (result.errors.length > 0) {
    result.valid = false;
  }

  return result;
}

// Main
async function main() {
  // Load sharp for image processing
  sharp = await loadSharp();
  if (!sharp) {
    console.log("Note: Install 'sharp' for visual verification: npm install sharp\n");
  }

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx tsx scripts/verify-pack.ts <definition.json> [definition2.json ...]");
    console.log("       npx tsx scripts/verify-pack.ts sprites/kenney/*.json");
    process.exit(1);
  }

  let totalErrors = 0;

  for (const defPath of args) {
    if (!fs.existsSync(defPath)) {
      console.error(`File not found: ${defPath}`);
      totalErrors++;
      continue;
    }

    // Skip index files
    if (defPath.endsWith("_index.json")) continue;

    const result = await verifyPack(defPath);

    if (result.errors.length > 0) {
      console.log(`  ERRORS:`);
      for (const err of result.errors) {
        console.log(`    - ${err}`);
      }
      totalErrors += result.errors.length;
    }

    if (result.warnings.length > 0) {
      console.log(`  WARNINGS:`);
      for (const warn of result.warnings) {
        console.log(`    - ${warn}`);
      }
    }

    console.log(`  Status: ${result.valid ? "✅ VALID" : "❌ INVALID"} (${result.spriteCount} sprites)`);
  }

  if (totalErrors > 0) {
    console.log(`\n${totalErrors} error(s) found.`);
    process.exit(1);
  } else {
    console.log(`\nAll packs valid.`);
  }
}

main().catch(console.error);
