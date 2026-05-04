import { Container, Graphics, Renderer, Sprite } from 'pixi.js';
import { PAL, VIEW_W, VIEW_H, DOLPHIN_INTERVAL_MIN_MS, DOLPHIN_INTERVAL_MAX_MS, BIRD_INTERVAL_MIN_MS, BIRD_INTERVAL_MAX_MS } from '../config';
import { pixelsToTexture, type PaletteMap, type PixelArt } from './sprites';
import type { IslandRefs } from './island';

interface Layers {
  islandBack: Container;
  islandMid: Container;
  islandFront: Container;
  seaSurface: Container;
  sky: Container;
}

export interface AmbientRefs {
  update: (dt: number) => void;
}

interface SteamPuff {
  x: number;
  y: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
}

interface Dolphin {
  active: boolean;
  startX: number;
  endX: number;
  baseY: number;
  apex: number; // peak height above baseY
  t: number; // 0..1
  duration: number;
}

interface Bird {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  flap: number;
}

const DOLPHIN_PIXELS: PixelArt = [
  '..bbb...',
  '.bbbbbb.',
  'bbbbbbbb',
  '.bbwwbbb',
  '..bb.bb.',
];

const SPLASH: PixelArt = [
  'w.w.w',
  '.www.',
  'wwwww',
];

export function buildAmbient(layers: Layers, renderer: Renderer, island: IslandRefs): AmbientRefs {
  // ─── Coffee steam, fountain spray, chimney smoke (all use one Graphics) ───
  const particles = new Graphics();
  layers.islandFront.addChild(particles);

  const steam: SteamPuff[] = [];
  const smoke: SteamPuff[] = [];
  const fountainSpray: SteamPuff[] = [];

  let timeSinceSteamSpawn = 0;
  let timeSinceSmokeSpawn = 0;
  let timeSinceSpraySpawn = 0;

  // ─── Dolphins ────────────────────────────────────────────────────────────
  const dolphinPalette: PaletteMap = { b: 0x2a3d52, w: PAL.white };
  const dolphinTex = pixelsToTexture(DOLPHIN_PIXELS, dolphinPalette, renderer);
  const splashPalette: PaletteMap = { w: 0xffffff, '.': 0 };
  const splashTex = pixelsToTexture(SPLASH, splashPalette, renderer);

  const dolphinSprite = new Sprite(dolphinTex);
  dolphinSprite.anchor.set(0.5, 1.0);
  dolphinSprite.visible = false;
  layers.seaSurface.addChild(dolphinSprite);

  const splashSprite = new Sprite(splashTex);
  splashSprite.anchor.set(0.5, 1.0);
  splashSprite.visible = false;
  layers.seaSurface.addChild(splashSprite);

  const dolphin: Dolphin = {
    active: false,
    startX: 0,
    endX: 0,
    baseY: 200,
    apex: 10,
    t: 0,
    duration: 1.4,
  };
  let dolphinNextSpawnMs = 1500;
  let dolphinSinceLastMs = 0;
  let splashTimer = 0;

  // ─── Birds ───────────────────────────────────────────────────────────────
  const birdsG = new Graphics();
  layers.sky.addChild(birdsG);
  const birds: Bird[] = [
    { active: false, x: 0, y: 0, vx: 0, flap: 0 },
    { active: false, x: 0, y: 0, vx: 0, flap: 0 },
    { active: false, x: 0, y: 0, vx: 0, flap: 0 },
  ];
  let birdNextSpawnMs = 4000;
  let birdSinceLastMs = 0;

  function spawnBird() {
    const free = birds.find((b) => !b.active);
    if (!free) return;
    free.active = true;
    free.y = 25 + Math.random() * 50;
    const goingRight = Math.random() < 0.5;
    free.x = goingRight ? -10 : VIEW_W + 10;
    free.vx = (goingRight ? 1 : -1) * (18 + Math.random() * 10);
    free.flap = Math.random() * Math.PI;
  }

  // ─── Fountain water ripple (animated 4-frame loop on bowl) ──────────────
  const fountainWater = new Graphics();
  layers.islandMid.addChild(fountainWater);

  return {
    update(dt) {
      const dtMs = dt * 1000;
      particles.clear();

      // ─ Steam from coffee cups ─
      timeSinceSteamSpawn += dt;
      if (timeSinceSteamSpawn > 0.18) {
        timeSinceSteamSpawn = 0;
        for (const t of island.anchors.coffeeTables) {
          if (Math.random() < 0.7) {
            steam.push({
              x: t.x + (Math.random() - 0.5) * 1.5,
              y: t.y - 1,
              vy: -10 - Math.random() * 5,
              life: 0,
              ttl: 1.4 + Math.random() * 0.6,
              size: 1 + Math.floor(Math.random() * 2),
            });
          }
        }
      }
      for (let i = steam.length - 1; i >= 0; i--) {
        const p = steam[i];
        p.life += dt;
        if (p.life >= p.ttl) {
          steam.splice(i, 1);
          continue;
        }
        p.x += Math.sin((p.life + i) * 2.0) * dt * 1.5;
        p.y += p.vy * dt;
        const alpha = (1 - p.life / p.ttl) * 0.7;
        const size = p.size + Math.floor(p.life * 1.5);
        particles.rect(Math.round(p.x), Math.round(p.y), size, size).fill({ color: PAL.steam, alpha });
      }

      // ─ Smoke from bakery chimney ─
      timeSinceSmokeSpawn += dt;
      if (timeSinceSmokeSpawn > 0.4) {
        timeSinceSmokeSpawn = 0;
        smoke.push({
          x: island.anchors.bakeryChimney.x,
          y: island.anchors.bakeryChimney.y,
          vy: -7,
          life: 0,
          ttl: 2.2,
          size: 2,
        });
      }
      for (let i = smoke.length - 1; i >= 0; i--) {
        const p = smoke[i];
        p.life += dt;
        if (p.life >= p.ttl) {
          smoke.splice(i, 1);
          continue;
        }
        p.x += Math.sin((p.life + i * 0.5) * 1.5) * dt * 3;
        p.y += p.vy * dt;
        const alpha = (1 - p.life / p.ttl) * 0.55;
        const size = p.size + Math.floor(p.life * 2);
        particles.rect(Math.round(p.x), Math.round(p.y), size, size).fill({ color: 0xeae0d2, alpha });
      }

      // ─ Fountain spray (small particles) ─
      timeSinceSpraySpawn += dt;
      if (timeSinceSpraySpawn > 0.06) {
        timeSinceSpraySpawn = 0;
        for (let k = 0; k < 2; k++) {
          fountainSpray.push({
            x: island.anchors.fountainCenter.x,
            y: island.anchors.fountainCenter.y - 4,
            vy: -22 - Math.random() * 8,
            life: 0,
            ttl: 0.5 + Math.random() * 0.2,
            size: 1,
          });
        }
      }
      for (let i = fountainSpray.length - 1; i >= 0; i--) {
        const p = fountainSpray[i];
        p.life += dt;
        if (p.life >= p.ttl) {
          fountainSpray.splice(i, 1);
          continue;
        }
        // simple ballistic
        p.x += Math.sin((p.life + i * 0.7) * 6) * dt * 8;
        p.vy += 60 * dt; // gravity
        p.y += p.vy * dt;
        const alpha = 0.85 - p.life / p.ttl;
        particles.rect(Math.round(p.x), Math.round(p.y), 1, 1).fill({ color: 0xc0e6ff, alpha });
      }

      // ─ Fountain water surface ripple ─
      fountainWater.clear();
      const fc = island.anchors.fountainCenter;
      const phase = Math.floor(((Date.now() / 200) % 4));
      for (let r = 1; r <= 3; r++) {
        const drawIt = ((phase + r) % 4) < 2;
        if (!drawIt) continue;
        for (let dx = -r; dx <= r; dx++) {
          const dyAbs = Math.round(Math.sqrt(r * r - dx * dx) * 0.4);
          if (dyAbs > 1) continue;
          fountainWater.rect(fc.x + dx, fc.y - dyAbs, 1, 1).fill({ color: 0xc0e6ff, alpha: 0.65 });
        }
      }

      // ─ Dolphins ─
      dolphinSinceLastMs += dtMs;
      if (!dolphin.active && dolphinSinceLastMs >= dolphinNextSpawnMs) {
        dolphinSinceLastMs = 0;
        dolphinNextSpawnMs =
          DOLPHIN_INTERVAL_MIN_MS + Math.random() * (DOLPHIN_INTERVAL_MAX_MS - DOLPHIN_INTERVAL_MIN_MS);
        const goingRight = Math.random() < 0.5;
        // pick a y *below* the island
        const baseY = 235 + Math.random() * 25;
        const startX = goingRight ? -10 : VIEW_W + 10;
        const endX = startX + (goingRight ? 1 : -1) * (60 + Math.random() * 40);
        dolphin.active = true;
        dolphin.t = 0;
        dolphin.duration = 1.4 + Math.random() * 0.4;
        dolphin.startX = startX;
        dolphin.endX = endX;
        dolphin.baseY = baseY;
        dolphin.apex = 10 + Math.random() * 6;
        dolphinSprite.scale.x = goingRight ? 1 : -1;
        dolphinSprite.visible = true;
      }

      if (dolphin.active) {
        dolphin.t += dt / dolphin.duration;
        if (dolphin.t >= 1) {
          dolphin.active = false;
          dolphinSprite.visible = false;
          // splash at landing
          splashSprite.x = Math.round(dolphin.endX);
          splashSprite.y = Math.round(dolphin.baseY);
          splashSprite.visible = true;
          splashTimer = 0.35;
        } else {
          const t = dolphin.t;
          const x = dolphin.startX + (dolphin.endX - dolphin.startX) * t;
          // arc: -4 sin(πt) * apex, but more vertical stretch near peak
          const y = dolphin.baseY - Math.sin(t * Math.PI) * dolphin.apex;
          dolphinSprite.x = Math.round(x);
          dolphinSprite.y = Math.round(y);
          // tilt up on ascent, down on descent
          const angle = Math.cos(t * Math.PI) * 0.6;
          dolphinSprite.rotation = (dolphinSprite.scale.x === 1 ? -angle : angle) * 0.5;
        }
      }

      if (splashTimer > 0) {
        splashTimer -= dt;
        if (splashTimer <= 0) splashSprite.visible = false;
      }

      // ─ Birds ─
      birdSinceLastMs += dtMs;
      if (birdSinceLastMs >= birdNextSpawnMs) {
        birdSinceLastMs = 0;
        birdNextSpawnMs =
          BIRD_INTERVAL_MIN_MS + Math.random() * (BIRD_INTERVAL_MAX_MS - BIRD_INTERVAL_MIN_MS);
        spawnBird();
      }

      birdsG.clear();
      for (const b of birds) {
        if (!b.active) continue;
        b.x += b.vx * dt;
        b.flap += dt * 7;
        if (b.x < -20 || b.x > VIEW_W + 20) {
          b.active = false;
          continue;
        }
        // a tiny pixel "M" silhouette: two tilted strokes that flap
        const flapUp = Math.sin(b.flap) > 0;
        const x = Math.round(b.x);
        const y = Math.round(b.y);
        const c = 0x2a1f3d;
        if (flapUp) {
          birdsG.rect(x - 2, y - 1, 1, 1).fill(c);
          birdsG.rect(x - 1, y, 1, 1).fill(c);
          birdsG.rect(x, y, 1, 1).fill(c);
          birdsG.rect(x + 1, y, 1, 1).fill(c);
          birdsG.rect(x + 2, y - 1, 1, 1).fill(c);
        } else {
          birdsG.rect(x - 2, y, 1, 1).fill(c);
          birdsG.rect(x - 1, y - 1, 1, 1).fill(c);
          birdsG.rect(x, y, 1, 1).fill(c);
          birdsG.rect(x + 1, y - 1, 1, 1).fill(c);
          birdsG.rect(x + 2, y, 1, 1).fill(c);
        }
      }
    },
  };
}
