// Tunable constants. Tweak these to change the feel of the scene.

// Internal pixel-art resolution. Everything is rendered at this size and
// then scaled up with NEAREST filtering to fit the window.
export const VIEW_W = 480;
export const VIEW_H = 270;

// Sunset Santorini palette. Reused everywhere.
export const PAL = {
  // Sky gradient stops (top → horizon)
  skyTop: 0xffd4a3,
  skyMid: 0xffb6a3,
  skyLow: 0xffd2b8,
  cloud: 0xe6c4e6,
  cloudHi: 0xfff0f0,
  sun: 0xffe9b0,
  sunCore: 0xfff3c8,

  // Sea
  seaShallow: 0x6ab0e0,
  seaMid: 0x5b9bd5,
  seaDeep: 0x3a6fa8,
  seaFoam: 0xffffff,

  // Island
  sand: 0xeadcb8,
  sandLight: 0xf3e6c6,
  rock: 0xb39b78,
  grass: 0xb6c97a,
  grassDark: 0x8eaa5c,

  // Buildings
  white: 0xf8f4ed,
  whiteShade: 0xe2dcce,
  whiteDark: 0xc7c0ae,
  dome: 0x2e5c8a,
  domeHi: 0x4d80b3,
  domeShade: 0x1f4068,
  stone: 0xe8dcc4,
  stoneShade: 0xc6b893,
  wood: 0x8a5a3a,
  woodLight: 0xb47a4e,
  awningRed: 0xc44b4b,
  awningCream: 0xf2e3c2,
  awningBlue: 0x4a7fb8,
  bread: 0xd9a05b,
  fish: 0xc3d4dc,
  fishPink: 0xe89aa1,
  steam: 0xfaf6ef,

  // Characters – man
  manSkin: 0xf2c9a0,
  manSkinShade: 0xd9a37a,
  manHair: 0x1d1410,
  manShirt: 0xfaf6ef,
  manShirtShade: 0xd5cfbf,
  manPants: 0xe8dab0,
  manPantsShade: 0xb89e6e,
  manShoe: 0x2a1f15,
  bouquet: 0xff8aa6,
  bouquetLeaf: 0x6da25b,

  // Characters – woman
  womanHair: 0xe9c97a,
  womanHairShade: 0xb89548,
  womanSkin: 0xf6d3b0,
  womanSkinShade: 0xd9a37a,
  womanDress: 0xf6f6fa,
  womanDressShade: 0xc8c8d8,
  womanRibbon: 0x7aa3d6,
  womanEye: 0x3a6fa8,
  womanLip: 0xd97a82,

  // Misc
  black: 0x111111,
  shadow: 0x2a2a3a,
  outline: 0x2a1f15,
} as const;

// Countdown JSON path (served from public/)
export const COUNTDOWN_URL = 'countdown.json';

// Pathfinding & character motion
export const MAN_SPEED_PX_PER_SEC = 28; // pixel-art units / second
export const MAN_REPLAN_MS = 200;
export const MAN_FOLLOW_RANGE_PX = 18; // close-enough threshold near cursor
export const MAN_LAUNDRY_TIME_MS = 3000; // how long he hangs laundry before noticing

// Woman physics
export const WOMAN_SPRING_K = 220; // stiffness (px/s^2 per px of stretch)
export const WOMAN_DAMP = 6.5; // damping
export const WOMAN_BODY_LENGTH = 14; // distance hand→hip
export const WOMAN_MAX_TILT_DEG = 38;

// Ambient life
export const DOLPHIN_INTERVAL_MIN_MS = 4000;
export const DOLPHIN_INTERVAL_MAX_MS = 8000;
export const BIRD_INTERVAL_MIN_MS = 9000;
export const BIRD_INTERVAL_MAX_MS = 18000;
export const SUN_DESCENT_PX_PER_MIN = 3; // very slow

// Boats
export const BOAT_SPEED_MIN = 4;
export const BOAT_SPEED_MAX = 9;
