#!/usr/bin/env tsx
/**
 * Sprite Catalog Server
 *
 * Visual UI for browsing and selecting sprites from CC0 game asset packs.
 * Downloads packs on-demand when user clicks them.
 *
 * Usage:
 *   tsx scripts/sprite-catalog-server.ts           # Browse all packs
 *   tsx scripts/sprite-catalog-server.ts <pack-id> # Open specific pack
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PORT = 3847;
const CACHE_DIR = '.cache';
const CATALOG_FILE = 'catalog.json';

interface CatalogPack {
  id: string;
  name: string;
  source: string;
  downloadUrl: string;
  tileSize?: number;
  spacing?: number;
  gridOffset?: { x: number; y: number };
  tags?: string[];
}

interface Catalog {
  packs: CatalogPack[];
}

interface PackWithImage extends CatalogPack {
  imagePath?: string;
  thumbnailData?: string;
  downloaded: boolean;
}

let catalog: Catalog;
let allPacks: PackWithImage[] = [];

function loadCatalog(): Catalog {
  const content = fs.readFileSync(CATALOG_FILE, 'utf-8');
  return JSON.parse(content);
}

function findPackImage(packId: string): string | null {
  const cacheDir = path.join(CACHE_DIR, packId);
  if (!fs.existsSync(cacheDir)) return null;

  // Common image locations in Kenney packs
  const possiblePaths = [
    'Preview.png',
    'preview.png',
    'Sample.png',
    'sample.png',
    'Tilemap/tilemap_packed.png',
    'Tilemap/tilemap.png',
    'Spritesheet/sheet.png',
    'Tilesheet/tilesheet.png',
    'Tilesheet/monochrome_packed.png',
  ];

  for (const p of possiblePaths) {
    const fullPath = path.join(cacheDir, p);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Find any PNG
  try {
    const findPng = (dir: string, depth = 0): string | null => {
      if (depth > 2) return null;
      const files = fs.readdirSync(dir);

      // First check for PNGs in this directory
      const png = files.find(f => f.endsWith('.png') && !f.startsWith('.'));
      if (png) return path.join(dir, png);

      // Then check subdirectories
      for (const f of files) {
        const subPath = path.join(dir, f);
        if (fs.statSync(subPath).isDirectory() && !f.startsWith('.')) {
          const found = findPng(subPath, depth + 1);
          if (found) return found;
        }
      }
      return null;
    };
    return findPng(cacheDir);
  } catch {
    return null;
  }
}

function getImageData(imagePath: string): string {
  try {
    const data = fs.readFileSync(imagePath);
    return `data:image/png;base64,${data.toString('base64')}`;
  } catch {
    return '';
  }
}

function enrichPacks(): PackWithImage[] {
  return catalog.packs.map(pack => {
    const imagePath = findPackImage(pack.id);
    return {
      ...pack,
      imagePath: imagePath || undefined,
      downloaded: !!imagePath
    };
  });
}

async function downloadPack(packId: string): Promise<{ success: boolean; error?: string }> {
  const pack = catalog.packs.find(p => p.id === packId);
  if (!pack) return { success: false, error: 'Pack not found in catalog' };

  const cacheDir = path.join(CACHE_DIR, packId);
  const zipPath = path.join(CACHE_DIR, `${packId}.zip`);

  try {
    // Create cache dir
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    // Download
    console.error(`Downloading ${pack.name}...`);
    execSync(`curl -L -o "${zipPath}" "${pack.downloadUrl}"`, { stdio: 'inherit' });

    // Extract
    console.error(`Extracting ${pack.name}...`);
    fs.mkdirSync(cacheDir, { recursive: true });
    execSync(`unzip -q -o "${zipPath}" -d "${cacheDir}"`, { stdio: 'inherit' });

    // Clean up zip
    fs.unlinkSync(zipPath);

    // Refresh pack data
    allPacks = enrichPacks();

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function getBrowseAllHtml(): string {
  const packsData = allPacks.map(p => ({
    ...p,
    thumbnailData: p.imagePath ? getImageData(p.imagePath) : ''
  }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asset Palette - Sprite Selector</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
      min-height: 100vh;
    }
    header {
      background: #16213e;
      padding: 16px 24px;
      border-bottom: 1px solid #0f3460;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    header h1 { font-size: 20px; font-weight: 500; margin-bottom: 8px; }
    .subtitle { color: #888; font-size: 13px; margin-bottom: 12px; }
    .search-bar {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .search-bar input {
      flex: 1;
      min-width: 200px;
      max-width: 400px;
      padding: 8px 12px;
      background: #0f3460;
      border: 1px solid #1a1a2e;
      color: #fff;
      border-radius: 6px;
      font-size: 14px;
    }
    .search-bar input::placeholder { color: #666; }
    .stats { color: #888; font-size: 13px; }
    .tag-filters {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .tag-filter {
      padding: 4px 10px;
      background: #0f3460;
      border: 1px solid transparent;
      color: #aaa;
      border-radius: 12px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tag-filter:hover { background: #1a3a6e; color: #fff; }
    .tag-filter.active { background: #e94560; color: #fff; border-color: #e94560; }

    .pack-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      padding: 24px;
    }

    .pack-card {
      background: #16213e;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      border: 1px solid #0f3460;
      position: relative;
    }
    .pack-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      border-color: #e94560;
    }
    .pack-card.hidden { display: none; }
    .pack-card.downloading { pointer-events: none; opacity: 0.7; }

    .pack-thumbnail {
      width: 100%;
      aspect-ratio: 1;
      background: #0f3460;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .pack-thumbnail img {
      max-width: 100%;
      max-height: 100%;
      image-rendering: pixelated;
      object-fit: contain;
    }
    .pack-thumbnail .download-icon {
      color: #4ecca3;
      font-size: 48px;
      opacity: 0.6;
    }
    .pack-thumbnail .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #0f3460;
      border-top-color: #e94560;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .download-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(78, 204, 163, 0.9);
      color: #1a1a2e;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }

    .pack-info { padding: 12px; }
    .pack-name {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pack-meta {
      font-size: 12px;
      color: #888;
    }
    .pack-source {
      display: inline-block;
      background: #0f3460;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      margin-right: 6px;
    }
    .pack-tags {
      margin-top: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .pack-tag {
      font-size: 10px;
      color: #666;
      background: #1a1a2e;
      padding: 2px 6px;
      border-radius: 3px;
    }

    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f3460;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
      z-index: 200;
    }
    .toast.show { opacity: 1; }
    .toast.error { background: #e94560; }
  </style>
</head>
<body>
  <header>
    <h1>Asset Palette</h1>
    <p class="subtitle">Click a pack to download and browse sprites. Selection is copied to clipboard and returned to agent.</p>
    <div class="search-bar">
      <input type="text" id="search" placeholder="Search packs..." autocomplete="off">
      <span class="stats"><span id="visible-count">${packsData.length}</span> of ${packsData.length} packs</span>
    </div>
    <div class="tag-filters" id="tag-filters"></div>
  </header>

  <div class="pack-grid" id="pack-grid">
    ${packsData.map(p => `
      <div class="pack-card" data-pack-id="${p.id}" data-name="${p.name.toLowerCase()}" data-tags="${(p.tags || []).join(' ')}" data-downloaded="${p.downloaded}">
        <div class="pack-thumbnail">
          ${p.thumbnailData
            ? `<img src="${p.thumbnailData}" alt="${p.name}">`
            : '<span class="download-icon">↓</span>'}
        </div>
        ${p.downloaded ? '' : '<div class="download-badge">Click to download</div>'}
        <div class="pack-info">
          <div class="pack-name">${p.name}</div>
          <div class="pack-meta">
            <span class="pack-source">${p.source}</span>
            ${p.tileSize ? p.tileSize + 'px' : ''}
          </div>
          ${p.tags?.length ? `
            <div class="pack-tags">
              ${p.tags.slice(0, 4).map(t => `<span class="pack-tag">${t}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `).join('')}
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const packs = ${JSON.stringify(packsData.map(p => ({ id: p.id, name: p.name, tags: p.tags, downloaded: p.downloaded })))};
    const cards = document.querySelectorAll('.pack-card');
    const searchInput = document.getElementById('search');
    const visibleCount = document.getElementById('visible-count');
    const tagFilters = document.getElementById('tag-filters');

    // Build tag filter buttons
    const allTags = [...new Set(packs.flatMap(p => p.tags || []))].sort();
    const popularTags = allTags.slice(0, 12);
    let activeTag = null;

    popularTags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'tag-filter';
      btn.textContent = tag;
      btn.onclick = () => {
        if (activeTag === tag) {
          activeTag = null;
          btn.classList.remove('active');
        } else {
          tagFilters.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active'));
          activeTag = tag;
          btn.classList.add('active');
        }
        filterPacks();
      };
      tagFilters.appendChild(btn);
    });

    function filterPacks() {
      const query = searchInput.value.toLowerCase();
      let count = 0;
      cards.forEach(card => {
        const name = card.dataset.name;
        const tags = card.dataset.tags;
        const matchesSearch = name.includes(query) || tags.includes(query);
        const matchesTag = !activeTag || tags.includes(activeTag);
        const show = matchesSearch && matchesTag;
        card.classList.toggle('hidden', !show);
        if (show) count++;
      });
      visibleCount.textContent = count;
    }

    searchInput.addEventListener('input', filterPacks);

    cards.forEach(card => {
      card.addEventListener('click', async () => {
        const packId = card.dataset.packId;
        const downloaded = card.dataset.downloaded === 'true';

        if (!downloaded) {
          // Download first
          card.classList.add('downloading');
          const thumbnail = card.querySelector('.pack-thumbnail');
          thumbnail.innerHTML = '<div class="spinner"></div>';
          showToast('Downloading pack...');

          const res = await fetch('/download/' + packId, { method: 'POST' });
          const result = await res.json();

          if (result.success) {
            showToast('Downloaded! Opening...');
            setTimeout(() => {
              window.location.href = '/pack/' + packId;
            }, 500);
          } else {
            showToast('Download failed: ' + result.error, true);
            card.classList.remove('downloading');
            thumbnail.innerHTML = '<span class="download-icon">↓</span>';
          }
        } else {
          window.location.href = '/pack/' + packId;
        }
      });
    });

    function showToast(msg, isError = false) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.className = 'toast show' + (isError ? ' error' : '');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  </script>
</body>
</html>`;
}

function getPackDetailHtml(pack: PackWithImage): string {
  const imageData = pack.imagePath ? getImageData(pack.imagePath) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asset Palette - ${pack.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: #16213e;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #0f3460;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .back-btn {
      background: #0f3460;
      border: none;
      color: #eee;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      text-decoration: none;
    }
    .back-btn:hover { background: #1a3a6e; }
    header h1 { font-size: 18px; font-weight: 500; }
    .controls { display: flex; gap: 12px; align-items: center; }
    .controls label { font-size: 13px; color: #aaa; }
    .controls input[type="number"] {
      width: 60px;
      padding: 4px 8px;
      background: #0f3460;
      border: 1px solid #1a1a2e;
      color: #fff;
      border-radius: 4px;
    }
    .controls button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
    }
    .btn-primary { background: #e94560; color: white; }
    .btn-primary:hover { background: #ff6b6b; }
    .btn-secondary { background: #0f3460; color: #eee; }
    .btn-secondary:hover { background: #1a3a6e; }

    main { flex: 1; display: flex; overflow: hidden; }

    .canvas-container {
      flex: 1;
      overflow: auto;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }

    #sprite-canvas {
      cursor: crosshair;
      image-rendering: pixelated;
      border: 2px solid #0f3460;
    }

    .sidebar {
      width: 320px;
      background: #16213e;
      border-left: 1px solid #0f3460;
      display: flex;
      flex-direction: column;
    }

    .sidebar-header {
      padding: 12px 16px;
      border-bottom: 1px solid #0f3460;
      font-size: 14px;
      font-weight: 500;
    }

    .selection-list { flex: 1; overflow-y: auto; padding: 8px; }

    .selection-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: #1a1a2e;
      border-radius: 4px;
      margin-bottom: 6px;
    }

    .selection-item canvas {
      image-rendering: pixelated;
      border: 1px solid #0f3460;
      background: #2a2a4e;
    }

    .selection-item input {
      flex: 1;
      padding: 6px 8px;
      background: #0f3460;
      border: 1px solid #1a1a2e;
      color: #fff;
      border-radius: 4px;
      font-size: 13px;
    }

    .selection-item .remove {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: #e94560;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
    }
    .selection-item .remove:hover { color: #ff6b6b; }

    .sidebar-footer {
      padding: 12px 16px;
      border-top: 1px solid #0f3460;
      display: flex;
      gap: 8px;
    }
    .sidebar-footer button { flex: 1; }

    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #0f3460;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    .toast.show { opacity: 1; }

    .hover-cell {
      position: absolute;
      border: 2px solid #4ecca3;
      background: rgba(78, 204, 163, 0.2);
      pointer-events: none;
    }

    .selected-cell {
      position: absolute;
      border: 2px solid #e94560;
      background: rgba(233, 69, 96, 0.3);
      pointer-events: none;
    }

    #canvas-wrapper { position: relative; display: inline-block; }

    .zoom-controls { display: flex; align-items: center; gap: 4px; }
    .zoom-controls button {
      width: 28px;
      height: 28px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .zoom-level {
      font-size: 12px;
      color: #aaa;
      min-width: 40px;
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <a href="/" class="back-btn">← All Packs</a>
      <h1>${pack.name}</h1>
    </div>
    <div class="controls">
      <label>Size:</label>
      <input type="number" id="tile-size" value="${pack.tileSize || 16}" min="1" max="256" title="Tile size in pixels">
      <label>Gap:</label>
      <input type="number" id="spacing" value="${pack.spacing || 0}" min="0" max="32" title="Space between sprites">
      <label>Offset:</label>
      <input type="number" id="offset-x" value="${pack.gridOffset?.x || 0}" min="0" max="256" title="Grid X offset">
      <input type="number" id="offset-y" value="${pack.gridOffset?.y || 0}" min="0" max="256" title="Grid Y offset">
      <div class="zoom-controls">
        <button class="btn-secondary" onclick="zoomOut()">−</button>
        <span class="zoom-level" id="zoom-level">2x</span>
        <button class="btn-secondary" onclick="zoomIn()">+</button>
      </div>
    </div>
  </header>

  <main>
    <div class="canvas-container">
      <div id="canvas-wrapper">
        <canvas id="sprite-canvas"></canvas>
      </div>
    </div>

    <div class="sidebar">
      <div class="sidebar-header">Selected Sprites (<span id="selection-count">0</span>)</div>
      <div class="selection-list" id="selection-list"></div>
      <div class="sidebar-footer">
        <button class="btn-secondary" onclick="clearSelection()">Clear</button>
        <button class="btn-primary" onclick="copyAndClose()">Copy & Close</button>
      </div>
    </div>
  </main>

  <div class="toast" id="toast"></div>

  <script>
    const packMeta = ${JSON.stringify({
      id: pack.id,
      name: pack.name,
      source: pack.source,
      downloadUrl: pack.downloadUrl,
      tileSize: pack.tileSize || 16,
      spacing: pack.spacing || 0,
      gridOffset: pack.gridOffset || { x: 0, y: 0 }
    })};
    const imageData = "${imageData}";

    let tileSize = packMeta.tileSize || 16;
    let spacing = packMeta.spacing || 0;
    let offsetX = packMeta.gridOffset?.x || 0;
    let offsetY = packMeta.gridOffset?.y || 0;
    let zoom = 2;
    let selections = [];
    let img = null;

    const canvas = document.getElementById('sprite-canvas');
    const ctx = canvas.getContext('2d');
    const wrapper = document.getElementById('canvas-wrapper');

    img = new Image();
    img.onload = () => render();
    img.src = imageData;

    function render() {
      if (!img.complete) return;

      canvas.width = img.width * zoom;
      canvas.height = img.height * zoom;

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;

      const scaledTile = tileSize * zoom;
      const scaledSpacing = spacing * zoom;
      const scaledOffsetX = offsetX * zoom;
      const scaledOffsetY = offsetY * zoom;
      const stride = scaledTile + scaledSpacing;

      // Draw vertical lines (left edge of each cell, then right edge of last)
      for (let i = 0; scaledOffsetX + i * stride <= canvas.width; i++) {
        const x = scaledOffsetX + i * stride;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
        // Right edge of tile
        if (x + scaledTile <= canvas.width) {
          ctx.beginPath();
          ctx.moveTo(x + scaledTile, 0);
          ctx.lineTo(x + scaledTile, canvas.height);
          ctx.stroke();
        }
      }
      // Draw horizontal lines
      for (let i = 0; scaledOffsetY + i * stride <= canvas.height; i++) {
        const y = scaledOffsetY + i * stride;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        // Bottom edge of tile
        if (y + scaledTile <= canvas.height) {
          ctx.beginPath();
          ctx.moveTo(0, y + scaledTile);
          ctx.lineTo(canvas.width, y + scaledTile);
          ctx.stroke();
        }
      }

      renderOverlays();
    }

    function renderOverlays() {
      wrapper.querySelectorAll('.selected-cell').forEach(el => el.remove());

      for (const sel of selections) {
        const div = document.createElement('div');
        div.className = 'selected-cell';
        div.style.left = (sel.x * zoom) + 'px';
        div.style.top = (sel.y * zoom) + 'px';
        div.style.width = (sel.w * zoom) + 'px';
        div.style.height = (sel.h * zoom) + 'px';
        wrapper.appendChild(div);
      }
    }

    let hoverDiv = document.createElement('div');
    hoverDiv.className = 'hover-cell';
    hoverDiv.style.display = 'none';
    wrapper.appendChild(hoverDiv);

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const stride = tileSize + spacing;
      const cellX = Math.floor((rawX / zoom - offsetX) / stride);
      const cellY = Math.floor((rawY / zoom - offsetY) / stride);
      const x = offsetX + cellX * stride;
      const y = offsetY + cellY * stride;

      hoverDiv.style.display = 'block';
      hoverDiv.style.left = (x * zoom) + 'px';
      hoverDiv.style.top = (y * zoom) + 'px';
      hoverDiv.style.width = (tileSize * zoom) + 'px';
      hoverDiv.style.height = (tileSize * zoom) + 'px';
    });

    canvas.addEventListener('mouseleave', () => {
      hoverDiv.style.display = 'none';
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const stride = tileSize + spacing;
      const cellX = Math.floor((rawX / zoom - offsetX) / stride);
      const cellY = Math.floor((rawY / zoom - offsetY) / stride);
      const x = offsetX + cellX * stride;
      const y = offsetY + cellY * stride;

      const existingIdx = selections.findIndex(s => s.x === x && s.y === y);
      if (existingIdx >= 0) {
        selections.splice(existingIdx, 1);
      } else {
        const name = \`sprite-\${x}-\${y}\`;
        selections.push({ name, x, y, w: tileSize, h: tileSize });
      }

      renderOverlays();
      renderSelectionList();
    });

    function renderSelectionList() {
      const list = document.getElementById('selection-list');
      const count = document.getElementById('selection-count');
      count.textContent = selections.length;
      list.innerHTML = '';

      for (let i = 0; i < selections.length; i++) {
        const sel = selections[i];
        const item = document.createElement('div');
        item.className = 'selection-item';

        const preview = document.createElement('canvas');
        preview.width = 32;
        preview.height = 32;
        const pCtx = preview.getContext('2d');
        pCtx.imageSmoothingEnabled = false;
        pCtx.drawImage(img, sel.x, sel.y, sel.w, sel.h, 0, 0, 32, 32);

        const input = document.createElement('input');
        input.type = 'text';
        input.value = sel.name;
        input.placeholder = 'sprite-name';
        input.addEventListener('input', (e) => {
          selections[i].name = e.target.value;
        });

        const remove = document.createElement('button');
        remove.className = 'remove';
        remove.textContent = '×';
        remove.onclick = () => {
          selections.splice(i, 1);
          renderOverlays();
          renderSelectionList();
        };

        item.appendChild(preview);
        item.appendChild(input);
        item.appendChild(remove);
        list.appendChild(item);
      }
    }

    function clearSelection() {
      selections = [];
      renderOverlays();
      renderSelectionList();
    }

    function zoomIn() {
      if (zoom < 8) {
        zoom++;
        document.getElementById('zoom-level').textContent = zoom + 'x';
        render();
      }
    }

    function zoomOut() {
      if (zoom > 1) {
        zoom--;
        document.getElementById('zoom-level').textContent = zoom + 'x';
        render();
      }
    }

    document.getElementById('tile-size').addEventListener('change', (e) => {
      tileSize = parseInt(e.target.value) || 16;
      render();
    });

    document.getElementById('spacing').addEventListener('change', (e) => {
      spacing = parseInt(e.target.value) || 0;
      render();
    });

    document.getElementById('offset-x').addEventListener('change', (e) => {
      offsetX = parseInt(e.target.value) || 0;
      render();
    });

    document.getElementById('offset-y').addEventListener('change', (e) => {
      offsetY = parseInt(e.target.value) || 0;
      render();
    });

    async function copyAndClose() {
      const result = {
        pack: packMeta.id,
        packName: packMeta.name,
        source: packMeta.source,
        downloadUrl: packMeta.downloadUrl,
        tileSize: tileSize,
        spacing: spacing,
        gridOffset: { x: offsetX, y: offsetY },
        selected: selections
      };

      const json = JSON.stringify(result, null, 2);

      try {
        await navigator.clipboard.writeText(json);
        showToast('Copied to clipboard!');

        await fetch('/done', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: json
        });
      } catch (err) {
        showToast('Failed to copy: ' + err.message);
      }
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  </script>
</body>
</html>`;
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const url = req.url || '/';

  // Browse all packs
  if (req.method === 'GET' && url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getBrowseAllHtml());
    return;
  }

  // Download a pack
  if (req.method === 'POST' && url.startsWith('/download/')) {
    const packId = url.replace('/download/', '');
    const result = await downloadPack(packId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  // Pack detail view
  if (req.method === 'GET' && url.startsWith('/pack/')) {
    const packId = url.replace('/pack/', '');
    const pack = allPacks.find(p => p.id === packId);
    if (pack && pack.imagePath) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getPackDetailHtml(pack));
      return;
    }
    res.writeHead(404);
    res.end('Pack not found or not downloaded');
    return;
  }

  // Done - receive selection
  if (req.method === 'POST' && url === '/done') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok": true}');

      console.log(body);

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 500);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// Main
try {
  catalog = loadCatalog();
} catch (err) {
  console.error('Failed to load catalog.json:', err);
  process.exit(1);
}

allPacks = enrichPacks();

const specificPack = process.argv[2];
if (specificPack) {
  const pack = allPacks.find(p => p.id === specificPack);
  if (!pack) {
    console.error(`Pack "${specificPack}" not found in catalog`);
    process.exit(1);
  }
  if (!pack.downloaded) {
    console.error(`Downloading ${pack.name}...`);
    downloadPack(specificPack).then(result => {
      if (!result.success) {
        console.error('Download failed:', result.error);
        process.exit(1);
      }
      startServer();
    });
  } else {
    startServer();
  }
} else {
  startServer();
}

function startServer() {
  // Refresh pack data after potential download
  allPacks = enrichPacks();

  server.listen(PORT, () => {
    const specificPack = process.argv[2];
    const url = specificPack
      ? `http://localhost:${PORT}/pack/${specificPack}`
      : `http://localhost:${PORT}`;

    console.error(`Asset Palette running at ${url}`);

    try {
      const platform = process.platform;
      if (platform === 'darwin') {
        execSync(`open "${url}"`);
      } else if (platform === 'win32') {
        execSync(`start "${url}"`);
      } else {
        execSync(`xdg-open "${url}"`);
      }
    } catch {
      console.error(`Open ${url} in your browser`);
    }
  });
}
