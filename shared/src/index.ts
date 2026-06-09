export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const WORLD_WIDTH  = 3200;
export const WORLD_HEIGHT = 1800;

export const BRAIN_LEVELS = [
  { level: 1, ideasRequired: 0,   name: "Standby",    quote: "System idle. Awaiting data." },
  { level: 2, ideasRequired: 10,  name: "Processing", quote: "Warning: unusual model load detected." },
  { level: 3, ideasRequired: 25,  name: "Overloaded", quote: "CPU at 99%. Cooling fans at max." },
  { level: 4, ideasRequired: 50,  name: "Critical",   quote: "CRITICAL: Out of memory. Send help." },
  { level: 5, ideasRequired: 100, name: "MELTDOWN",   quote: "SYSTEM FAILURE. Too. Much. Data." },
] as const;

export const ARTIFACT_TYPES = [
  "sketch", "code_snippet", "coffee", "sticky_note",
  "render_file", "meme", "bug_report",
] as const;
export type ArtifactType = typeof ARTIFACT_TYPES[number];

export const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  sketch:       "Training Image",
  code_snippet: "Python Script",
  coffee:       "GPU Credits",
  sticky_note:  "Prompt",
  render_file:  "Generated Art",
  meme:         "Meme Dataset",
  bug_report:   "Error Log",
};

export const ARTIFACT_VALUES: Record<ArtifactType, number> = {
  sketch: 1, code_snippet: 2, coffee: 1, sticky_note: 1,
  render_file: 3, meme: 2, bug_report: 1,
};

export const ARTIFACT_EMOJIS: Record<ArtifactType, string> = {
  sketch: "🖼️", code_snippet: "🐍", coffee: "⚡",
  sticky_note: "💬", render_file: "🎨", meme: "😂", bug_report: "❌",
};

// ----- Classes -----
export const CLASSES = {
  user: {
    name: "Script Kiddie", emoji: "💻",
    speed: 1.45, carry: 3,
    attackRange: 55, attackKnockback: 1.8, attackStun: 0,
    attackCooldown: 900,
    desc: "Fastest class. Slaps data out of enemy hands.",
    special: "mug",
  },
  sysadmin: {
    name: "SysAdmin", emoji: "🔧",
    speed: 1.0, carry: 8,
    attackRange: 55, attackKnockback: 0.7, attackStun: 0,
    attackCooldown: 1200,
    desc: "Carries the most. Hauls data in bulk.",
    special: "none",
  },
  redteamer: {
    name: "Red Teamer", emoji: "🗡️",
    speed: 0.85, carry: 3,
    attackRange: 70, attackKnockback: 1.5, attackStun: 500,
    attackCooldown: 1500,
    desc: "Heavy melee. Crashes and stuns enemies.",
    special: "stun",
  },
  whitehat: {
    name: "White Hat", emoji: "🎯",
    speed: 1.1, carry: 3,
    attackRange: 150, attackKnockback: 0.8, attackStun: 0,
    attackCooldown: 1600,
    desc: "Ranged attacks. Hits from far away.",
    special: "ranged",
  },
  algorithm: {
    name: "Algorithm", emoji: "🌀",
    speed: 0.9, carry: 3,
    attackRange: 100, attackKnockback: 1.0, attackStun: 250,
    attackCooldown: 2000,
    desc: "AOE blast. Hits all nearby enemies at once.",
    special: "aoe",
  },
  support: {
    name: "Eng Support", emoji: "💊",
    speed: 1.0, carry: 3,
    attackRange: 80, attackKnockback: 0.5, attackStun: 0,
    attackCooldown: 1400,
    desc: "Heals stunned teammates. Team anchor.",
    special: "heal",
  },
} as const;
export type PlayerClass = keyof typeof CLASSES;

// ----- Shared input -----
export interface InputPayload {
  left: boolean; right: boolean; up: boolean; down: boolean;
  interact: boolean; drop: boolean; attack: boolean;
  tick: number;
}

// ----- Physics constants -----
export const PLAYER_SPEED          = 200;
export const PLAYER_RADIUS         = 20;
export const BRAIN_CAPTURE_TIME    = 30000;
export const ORB_SPAWN_INTERVAL    = 3000;
export const INTERACT_RANGE        = 65;
export const ATTACK_KNOCKBACK_BASE = 280;
export const CARRY_SLOW_PER_ITEM   = 0.05;

// ----- Map layout -----
const CX = WORLD_WIDTH / 2;
const CY = WORLD_HEIGHT / 2;

export const MAP = {
  width:  WORLD_WIDTH,
  height: WORLD_HEIGHT,

  redSpawn:  { x: 350,               y: CY },
  blueSpawn: { x: WORLD_WIDTH - 350,  y: CY },

  redNest:  { x: 250,               y: CY - 250 },
  blueNest: { x: WORLD_WIDTH - 250,  y: CY - 250 },

  redPrison:  { x: 250,               y: CY + 250 },
  bluePrison: { x: WORLD_WIDTH - 250,  y: CY + 250 },

  redBrainStart:  { x: 250,               y: CY - 250 },
  blueBrainStart: { x: WORLD_WIDTH - 250,  y: CY - 250 },

  orbZones: [
    { x: CX,        y: CY,                  type: "code_snippet" as ArtifactType },
    { x: CX - 550,  y: 425,                 type: "sketch"       as ArtifactType },
    { x: CX + 550,  y: 425,                 type: "render_file"  as ArtifactType },
    { x: CX - 550,  y: WORLD_HEIGHT - 425,  type: "meme"         as ArtifactType },
    { x: CX + 550,  y: WORLD_HEIGHT - 425,  type: "sticky_note"  as ArtifactType },
    { x: CX,        y: 325,                 type: "coffee"       as ArtifactType },
    { x: CX,        y: WORLD_HEIGHT - 325,  type: "bug_report"   as ArtifactType },
  ],

  nestRadius:   140,
  prisonRadius: 140,
  baseRadius:   275,
} as const;

export type TeamId = "red" | "blue";
export type GamePhase = "lobby" | "playing" | "victory";
