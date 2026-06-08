import { Room, Client } from "colyseus";
import { GameState, PlayerState, ArtifactState, BrainState } from "../schema/GameState";
import {
  InputPayload, TeamId, ArtifactType, ARTIFACT_TYPES, ARTIFACT_VALUES,
  MAP, GAME_WIDTH, GAME_HEIGHT, PLAYER_SPEED, PLAYER_RADIUS, BRAIN_LEVELS,
  BRAIN_CAPTURE_TIME, ORB_SPAWN_INTERVAL, MAX_CARRY, PUSH_FORCE,
  INTERACT_RANGE,
} from "@brain-heist/shared";

const FIXED_TIMESTEP = 1000 / 60;
const MAX_ARTIFACTS = 20;
const BASE_RADIUS = 80;
const BRAIN_RADIUS = 40;

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

let artifactCounter = 0;

export class BrainHeistRoom extends Room<GameState> {
  private elapsedTime = 0;
  private orbTimer = 0;
  private inputs = new Map<string, InputPayload>();

  onCreate() {
    this.setState(new GameState());
    this.setSimulationInterval((dt) => this.update(dt), FIXED_TIMESTEP);
    this.maxClients = 8;

    const rb = this.state.redBrain;
    rb.team = "red";
    rb.x = MAP.redBrainStart.x;
    rb.y = MAP.redBrainStart.y;

    const bb = this.state.blueBrain;
    bb.team = "blue";
    bb.x = MAP.blueBrainStart.x;
    bb.y = MAP.blueBrainStart.y;

    this.onMessage("input", (client, input: InputPayload) => {
      this.inputs.set(client.sessionId, input);
    });

    this.onMessage("join_team", (client, data: { team: TeamId; name: string; avatarUrl: string }) => {
      const p = this.state.players.get(client.sessionId);
      if (p) {
        p.team = data.team;
        p.name = data.name || "Player";
        p.avatarUrl = data.avatarUrl || "";
        const spawn = data.team === "red" ? MAP.redBase : MAP.blueBase;
        p.x = spawn.x + (Math.random() - 0.5) * 60;
        p.y = spawn.y + (Math.random() - 0.5) * 60;
      }
      if (this.state.phase === "lobby" && this.state.players.size >= 2) {
        this.startGame();
      }
    });

    this.onMessage("start_game", () => {
      if (this.state.phase === "lobby") this.startGame();
    });

    // Spawn initial artifacts
    for (let i = 0; i < 10; i++) this.spawnArtifact();
  }

  onJoin(client: Client) {
    const p = new PlayerState();
    p.id = client.sessionId;
    p.name = "Player";
    p.x = GAME_WIDTH / 2;
    p.y = GAME_HEIGHT / 2;
    this.state.players.set(client.sessionId, p);
  }

  onLeave(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (p) {
      this.dropArtifactsForPlayer(client.sessionId);
      if (this.state.redBrain.carriedBy === client.sessionId) {
        this.state.redBrain.beingCarried = false;
        this.state.redBrain.carriedBy = "";
      }
      if (this.state.blueBrain.carriedBy === client.sessionId) {
        this.state.blueBrain.beingCarried = false;
        this.state.blueBrain.carriedBy = "";
      }
    }
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
  }

  private startGame() {
    this.state.phase = "playing";
    this.state.matchTimer = 300000;
    this.state.winner = "";
    this.state.winReason = "";

    this.state.redBrain.ideas = 0;
    this.state.redBrain.level = 1;
    this.state.redBrain.x = MAP.redBrainStart.x;
    this.state.redBrain.y = MAP.redBrainStart.y;
    this.state.redBrain.captured = false;
    this.state.redBrain.captureTimer = 0;

    this.state.blueBrain.ideas = 0;
    this.state.blueBrain.level = 1;
    this.state.blueBrain.x = MAP.blueBrainStart.x;
    this.state.blueBrain.y = MAP.blueBrainStart.y;
    this.state.blueBrain.captured = false;
    this.state.blueBrain.captureTimer = 0;
  }

  private spawnArtifact() {
    if (this.state.artifacts.size >= MAX_ARTIFACTS) return;
    const zone = MAP.orbZones[Math.floor(Math.random() * MAP.orbZones.length)];
    const type = ARTIFACT_TYPES[Math.floor(Math.random() * ARTIFACT_TYPES.length)] as ArtifactType;
    const a = new ArtifactState();
    a.id = `artifact_${++artifactCounter}`;
    a.type = type;
    a.x = zone.x + (Math.random() - 0.5) * 120;
    a.y = zone.y + (Math.random() - 0.5) * 80;
    a.x = clamp(a.x, 80, GAME_WIDTH - 80);
    a.y = clamp(a.y, 80, GAME_HEIGHT - 80);
    a.held = false;
    a.heldBy = "";
    this.state.artifacts.set(a.id, a);
  }

  private dropArtifactsForPlayer(sessionId: string) {
    this.state.artifacts.forEach((a) => {
      if (a.heldBy === sessionId) {
        a.held = false;
        a.heldBy = "";
      }
    });
    const p = this.state.players.get(sessionId);
    if (p) p.carrying = 0;
  }

  private getBrainRadius(brain: BrainState) {
    return BRAIN_RADIUS + (brain.level - 1) * 10;
  }

  private update(dt: number) {
    if (this.state.phase !== "playing") return;

    this.elapsedTime += dt;
    this.orbTimer += dt;
    this.state.matchTimer = Math.max(0, this.state.matchTimer - dt);

    if (this.orbTimer >= ORB_SPAWN_INTERVAL) {
      this.orbTimer = 0;
      this.spawnArtifact();
    }

    // Process player inputs
    this.state.players.forEach((player, sessionId) => {
      const input = this.inputs.get(sessionId);
      if (!input) return;

      const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const len = Math.sqrt(dx * dx + dy * dy) || 1;

      // Slow down when carrying brain
      const brain = player.team === "red" ? this.state.blueBrain : this.state.redBrain;
      const carryingBrain = brain.carriedBy === sessionId;
      const speedMult = carryingBrain ? 0.5 : 1;

      if (dx !== 0 || dy !== 0) {
        player.x += (dx / len) * PLAYER_SPEED * speedMult * (dt / 1000);
        player.y += (dy / len) * PLAYER_SPEED * speedMult * (dt / 1000);
      }

      player.x = clamp(player.x, PLAYER_RADIUS, GAME_WIDTH - PLAYER_RADIUS);
      player.y = clamp(player.y, PLAYER_RADIUS, GAME_HEIGHT - PLAYER_RADIUS);
      player.tick = input.tick;

      // Move carried brain with player
      if (carryingBrain) {
        brain.x = player.x;
        brain.y = player.y;
      }

      // Interact
      if (input.interact) {
        this.handleInteract(player, sessionId);
      }

      // Drop carried artifacts
      if (input.drop) {
        this.dropArtifactsForPlayer(sessionId);
      }
    });

    // Player-player collisions (push)
    const playerArr: PlayerState[] = [];
    this.state.players.forEach((p) => playerArr.push(p));
    for (let i = 0; i < playerArr.length; i++) {
      for (let j = i + 1; j < playerArr.length; j++) {
        const a = playerArr[i];
        const b = playerArr[j];
        const d = dist(a.x, a.y, b.x, b.y);
        const minDist = PLAYER_RADIUS * 2;
        if (d < minDist && d > 0) {
          const overlap = (minDist - d) / 2;
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          a.x = clamp(a.x, PLAYER_RADIUS, GAME_WIDTH - PLAYER_RADIUS);
          a.y = clamp(a.y, PLAYER_RADIUS, GAME_HEIGHT - PLAYER_RADIUS);
          b.x = clamp(b.x, PLAYER_RADIUS, GAME_WIDTH - PLAYER_RADIUS);
          b.y = clamp(b.y, PLAYER_RADIUS, GAME_HEIGHT - PLAYER_RADIUS);
        }
      }
    }

    // Capture timer for enemy brains in enemy base
    this.updateCaptureTimer(this.state.redBrain, "blue", MAP.blueBase, dt);
    this.updateCaptureTimer(this.state.blueBrain, "red", MAP.redBase, dt);

    // Check win conditions
    this.checkWinConditions();
  }

  private handleInteract(player: PlayerState, sessionId: string) {
    const ownBrain = player.team === "red" ? this.state.redBrain : this.state.blueBrain;
    const enemyBrain = player.team === "red" ? this.state.blueBrain : this.state.redBrain;
    const base = player.team === "red" ? MAP.redBase : MAP.blueBase;

    // Deposit carried artifacts into own brain
    if (dist(player.x, player.y, ownBrain.x, ownBrain.y) < INTERACT_RANGE + this.getBrainRadius(ownBrain)) {
      if (player.carrying > 0) {
        let deposited = 0;
        this.state.artifacts.forEach((a) => {
          if (a.heldBy === sessionId) {
            ownBrain.ideas += ARTIFACT_VALUES[a.type];
            deposited++;
            this.state.artifacts.delete(a.id);
          }
        });
        player.carrying = 0;
        this.updateBrainLevel(ownBrain);
        return;
      }
    }

    // Pick up artifact
    if (player.carrying < MAX_CARRY) {
      let picked = false;
      this.state.artifacts.forEach((a) => {
        if (picked || a.held) return;
        if (dist(player.x, player.y, a.x, a.y) < INTERACT_RANGE) {
          a.held = true;
          a.heldBy = sessionId;
          a.x = player.x;
          a.y = player.y;
          player.carrying++;
          picked = true;
        }
      });
      if (picked) return;
    }

    // Grab enemy brain
    if (!enemyBrain.beingCarried &&
        dist(player.x, player.y, enemyBrain.x, enemyBrain.y) < INTERACT_RANGE + this.getBrainRadius(enemyBrain)) {
      enemyBrain.beingCarried = true;
      enemyBrain.carriedBy = sessionId;
      return;
    }

    // Drop enemy brain if we're carrying it
    if (enemyBrain.carriedBy === sessionId) {
      enemyBrain.beingCarried = false;
      enemyBrain.carriedBy = "";
    }
  }

  private updateBrainLevel(brain: BrainState) {
    for (let i = BRAIN_LEVELS.length - 1; i >= 0; i--) {
      if (brain.ideas >= BRAIN_LEVELS[i].ideasRequired) {
        brain.level = BRAIN_LEVELS[i].level;
        break;
      }
    }
  }

  private updateCaptureTimer(brain: BrainState, enemyTeam: TeamId, enemyBase: { x: number; y: number }, dt: number) {
    const inEnemyBase = dist(brain.x, brain.y, enemyBase.x, enemyBase.y) < BASE_RADIUS;
    if (inEnemyBase && brain.team !== enemyTeam) {
      brain.captureTimer = Math.min(BRAIN_CAPTURE_TIME, brain.captureTimer + dt);
      brain.captured = brain.captureTimer >= BRAIN_CAPTURE_TIME;
    } else {
      brain.captureTimer = Math.max(0, brain.captureTimer - dt * 0.5);
      brain.captured = false;
    }
  }

  private checkWinConditions() {
    if (this.state.winner) return;

    // Level 5 win
    if (this.state.redBrain.level >= 5) {
      this.endGame("red", "Red Brain reached Singularity!");
      return;
    }
    if (this.state.blueBrain.level >= 5) {
      this.endGame("blue", "Blue Brain reached Singularity!");
      return;
    }

    // Capture win
    if (this.state.redBrain.captured) {
      this.endGame("blue", "Blue team captured the Red Brain!");
      return;
    }
    if (this.state.blueBrain.captured) {
      this.endGame("red", "Red team captured the Blue Brain!");
      return;
    }

    // Timer
    if (this.state.matchTimer <= 0) {
      const winner = this.state.redBrain.ideas >= this.state.blueBrain.ideas ? "red" : "blue";
      this.endGame(winner, "Time's up! Most evolved Brain wins!");
    }
  }

  private endGame(winner: TeamId, reason: string) {
    this.state.winner = winner;
    this.state.winReason = reason;
    this.state.phase = "victory";
    if (winner === "red") this.state.redScore++;
    else this.state.blueScore++;

    // Reset after 10 seconds
    this.clock.setTimeout(() => {
      this.state.phase = "lobby";
      this.state.winner = "";
    }, 10000);
  }
}
