import type { TeamId, ArtifactType, PlayerClass } from "@brain-heist/shared";

export interface PlayerState {
  id: string;
  name: string;
  avatarUrl: string;
  team: TeamId;
  playerClass: PlayerClass;
  x: number;
  y: number;
  carrying: number;
  connected: boolean;
  stunned: boolean;
  stunTimer: number;
  attackCooldown: number;
  onChange: (cb: () => void) => void;
}

export interface ArtifactState {
  id: string;
  type: ArtifactType;
  x: number;
  y: number;
  held: boolean;
  heldBy: string;
  onChange: (cb: () => void) => void;
}

export interface BrainState {
  team: TeamId;
  x: number;
  y: number;
  ideas: number;
  level: number;
  captured: boolean;
  capturedBy: string;
  captureTimer: number;
  beingCarried: boolean;
  carriedBy: string;
  onChange: (cb: () => void) => void;
}

export interface ColyseusMap<V> {
  onAdd: (cb: (value: V, key: string) => void) => void;
  onRemove: (cb: (value: V, key: string) => void) => void;
  get: (key: string) => V | undefined;
  forEach: (cb: (value: V, key: string) => void) => void;
  size: number;
}

export interface GameState {
  phase: string;
  players: ColyseusMap<PlayerState>;
  artifacts: ColyseusMap<ArtifactState>;
  redBrain: BrainState;
  blueBrain: BrainState;
  matchTimer: number;
  winner: string;
  winReason: string;
  redScore: number;
  blueScore: number;
}
