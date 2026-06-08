export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const BRAIN_LEVELS = [
  { level: 1, ideasRequired: 0,  name: "Newborn",     quote: "Hello." },
  { level: 2, ideasRequired: 10, name: "Awakening",   quote: "I have discovered cheese." },
  { level: 3, ideasRequired: 25, name: "Enlightened", quote: "I require additional memes." },
  { level: 4, ideasRequired: 50, name: "Ascendant",   quote: "The pigeons are watching." },
  { level: 5, ideasRequired: 100,name: "Singularity", quote: "Ascension complete." },
] as const;

export const ARTIFACT_TYPES = [
  "sketch",
  "code_snippet",
  "coffee",
  "sticky_note",
  "render_file",
  "meme",
  "bug_report",
] as const;

export type ArtifactType = typeof ARTIFACT_TYPES[number];

export const ARTIFACT_VALUES: Record<ArtifactType, number> = {
  sketch: 1,
  code_snippet: 2,
  coffee: 1,
  sticky_note: 1,
  render_file: 3,
  meme: 2,
  bug_report: 1,
};

export const ARTIFACT_EMOJIS: Record<ArtifactType, string> = {
  sketch: "✏️",
  code_snippet: "💻",
  coffee: "☕",
  sticky_note: "📝",
  render_file: "🎨",
  meme: "😂",
  bug_report: "🐛",
};

export type TeamId = "red" | "blue";

export type GamePhase = "lobby" | "playing" | "victory";

export interface InputPayload {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  interact: boolean;
  drop: boolean;
  tick: number;
}

export const PLAYER_SPEED = 200;
export const PLAYER_RADIUS = 20;
export const BRAIN_CAPTURE_TIME = 30000;
export const ORB_SPAWN_INTERVAL = 3000;
export const MAX_CARRY = 5;
export const PUSH_FORCE = 300;
export const INTERACT_RANGE = 60;

export const MAP = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  redBase: { x: 120, y: GAME_HEIGHT / 2 },
  blueBase: { x: GAME_WIDTH - 120, y: GAME_HEIGHT / 2 },
  redBrainStart: { x: 160, y: GAME_HEIGHT / 2 },
  blueBrainStart: { x: GAME_WIDTH - 160, y: GAME_HEIGHT / 2 },
  orbZones: [
    { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
    { x: GAME_WIDTH / 2 - 200, y: 180 },
    { x: GAME_WIDTH / 2 + 200, y: 180 },
    { x: GAME_WIDTH / 2 - 200, y: GAME_HEIGHT - 180 },
    { x: GAME_WIDTH / 2 + 200, y: GAME_HEIGHT - 180 },
    { x: GAME_WIDTH / 2, y: 140 },
    { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 140 },
  ],
};
