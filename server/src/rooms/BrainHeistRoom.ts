import { Room, Client } from "colyseus";
import { GameState, PlayerState, ArtifactState, BrainState } from "../schema/GameState";
import {
  InputPayload, TeamId, ArtifactType, ARTIFACT_VALUES,
  MAP, WORLD_WIDTH, WORLD_HEIGHT, PLAYER_SPEED, PLAYER_RADIUS, BRAIN_LEVELS,
  BRAIN_CAPTURE_TIME, ORB_SPAWN_INTERVAL, INTERACT_RANGE,
  CLASSES, PlayerClass, ATTACK_KNOCKBACK_BASE, CARRY_SLOW_PER_ITEM,
} from "@brain-heist/shared";

const FIXED_TIMESTEP = 1000 / 60;
const MAX_ARTIFACTS = 20;

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

let artifactCounter = 0;

export class BrainHeistRoom extends Room<GameState> {
  private orbTimer = 0;
  private inputs = new Map<string, InputPayload>();

  onCreate() {
    this.setState(new GameState());
    this.setSimulationInterval((dt) => this.update(dt), FIXED_TIMESTEP);
    this.maxClients = 8;

    this.resetBrains();
    for (let i = 0; i < 10; i++) this.spawnArtifact();

    this.onMessage("input", (client, input: InputPayload) => {
      this.inputs.set(client.sessionId, input);
    });

    this.onMessage("join_team", (client, data: { team: TeamId; playerClass: PlayerClass; name: string; avatarUrl: string }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      p.team = data.team;
      p.playerClass = data.playerClass ?? "user";
      p.name = data.name || "Player";
      p.avatarUrl = data.avatarUrl || "";
      this.respawnPlayer(p);
      if (this.state.phase === "lobby" && this.state.players.size >= 2) this.startGame();
    });

    this.onMessage("start_game", (_client) => {
      if (this.state.phase === "lobby") this.startGame();
    });
  }

  onJoin(client: Client) {
    const p = new PlayerState();
    p.id = client.sessionId;
    p.x = WORLD_WIDTH / 2;
    p.y = WORLD_HEIGHT / 2;
    this.state.players.set(client.sessionId, p);
  }

  onLeave(client: Client) {
    this.dropArtifactsForPlayer(client.sessionId);
    const rb = this.state.redBrain;
    const bb = this.state.blueBrain;
    if (rb.carriedBy === client.sessionId) { rb.beingCarried = false; rb.carriedBy = ""; }
    if (bb.carriedBy === client.sessionId) { bb.beingCarried = false; bb.carriedBy = ""; }
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
  }

  private resetBrains() {
    const rb = this.state.redBrain;
    rb.team = "red"; rb.x = MAP.redBrainStart.x; rb.y = MAP.redBrainStart.y;
    rb.ideas = 0; rb.level = 1; rb.captured = false; rb.captureTimer = 0;
    rb.beingCarried = false; rb.carriedBy = "";

    const bb = this.state.blueBrain;
    bb.team = "blue"; bb.x = MAP.blueBrainStart.x; bb.y = MAP.blueBrainStart.y;
    bb.ideas = 0; bb.level = 1; bb.captured = false; bb.captureTimer = 0;
    bb.beingCarried = false; bb.carriedBy = "";
  }

  private startGame() {
    this.state.phase = "playing";
    this.state.matchTimer = 300000;
    this.state.winner = "";
    this.state.winReason = "";
    this.resetBrains();
    this.state.players.forEach((p) => this.respawnPlayer(p));
  }

  private respawnPlayer(p: PlayerState) {
    const spawn = p.team === "red" ? MAP.redSpawn : MAP.blueSpawn;
    p.x = spawn.x + (Math.random() - 0.5) * 60;
    p.y = spawn.y + (Math.random() - 0.5) * 60;
    p.stunned = false;
    p.stunTimer = 0;
    p.carrying = 0;
  }

  private spawnArtifact() {
    if (this.state.artifacts.size >= MAX_ARTIFACTS) return;
    const zone = MAP.orbZones[Math.floor(Math.random() * MAP.orbZones.length)];
    const a = new ArtifactState();
    a.id = `artifact_${++artifactCounter}`;
    a.type = zone.type as ArtifactType;
    a.x = clamp(zone.x + (Math.random() - 0.5) * 100, 80, WORLD_WIDTH - 80);
    a.y = clamp(zone.y + (Math.random() - 0.5) * 70, 80, WORLD_HEIGHT - 80);
    this.state.artifacts.set(a.id, a);
  }

  private dropArtifactsForPlayer(sessionId: string, scatterX?: number, scatterY?: number) {
    const p = this.state.players.get(sessionId);
    this.state.artifacts.forEach((a) => {
      if (a.heldBy !== sessionId) return;
      a.held = false;
      a.heldBy = "";
      if (scatterX !== undefined && scatterY !== undefined) {
        a.x = clamp(scatterX + (Math.random() - 0.5) * 60, 80, WORLD_WIDTH - 80);
        a.y = clamp(scatterY + (Math.random() - 0.5) * 60, 80, WORLD_HEIGHT - 80);
      }
    });
    if (p) p.carrying = 0;
  }

  private getBrainRadius(brain: BrainState) {
    return 30 + (brain.level - 1) * 10;
  }

  // Heavier machine = slower carry speed; scales with data loaded into it
  private getMachineCarrySlow(brain: BrainState): number {
    return Math.max(0.15, 0.5 - brain.ideas * 0.004);
  }

  private update(dt: number) {
    if (this.state.phase !== "playing") return;

    this.state.matchTimer = Math.max(0, this.state.matchTimer - dt);
    this.orbTimer += dt;
    if (this.orbTimer >= ORB_SPAWN_INTERVAL) { this.orbTimer = 0; this.spawnArtifact(); }

    this.state.players.forEach((player, sessionId) => {
      if (player.stunTimer > 0) {
        player.stunTimer = Math.max(0, player.stunTimer - dt);
        player.stunned = player.stunTimer > 0;
      }
      if (player.attackCooldown > 0) {
        player.attackCooldown = Math.max(0, player.attackCooldown - dt);
      }

      if (player.stunned) return;

      const input = this.inputs.get(sessionId);
      if (!input) return;

      const cls = CLASSES[player.playerClass] ?? CLASSES.user;
      const carrySlowMult = 1 - player.carrying * CARRY_SLOW_PER_ITEM;
      const carryingBrainNow = this.state.redBrain.carriedBy === sessionId || this.state.blueBrain.carriedBy === sessionId;
      let brainSlow = 1;
      if (carryingBrainNow) {
        const carriedBrain = this.state.redBrain.carriedBy === sessionId ? this.state.redBrain : this.state.blueBrain;
        brainSlow = this.getMachineCarrySlow(carriedBrain);
      }
      const speedMult = cls.speed * carrySlowMult * brainSlow;

      const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dx !== 0 || dy !== 0) {
        player.x += (dx / len) * PLAYER_SPEED * speedMult * (dt / 1000);
        player.y += (dy / len) * PLAYER_SPEED * speedMult * (dt / 1000);
      }
      player.x = clamp(player.x, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
      player.y = clamp(player.y, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
      player.tick = input.tick;

      if (carryingBrainNow) {
        const eBrain = this.state.redBrain.carriedBy === sessionId ? this.state.redBrain : this.state.blueBrain;
        eBrain.x = player.x;
        eBrain.y = player.y;
      }

      if (input.interact) this.handleInteract(player, sessionId);
      if (input.drop)     this.handleDrop(player, sessionId);
      if (input.attack && player.attackCooldown <= 0) this.handleAttack(player, sessionId);
    });

    // Player-player collision
    const arr: PlayerState[] = [];
    this.state.players.forEach((p) => arr.push(p));
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        const d = dist(a.x, a.y, b.x, b.y);
        const minD = PLAYER_RADIUS * 2;
        if (d < minD && d > 0) {
          const overlap = (minD - d) / 2;
          const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
          a.x = clamp(a.x - nx * overlap, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
          a.y = clamp(a.y - ny * overlap, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
          b.x = clamp(b.x + nx * overlap, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
          b.y = clamp(b.y + ny * overlap, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
        }
      }
    }

    this.updateCaptureTimer(this.state.redBrain, "blue", MAP.bluePrison, dt);
    this.updateCaptureTimer(this.state.blueBrain, "red", MAP.redPrison, dt);
    this.checkWinConditions();
  }

  private handleInteract(player: PlayerState, sessionId: string) {
    const enemyBrain = player.team === "red" ? this.state.blueBrain : this.state.redBrain;
    const cls = CLASSES[player.playerClass] ?? CLASSES.user;

    // Priority 1: Feed artifacts into enemy machine (makes it heavier to carry)
    if (player.carrying > 0 && !enemyBrain.beingCarried &&
        dist(player.x, player.y, enemyBrain.x, enemyBrain.y) < INTERACT_RANGE + this.getBrainRadius(enemyBrain)) {
      this.state.artifacts.forEach((a) => {
        if (a.heldBy !== sessionId) return;
        enemyBrain.ideas += ARTIFACT_VALUES[a.type];
        this.state.artifacts.delete(a.id);
      });
      player.carrying = 0;
      this.updateBrainLevel(enemyBrain);
      return;
    }

    // Priority 2: Pick up a nearby artifact
    if (player.carrying < cls.carry) {
      let picked = false;
      this.state.artifacts.forEach((a) => {
        if (picked || a.held) return;
        if (dist(player.x, player.y, a.x, a.y) < INTERACT_RANGE) {
          a.held = true; a.heldBy = sessionId;
          a.x = player.x; a.y = player.y;
          player.carrying++;
          picked = true;
        }
      });
      if (picked) return;
    }

    // Priority 3: Grab enemy machine and carry it
    if (!enemyBrain.beingCarried &&
        dist(player.x, player.y, enemyBrain.x, enemyBrain.y) < INTERACT_RANGE + this.getBrainRadius(enemyBrain)) {
      enemyBrain.beingCarried = true;
      enemyBrain.carriedBy = sessionId;
    }
  }

  private handleDrop(player: PlayerState, sessionId: string) {
    const enemyBrain = player.team === "red" ? this.state.blueBrain : this.state.redBrain;

    // Drop carried machine first
    if (enemyBrain.carriedBy === sessionId) {
      enemyBrain.beingCarried = false;
      enemyBrain.carriedBy = "";
      return;
    }

    // Drop held artifacts scattered around player
    if (player.carrying > 0) {
      this.dropArtifactsForPlayer(sessionId, player.x, player.y);
    }
  }

  private handleAttack(attacker: PlayerState, attackerId: string) {
    const cls = CLASSES[attacker.playerClass] ?? CLASSES.user;
    attacker.attackCooldown = cls.attackCooldown;

    // Eng Support: heals stunned allies instead of attacking enemies
    if (attacker.playerClass === "support") {
      this.state.players.forEach((target, targetId) => {
        if (targetId === attackerId || target.team !== attacker.team) return;
        if (!target.stunned) return;
        const d = dist(attacker.x, attacker.y, target.x, target.y);
        if (d > cls.attackRange + PLAYER_RADIUS * 2) return;
        target.stunned = false;
        target.stunTimer = 0;
      });
      return;
    }

    // Algorithm: AOE blast hits all enemies in range simultaneously
    if (attacker.playerClass === "algorithm") {
      this.state.players.forEach((target, targetId) => {
        if (targetId === attackerId || target.team === attacker.team) return;
        const d = dist(attacker.x, attacker.y, target.x, target.y);
        if (d > cls.attackRange + PLAYER_RADIUS * 2) return;
        this.applyHit(attacker, attacker.playerClass as PlayerClass, attackerId, target, targetId, d);
      });
      return;
    }

    // All other classes: single-target hit (closest enemy in range)
    let closest: PlayerState | null = null;
    let closestId = "";
    let closestDist = Infinity;
    this.state.players.forEach((target, targetId) => {
      if (targetId === attackerId || target.team === attacker.team) return;
      const d = dist(attacker.x, attacker.y, target.x, target.y);
      if (d > cls.attackRange + PLAYER_RADIUS * 2 || d >= closestDist) return;
      closestDist = d; closest = target; closestId = targetId;
    });
    if (closest) this.applyHit(attacker, attacker.playerClass as PlayerClass, attackerId, closest, closestId, closestDist);
  }

  private applyHit(attacker: PlayerState, playerClass: PlayerClass, attackerId: string, target: PlayerState, targetId: string, d: number) {
    const cls = CLASSES[playerClass];
    const nx = d > 0 ? (target.x - attacker.x) / d : 1;
    const ny = d > 0 ? (target.y - attacker.y) / d : 0;
    const force = ATTACK_KNOCKBACK_BASE * cls.attackKnockback;
    target.x = clamp(target.x + nx * force * 0.1, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    target.y = clamp(target.y + ny * force * 0.1, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);

    if (cls.attackStun > 0) {
      target.stunned = true;
      target.stunTimer = cls.attackStun;
    }

    // Script Kiddie (user) mugs 1 artifact on hit
    if (playerClass === "user" && target.carrying > 0 && attacker.carrying < cls.carry) {
      let mugged = false;
      this.state.artifacts.forEach((a) => {
        if (mugged || a.heldBy !== targetId) return;
        a.heldBy = attackerId;
        attacker.carrying++;
        target.carrying--;
        mugged = true;
      });
    }

    // Drop carried machine when stunned
    if (target.stunned) {
      if (this.state.redBrain.carriedBy === targetId) { this.state.redBrain.beingCarried = false; this.state.redBrain.carriedBy = ""; }
      if (this.state.blueBrain.carriedBy === targetId) { this.state.blueBrain.beingCarried = false; this.state.blueBrain.carriedBy = ""; }
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

  private updateCaptureTimer(brain: BrainState, capturingTeam: TeamId, prisonPos: { x: number; y: number }, dt: number) {
    const inPrison = dist(brain.x, brain.y, prisonPos.x, prisonPos.y) < MAP.prisonRadius;
    let guardsNearby = false;
    this.state.players.forEach((p) => {
      if (p.team === capturingTeam && dist(p.x, p.y, prisonPos.x, prisonPos.y) < MAP.prisonRadius + 60) {
        guardsNearby = true;
      }
    });

    if (inPrison && guardsNearby) {
      brain.captureTimer = Math.min(BRAIN_CAPTURE_TIME, brain.captureTimer + dt);
      brain.captured = brain.captureTimer >= BRAIN_CAPTURE_TIME;
    } else {
      brain.captureTimer = Math.max(0, brain.captureTimer - dt * 0.5);
      brain.captured = false;
    }
  }

  private checkWinConditions() {
    if (this.state.winner) return;
    // Win by locking enemy machine in your sandbox
    if (this.state.redBrain.captured)  { this.endGame("blue", "Blue team captured the Red Machine!"); return; }
    if (this.state.blueBrain.captured) { this.endGame("red",  "Red team captured the Blue Machine!"); return; }
    if (this.state.matchTimer <= 0) {
      // Team that fed more data into the enemy machine wins
      if (this.state.blueBrain.ideas >= this.state.redBrain.ideas) {
        this.endGame("red",  "Time's up! Red team overloaded the enemy system!");
      } else {
        this.endGame("blue", "Time's up! Blue team overloaded the enemy system!");
      }
    }
  }

  private endGame(winner: TeamId, reason: string) {
    this.state.winner = winner;
    this.state.winReason = reason;
    this.state.phase = "victory";
    if (winner === "red") this.state.redScore++; else this.state.blueScore++;
    this.clock.setTimeout(() => { this.state.phase = "lobby"; this.state.winner = ""; }, 10000);
  }
}
