import Phaser from "phaser";
import type { Room } from "colyseus.js";
import type { GameState, BrainState, ArtifactState, PlayerState } from "./types";
import type { UserInfo } from "../../App";
import type { TeamId, ArtifactType } from "@brain-heist/shared";
import {
  ARTIFACT_EMOJIS, BRAIN_LEVELS, MAP, GAME_WIDTH, GAME_HEIGHT,
  PLAYER_RADIUS, BRAIN_CAPTURE_TIME, CLASSES,
} from "@brain-heist/shared";
import type { PlayerClass } from "@brain-heist/shared";

const COLORS = {
  red: 0xef4444,
  blue: 0x3b82f6,
  redLight: 0xfca5a5,
  blueLight: 0x93c5fd,
  redBase: 0xff2222,
  blueBase: 0x2244ff,
  ground: 0x1e1040,
  groundLight: 0x2a1a55,
  obstacle: 0x3d2a6e,
  idea: 0xfbbf24,
};

const ARTIFACT_COLORS: Record<ArtifactType, number> = {
  sketch: 0xfbbf24,
  code_snippet: 0x4ade80,
  coffee: 0xa16207,
  sticky_note: 0xfde047,
  render_file: 0xe879f9,
  meme: 0xf97316,
  bug_report: 0xef4444,
};

interface SceneData {
  room: Room<GameState>;
  user: UserInfo;
  getTeam: () => TeamId;
  onBrainQuote: (team: TeamId, text: string) => void;
}

export class ArenaScene extends Phaser.Scene {
  private room!: Room<GameState>;
  private user!: UserInfo;
  private getTeam!: () => TeamId;
  private onBrainQuote!: (team: TeamId, text: string) => void;

  private playerSprites = new Map<string, Phaser.GameObjects.Container>();
  private artifactSprites = new Map<string, Phaser.GameObjects.Container>();
  private redBrainSprite!: Phaser.GameObjects.Container;
  private blueBrainSprite!: Phaser.GameObjects.Container;

  private keys!: {
    W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key; E: Phaser.Input.Keyboard.Key;
    Q: Phaser.Input.Keyboard.Key;
    UP: Phaser.Input.Keyboard.Key; DOWN: Phaser.Input.Keyboard.Key;
    LEFT: Phaser.Input.Keyboard.Key; RIGHT: Phaser.Input.Keyboard.Key;
  };

  private tickCounter = 0;
  private lastBrainLevels = { red: 1, blue: 1 };
  private touch = { left: false, right: false, up: false, down: false, interact: false, drop: false, attack: false };

  setTouchInput(input: { left: boolean; right: boolean; up: boolean; down: boolean; interact: boolean; drop: boolean; attack: boolean }) {
    this.touch = { ...input };
  }

  constructor() {
    super({ key: "ArenaScene" });
  }

  init(data: SceneData) {
    this.room = data.room;
    this.user = data.user;
    this.getTeam = data.getTeam;
    this.onBrainQuote = data.onBrainQuote;
  }

  create() {
    this.drawMap();
    this.createBrainSprites();
    this.setupInput();
    this.setupRoomListeners();
  }

  private drawMap() {
    const g = this.add.graphics();

    // Background
    g.fillStyle(COLORS.ground);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Tile pattern
    g.fillStyle(COLORS.groundLight, 0.4);
    for (let x = 0; x < GAME_WIDTH; x += 80) {
      for (let y = 0; y < GAME_HEIGHT; y += 80) {
        if ((x / 80 + y / 80) % 2 === 0) g.fillRect(x, y, 80, 80);
      }
    }

    // ---- Red base area ----
    g.fillStyle(0xff0000, 0.07);
    g.fillCircle(MAP.redSpawn.x, MAP.redSpawn.y, MAP.baseRadius);

    // Red Nest (brain home)
    g.fillStyle(0xff0000, 0.18);
    g.fillCircle(MAP.redNest.x, MAP.redNest.y, MAP.nestRadius);
    g.lineStyle(3, COLORS.red, 0.8);
    g.strokeCircle(MAP.redNest.x, MAP.redNest.y, MAP.nestRadius);
    this.add.text(MAP.redNest.x, MAP.redNest.y - MAP.nestRadius - 10, "🖥 LAB", {
      fontSize: "12px", fontStyle: "bold", color: "#ef4444",
    }).setOrigin(0.5).setAlpha(0.9);

    // Red Prison (captured brain zone)
    g.fillStyle(0xff0000, 0.10);
    g.fillCircle(MAP.redPrison.x, MAP.redPrison.y, MAP.prisonRadius);
    g.lineStyle(2, COLORS.red, 0.5);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(
        MAP.redPrison.x + Math.cos(a) * (MAP.prisonRadius - 8), MAP.redPrison.y + Math.sin(a) * (MAP.prisonRadius - 8),
        MAP.redPrison.x + Math.cos(a) * MAP.prisonRadius, MAP.redPrison.y + Math.sin(a) * MAP.prisonRadius,
      );
    }
    g.strokeCircle(MAP.redPrison.x, MAP.redPrison.y, MAP.prisonRadius);
    this.add.text(MAP.redPrison.x, MAP.redPrison.y - MAP.prisonRadius - 10, "🔒 SANDBOX", {
      fontSize: "12px", fontStyle: "bold", color: "#ef4444",
    }).setOrigin(0.5).setAlpha(0.9);

    // ---- Blue base area ----
    g.fillStyle(0x0044ff, 0.07);
    g.fillCircle(MAP.blueSpawn.x, MAP.blueSpawn.y, MAP.baseRadius);

    // Blue Nest
    g.fillStyle(0x0044ff, 0.18);
    g.fillCircle(MAP.blueNest.x, MAP.blueNest.y, MAP.nestRadius);
    g.lineStyle(3, COLORS.blue, 0.8);
    g.strokeCircle(MAP.blueNest.x, MAP.blueNest.y, MAP.nestRadius);
    this.add.text(MAP.blueNest.x, MAP.blueNest.y - MAP.nestRadius - 10, "🖥 LAB", {
      fontSize: "12px", fontStyle: "bold", color: "#3b82f6",
    }).setOrigin(0.5).setAlpha(0.9);

    // Blue Prison
    g.fillStyle(0x0044ff, 0.10);
    g.fillCircle(MAP.bluePrison.x, MAP.bluePrison.y, MAP.prisonRadius);
    g.lineStyle(2, COLORS.blue, 0.5);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(
        MAP.bluePrison.x + Math.cos(a) * (MAP.prisonRadius - 8), MAP.bluePrison.y + Math.sin(a) * (MAP.prisonRadius - 8),
        MAP.bluePrison.x + Math.cos(a) * MAP.prisonRadius, MAP.bluePrison.y + Math.sin(a) * MAP.prisonRadius,
      );
    }
    g.strokeCircle(MAP.bluePrison.x, MAP.bluePrison.y, MAP.prisonRadius);
    this.add.text(MAP.bluePrison.x, MAP.bluePrison.y - MAP.prisonRadius - 10, "🔒 SANDBOX", {
      fontSize: "12px", fontStyle: "bold", color: "#3b82f6",
    }).setOrigin(0.5).setAlpha(0.9);

    // Center divider
    g.lineStyle(2, 0xffffff, 0.08);
    g.lineBetween(GAME_WIDTH / 2, 0, GAME_WIDTH / 2, GAME_HEIGHT);
    g.lineStyle(2, 0xffffff, 0.1);
    g.strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 100);

    // Obstacles
    const obstacles = [
      { x: 360, y: 200, w: 80, h: 40 },
      { x: 360, y: GAME_HEIGHT - 200, w: 80, h: 40 },
      { x: GAME_WIDTH - 360, y: 200, w: 80, h: 40 },
      { x: GAME_WIDTH - 360, y: GAME_HEIGHT - 200, w: 80, h: 40 },
      { x: GAME_WIDTH / 2 - 40, y: 120, w: 80, h: 40 },
      { x: GAME_WIDTH / 2 - 40, y: GAME_HEIGHT - 140, w: 80, h: 40 },
    ];
    for (const o of obstacles) {
      g.fillStyle(COLORS.obstacle);
      g.fillRoundedRect(o.x, o.y, o.w, o.h, 8);
      g.lineStyle(2, 0x7c5cbf, 0.8);
      g.strokeRoundedRect(o.x, o.y, o.w, o.h, 8);
    }

    // Typed artifact zones
    const zoneColors: Record<string, number> = {
      code_snippet: 0x4ade80, sketch: 0xfbbf24, render_file: 0xe879f9,
      meme: 0xf97316, sticky_note: 0xfde047, coffee: 0xa16207, bug_report: 0xef4444,
    };
    for (const zone of MAP.orbZones) {
      const col = zoneColors[zone.type] ?? COLORS.idea;
      g.lineStyle(1, col, 0.3);
      g.strokeCircle(zone.x, zone.y, 56);
      g.fillStyle(col, 0.06);
      g.fillCircle(zone.x, zone.y, 56);
    }

    g.lineStyle(4, 0x7c3aed, 0.5);
    g.strokeRect(2, 2, GAME_WIDTH - 4, GAME_HEIGHT - 4);
  }

  private createBrainSprites() {
    this.redBrainSprite = this.createBrainContainer(MAP.redBrainStart.x, MAP.redBrainStart.y, "red", 1);
    this.blueBrainSprite = this.createBrainContainer(MAP.blueBrainStart.x, MAP.blueBrainStart.y, "blue", 1);
  }

  private createBrainContainer(x: number, y: number, team: TeamId, level: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    this.updateBrainContainer(container, team, level, 0);
    return container;
  }

  private updateBrainContainer(container: Phaser.GameObjects.Container, team: TeamId, level: number, captureProgress: number) {
    container.removeAll(true);
    const color = team === "red" ? COLORS.red : COLORS.blue;
    const radius = 30 + (level - 1) * 10;

    // Glow
    const glow = this.add.graphics();
    glow.fillStyle(color, 0.15);
    glow.fillCircle(0, 0, radius + 20);
    container.add(glow);

    // Body
    const body = this.add.graphics();
    body.fillStyle(color, 0.9);
    body.fillCircle(0, 0, radius);
    body.lineStyle(3, 0xffffff, 0.6);
    body.strokeCircle(0, 0, radius);
    container.add(body);

    // Brain wrinkles (decorative)
    const wrinkle = this.add.graphics();
    wrinkle.lineStyle(2, 0xffffff, 0.3);
    wrinkle.beginPath();
    wrinkle.arc(0, 0, radius * 0.6, 0.2, Math.PI - 0.2, false);
    wrinkle.strokePath();
    wrinkle.beginPath();
    wrinkle.arc(-radius * 0.2, -radius * 0.1, radius * 0.3, 0.3, Math.PI - 0.3, false);
    wrinkle.strokePath();
    container.add(wrinkle);

    // Level label
    const levelInfo = BRAIN_LEVELS[level - 1];
    const label = this.add.text(0, radius + 14, `Lv.${level} ${levelInfo.name}`, {
      fontSize: "13px", fontStyle: "bold",
      color: team === "red" ? "#ef4444" : "#3b82f6",
      stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5, 0);
    container.add(label);

    // Capture timer arc
    if (captureProgress > 0) {
      const arc = this.add.graphics();
      const enemyColor = team === "red" ? COLORS.blue : COLORS.red;
      arc.lineStyle(6, enemyColor, 0.9);
      arc.beginPath();
      arc.arc(0, 0, radius + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * captureProgress, false);
      arc.strokePath();
      container.add(arc);
    }
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    this.keys = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      SPACE: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      E: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      Q: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      UP: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      DOWN: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      LEFT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      RIGHT: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    };
  }

  private setupRoomListeners() {
    const state = this.room.state;

    // Players
    state.players.onAdd((player: PlayerState, sessionId: string) => {
      const sprite = this.createPlayerSprite(player.x, player.y, player.team, player.name);
      this.playerSprites.set(sessionId, sprite);

      player.onChange(() => {
        const s = this.playerSprites.get(sessionId);
        if (!s) return;
        s.setPosition(player.x, player.y);
        this.updatePlayerSprite(s, player.team, player.name, player.carrying,
          sessionId === this.room.sessionId, player.playerClass as PlayerClass, player.stunned);
      });
    });

    state.players.onRemove((_: PlayerState, sessionId: string) => {
      this.playerSprites.get(sessionId)?.destroy();
      this.playerSprites.delete(sessionId);
    });

    // Artifacts
    state.artifacts.onAdd((artifact: ArtifactState, id: string) => {
      const sprite = this.createArtifactSprite(artifact.x, artifact.y, artifact.type);
      this.artifactSprites.set(id, sprite);

      artifact.onChange(() => {
        const s = this.artifactSprites.get(id);
        if (!s) return;
        if (artifact.held) {
          const carrier = this.playerSprites.get(artifact.heldBy);
          if (carrier) {
            s.setPosition(carrier.x + (Math.random() - 0.5) * 30, carrier.y - 30);
          }
        } else {
          s.setPosition(artifact.x, artifact.y);
        }
        s.setVisible(!artifact.held);
      });
    });

    state.artifacts.onRemove((_: ArtifactState, id: string) => {
      this.artifactSprites.get(id)?.destroy();
      this.artifactSprites.delete(id);
    });

    // Brains
    state.redBrain.onChange(() => this.syncBrain(state.redBrain, this.redBrainSprite, "red"));
    state.blueBrain.onChange(() => this.syncBrain(state.blueBrain, this.blueBrainSprite, "blue"));
  }

  private syncBrain(brain: BrainState, sprite: Phaser.GameObjects.Container, team: TeamId) {
    sprite.setPosition(brain.x, brain.y);
    const captureProgress = brain.captureTimer / BRAIN_CAPTURE_TIME;
    this.updateBrainContainer(sprite, team, brain.level, captureProgress);

    if (brain.level !== this.lastBrainLevels[team]) {
      this.lastBrainLevels[team] = brain.level;
      const quote = BRAIN_LEVELS[brain.level - 1].quote;
      this.onBrainQuote(team, quote);
      this.spawnLevelUpEffect(brain.x, brain.y, team);
    }
  }

  private spawnLevelUpEffect(x: number, y: number, team: TeamId) {
    const color = team === "red" ? "#ef4444" : "#3b82f6";
    const text = this.add.text(x, y - 50, "UPGRADED! 🤖", {
      fontSize: "24px", fontStyle: "bold", color,
      stroke: "#000", strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 120, alpha: 0,
      duration: 1500, ease: "Cubic.Out",
      onComplete: () => text.destroy(),
    });

    // Particle burst
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dot = this.add.graphics();
      dot.fillStyle(team === "red" ? COLORS.red : COLORS.blue);
      dot.fillCircle(0, 0, 6);
      dot.setPosition(x, y);
      const dist = 80;
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 700, ease: "Cubic.Out",
        onComplete: () => dot.destroy(),
      });
    }
  }

  private createPlayerSprite(x: number, y: number, team: TeamId, name: string, playerClass: PlayerClass = "coder"): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    this.updatePlayerSprite(container, team, name, 0, false, playerClass, false);
    return container;
  }

  private updatePlayerSprite(
    container: Phaser.GameObjects.Container,
    team: TeamId,
    name: string,
    carrying: number,
    isSelf: boolean,
    playerClass: PlayerClass = "coder",
    stunned: boolean = false,
  ) {
    container.removeAll(true);
    const color = team === "red" ? COLORS.red : COLORS.blue;
    const r = PLAYER_RADIUS;

    // Stun flash ring
    if (stunned) {
      const stunRing = this.add.graphics();
      stunRing.lineStyle(3, 0xffff00, 0.9);
      stunRing.strokeCircle(0, 0, r + 6);
      container.add(stunRing);
    }

    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillEllipse(3, 3, r * 2.2, r * 1.4);
    container.add(shadow);

    // Self indicator ring
    if (isSelf) {
      const ring = this.add.graphics();
      ring.lineStyle(2, 0xffffff, 0.5);
      ring.strokeCircle(0, 0, r + 5);
      container.add(ring);
    }

    // Body — tinted by class
    const classColors: Record<PlayerClass, number> = {
      coder: color,
      designer: team === "red" ? 0xf87171 : 0x818cf8,
      brawler:  team === "red" ? 0xb45309 : 0x1d4ed8,
    };
    const body = this.add.graphics();
    body.fillStyle(stunned ? 0xaaaaaa : classColors[playerClass], 1);
    body.fillCircle(0, 0, r);
    container.add(body);

    // Face
    const face = this.add.graphics();
    face.fillStyle(stunned ? 0xdddddd : 0xffd3a8, 1);
    face.fillCircle(0, -4, r * 0.6);
    face.fillStyle(0x111111, 1);
    face.fillCircle(-6, -6, 3);
    face.fillCircle(6, -6, 3);
    face.lineStyle(2, 0x111111, 1);
    if (stunned) {
      // X eyes
      face.fillStyle(0x111111, 1);
      face.fillRect(-8, -8, 3, 3); face.fillRect(-5, -5, 3, 3);
      face.fillRect(5, -8, 3, 3);  face.fillRect(3, -5, 3, 3);
    } else {
      face.beginPath();
      face.arc(0, -2, 6, 0.3, Math.PI - 0.3);
      face.strokePath();
    }
    container.add(face);

    // Class badge
    const clsInfo = CLASSES[playerClass];
    const badge = this.add.text(r - 2, -r + 2, clsInfo.emoji, { fontSize: "10px" }).setOrigin(0.5);
    container.add(badge);

    // Name tag
    const nameTag = this.add.text(0, r + 6, name, {
      fontSize: "11px", color: "#ffffff", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5, 0);
    container.add(nameTag);

    // Carrying counter
    if (carrying > 0) {
      const carry = this.add.text(-r, -r - 4, `📦${carrying}`, {
        fontSize: "12px", fontStyle: "bold", color: "#fbbf24", stroke: "#000", strokeThickness: 3,
      }).setOrigin(0.5);
      container.add(carry);
    }
  }

  private createArtifactSprite(x: number, y: number, type: ArtifactType): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const color = ARTIFACT_COLORS[type];
    const emoji = ARTIFACT_EMOJIS[type];

    // Glow ring
    const glow = this.add.graphics();
    glow.fillStyle(color, 0.2);
    glow.fillCircle(0, 0, 22);
    container.add(glow);

    // Body
    const body = this.add.graphics();
    body.fillStyle(color, 0.9);
    body.fillCircle(0, 0, 16);
    body.lineStyle(2, 0xffffff, 0.5);
    body.strokeCircle(0, 0, 16);
    container.add(body);

    // Emoji label
    const label = this.add.text(0, 0, emoji, { fontSize: "14px" }).setOrigin(0.5);
    container.add(label);

    // Float animation
    this.tweens.add({
      targets: container,
      y: y - 6,
      duration: 1000 + Math.random() * 500,
      yoyo: true, repeat: -1, ease: "Sine.InOut",
    });

    return container;
  }

  update() {
    if (!this.keys) return;

    const k = this.keys;
    const input = {
      left:     k.A.isDown || k.LEFT.isDown  || this.touch.left,
      right:    k.D.isDown || k.RIGHT.isDown || this.touch.right,
      up:       k.W.isDown || k.UP.isDown    || this.touch.up,
      down:     k.S.isDown || k.DOWN.isDown  || this.touch.down,
      interact: Phaser.Input.Keyboard.JustDown(k.SPACE) || this.touch.interact,
      drop:     Phaser.Input.Keyboard.JustDown(k.E)     || this.touch.drop,
      attack:   Phaser.Input.Keyboard.JustDown(k.Q)     || this.touch.attack,
      tick:     ++this.tickCounter,
    };

    this.touch.interact = false;
    this.touch.drop = false;
    this.touch.attack = false;

    this.room.send("input", input);
  }
}
