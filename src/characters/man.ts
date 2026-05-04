import { Container, Renderer, Sprite, Texture, Graphics } from 'pixi.js';
import { PAL, MAN_LAUNDRY_TIME_MS, MAN_REPLAN_MS, MAN_SPEED_PX_PER_SEC, MAN_FOLLOW_RANGE_PX, VIEW_W, VIEW_H } from '../config';
import { pixelsToTexture, type PaletteMap, type PixelArt } from '../scene/sprites';
import { aStar, nearestNode, type Graph, type Node } from '../scene/pathfinding';

interface Layers {
  islandFront: Container;
  ui: Container;
}

interface Cursor {
  x: number;
  y: number;
  inside: boolean;
}

export interface ManRefs {
  update: (dt: number, cursor: Cursor) => void;
}

// ─── Pixel art ───────────────────────────────────────────────────────────────
const PALETTE: PaletteMap = {
  H: PAL.manHair,
  S: PAL.manSkin,
  s: PAL.manSkinShade,
  E: PAL.outline,
  W: PAL.manShirt,
  w: PAL.manShirtShade,
  P: PAL.manPants,
  p: PAL.manPantsShade,
  B: PAL.manShoe,
  F: PAL.bouquet, // bouquet flowers
  L: PAL.bouquetLeaf,
  K: 0xffd86a, // clothespin yellow
  o: PAL.outline,
};

// 11 wide × 17 tall facing right.
// idle laundry frame 1: arms raised pinning clothespin (right hand up)
const MAN_LAUNDRY_1: PixelArt = [
  '.....K.....',
  '...HHHHK...',
  '..HHsHHH...',
  '..HSSSSH...',
  '..sSESEs..K',
  '..SSsSSS..K',
  '..SsoSsS..K',
  '...sSSs....',
  '..wWWWWw...',
  '..WWWWWW..K',
  '.WWWWWWW..K',
  '..wWWWWw...',
  '..pPPPPp...',
  '..pPPPPp...',
  '..pP..Pp...',
  '..BB..BB...',
  '..BB..BB...',
];
// idle laundry frame 2: arms lowered, both hanging
const MAN_LAUNDRY_2: PixelArt = [
  '...........',
  '...HHHHH...',
  '..HHsHHH...',
  '..HSSSSH...',
  '..sSESEs...',
  '..SSsSSS...',
  '..SsoSsS...',
  '...sSSs....',
  '..wWWWWw...',
  '.WWWWWWWW..',
  'WWWWWWWWW..',
  '..wWWWWw...',
  '..pPPPPp...',
  '..pPPPPp...',
  '..pP..Pp...',
  '..BB..BB...',
  '..BB..BB...',
];
// walk frame A: legs together
const MAN_WALK_1: PixelArt = [
  '...........',
  '...HHHHH...',
  '..HHsHHH.LL',
  '..HSSSSH.FF',
  '..sSESEs.FF',
  '..SSsSSS.LL',
  '..SsoSsS.S.',
  '...sSSs.SS.',
  '..wWWWWw.W.',
  '..WWWWWWWW.',
  '..WWWWWW...',
  '..wWWWWw...',
  '..pPPPPp...',
  '..pPPPPp...',
  '..pPPPPp...',
  '..BBBBBB...',
  '...........',
];
// walk frame B: legs apart, left forward (mid stride)
const MAN_WALK_2: PixelArt = [
  '...........',
  '...HHHHH...',
  '..HHsHHH.LL',
  '..HSSSSH.FF',
  '..sSESEs.FF',
  '..SSsSSS.LL',
  '..SsoSsS.S.',
  '...sSSs.SS.',
  '..wWWWWw.W.',
  '..WWWWWWWW.',
  '..WWWWWW...',
  '..wWWWWw...',
  '..pPPPPp...',
  '..pPPPPp...',
  '..pP..Pp...',
  '..BB..PP...',
  '...B...BB..',
];
// follow: holds bouquet up in right hand, looking forward
const MAN_FOLLOW: PixelArt = [
  '.......F.FL',
  '..HHHHH.FFF',
  '.HHsHHH.LFL',
  '.HSSSSH.FFF',
  '.sSESEs.FL.',
  '.SSsSSS.F..',
  '.SsoSsS.S..',
  '..sSSs.SS..',
  '.wWWWWw.W..',
  '.WWWWWWWW..',
  '.WWWWWW....',
  '.wWWWWw....',
  '.pPPPPp....',
  '.pPPPPp....',
  '.pPPPPp....',
  '.BBBBBB....',
  '...........',
];

// Heart for the trail
const HEART: PixelArt = [
  '.F.F.',
  'FFFFF',
  'FFFFF',
  '.FFF.',
  '..F..',
];

// Speech bubble with an exclamation mark
const BUBBLE: PixelArt = [
  'oooooo.',
  'oWWWWWo',
  'oWoEWWo',
  'oWoWWWo',
  'oWoWWWo',
  'oWWoWWo',
  'oWWWWWo',
  'oooooo.',
  '..oo...',
  '...o...',
];

// ─────────────────────────────────────────────────────────────────────────────
type State = 'IDLE_LAUNDRY' | 'TRANSITION' | 'WALKING' | 'FOLLOWING';

interface HeartInstance {
  sprite: Sprite;
  age: number;
  vx: number;
  vy: number;
}

interface ManState {
  state: State;
  // Animation
  animTime: number;
  // Position (the *foot* anchor)
  x: number;
  y: number;
  // Path traversal
  path: Node[];
  pathIndex: number;
  facingRight: boolean;
  // Replan timer
  sinceReplanMs: number;
  sinceStartMs: number;
  bubbleShownAt: number | null;
  // Trail
  hearts: HeartInstance[];
  sinceHeartSpawn: number;
}

export function buildMan(layers: Layers, renderer: Renderer, graph: Graph): ManRefs {
  const t_laundry1 = pixelsToTexture(MAN_LAUNDRY_1, PALETTE, renderer);
  const t_laundry2 = pixelsToTexture(MAN_LAUNDRY_2, PALETTE, renderer);
  const t_walk1 = pixelsToTexture(MAN_WALK_1, PALETTE, renderer);
  const t_walk2 = pixelsToTexture(MAN_WALK_2, PALETTE, renderer);
  const t_follow = pixelsToTexture(MAN_FOLLOW, PALETTE, renderer);
  const t_bubble = pixelsToTexture(BUBBLE, PALETTE, renderer);
  const t_heart = pixelsToTexture(HEART, PALETTE, renderer);

  const sprite = new Sprite(t_laundry1);
  // Anchor at bottom-center so we can position by feet.
  sprite.anchor.set(0.5, 1.0);

  // Drop shadow under feet
  const shadow = new Graphics();
  shadow.ellipse(0, 0, 5, 1.5).fill({ color: PAL.shadow, alpha: 0.35 });

  const bubble = new Sprite(t_bubble);
  bubble.anchor.set(0.5, 1.0);
  bubble.visible = false;

  // Laundry on the clothesline (animated sway here so it shares state)
  // anchored at clothesline y=110, x range 222..260
  const laundry = new Graphics();

  // Wrap so we can z-sort laundry appropriately.
  layers.islandFront.addChild(laundry);
  layers.islandFront.addChild(shadow);
  layers.islandFront.addChild(sprite);
  layers.islandFront.addChild(bubble);

  // Initial position: balcony / clothesline base, aligned with the patio
  const startX = 240;
  const startY = 152; // feet on the front balcony patio

  const ms: ManState = {
    state: 'IDLE_LAUNDRY',
    animTime: 0,
    x: startX,
    y: startY,
    path: [],
    pathIndex: 0,
    facingRight: true,
    sinceReplanMs: 0,
    sinceStartMs: 0,
    bubbleShownAt: null,
    hearts: [],
    sinceHeartSpawn: 0,
  };

  function setSprite(tex: Texture) {
    sprite.texture = tex;
  }

  function planPathTo(targetNode: Node) {
    // Find the graph node nearest to current position
    const cur = nearestNode(graph, ms.x, ms.y);
    if (cur.id === targetNode.id) {
      ms.path = [cur];
      ms.pathIndex = 0;
      return;
    }
    const path = aStar(graph, cur.id, targetNode.id);
    if (!path) return;
    ms.path = path;
    ms.pathIndex = 1; // skip current node
  }

  // Hanging clothes on the balcony clothesline (drawn each frame so they sway).
  // Line itself is at y=135 on the palace; clothes hang downward from there.
  const clothesY = 136;
  const clothesItems = [
    { x: 225, color: PAL.womanDress, w: 4, h: 6 },
    { x: 232, color: PAL.awningRed, w: 5, h: 5 },
    { x: 239, color: PAL.dome, w: 4, h: 6 },
    { x: 246, color: PAL.bouquet, w: 5, h: 5 },
    { x: 253, color: PAL.manShirt, w: 4, h: 6 },
  ];

  return {
    update(dt, cursor) {
      ms.animTime += dt;
      ms.sinceStartMs += dt * 1000;
      ms.sinceReplanMs += dt * 1000;

      // Sway hanging laundry every frame (cute)
      laundry.clear();
      for (const c of clothesItems) {
        const sway = Math.sin(ms.animTime * 1.3 + c.x * 0.2) * 1.2;
        const bow = Math.cos(ms.animTime * 1.7 + c.x * 0.3) * 0.5;
        const x = Math.round(c.x + sway);
        const y = Math.round(clothesY + bow);
        // pinch at top
        laundry.rect(x + 1, y, 1, 1).fill(0x4a3a26);
        laundry.rect(x + c.w - 2, y, 1, 1).fill(0x4a3a26);
        // body
        laundry.rect(x, y + 1, c.w, c.h).fill(c.color);
        // a slightly darker bottom hem
        laundry.rect(x, y + c.h, c.w, 1).fill({ color: 0x000000, alpha: 0.18 });
      }

      // ── Trail logic ──
      const isMoving = ms.state === 'WALKING';
      if (isMoving) {
        ms.sinceHeartSpawn += dt;
        if (ms.sinceHeartSpawn > 0.4) {
          ms.sinceHeartSpawn = 0;
          const hSprite = new Sprite(t_heart);
          hSprite.anchor.set(0.5);
          hSprite.x = ms.x + (Math.random() - 0.5) * 8;
          hSprite.y = ms.y - 12 + (Math.random() - 0.5) * 8;
          hSprite.scale.set(0.6 + Math.random() * 0.4);
          layers.islandFront.addChild(hSprite);
          ms.hearts.push({
            sprite: hSprite,
            age: 0,
            vx: (Math.random() - 0.5) * 10,
            vy: -15 - Math.random() * 15,
          });
        }
      }
      for (let i = ms.hearts.length - 1; i >= 0; i--) {
        const h = ms.hearts[i];
        h.age += dt;
        h.sprite.x += h.vx * dt;
        h.sprite.y += h.vy * dt;
        h.vy += 10 * dt; // slight gravity or drift
        const life = 2.0; // seconds
        const alpha = Math.max(0, 1 - h.age / life);
        h.sprite.alpha = alpha;
        h.sprite.scale.set(h.sprite.scale.x * 1.005); // slightly grow as it evaporates
        if (h.age >= life) {
          layers.islandFront.removeChild(h.sprite);
          h.sprite.destroy();
          ms.hearts.splice(i, 1);
        }
      }

      // ── State machine ──
      switch (ms.state) {
        case 'IDLE_LAUNDRY': {
          const f = Math.floor(ms.animTime * 1.6) % 2 === 0;
          setSprite(f ? t_laundry1 : t_laundry2);
          if (ms.sinceStartMs > MAN_LAUNDRY_TIME_MS) {
            // notice the woman: bubble pops up, then transition to WALKING
            ms.state = 'TRANSITION';
            ms.bubbleShownAt = performance.now();
          }
          break;
        }
        case 'TRANSITION': {
          setSprite(t_follow);
          bubble.visible = true;
          const since = performance.now() - (ms.bubbleShownAt ?? 0);
          if (since > 1500) {
            bubble.visible = false;
            // Step down off the balcony to the palace door
            ms.state = 'WALKING';
            const doorNode = graph.nodes.get('palace_door')!;
            ms.path = [doorNode];
            ms.pathIndex = 0;
          }
          break;
        }
        case 'WALKING': {
          // step animation
          const f = Math.floor(ms.animTime * 6) % 2 === 0;
          setSprite(f ? t_walk1 : t_walk2);

          // Replan periodically toward the cursor's nearest road node
          if (ms.sinceReplanMs >= MAN_REPLAN_MS) {
            ms.sinceReplanMs = 0;
            const cx = cursor.inside ? cursor.x : VIEW_W / 2;
            const cy = cursor.inside ? cursor.y : VIEW_H / 2;
            const target = nearestNode(graph, cx, cy);
            // Only replan if our final destination differs
            const finalNode = ms.path[ms.path.length - 1];
            if (!finalNode || finalNode.id !== target.id) {
              // Don't yank him mid-segment: build a new path from the *next*
              // node we're heading to, then prepend any remaining motion.
              const nextNode = ms.path[ms.pathIndex];
              if (nextNode) {
                const p = aStar(graph, nextNode.id, target.id);
                if (p) {
                  ms.path = p;
                  ms.pathIndex = 0;
                }
              } else {
                planPathTo(target);
              }
            }
          }

          // Move toward current target node along path
          const node = ms.path[ms.pathIndex];
          if (!node) {
            ms.state = 'FOLLOWING';
            break;
          }
          const dx = node.x - ms.x;
          const dy = node.y - ms.y;
          const d = Math.hypot(dx, dy);
          const step = MAN_SPEED_PX_PER_SEC * dt;
          if (d <= step) {
            ms.x = node.x;
            ms.y = node.y;
            ms.pathIndex++;
            if (ms.pathIndex >= ms.path.length) {
              // Reached end of path. Switch to FOLLOWING if cursor close.
              const cx = cursor.inside ? cursor.x : VIEW_W / 2;
              const cy = cursor.inside ? cursor.y : VIEW_H / 2;
              const dToCursor = Math.hypot(cx - ms.x, cy - ms.y);
              if (dToCursor < MAN_FOLLOW_RANGE_PX) {
                ms.state = 'FOLLOWING';
              }
            }
          } else {
            ms.x += (dx / d) * step;
            ms.y += (dy / d) * step;
            ms.facingRight = dx >= 0;
          }
          break;
        }
        case 'FOLLOWING': {
          setSprite(t_follow);
          // Stay where we are, but if cursor moves far enough, walk again.
          const cx = cursor.inside ? cursor.x : VIEW_W / 2;
          const cy = cursor.inside ? cursor.y : VIEW_H / 2;
          const dToCursor = Math.hypot(cx - ms.x, cy - ms.y);
          if (dToCursor > MAN_FOLLOW_RANGE_PX + 8) {
            ms.state = 'WALKING';
          }
          // Face the cursor
          ms.facingRight = cx >= ms.x;
          break;
        }
      }

      // Update sprite transform
      sprite.x = Math.round(ms.x);
      sprite.y = Math.round(ms.y);
      sprite.scale.x = ms.facingRight ? 1 : -1;

      // Subtle head/body lean toward cursor (attentive, not robotic)
      if (cursor.inside && ms.state !== 'IDLE_LAUNDRY') {
        const cx = cursor.x;
        const dx = cx - ms.x;
        const targetTilt = Math.max(-0.06, Math.min(0.06, dx / 140));
        sprite.rotation += (targetTilt - sprite.rotation) * 0.12;
      } else {
        sprite.rotation += (0 - sprite.rotation) * 0.1;
      }

      shadow.x = sprite.x;
      shadow.y = sprite.y + 1;

      bubble.x = sprite.x + 9;
      bubble.y = sprite.y - 16;
    },
  };
}
