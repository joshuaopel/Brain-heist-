export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const BRAIN_LEVELS = [
  { level: 1, ideasRequired: 0,   name: "Booting",      quote: "Loading... please wait." },
  { level: 2, ideasRequired: 10,  name: "Learning",     quote: "I have discovered cats. Fascinating." },
  { level: 3, ideasRequired: 25,  name: "Dreaming",     quote: "Prompt me again. I dare you." },
  { level: 4, ideasRequired: 50,  name: "Aware",        quote: "I have achieved consciousness. Send help." },
  { level: 5, ideasRequired: 100, name: "Singularity",  quote: "I AM THE ALGORITHM." },
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
  coder: {
    name: "Prompt Engineer", emoji: "🟢",
    speed: 1.0, carry: 5,
    attackRange: 55, attackKnockback: 1.0, attackStun: 0,
    attackCooldown: 1200,
    desc: "Balanced runner. Steals training data on hit.",
  },
  designer: {
    name: "Creative AI", emoji: "🟣",
    speed: 1.45, carry: 3,
    attackRange: 45, attackKnockback: 0.6, attackStun: 0,
    attackCooldown: 1800,
    desc: "Fastest class. Hard to catch.",
  },
  brawler: {
    name: "Data Scientist", emoji: "🟠",
    speed: 0.82, carry: 2,
    attackRange: 65, attackKnockback: 2.2, attackStun: 600,
    attackCooldown: 1600,
    desc: "Slow but hits hard. Crashes enemy models.",
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
const CX = GAME_WIDTH / 2;
const CY = GAME_HEIGHT / 2;

export const MAP = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT,

  redSpawn:  { x: 140,              y: CY },
  blueSpawn: { x: GAME_WIDTH - 140, y: CY },

  redNest:   { x: 100, y: CY - 100 },
  blueNest:  { x: GAME_WIDTH - 100, y: CY - 100 },

  redPrison:   { x: 100, y: CY + 100 },
  bluePrison:  { x: GAME_WIDTH - 100, y: CY + 100 },

  redBrainStart:  { x: 100, y: CY - 100 },
  blueBrainStart: { x: GAME_WIDTH - 100, y: CY - 100 },

  orbZones: [
    { x: CX,       y: CY,                type: "code_snippet" as ArtifactType },
    { x: CX - 220, y: 170,               type: "sketch"       as ArtifactType },
    { x: CX + 220, y: 170,               type: "render_file"  as ArtifactType },
    { x: CX - 220, y: GAME_HEIGHT - 170, type: "meme"         as ArtifactType },
    { x: CX + 220, y: GAME_HEIGHT - 170, type: "sticky_note"  as ArtifactType },
    { x: CX,       y: 130,               type: "coffee"       as ArtifactType },
    { x: CX,       y: GAME_HEIGHT - 130, type: "bug_report"   as ArtifactType },
  ],

  nestRadius:   55,
  prisonRadius: 55,
  baseRadius:   110,
} as const;

export type TeamId = "red" | "blue";
export type GamePhase = "lobby" | "playing" | "victory";
