// sprites.js — All pixel art, models, animations, and visual data for Garden Grove

const TILE_SIZE = 16;

// ─── Color Palettes ──────────────────────────────────────────────────────────
export const PALETTE = {
  // Terrain
  grass:        '#5a8a3c',
  grassLight:   '#6faa4a',
  grassDark:    '#3d6228',
  dirt:         '#8b5e3c',
  dirtLight:    '#a87050',
  dirtDark:     '#5c3a20',
  path:         '#c4a265',
  pathLight:    '#d4b87a',
  water:        '#3a7fbf',
  waterLight:   '#5599d5',
  waterDark:    '#255a8a',
  stone:        '#888888',
  stoneLight:   '#aaaaaa',

  // Plants
  leafGreen:    '#4a9e3f',
  leafMid:      '#3a8030',
  leafDark:     '#2a5f22',
  leafLight:    '#6abf52',
  leafYellow:   '#9ecf3a',
  bark:         '#7a4f2a',
  barkLight:    '#9a6f40',
  barkDark:     '#4a2e10',
  flower1:      '#e84393',
  flower2:      '#f7a800',
  flower3:      '#e04040',
  flower4:      '#a060e0',
  flower5:      '#60c0e0',
  berryRed:     '#cc2222',
  berryBlue:    '#3355cc',

  // Sky / UI
  sky:          '#87ceeb',
  skyDark:      '#4a90c8',
  sun:          '#ffe066',
  sunGlow:      '#ffcc00',
  uiBg:         '#1a2e14',
  uiPanel:      '#243d1a',
  uiBorder:     '#4a7a30',
  uiText:       '#c8f0a0',
  uiHighlight:  '#88ee44',
  uiGold:       '#f0c040',
  transparent:  'transparent',
};

// ─── Pixel Art Helper ─────────────────────────────────────────────────────────
// Each sprite is an array of rows, each row a string of palette keys (space = transparent).
// Single char codes mapped to palette entries.
const C = {
  // terrain
  G: PALETTE.grass, g: PALETTE.grassLight, d: PALETTE.grassDark,
  B: PALETTE.dirt,  b: PALETTE.dirtLight,  D: PALETTE.dirtDark,
  P: PALETTE.path,  p: PALETTE.pathLight,
  W: PALETTE.water, w: PALETTE.waterLight, v: PALETTE.waterDark,
  S: PALETTE.stone, s: PALETTE.stoneLight,
  // plants
  L: PALETTE.leafGreen, l: PALETTE.leafMid, K: PALETTE.leafDark,
  J: PALETTE.leafLight, Y: PALETTE.leafYellow,
  R: PALETTE.bark,  r: PALETTE.barkLight,  k: PALETTE.barkDark,
  // flowers / berries
  F: PALETTE.flower1, f: PALETTE.flower2, E: PALETTE.flower3,
  V: PALETTE.flower4, U: PALETTE.flower5,
  X: PALETTE.berryRed, x: PALETTE.berryBlue,
  // sky / misc
  O: PALETTE.sun,   o: PALETTE.sunGlow,
  '0': PALETTE.transparent,
  ' ': PALETTE.transparent,
};

/** Convert a sprite definition (array of equal-length strings) to an ImageData-compatible pixel array */
export function buildSprite(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      const col = C[ch];
      if (!col || col === PALETTE.transparent) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

// ─── Sprite Definitions ───────────────────────────────────────────────────────

// GRASS TILE (16×16)
export const SPRITE_GRASS = [
  'GGgGGGgGGgGGGgGG',
  'gGGGgGGGGGgGGGgG',
  'GGdGGGGgGGGGdGGG',
  'GGGGGgGGGgGGGGGG',
  'gGGGGGdGGGGgGGgG',
  'GGgGGGGGGGGGGGGG',
  'GGGGgGGGGgGGGGgG',
  'dGGGGGgGGGGGdGGG',
  'GGGgGGGGgGGGGGGG',
  'GgGGGGGGGGgGGgGG',
  'GGGGdGGgGGGGGGGG',
  'GGgGGGGGGGGGdGGG',
  'gGGGGGgGGgGGGGGg',
  'GGGGGGGGGGGGGGGG',
  'GgGdGGGgGGGgGGGG',
  'GGGGGGGGgGGGGGGG',
];

// DIRT TILE (16×16)
export const SPRITE_DIRT = [
  'BBbBBBbBBbBBBbBB',
  'bBBBbBBBBBbBBBbB',
  'BBDBBBBbBBBBDBBB',
  'BBBBBbBBBbBBBBBB',
  'bBBBBBDBBBBbBBbB',
  'BBbBBBBBBBBBBBBB',
  'BBBBbBBBBbBBBBbB',
  'DBBBBBbBBBBBDBBB',
  'BBBbBBBBbBBBBBBB',
  'BbBBBBBBBBbBBbBB',
  'BBBBDBBbBBBBBBBB',
  'BBbBBBBBBBBBDBBB',
  'bBBBBBbBBbBBBBBb',
  'BBBBBBBBBBBBBBBB',
  'BbBDBBBbBBBbBBBB',
  'BBBBBBBBbBBBBBBB',
];

// PATH TILE (16×16)
export const SPRITE_PATH = [
  'PPpPPPpPPpPPPpPP',
  'pPPPpPPPPPpPPPpP',
  'PPPPPPpPPPPPPPPP',
  'PPPPPpPPPpPPPPPP',
  'pPPPPPPPPPPpPPpP',
  'PPpPPpPPPPPPPPPP',
  'PPPPpPPPPpPPPPpP',
  'PPPPPPPPPPPPPPPP',
  'PPPpPPPPpPPPPPPP',
  'PpPPPPPPPPpPPpPP',
  'PPPPPPPpPPPPPPPP',
  'PPpPPPPPPPPPPPPP',
  'pPPPPPpPPpPPPPPp',
  'PPPPPPPPPPPPPPPP',
  'PpPPPPPpPPPpPPPP',
  'PPPPPPPPpPPPPPPP',
];

// WATER TILE (16×16)
export const SPRITE_WATER = [
  'WWwWWWWwWWwWWWWW',
  'WwWWwwWWWWWwWWwW',
  'WWWWWWwWWWWWWWWW',
  'vWWWWWWWwWWWvWWW',
  'WWWwWWWWWWWWWWWW',
  'WwWWWWWwWWwWWWwW',
  'WWWWwWWWWWWWWWWW',
  'WWWWWWwWWwWWWWWW',
  'WwWWWWWWWWWwWWwW',
  'WWWWWwWWWWWWWWWW',
  'vWWWWWWwWwWWvWWW',
  'WWwWWWWWWWWWWWwW',
  'WWWWWwWWWWWWWWWW',
  'WwWWWWWwWWwWWWWW',
  'WWWwWWWWWWWWwWWW',
  'WWWWWWWWWWWWWWWW',
];

// SAPLING (8×12)
export const SPRITE_SAPLING = [
  '  JLJ  ',
  ' JLLLJ ',
  ' LLLLL ',
  '  LlL  ',
  '   R   ',
  '   R   ',
  '   R   ',
];

// SMALL BUSH (12×10)
export const SPRITE_BUSH_SMALL = [
  '  LLJLL  ',
  ' JLLLLLJ ',
  'JLLLKLLL ',
  'LLLLLLLLJ',
  'lLLLLLLLL',
  'LLlLlLLLL',
  ' LLLLLLL ',
  '  LLLLL  ',
  '   RRR   ',
  '    R    ',
];

// FLOWER BUSH (12×10)
export const SPRITE_BUSH_FLOWER = [
  '  LFfFL  ',
  ' LFLlFFL ',
  'LFLLLLLFL',
  'LLLlLLLLL',
  'lLFLLFLLL',
  'LLLLlLLLL',
  ' FLLlLFL ',
  '  LLLLL  ',
  '   RRR   ',
  '    R    ',
];

// MEDIUM TREE (16×20) — oak-like
export const SPRITE_TREE_OAK = [
  '   JLLJLL   ',
  '  JLLLLLLJ  ',
  ' JLLLLLLLLJ ',
  'JLLLLLKLLLLL',
  'LLLLLLLLLLLL',
  'LLKLLLLlLLLL',
  'LLLLLLLLLLLL',
  'JLLLKLLLLLLL',
  ' LLLLLLLLLL ',
  ' JLLLLLLLJ  ',
  '  JLLLLLL   ',
  '   LLLLLL   ',
  '    RRRR    ',
  '     RR     ',
  '     RR     ',
  '    bRRb    ',
  '   bBRRBb   ',
];

// TALL PINE TREE (10×22)
export const SPRITE_TREE_PINE = [
  '    JL    ',
  '   JLLJ   ',
  '  JLLLLJ  ',
  ' JLLLLLLL ',
  'JLLLKLLLLJ',
  ' LLLLLLLLL',
  '  JlLLLJ  ',
  ' JLLLLLLLJ',
  'JLLLLLLLLL',
  'LLLLKLLLLJ',
  ' LLLLLLLLL',
  '  JLLLLJ  ',
  ' JLLLLLLLJ',
  'JLLLLKLLLL',
  'LLLLLLLLLJ',
  ' LLLLLLLLL',
  '  JLLLLJ  ',
  '    RR    ',
  '    RR    ',
  '    RR    ',
  '   bRRb   ',
  '   BRRB   ',
];

// BIG TREE (20×24)
export const SPRITE_TREE_BIG = [
  '    JJLLJJLL    ',
  '   JLLLLLLLLJ   ',
  '  JLLLLLLLLLLJ  ',
  ' JLLLLLLKLLLLLL ',
  'JLLLLLLLLLLLLLLL',
  'LLLLKLLLLLLLLLLJ',
  'LLLLLLLLLKLLLLL ',
  'JLLLLLLLLLLLLLLL',
  ' LLLLLLLLLLLLLL ',
  ' JLLLLLLLLLLLLJ ',
  '  LLLLKLLLLLLL  ',
  '  JLLLLLLLLLLJ  ',
  '   LLLLLLLLLL   ',
  '   JLLLLLLLLL   ',
  '    LLLLLLLL    ',
  '     LLLLLL     ',
  '      RRRR      ',
  '      RRRR      ',
  '      RRRR      ',
  '     bRRRRb     ',
  '    bBRRRRBb    ',
  '    BBBRRBB     ',
];

// FLOWER (5×7) - multiple colors
export const makeFlower = (color) => [
  ` ${color}${color}${color} `,
  `${color}${color}${color}${color}${color}`,
  `${color}${color}${color}${color}${color}`,
  ` ${color}${color}${color} `,
  '  L  ',
  '  L  ',
  '  L  ',
];
export const SPRITE_FLOWER_PINK   = makeFlower('F');
export const SPRITE_FLOWER_YELLOW = makeFlower('f');
export const SPRITE_FLOWER_RED    = makeFlower('E');
export const SPRITE_FLOWER_PURPLE = makeFlower('V');
export const SPRITE_FLOWER_BLUE   = makeFlower('U');

// MUSHROOM (8×8)
export const SPRITE_MUSHROOM = [
  ' EEEEE  ',
  'EEEEEEE ',
  'EEEeEEE ',
  ' EEEEE  ',
  '  sss   ',
  '  sss   ',
  '  sss   ',
  '   s    ',
];

// BERRY BUSH (10×10)
export const SPRITE_BERRY_BUSH = [
  '  LLXLL  ',
  ' LLLLLLL ',
  'LXLLlLLXL',
  'LLLLLLLL ',
  'LLXLlLLLL',
  'LLLLLLLLL',
  ' LXlLLXL ',
  '  LLLLL  ',
  '   RRR   ',
  '    R    ',
];

// SUNFLOWER (8×14)
export const SPRITE_SUNFLOWER = [
  '   fff   ',
  '  fffff  ',
  ' fffOfff ',
  ' ffOOfff ',
  '  fffff  ',
  '   fff   ',
  '   YL    ',
  '   LL    ',
  '  lLl    ',
  '   LL    ',
  '   LL    ',
  '   LL    ',
  '  lLl    ',
  '   LL    ',
];

// CACTUS (8×14)
export const SPRITE_CACTUS = [
  '  YYY  ',
  '  YYY  ',
  'YYYYYYY',
  'YYYYYYY',
  '  YYY  ',
  '  YYY  ',
  '  YYY  ',
  '  YYY  ',
  '  YYY  ',
  '  YYY  ',
  ' YYYYY ',
  ' YYYYY ',
  ' YYYYY ',
  ' YYYYY ',
];

// STONE (8×6)
export const SPRITE_STONE = [
  '  SSs   ',
  ' SSSss  ',
  'SSSSSss ',
  'SSSSSss ',
  ' SSSss  ',
  '  SSs   ',
];

// FENCE POST (4×10)
export const SPRITE_FENCE = [
  ' PP ',
  'PPPP',
  ' PP ',
  ' PP ',
  ' PP ',
  ' PP ',
  ' PP ',
  ' PP ',
  ' PP ',
  'PPPP',
];

// WELL (12×14)
export const SPRITE_WELL = [
  '  ssssssss  ',
  ' sSSSSSSSs  ',
  'sSSSSSSSSSs ',
  'sSvvvvvvSSs ',
  'sSvWWWWvSSs ',
  'sSvWWWWvSSs ',
  'sSvvvvvvSSs ',
  'sSSSSSSSSSs ',
  ' sSSSSSSSs  ',
  '  ssRRRss   ',
  '   sRRRs    ',
  '   BRRB     ',
  '   BRRB     ',
  '  BBRBB     ',
];

// GARDEN GNOME (6×12)
export const SPRITE_GNOME = [
  '  EEE  ',
  ' EEEEE ',
  '  fff  ',
  ' sssss ',
  'sssssss',
  ' sssss ',
  '  BBB  ',
  ' BBBBB ',
  'BBBBBBB',
  ' BB BB ',
  ' BB BB ',
  ' ss ss ',
];

// CLOUD (12×6)
export const SPRITE_CLOUD = [
  '   wwww    ',
  ' wwwwwwww  ',
  'wwwwwwwwww ',
  'wwwwwwwwwww',
  ' wwwwwwwww ',
  '  wwwwwww  ',
];

// BIRD (6×4)
export const SPRITE_BIRD = [
  ' d d ',
  'ddddd',
  'JJJJJ',
  ' J J ',
];

// SUN (10×10)
export const SPRITE_SUN = [
  'OoOoOoOoOo',
  'oOOOOOOOoo',
  'OOOoOOOOOo',
  'oOOOOOOOoo',
  'OOoOOoOOOo',
  'oOOOOOOOoo',
  'OOOOoOOOOo',
  'oOOOOOOOoo',
  'OoOoOoOoOo',
  'oooooooooO',
];

// ─── Animation Frames ─────────────────────────────────────────────────────────

// Water ripple frames (just shifting the w chars)
export const SPRITE_WATER_FRAMES = [SPRITE_WATER,
  SPRITE_WATER.map((r, i) => i % 4 === 1 ? r.replace('w','W').replace('W','w') : r),
];

// Growth stages per plant type: array of [sprite, growthTime_ms, label]
export const GROWTH_STAGES = {
  flower_pink:   [SPRITE_SAPLING, SPRITE_FLOWER_PINK,   null],
  flower_yellow: [SPRITE_SAPLING, SPRITE_FLOWER_YELLOW, null],
  flower_red:    [SPRITE_SAPLING, SPRITE_FLOWER_RED,    null],
  flower_purple: [SPRITE_SAPLING, SPRITE_FLOWER_PURPLE, null],
  flower_blue:   [SPRITE_SAPLING, SPRITE_FLOWER_BLUE,   null],
  bush:          [SPRITE_SAPLING, SPRITE_BUSH_SMALL,    null],
  bush_flower:   [SPRITE_SAPLING, SPRITE_BUSH_FLOWER,   null],
  berry_bush:    [SPRITE_SAPLING, SPRITE_BERRY_BUSH,    null],
  tree_oak:      [SPRITE_SAPLING, SPRITE_TREE_OAK,      null],
  tree_pine:     [SPRITE_SAPLING, SPRITE_TREE_PINE,     null],
  tree_big:      [SPRITE_SAPLING, SPRITE_TREE_OAK, SPRITE_TREE_BIG],
  mushroom:      [SPRITE_MUSHROOM, null, null],
  sunflower:     [SPRITE_SAPLING, SPRITE_SUNFLOWER,     null],
  cactus:        [SPRITE_SAPLING, SPRITE_CACTUS,        null],
};

// ─── UI Sprite Data ───────────────────────────────────────────────────────────
export const UI_ICONS = {
  flower_pink:   SPRITE_FLOWER_PINK,
  flower_yellow: SPRITE_FLOWER_YELLOW,
  flower_red:    SPRITE_FLOWER_RED,
  flower_purple: SPRITE_FLOWER_PURPLE,
  flower_blue:   SPRITE_FLOWER_BLUE,
  bush:          SPRITE_BUSH_SMALL,
  bush_flower:   SPRITE_BUSH_FLOWER,
  berry_bush:    SPRITE_BERRY_BUSH,
  tree_oak:      SPRITE_TREE_OAK,
  tree_pine:     SPRITE_TREE_PINE,
  tree_big:      SPRITE_TREE_BIG,
  mushroom:      SPRITE_MUSHROOM,
  sunflower:     SPRITE_SUNFLOWER,
  cactus:        SPRITE_CACTUS,
  stone:         SPRITE_STONE,
  fence:         SPRITE_FENCE,
  well:          SPRITE_WELL,
  gnome:         SPRITE_GNOME,
};

// Cost in seeds for each plant
export const PLANT_COSTS = {
  flower_pink:   1,
  flower_yellow: 1,
  flower_red:    1,
  flower_purple: 1,
  flower_blue:   1,
  bush:          3,
  bush_flower:   4,
  berry_bush:    5,
  tree_oak:      8,
  tree_pine:     8,
  tree_big:      20,
  mushroom:      2,
  sunflower:     3,
  cactus:        6,
  stone:         0,
  fence:         0,
  well:          0,
  gnome:         0,
};

// Seeds earned when a plant fully grows
export const PLANT_REWARDS = {
  flower_pink:   2,
  flower_yellow: 2,
  flower_red:    2,
  flower_purple: 2,
  flower_blue:   2,
  bush:          4,
  bush_flower:   5,
  berry_bush:    8,
  tree_oak:      12,
  tree_pine:     12,
  tree_big:      30,
  mushroom:      3,
  sunflower:     4,
  cactus:        7,
  stone:         0,
  fence:         0,
  well:          0,
  gnome:         0,
};

// Growth time in ms
export const PLANT_GROW_TIME = {
  flower_pink:   8000,
  flower_yellow: 8000,
  flower_red:    8000,
  flower_purple: 8000,
  flower_blue:   8000,
  bush:          14000,
  bush_flower:   14000,
  berry_bush:    18000,
  tree_oak:      25000,
  tree_pine:     25000,
  tree_big:      45000,
  mushroom:      6000,
  sunflower:     12000,
  cactus:        20000,
  stone:         0,
  fence:         0,
  well:          0,
  gnome:         0,
};

export const DECORATIONS = ['stone', 'fence', 'well', 'gnome'];
export const PLANTS = Object.keys(PLANT_COSTS).filter(k => !DECORATIONS.includes(k));

// Score values
export const PLANT_SCORES = {
  flower_pink:   5,
  flower_yellow: 5,
  flower_red:    5,
  flower_purple: 5,
  flower_blue:   5,
  bush:          10,
  bush_flower:   12,
  berry_bush:    15,
  tree_oak:      25,
  tree_pine:     25,
  tree_big:      60,
  mushroom:      8,
  sunflower:     10,
  cactus:        12,
  stone:         1,
  fence:         1,
  well:          5,
  gnome:         3,
};

export const PLANT_LABELS = {
  flower_pink:   '🌸 Pink Flower',
  flower_yellow: '🌼 Yellow Flower',
  flower_red:    '🌺 Red Flower',
  flower_purple: '💜 Purple Flower',
  flower_blue:   '💙 Blue Flower',
  bush:          '🌿 Bush',
  bush_flower:   '🌹 Flower Bush',
  berry_bush:    '🍓 Berry Bush',
  tree_oak:      '🌳 Oak Tree',
  tree_pine:     '🌲 Pine Tree',
  tree_big:      '🌴 Grand Tree',
  mushroom:      '🍄 Mushroom',
  sunflower:     '🌻 Sunflower',
  cactus:        '🌵 Cactus',
  stone:         '🪨 Stone',
  fence:         '🪵 Fence',
  well:          '🪣 Well',
  gnome:         '🏠 Gnome',
};

// Terrain types for tiles
export const TERRAIN = {
  GRASS: 'grass',
  DIRT:  'dirt',
  PATH:  'path',
  WATER: 'water',
};

// Default map layout (25×18 tiles)
// G=grass D=dirt P=path W=water
export const DEFAULT_MAP = [
  'GGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGDDDDDDDDDDDDDDDDGGGGGGG',
  'GGGDGGGGGGGGGGGGGDGGGGGGG',
  'GGGDGGGGGGGGGGGGGDGGGGGGG',
  'GGGDGGGGGGGGGGGGGDGGGWWWG',
  'GGGDGGGGGGGGGGGGGDGGWWWWG',
  'PPPPPPPPPPPPPPPPPPGGWWWWG',
  'GGGDGGGGGGGGGGGGGDGGWWWWG',
  'GGGDGGGGGGGGGGGGGDGGGWWWG',
  'GGGDGGGGGGGGGGGGGDGGGGGGG',
  'GGGDGGGGGGGGGGGGGDGGGGGGG',
  'GGGDDDDDDDDDDDDDDDDGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGG',
  'PPPPPPGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGGG',
];
