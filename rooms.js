// ╔══════════════════════════════════════════════════╗
// ║         DUNGEON DATA FILE — rooms.js             ║
// ║  Add rooms, enemies, items — engine auto-reads   ║
// ╚══════════════════════════════════════════════════╝

// ── TILE KEY ──────────────────────────────────────
// 0  = floor
// 1  = wall (stone)
// 2  = wall (mossy)
// 3  = wall (cracked)
// 4  = door (passage — auto-connects rooms)
// 5  = torch (decorative, emits light)
// 6  = chest
// 7  = pillar
// 8  = water/void
// 9  = floor (dark variant)

const TILE = {
  FLOOR:0, WALL:1, MOSSY:2, CRACKED:3,
  DOOR:4, TORCH:5, CHEST:6, PILLAR:7, VOID:8, DARK:9
};

// ── PIXEL ART TILE DESCRIPTORS ────────────────────
// Each tile has layers drawn procedurally to look hand-pixeled
const TILE_ART = {
  0: { // Floor — stone flags
    base:"#2a2218", grout:"#1a1510",
    detail:["#332c20","#2e2719","#242015"],
    pattern:"flags"
  },
  1: { // Wall — solid stone
    base:"#3d3428", top:"#4e4535", shadow:"#1e1a12",
    detail:["#453c2c","#3a3222","#302a1d"],
    pattern:"bricks"
  },
  2: { // Mossy wall
    base:"#2e3a1e", top:"#3d4e28", shadow:"#151e0e",
    detail:["#3a4a22","#4a5a2c","#232e14"],
    pattern:"bricks_moss"
  },
  3: { // Cracked wall
    base:"#352c22", top:"#453c2e", shadow:"#1a1510",
    detail:["#3e3528","#2e2820","#4a4035"],
    pattern:"bricks_crack"
  },
  4: { // Door / passage
    base:"#1a1208", arch:"#4a3c28", open:"#080504",
    pattern:"arch"
  },
  5: { // Torch
    base:"#2a2218", pole:"#6b4c1e", flame:["#ff8c00","#ffb830","#ff4400","#ffee00"],
    pattern:"torch"
  },
  6: { // Chest
    base:"#7a4e1c", band:"#c8a030", lock:"#d4b840",
    lid:"#9a6824", pattern:"chest"
  },
  7: { // Pillar
    base:"#4a4030", cap:"#5a5040", shadow:"#2a2420",
    detail:["#524838","#3e3628"],
    pattern:"pillar"
  },
  8: { // Void / water
    base:"#08080f", shimmer:["#0e0e1e","#12122a","#080818"],
    pattern:"void"
  },
  9: { // Dark floor
    base:"#1e1a12", grout:"#141008",
    detail:["#242015","#1a1610"],
    pattern:"flags_dark"
  },
};

// ── ROOMS ─────────────────────────────────────────
// Each room: 16×12 tile grid
// Rooms connect via DOOR tiles on edges
// Engine picks random rooms and stitches them
const ROOMS = [

  // ── Great Hall ──────────────────────────────────
  {
    id:"great_hall",
    w:16, h:12,
    map:[
      [1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1],
      [1,7,0,0,0,0,0,0,0,0,0,0,0,0,7,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [4,0,0,5,0,0,0,0,0,0,0,5,0,0,0,4],
      [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
      [1,0,0,0,0,9,9,9,9,9,0,0,0,0,0,1],
      [1,0,0,0,0,9,6,9,6,9,0,0,0,0,0,1],
      [4,0,0,0,0,9,9,9,9,9,0,0,0,0,0,4],
      [4,0,0,5,0,0,0,0,0,0,0,5,0,0,0,4],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,7,0,0,0,0,0,0,0,0,0,0,0,0,7,1],
      [1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1],
    ],
    enemies:[
      {type:"skeleton", tx:4,  ty:4},
      {type:"skeleton", tx:11, ty:7},
      {type:"slime",    tx:8,  ty:5},
    ]
  },

  // ── Crypt Corridor ──────────────────────────────
  {
    id:"crypt_corridor",
    w:16, h:12,
    map:[
      [1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1],
      [1,2,2,1,0,0,0,0,0,0,1,2,2,1,1,1],
      [1,2,0,0,0,0,0,0,0,0,0,0,2,1,1,1],
      [1,1,0,5,0,0,0,0,0,0,0,5,0,1,1,1],
      [1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
      [4,0,0,0,0,3,3,3,3,3,0,0,0,0,0,4],
      [4,0,0,0,0,3,0,0,0,3,0,0,0,0,0,4],
      [1,1,0,0,0,3,0,6,0,3,0,0,0,1,1,1],
      [1,1,0,5,0,3,0,0,0,3,0,5,0,1,1,1],
      [1,2,0,0,0,3,3,3,3,3,0,0,2,1,1,1],
      [1,2,2,1,0,0,0,0,0,0,1,2,2,1,1,1],
      [1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1],
    ],
    enemies:[
      {type:"skeleton", tx:7, ty:6},
      {type:"bat",      tx:3, ty:3},
      {type:"bat",      tx:12,ty:3},
    ]
  },

  // ── Pillared Chamber ────────────────────────────
  {
    id:"pillared_chamber",
    w:16, h:12,
    map:[
      [1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,7,0,0,0,0,0,0,0,0,0,7,0,0,1],
      [4,0,0,0,0,5,0,0,0,0,5,0,0,0,0,4],
      [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
      [1,0,0,0,0,0,0,9,9,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,9,9,0,0,0,0,0,0,1],
      [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,0,0,0,5,0,0,0,0,5,0,0,0,0,4],
      [1,0,7,0,0,0,0,0,0,0,0,0,7,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1],
    ],
    enemies:[
      {type:"skeleton", tx:5,  ty:5},
      {type:"skeleton", tx:10, ty:6},
      {type:"demon",    tx:7,  ty:9},
    ]
  },

  // ── Flooded Vault ───────────────────────────────
  {
    id:"flooded_vault",
    w:16, h:12,
    map:[
      [1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,8,8,8,8,8,8,8,0,0,0,0,1],
      [4,0,0,0,8,0,0,0,0,0,8,0,0,0,0,4],
      [4,0,0,0,8,0,5,0,5,0,8,0,0,0,0,4],
      [1,0,0,0,8,0,0,6,0,0,8,0,0,0,0,1],
      [1,0,0,0,8,0,5,0,5,0,8,0,0,0,0,1],
      [4,0,0,0,8,0,0,0,0,0,8,0,0,0,0,4],
      [4,0,0,0,8,8,8,8,8,8,8,0,0,0,0,4],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1],
    ],
    enemies:[
      {type:"slime",    tx:3, ty:5},
      {type:"slime",    tx:12,ty:5},
      {type:"skeleton", tx:6, ty:9},
    ]
  },

  // ── Throne Room ─────────────────────────────────
  {
    id:"throne_room",
    w:16, h:12,
    map:[
      [1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,3,3,0,0,0,0,0,0,0,3,3,0,0,1],
      [4,0,3,0,0,5,0,0,0,0,5,0,3,0,0,4],
      [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
      [1,0,0,0,0,0,0,7,7,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,7,7,0,0,0,0,0,0,1],
      [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,3,0,0,5,0,0,0,0,5,0,3,0,0,4],
      [1,0,3,3,0,0,0,0,0,0,0,3,3,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1],
    ],
    enemies:[
      {type:"demon",    tx:7, ty:4},
      {type:"skeleton", tx:3, ty:7},
      {type:"skeleton", tx:12,ty:4},
      {type:"bat",      tx:5, ty:2},
    ]
  },

  // ── Narrow Passage ──────────────────────────────
  {
    id:"narrow_passage",
    w:16, h:12,
    map:[
      [1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,2,0,0,2,1,1,1,1,1,1,1],
      [1,1,1,1,1,2,0,0,2,1,1,1,1,1,1,1],
      [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
      [4,0,5,0,0,0,0,0,0,0,0,0,5,0,0,4],
      [1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1],
      [1,1,1,0,0,6,0,0,0,6,0,0,1,1,1,1],
      [4,0,5,0,0,0,0,0,0,0,0,0,5,0,0,4],
      [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
      [1,1,1,1,1,2,0,0,2,1,1,1,1,1,1,1],
      [1,1,1,1,1,2,0,0,2,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1],
    ],
    enemies:[
      {type:"skeleton", tx:7, ty:5},
      {type:"bat",      tx:4, ty:4},
      {type:"bat",      tx:11,ty:7},
    ]
  },

];

// ── ENEMY DEFINITIONS ─────────────────────────────
const ENEMY_TYPES = {
  skeleton: {
    hp: 3, speed: 0.6, damage: 1, aggro: 6,
    color:"#c8c8b0", accent:"#e0dcc8", shadow:"#404030",
    size:12, reward:10,
    art:"humanoid"
  },
  slime: {
    hp: 2, speed: 0.4, damage: 1, aggro: 4,
    color:"#30a850", accent:"#50e878", shadow:"#104820",
    size:10, reward:5,
    art:"blob"
  },
  bat: {
    hp: 1, speed: 1.1, damage: 1, aggro: 8,
    color:"#502850", accent:"#803878", shadow:"#201020",
    size:8, reward:5,
    art:"bat"
  },
  demon: {
    hp: 6, speed: 0.5, damage: 2, aggro: 7,
    color:"#a82020", accent:"#e04040", shadow:"#401010",
    size:14, reward:25,
    art:"humanoid_large"
  },
};

// ── PLAYER CONFIG ─────────────────────────────────
const PLAYER_CONFIG = {
  speed: 1.8,
  hp: 10,
  maxHp: 10,
  attackRange: 22,
  attackDamage: 2,
  attackCooldown: 28,
  iframes: 40,
  size: 12,
  color:"#4090e0",
  accent:"#80c0ff",
  shadow:"#102848",
};

// ── WORLD CONFIG ──────────────────────────────────
const WORLD_CONFIG = {
  tileSize: 16,
  viewW: 256,
  viewH: 192,
  pixelScale: 1,   // rendered at native virtual res, CSS scales it up
  bgColor:"#06040a",
  torchFlicker: true,
  lightRadius: 80,
  ambientDark: 0.82,
};
