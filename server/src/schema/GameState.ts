import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import {
  TeamId, ArtifactType, GamePhase, BRAIN_LEVELS,
  ARTIFACT_TYPES, MAP, GAME_WIDTH, GAME_HEIGHT
} from "@brain-heist/shared";

export class PlayerState extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "Player";
  @type("string") avatarUrl: string = "";
  @type("string") team: TeamId = "red";
  @type("float32") x: number = 400;
  @type("float32") y: number = 300;
  @type("float32") vx: number = 0;
  @type("float32") vy: number = 0;
  @type("int8") carrying: number = 0;
  @type("boolean") connected: boolean = true;
  @type("int32") tick: number = 0;
}

export class ArtifactState extends Schema {
  @type("string") id: string = "";
  @type("string") type: ArtifactType = "sketch";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("boolean") held: boolean = false;
  @type("string") heldBy: string = "";
}

export class BrainState extends Schema {
  @type("string") team: TeamId = "red";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("int32") ideas: number = 0;
  @type("int8") level: number = 1;
  @type("boolean") captured: boolean = false;
  @type("string") capturedBy: string = "";
  @type("int32") captureTimer: number = 0;
  @type("boolean") beingCarried: boolean = false;
  @type("string") carriedBy: string = "";
}

export class GameState extends Schema {
  @type("string") phase: GamePhase = "lobby";
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: ArtifactState }) artifacts = new MapSchema<ArtifactState>();
  @type(BrainState) redBrain = new BrainState();
  @type(BrainState) blueBrain = new BrainState();
  @type("int32") matchTimer: number = 300000;
  @type("string") winner: TeamId | "" = "";
  @type("string") winReason: string = "";
  @type("int32") redScore: number = 0;
  @type("int32") blueScore: number = 0;
}
