// ---------------------------------------------------------------------------
// Shared game data — characters, frame data, poses, world constants
// ---------------------------------------------------------------------------

export const W = 1280;
export const H = 720;
export const GROUND = 596;
export const WORLD_W = 1600;
export const ROUND_SECONDS = 60;
export const ROUND_FRAMES = ROUND_SECONDS * 60;
export const GRAVITY = 0.78;
export const WALK_SPEED = 4.25;
export const BACK_SPEED = 3.55;
export const JUMP_VX = 4.2;
export const JUMP_VY = -15.2;
export const MAX_HEALTH = 100;
export const MAX_SPIRIT = 100;
export const PUSH_DISTANCE = 58;

export const CHARACTERS = {
  kaito: {
    id: 'kaito',
    name: 'KAITO',
    title: 'The Crimson Dragon',
    kanji: '火',
    quote: '“The flame remembers.”',
    blurb: 'A wandering karateka carrying the ember of a fallen clan.',
    colors: {
      skin: '#e9b78c',
      skinShade: '#c9875a',
      skinLight: '#f8d9b8',
      hair: '#17141f',
      hairLight: '#3c3047',
      gi: '#f3eee2',
      giShade: '#cfc4b0',
      giDark: '#9d9482',
      pants: '#ece6d7',
      pantsShade: '#b9ae9b',
      accent: '#d43844',
      accent2: '#f1a04a',
      accentDark: '#7e1826',
      trim: '#c9a25e',
      wrap: '#f7f1e3',
      aura: '#ff7130',
      aura2: '#ffd36b',
      projectile: '#ff7a2f',
      projectile2: '#ffd36b',
      eye: '#23171a'
    },
    specials: [
      { name: 'DRAGON FIRE', short: 'FIRE', color: '#ff7a2f', color2: '#ffd36b' },
      { name: 'RISING FANG', short: 'RISE', color: '#ffb03a', color2: '#fff0b0' },
      { name: 'CYCLONE LOTUS', short: 'SPIN', color: '#ff5a5f', color2: '#ffd0a0' }
    ],
    superName: 'CRIMSON ART: INFERNO',
    palette: { primary: '#d43844', secondary: '#f1a04a' }
  },
  akane: {
    id: 'akane',
    name: 'AKANE',
    title: 'The Winter Blade',
    kanji: '氷',
    quote: '“Still water cuts deepest.”',
    blurb: 'A shrine guardian who froze her grief into a perfect blade.',
    colors: {
      skin: '#f0c6a2',
      skinShade: '#c99370',
      skinLight: '#ffe0c4',
      hair: '#181622',
      hairLight: '#4b3a63',
      gi: '#232a49',
      giShade: '#151a30',
      giDark: '#0c1020',
      pants: '#1b2138',
      pantsShade: '#101525',
      accent: '#f24f8a',
      accent2: '#6fe0ff',
      accentDark: '#721c48',
      trim: '#a989c9',
      wrap: '#e9e4f2',
      aura: '#4bd6ff',
      aura2: '#ff7fc4',
      projectile: '#5cd8ff',
      projectile2: '#d8fbff',
      eye: '#231c2e'
    },
    specials: [
      { name: 'FROST SHARD', short: 'FROST', color: '#5cd8ff', color2: '#d8fbff' },
      { name: 'THUNDER RISE', short: 'RISE', color: '#8ee7ff', color2: '#ff9bd3' },
      { name: 'BLOSSOM TEMPEST', short: 'SPIN', color: '#ff6fb4', color2: '#b8f4ff' }
    ],
    superName: 'MOONLIT ART: FROZEN TIDE',
    palette: { primary: '#f24f8a', secondary: '#6fe0ff' }
  }
};

// Frame data is expressed at 60 fps. Boxes are relative to the fighter's feet,
// with x measured forward from the fighter's centre.
export const MOVES = {
  punch: {
    id: 'punch', label: 'PUNCH', startup: 4, active: 4, recovery: 9,
    damage: 4.5, chip: 0, hitstun: 14, blockstun: 8, knockback: 2.2,
    meter: 5, hitstop: 5, shake: 4, box: { x0: 22, x1: 92, y0: -162, y1: -104 },
    sound: 'punch', priority: 1
  },
  kick: {
    id: 'kick', label: 'KICK', startup: 9, active: 6, recovery: 16,
    damage: 9, chip: 0, hitstun: 21, blockstun: 11, knockback: 5.2,
    meter: 8, hitstop: 7, shake: 7, box: { x0: 24, x1: 126, y0: -156, y1: -42 },
    sound: 'kick', priority: 2
  },
  sweep: {
    id: 'sweep', label: 'SWEEP', startup: 11, active: 5, recovery: 21,
    damage: 7.5, chip: 0, hitstun: 24, blockstun: 10, knockback: 4.2,
    meter: 8, hitstop: 7, shake: 6, low: true, knockdown: true,
    box: { x0: 16, x1: 118, y0: -62, y1: -4 }, sound: 'sweep', priority: 2
  },
  jumpKick: {
    id: 'jumpKick', label: 'AIR KICK', startup: 5, active: 999, recovery: 10,
    damage: 8, chip: 0, hitstun: 20, blockstun: 11, knockback: 4.6,
    meter: 7, hitstop: 6, shake: 5, box: { x0: 14, x1: 116, y0: -116, y1: -12 },
    sound: 'kick', priority: 2, air: true
  },
  s1: {
    id: 's1', label: 'PROJECTILE', startup: 15, active: 1, recovery: 23,
    damage: 11, chip: 2, hitstun: 25, blockstun: 14, knockback: 6,
    meter: 11, hitstop: 8, shake: 7, projectile: true, spawnAt: 15,
    sound: 'fireball', priority: 3
  },
  s2: {
    id: 's2', label: 'RISING STRIKE', startup: 5, active: 10, recovery: 27,
    damage: 14.5, chip: 3, hitstun: 28, blockstun: 14, knockback: 6.5,
    meter: 13, hitstop: 10, shake: 10, knockdown: true, invuln: 13,
    box: { x0: -18, x1: 80, y0: -224, y1: -38 }, sound: 'uppercut', priority: 3
  },
  s3: {
    id: 's3', label: 'SPIN', startup: 9, active: 27, recovery: 21,
    damage: 4.6, chip: 1, hitstun: 13, blockstun: 8, knockback: 2.6,
    meter: 4, hitstop: 5, shake: 5, multi: 8, maxHits: 3, advance: 4.35,
    box: { x0: -12, x1: 114, y0: -176, y1: -26 }, sound: 'spin', priority: 3
  },
  super: {
    id: 'super', label: 'SUPER ART', startup: 26, active: 1, recovery: 66,
    damage: 33, chip: 8, hitstun: 42, blockstun: 22, knockback: 10,
    meter: 0, hitstop: 15, shake: 16, knockdown: true, projectile: true,
    spawnAt: 26, superBeam: true, sound: 'super', priority: 5
  }
};

export function moveTotal(move) {
  if (!move) return 1;
  if (move.air) return move.startup + 999;
  return move.startup + move.active + move.recovery;
}

// Skeleton poses. Angles are absolute: 0 = down, 90 = forward, 180 = up.
// Arrays hold [shoulderOrHip, elbowOrKnee] in degrees.
export const BASE_POSE = {
  hipY: 0, lean: 4, head: 0,
  armF: [38, 168], armB: [22, 156],
  legF: [12, 2], legB: [-14, -6]
};

export const POSES = {
  idle: { ...BASE_POSE },
  crouch: {
    hipY: 42, lean: 20, head: -4,
    armF: [54, 150], armB: [38, 142],
    legF: [70, -40], legB: [-70, 40]
  },
  block: {
    hipY: 0, lean: 8, head: 2,
    armF: [58, 138], armB: [44, 126],
    legF: [16, 2], legB: [-19, -4]
  },
  jump: {
    hipY: -2, lean: 8, head: 0,
    armF: [82, 128], armB: [52, 152],
    legF: [58, -34], legB: [-30, 42]
  },
  punchWind: {
    hipY: 1, lean: -3, head: 0,
    armF: [26, 150], armB: [42, 158],
    legF: [12, 2], legB: [-14, -6]
  },
  punch: {
    hipY: 0, lean: 14, head: -2,
    armF: [94, 94], armB: [34, 160],
    legF: [20, 6], legB: [-24, -8]
  },
  kickWind: {
    hipY: 2, lean: -6, head: 0,
    armF: [46, 152], armB: [30, 148],
    legF: [24, -34], legB: [-16, -6]
  },
  kick: {
    hipY: 0, lean: -14, head: 4,
    armF: [72, 138], armB: [30, 128],
    legF: [96, 92], legB: [-10, -10]
  },
  sweep: {
    hipY: 58, lean: 26, head: 12,
    armF: [82, 108], armB: [48, 128],
    legF: [108, 78], legB: [-62, 40]
  },
  jumpKick: {
    hipY: -2, lean: 6, head: 0,
    armF: [80, 132], armB: [45, 145],
    legF: [102, 88], legB: [-34, 60]
  },
  s1Wind: {
    hipY: 10, lean: -10, head: 4,
    armF: [24, 118], armB: [16, 106],
    legF: [18, 4], legB: [-20, -6]
  },
  s1Fire: {
    hipY: -2, lean: 16, head: -4,
    armF: [88, 90], armB: [76, 82],
    legF: [24, 8], legB: [-28, -10]
  },
  s2Wind: {
    hipY: 30, lean: 12, head: 2,
    armF: [20, 140], armB: [10, 120],
    legF: [64, -34], legB: [-58, 22]
  },
  s2Rise: {
    hipY: -6, lean: -14, head: -8,
    armF: [168, 176], armB: [46, 156],
    legF: [62, 8], legB: [-36, 8]
  },
  s3: {
    hipY: 3, lean: -8, head: 3,
    armF: [96, 150], armB: [112, 164],
    legF: [100, 94], legB: [-52, 24]
  },
  hit: {
    hipY: 4, lean: -24, head: -10,
    armF: [-24, -46], armB: [-40, -20],
    legF: [24, -12], legB: [-30, 4]
  },
  hitCrouch: {
    hipY: 44, lean: -16, head: -8,
    armF: [-6, 28], armB: [-20, 36],
    legF: [74, -44], legB: [-64, 38]
  },
  knock: {
    hipY: 8, lean: -8, head: -4,
    armF: [140, 170], armB: [-50, -20],
    legF: [54, 18], legB: [-42, 20]
  },
  victory: {
    hipY: -2, lean: -5, head: -6,
    armF: [168, 174], armB: [32, 128],
    legF: [16, 4], legB: [-20, -6]
  },
  intro: {
    hipY: 6, lean: 16, head: -14,
    armF: [52, 152], armB: [30, 138],
    legF: [22, 0], legB: [-26, -4]
  },
  superCharge: {
    hipY: 18, lean: -12, head: 4,
    armF: [24, 100], armB: [12, 96],
    legF: [48, -20], legB: [-48, 18]
  },
  superFire: {
    hipY: -4, lean: 20, head: -6,
    armF: [92, 92], armB: [84, 86],
    legF: [30, 10], legB: [-34, -10]
  }
};

export const STAGE = {
  skyTop: '#161129',
  skyMid: '#3f1d3e',
  skyWarm: '#a6444b',
  skyHorizon: '#f09055',
  sun: '#ffdda0',
  mountainFar: '#3a2340',
  mountainMid: '#281a31',
  mountainNear: '#1a1224',
  tree: '#1b101c',
  treeLight: '#2d1a28',
  wood: '#3a221f',
  woodLight: '#6b4330',
  woodDark: '#211214',
  gold: '#d8b06a',
  lantern: '#ffb35e'
};
