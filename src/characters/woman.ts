import { Container, Renderer, Sprite, Graphics } from 'pixi.js';
import { PAL, WOMAN_BODY_LENGTH, WOMAN_DAMP, WOMAN_MAX_TILT_DEG, WOMAN_SPRING_K } from '../config';
import { pixelsToTexture, type PaletteMap, type PixelArt } from '../scene/sprites';

interface Layers {
  islandFront: Container;
  ui: Container;
}

interface Cursor {
  x: number;
  y: number;
  inside: boolean;
}

export interface WomanRefs {
  update: (dt: number, cursor: Cursor) => void;
}

const PALETTE: PaletteMap = {
  H: PAL.womanHair,
  h: PAL.womanHairShade,
  K: PAL.womanRibbon,
  S: PAL.womanSkin,
  s: PAL.womanSkinShade,
  E: PAL.womanEye,
  o: PAL.womanLip,
  W: PAL.womanDress,
  w: PAL.womanDressShade,
  B: PAL.manShoe,
  R: PAL.bouquet,
  L: PAL.bouquetLeaf,
};

// 11 wide × 22 tall. Anchor (0.5, 0) — TOP-CENTER is the hand at the cursor.
// Row 0: nothing (the cursor itself sits where the hand reaches up).
const WOMAN: PixelArt = [
  '.....SS....', // hand reaching up
  '.....S.....', // wrist
  '.....s.....', // arm
  '.....s.....',
  '....HHHH...', // top of bun
  '...HHhhHH..',
  '...HKKKHH..', // ribbon across bun
  '...HhHhHH..',
  '....HSSh...', // forehead/hair edge
  '...HSSSSh..',
  '...sSESEs..', // eyes
  '...SSsSSS..',
  '...SsoSsS..', // mouth
  '....sSSs...',
  '...wWWWWw..', // shoulders
  '..WWWWWWWW.',
  '..WWWWWWWW.',
  '..WWWWWWWW.', // dress
  '..WWWWWWWW.',
  '..wWWWWWWw.',
  '...sSSSSs..', // legs
  '...BBBBBB..', // shoes
];

interface WState {
  theta: number; // pendulum angle (rad), 0 = hanging straight down
  omega: number; // angular velocity
  prevCursorX: number;
  prevCursorY: number;
  prevCursorVX: number;
  prevCursorVY: number;
  time: number;
  initialized: boolean;
}

export function buildWoman(layers: Layers, renderer: Renderer): WomanRefs {
  const tex = pixelsToTexture(WOMAN, PALETTE, renderer);
  const sprite = new Sprite(tex);
  // Pivot at the hand (top center of the sprite).
  sprite.anchor.set(0.5, 0);

  // Soft glow around her so she reads against the sky.
  const glow = new Graphics();
  glow.circle(0, 6, 9).fill({ color: 0xffe9d4, alpha: 0.18 });
  glow.circle(0, 6, 6).fill({ color: 0xffffff, alpha: 0.12 });

  // Tiny shadow she casts when she's over the island
  const shadow = new Graphics();
  shadow.ellipse(0, 0, 5, 1).fill({ color: PAL.shadow, alpha: 0.25 });

  // Add to top-most so she's above everything.
  layers.ui.addChild(shadow);
  layers.ui.addChild(glow);
  layers.ui.addChild(sprite);

  // Pendulum constants
  const L = WOMAN_BODY_LENGTH;
  const omega0sq = WOMAN_SPRING_K / L; // restoring "stiffness/L" ~ g/L
  const omega0 = Math.sqrt(omega0sq);
  const zeta = WOMAN_DAMP / (2 * omega0); // damping ratio

  const ws: WState = {
    theta: 0,
    omega: 0,
    prevCursorX: 0,
    prevCursorY: 0,
    prevCursorVX: 0,
    prevCursorVY: 0,
    time: 0,
    initialized: false,
  };

  return {
    update(dt, cursor) {
      ws.time += dt;
      const cx = cursor.x;
      const cy = cursor.y;

      // First frame: snap state to cursor so we don't get a giant acceleration
      // impulse from prev=(0,0).
      if (!ws.initialized) {
        ws.prevCursorX = cx;
        ws.prevCursorY = cy;
        ws.prevCursorVX = 0;
        ws.prevCursorVY = 0;
        ws.initialized = true;
      }

      // Clamp dt: long browser stalls (alt-tab, devtools) can produce
      // huge dt's that would otherwise blow the integrator up.
      const sdt = Math.min(dt, 0.05);

      // Cursor velocity & acceleration
      const cvx = (cx - ws.prevCursorX) / Math.max(sdt, 1e-3);
      const cvy = (cy - ws.prevCursorY) / Math.max(sdt, 1e-3);
      const cax = (cvx - ws.prevCursorVX) / Math.max(sdt, 1e-3);
      // We use horizontal acceleration as the swing driver; vertical
      // shake mostly looks like noise on a pendulum so we ignore it.

      // Pendulum dynamics:
      //   θ̈ = -ω₀² sin θ  -  2ζω₀ θ̇  -  (ax/L) cos θ  +  small idle sway
      const idleSway = Math.sin(ws.time * 0.9) * 0.08;
      const angAcc =
        -omega0sq * Math.sin(ws.theta) -
        2 * zeta * omega0 * ws.omega -
        (cax / L) * Math.cos(ws.theta) +
        idleSway * 0.6;

      ws.omega += angAcc * sdt;
      ws.theta += ws.omega * sdt;

      // Clamp tilt
      const maxRad = (WOMAN_MAX_TILT_DEG * Math.PI) / 180;
      if (ws.theta > maxRad) {
        ws.theta = maxRad;
        if (ws.omega > 0) ws.omega *= -0.4;
      } else if (ws.theta < -maxRad) {
        ws.theta = -maxRad;
        if (ws.omega < 0) ws.omega *= -0.4;
      }

      ws.prevCursorX = cx;
      ws.prevCursorY = cy;
      ws.prevCursorVX = cvx;
      ws.prevCursorVY = cvy;

      // Position sprite at cursor with pivot at top (hand).
      sprite.x = Math.round(cx);
      sprite.y = Math.round(cy);
      sprite.rotation = ws.theta;

      glow.x = sprite.x;
      glow.y = sprite.y + 14;

      // Shadow falls a few pixels below feet at the body's base position.
      const bodyEndX = cx + Math.sin(ws.theta) * (L + 8);
      const bodyEndY = cy + Math.cos(ws.theta) * (L + 8);
      shadow.x = Math.round(bodyEndX);
      shadow.y = Math.round(bodyEndY) + 1;
      // Hide the shadow when she's over the sky (above horizon)
      shadow.visible = bodyEndY > 150 && bodyEndY < 270;
    },
  };
}
