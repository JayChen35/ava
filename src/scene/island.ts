import { Container, Graphics, Renderer } from 'pixi.js';
import { PAL, VIEW_W, VIEW_H } from '../config';

export interface IslandAnchors {
  palaceCenter: { x: number; y: number };
  balconyClothesline: { x1: number; x2: number; y: number };
  coffeeTables: Array<{ x: number; y: number }>;
  bakeryChimney: { x: number; y: number };
  fountainCenter: { x: number; y: number };
}

export interface IslandRefs {
  anchors: IslandAnchors;
  update: (dt: number) => void;
}

interface Layers {
  islandBack: Container;
  islandMid: Container;
  islandFront: Container;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function px(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1) {
  g.rect(Math.round(x), Math.round(y), w, h).fill({ color, alpha });
}

// Draw a filled outlined ellipse ground patch as a stack of horizontal scanlines
// to keep crisp pixel edges (no antialiasing fuzz).
function pixelEllipse(
  g: Graphics,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: number,
  alpha = 1,
) {
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(Math.sqrt(1 - (dy * dy) / (ry * ry)) * rx);
    g.rect(Math.round(cx - w), Math.round(cy + dy), w * 2, 1).fill({ color, alpha });
  }
}

// ─── Island ground ───────────────────────────────────────────────────────────
function drawGround(parent: Container) {
  const g = new Graphics();

  // Outer rocky shore (largest ellipse, pale rock color)
  pixelEllipse(g, 240, 165, 175, 50, PAL.rock);
  // Inner shore (slightly lighter)
  pixelEllipse(g, 240, 163, 168, 46, 0xc7b08a);
  // Grass cap
  pixelEllipse(g, 240, 158, 158, 40, PAL.grass);
  // Darker grass shading on north/west to fake shading
  pixelEllipse(g, 232, 155, 130, 32, PAL.grassDark, 0.55);
  // South beach (sand strip at the bottom)
  pixelEllipse(g, 240, 192, 145, 14, PAL.sand);
  pixelEllipse(g, 240, 196, 130, 8, PAL.sandLight);

  // A few small rocks/decorations along beach
  const rocks: Array<[number, number, number]> = [
    [120, 195, 0x9a8a6a],
    [360, 196, 0x9a8a6a],
    [300, 200, 0x8c7a5a],
    [165, 200, 0x8c7a5a],
  ];
  for (const [x, y, c] of rocks) {
    px(g, x, y, 3, 2, c);
    px(g, x + 1, y - 1, 1, 1, c);
  }

  // Pixel shells scattered on beach
  const shellColor = 0xfff0d6;
  const shellPink = 0xffc4c4;
  const shells: Array<[number, number, number]> = [
    [148, 199, shellPink],
    [200, 202, shellColor],
    [275, 201, shellColor],
    [315, 203, shellPink],
    [220, 200, shellColor],
    [180, 204, shellPink],
    [340, 202, shellColor],
  ];
  for (const [x, y, c] of shells) {
    px(g, x, y, 1, 1, c);
    px(g, x - 1, y, 1, 1, c);
    px(g, x + 1, y, 1, 1, c);
    px(g, x, y - 1, 1, 1, c);
  }

  parent.addChild(g);
}

// ─── Roads (cobblestone) ──────────────────────────────────────────────────────
function drawRoads(parent: Container) {
  const g = new Graphics();
  const stoneA = 0xddc9a4;
  const stoneB = 0xc8b48a;

  // Plaza (center), large oblong
  const plazaCX = 240;
  const plazaCY = 168;
  pixelEllipse(g, plazaCX, plazaCY, 26, 9, stoneA);
  pixelEllipse(g, plazaCX, plazaCY, 22, 7, stoneB, 0.5);

  // Helper to paint a road segment between two points
  const drawRoadStrip = (x1: number, y1: number, x2: number, y2: number, width: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(1, Math.round(Math.hypot(dx, dy)));
    for (let i = 0; i <= len; i++) {
      const t = i / len;
      const x = Math.round(x1 + dx * t);
      const y = Math.round(y1 + dy * t);
      // checkerboard cobblestone pattern
      for (let oy = -Math.floor(width / 2); oy <= Math.floor(width / 2); oy++) {
        for (let ox = -Math.floor(width / 2); ox <= Math.floor(width / 2); ox++) {
          const c = ((x + ox + y + oy) % 2 === 0) ? stoneA : stoneB;
          px(g, x + ox, y + oy, 1, 1, c);
        }
      }
    }
  };

  // Roads radiating from plaza
  drawRoadStrip(plazaCX, plazaCY, 175, 162, 3); // to bakery
  drawRoadStrip(plazaCX, plazaCY, 305, 162, 3); // to coffee
  drawRoadStrip(plazaCX, plazaCY, 240, 148, 3); // to palace
  drawRoadStrip(plazaCX, plazaCY, 240, 184, 3); // to market
  drawRoadStrip(plazaCX, plazaCY, 130, 175, 3); // west perim
  drawRoadStrip(plazaCX, plazaCY, 350, 175, 3); // east perim
  drawRoadStrip(240, 184, 240, 198, 3); // market → beach

  parent.addChild(g);
}

// ─── Palace ──────────────────────────────────────────────────────────────────
function drawPalace(parent: Container) {
  // Footprint center: (240, 130). 2-story white cube w/ blue dome + balcony.
  const g = new Graphics();

  // Shadow on ground
  px(g, 215, 152, 50, 4, PAL.shadow, 0.25);

  // ── Body (2-story) ──
  // Lower story
  px(g, 218, 134, 44, 18, PAL.white);
  // Upper story (slightly inset)
  px(g, 222, 116, 36, 18, PAL.white);
  // Wall shading (left side darker)
  px(g, 218, 134, 4, 18, PAL.whiteShade);
  px(g, 222, 116, 4, 18, PAL.whiteShade);
  // Floor divider line
  px(g, 218, 133, 44, 1, PAL.whiteDark);

  // Windows (lower story, 2 small)
  for (const wx of [226, 252]) {
    px(g, wx, 140, 6, 7, PAL.dome);
    px(g, wx + 1, 141, 4, 5, PAL.domeHi);
    px(g, wx + 3, 140, 1, 7, PAL.white); // mullion vertical
    px(g, wx, 143, 6, 1, PAL.white); // mullion horizontal
  }
  // Window box flowers under each window
  for (const wx of [225, 251]) {
    px(g, wx, 147, 8, 1, PAL.wood);
    px(g, wx + 1, 146, 1, 1, 0xff8aa6);
    px(g, wx + 3, 146, 1, 1, 0xffd86a);
    px(g, wx + 5, 146, 1, 1, 0xff8aa6);
  }

  // Windows (upper story)
  for (const wx of [228, 246]) {
    px(g, wx, 122, 6, 7, PAL.dome);
    px(g, wx + 1, 123, 4, 5, PAL.domeHi);
    px(g, wx + 3, 122, 1, 7, PAL.white);
    px(g, wx, 125, 6, 1, PAL.white);
  }

  // ── Door ──
  px(g, 237, 145, 6, 7, PAL.wood);
  px(g, 238, 146, 4, 5, PAL.woodLight);
  px(g, 241, 148, 1, 1, 0xffe8a0); // doorknob

  // ── Balcony patio (front, ground-level, where the man hangs laundry) ──
  // patio floor extends south of the palace base
  px(g, 218, 152, 44, 4, PAL.stone);
  px(g, 218, 152, 44, 1, PAL.stoneShade);
  px(g, 218, 156, 44, 1, PAL.shadow, 0.35);
  // railing posts at the corners (just for shape; we leave the front open
  // so the man and clothesline read clearly)
  px(g, 218, 150, 1, 3, PAL.whiteDark);
  px(g, 261, 150, 1, 3, PAL.whiteDark);

  // Clothesline (on the front balcony, above the man's reaching hand)
  // Pole left
  px(g, 222, 135, 1, 18, PAL.wood);
  // Pole right
  px(g, 258, 135, 1, 18, PAL.wood);
  // Crossbar / line itself
  px(g, 222, 135, 37, 1, 0x6b5a3e);
  // Tiny tops on the poles
  px(g, 221, 134, 3, 1, PAL.wood);
  px(g, 257, 134, 3, 1, PAL.wood);

  // ── Dome ──
  // Drum
  px(g, 232, 105, 16, 4, PAL.white);
  px(g, 232, 105, 4, 4, PAL.whiteShade);
  // Dome itself (use ellipse-ish shape via triangular stack)
  for (let dy = 0; dy < 8; dy++) {
    const wHalf = Math.round(Math.cos((dy / 8) * (Math.PI / 2)) * 7);
    const startY = 97 + dy;
    px(g, 240 - wHalf, startY, wHalf * 2, 1, PAL.dome);
    // highlight on left side
    px(g, 240 - wHalf, startY, Math.max(1, Math.round(wHalf / 2)), 1, PAL.domeHi);
  }
  // Dome shadow rim
  px(g, 233, 104, 14, 1, PAL.domeShade);
  // Cross/finial on top of dome
  px(g, 240, 93, 1, 4, PAL.wood);
  px(g, 239, 94, 3, 1, PAL.wood);

  // Tiny flag pole on side
  px(g, 261, 102, 1, 5, PAL.wood);
  px(g, 262, 103, 4, 3, PAL.awningRed);

  parent.addChild(g);
}

// ─── Bakery ───────────────────────────────────────────────────────────────────
function drawBakery(parent: Container, anchors: IslandAnchors) {
  const g = new Graphics();
  const cx = 175;
  const cy = 158;

  // Shadow
  px(g, cx - 12, cy + 4, 26, 3, PAL.shadow, 0.25);

  // Body
  px(g, cx - 12, cy - 18, 26, 22, PAL.white);
  px(g, cx - 12, cy - 18, 4, 22, PAL.whiteShade); // left shade
  // Roof line
  px(g, cx - 13, cy - 19, 28, 1, PAL.whiteDark);

  // Awning (red striped)
  for (let i = 0; i < 26; i++) {
    px(g, cx - 12 + i, cy - 12, 1, 3, i % 2 === 0 ? PAL.awningRed : PAL.awningCream);
  }
  px(g, cx - 13, cy - 12, 28, 1, PAL.awningRed);

  // Window with bread display
  px(g, cx - 9, cy - 9, 17, 7, PAL.stone);
  // bread loaves
  px(g, cx - 7, cy - 7, 4, 3, PAL.bread);
  px(g, cx - 6, cy - 8, 2, 1, PAL.bread);
  px(g, cx - 1, cy - 7, 4, 3, PAL.bread);
  px(g, cx, cy - 8, 2, 1, PAL.bread);
  px(g, cx + 5, cy - 7, 3, 3, PAL.bread);

  // Door
  px(g, cx + 5, cy - 1, 5, 5, PAL.wood);
  px(g, cx + 6, cy, 3, 4, PAL.woodLight);
  px(g, cx + 8, cy + 2, 1, 1, 0xffe8a0);

  // Sign "B"
  px(g, cx - 10, cy - 16, 5, 3, PAL.wood);
  px(g, cx - 9, cy - 15, 3, 1, PAL.awningCream);

  // Chimney
  px(g, cx + 8, cy - 23, 3, 5, PAL.stoneShade);
  px(g, cx + 8, cy - 23, 3, 1, PAL.shadow);

  anchors.bakeryChimney = { x: cx + 9, y: cy - 23 };

  parent.addChild(g);
}

// ─── Coffee shop ──────────────────────────────────────────────────────────────
function drawCoffeeShop(parent: Container, anchors: IslandAnchors) {
  const g = new Graphics();
  const cx = 305;
  const cy = 158;

  // Shadow
  px(g, cx - 12, cy + 4, 26, 3, PAL.shadow, 0.25);

  // Body
  px(g, cx - 12, cy - 16, 24, 20, PAL.white);
  px(g, cx - 12, cy - 16, 4, 20, PAL.whiteShade);
  px(g, cx - 13, cy - 17, 26, 1, PAL.whiteDark);

  // Door
  px(g, cx - 5, cy - 4, 5, 8, PAL.wood);
  px(g, cx - 4, cy - 3, 3, 7, PAL.woodLight);
  px(g, cx - 2, cy, 1, 1, 0xffe8a0);

  // Window
  px(g, cx + 3, cy - 11, 8, 6, PAL.dome);
  px(g, cx + 4, cy - 10, 6, 4, PAL.domeHi);
  px(g, cx + 6, cy - 11, 1, 6, PAL.white);
  px(g, cx + 3, cy - 8, 8, 1, PAL.white);

  // Striped awning above door
  for (let i = 0; i < 14; i++) {
    px(g, cx - 11 + i, cy - 13, 1, 2, i % 2 === 0 ? PAL.awningBlue : PAL.awningCream);
  }

  // Sign
  px(g, cx + 3, cy - 15, 8, 2, PAL.wood);

  // Terrace tables (3 little round tables in front)
  const tables: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 3; i++) {
    const tx = cx - 11 + i * 9;
    const ty = cy + 7;
    // Table top
    px(g, tx, ty, 5, 2, PAL.stone);
    px(g, tx, ty, 5, 1, PAL.stoneShade);
    // Leg
    px(g, tx + 2, ty + 2, 1, 2, PAL.stoneShade);
    // Cup
    px(g, tx + 1, ty - 1, 3, 1, PAL.white);
    px(g, tx + 1, ty - 2, 3, 1, PAL.whiteDark);
    px(g, tx + 4, ty - 1, 1, 1, PAL.white); // handle
    tables.push({ x: tx + 2, y: ty - 2 });
  }

  anchors.coffeeTables = tables;

  parent.addChild(g);
}

// ─── Market stalls ────────────────────────────────────────────────────────────
function drawMarket(parent: Container) {
  const g = new Graphics();
  const cx = 240;
  const cy = 188;

  // Shadow
  px(g, cx - 28, cy + 5, 56, 2, PAL.shadow, 0.25);

  // 3 stalls
  const stalls = [
    { offset: -22, awning: PAL.awningRed, contentColor: PAL.fish },
    { offset: 0, awning: PAL.awningBlue, contentColor: PAL.fishPink },
    { offset: 22, awning: PAL.awningRed, contentColor: PAL.fish },
  ];
  for (const s of stalls) {
    const sx = cx + s.offset;
    // Posts
    px(g, sx - 8, cy - 8, 1, 8, PAL.wood);
    px(g, sx + 7, cy - 8, 1, 8, PAL.wood);
    // Striped awning
    for (let i = 0; i < 16; i++) {
      px(g, sx - 8 + i, cy - 9, 1, 3, i % 2 === 0 ? s.awning : PAL.awningCream);
    }
    // Counter
    px(g, sx - 8, cy - 1, 16, 4, PAL.wood);
    px(g, sx - 8, cy - 1, 16, 1, PAL.woodLight);
    // Display goods
    px(g, sx - 6, cy - 3, 3, 2, s.contentColor);
    px(g, sx - 2, cy - 3, 3, 2, s.contentColor);
    px(g, sx + 2, cy - 3, 4, 2, s.contentColor);
    // Eye on fish
    px(g, sx - 5, cy - 3, 1, 1, PAL.black);
    px(g, sx - 1, cy - 3, 1, 1, PAL.black);
    px(g, sx + 4, cy - 3, 1, 1, PAL.black);
  }

  parent.addChild(g);
}

// ─── Fountain ─────────────────────────────────────────────────────────────────
function drawFountain(parent: Container, anchors: IslandAnchors) {
  const g = new Graphics();
  const cx = 240;
  const cy = 168;

  // Bowl (ellipse-ish)
  pixelEllipse(g, cx, cy + 1, 8, 3, PAL.stoneShade);
  pixelEllipse(g, cx, cy, 7, 2, PAL.stone);
  // Inner water surface (animated by ambient)
  pixelEllipse(g, cx, cy - 1, 5, 2, 0x6cb6e6);
  // Center pillar
  px(g, cx - 1, cy - 5, 2, 4, PAL.stone);
  px(g, cx - 1, cy - 5, 2, 1, PAL.stoneShade);
  // Top spout
  px(g, cx, cy - 6, 1, 1, PAL.stoneShade);

  anchors.fountainCenter = { x: cx, y: cy - 1 };

  parent.addChild(g);
}

// ─── Trees / decorative bushes ───────────────────────────────────────────────
function drawDecorations(parent: Container) {
  const g = new Graphics();
  const trees: Array<[number, number]> = [
    [105, 175],
    [120, 145],
    [380, 175],
    [365, 142],
    [200, 132],
    [285, 132],
  ];
  for (const [x, y] of trees) {
    // trunk
    px(g, x, y, 1, 3, PAL.wood);
    // canopy
    px(g, x - 3, y - 4, 7, 4, PAL.grassDark);
    px(g, x - 2, y - 5, 5, 1, PAL.grassDark);
    px(g, x - 2, y - 4, 4, 2, PAL.grass);
  }

  // Cypress trees (tall)
  const cypresses: Array<[number, number]> = [
    [145, 130],
    [330, 130],
    [275, 178],
    [205, 178],
  ];
  for (const [x, y] of cypresses) {
    for (let i = 0; i < 8; i++) {
      const w = Math.max(1, 3 - Math.floor(i / 4));
      px(g, x - w, y - i, w * 2 + 1, 1, i < 4 ? PAL.grassDark : 0x6b8a4a);
    }
    px(g, x, y + 1, 1, 1, PAL.wood);
  }

  parent.addChild(g);
}

export function buildIsland(layers: Layers, _renderer: Renderer): IslandRefs {
  const anchors: IslandAnchors = {
    palaceCenter: { x: 240, y: 130 },
    balconyClothesline: { x1: 222, x2: 258, y: 135 },
    coffeeTables: [],
    bakeryChimney: { x: 0, y: 0 },
    fountainCenter: { x: 240, y: 167 },
  };

  // Back layer: ground + roads
  drawGround(layers.islandBack);
  drawRoads(layers.islandBack);

  // Mid layer: buildings (drawn back-to-front by y)
  // Order: palace (north), bakery, coffee (mid), fountain, market (south)
  drawPalace(layers.islandMid);
  drawBakery(layers.islandMid, anchors);
  drawCoffeeShop(layers.islandMid, anchors);
  drawDecorations(layers.islandMid);
  drawFountain(layers.islandMid, anchors);
  drawMarket(layers.islandMid);

  return {
    anchors,
    update(_dt: number) {
      // No island-level animation here; ambient module handles dynamics.
    },
  };
}
