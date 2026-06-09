import Phaser from "phaser";
import type { Room } from "colyseus.js";
import type { GameState, BrainState, ArtifactState, PlayerState } from "./types";
import type { UserInfo } from "../../App";
import type { TeamId, ArtifactType } from "@brain-heist/shared";
import {
  ARTIFACT_EMOJIS, BRAIN_LEVELS, MAP, WORLD_WIDTH, WORLD_HEIGHT,
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
  private localFacing = 0;

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
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.drawMap();
    this.createBrainSprites();
    this.setupInput();
    this.setupRoomListeners();
  }

  private drawMap() {
    const g = this.add.graphics();

    // Background
    g.fillStyle(COLORS.ground);
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Tile pattern
    g.fillStyle(COLORS.groundLight, 0.4);
    for (let x = 0; x < WORLD_WIDTH; x += 80) {
      for (let y = 0; y < WORLD_HEIGHT; y += 80) {
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
    g.lineBetween(WORLD_WIDTH / 2, 0, WORLD_WIDTH / 2, WORLD_HEIGHT);
    g.lineStyle(2, 0xffffff, 0.1);
    g.strokeCircle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 100);

    // Obstacles
    const W = WORLD_WIDTH, H = WORLD_HEIGHT, CX2 = W/2, CY2 = H/2;
    const obstacles = [
      // Near bases
      { x: 600,     y: 450,      w: 200, h: 100 },
      { x: 600,     y: H - 550,  w: 200, h: 100 },
      { x: W - 800, y: 450,      w: 200, h: 100 },
      { x: W - 800, y: H - 550,  w: 200, h: 100 },
      // Top / bottom center
      { x: CX2 - 100, y: 300,      w: 200, h: 100 },
      { x: CX2 - 100, y: H - 400,  w: 200, h: 100 },
      // Center cluster
      { x: CX2 - 320, y: CY2 - 130, w: 160, h: 80 },
      { x: CX2 + 160, y: CY2 - 130, w: 160, h: 80 },
      { x: CX2 - 320, y: CY2 + 50,  w: 160, h: 80 },
      { x: CX2 + 160, y: CY2 + 50,  w: 160, h: 80 },
      // Mid-field cover
      { x: CX2 - 650, y: CY2 - 260, w: 140, h: 70 },
      { x: CX2 + 510, y: CY2 - 260, w: 140, h: 70 },
      { x: CX2 - 650, y: CY2 + 190, w: 140, h: 70 },
      { x: CX2 + 510, y: CY2 + 190, w: 140, h: 70 },
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
    g.strokeRect(2, 2, WORLD_WIDTH - 4, WORLD_HEIGHT - 4);
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

      if (sessionId === this.room.sessionId) {
        this.cameras.main.startFollow(sprite, true, 0.1, 0.1);
      }

      let prevStunned = false;
      player.onChange(() => {
        const s = this.playerSprites.get(sessionId);
        if (!s) return;
        s.setPosition(player.x, player.y);
        this.updatePlayerSprite(s, player.team, player.name, player.carrying,
          sessionId === this.room.sessionId, player.playerClass as PlayerClass, player.stunned);
        if (player.stunned && !prevStunned) this.spawnStunEffect(player.x, player.y);
        prevStunned = player.stunned;
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

  private playAttackVisual(x: number, y: number, playerClass: PlayerClass, _team: TeamId, facing: number) {
    switch (playerClass) {
      case "user": {
        // Script Kiddie: three fast yellow slashes in facing direction
        for (let i = -1; i <= 1; i++) {
          const a = facing + i * 0.45;
          const g = this.add.graphics();
          g.lineStyle(3, 0xfbbf24, 1);
          g.lineBetween(x + Math.cos(a) * 18, y + Math.sin(a) * 18, x + Math.cos(a) * 54, y + Math.sin(a) * 54);
          this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
        }
        break;
      }
      case "sysadmin": {
        // SysAdmin: blunt orange impact ring
        const g = this.add.graphics();
        g.lineStyle(5, 0xfb923c, 1);
        g.strokeCircle(x, y, 28);
        this.tweens.add({ targets: g, alpha: 0, scaleX: 1.9, scaleY: 1.9, duration: 300, ease: "Cubic.Out", onComplete: () => g.destroy() });
        break;
      }
      case "redteamer": {
        // Red Teamer: heavy red shockwave + inner ring
        const g = this.add.graphics();
        g.lineStyle(7, 0xef4444, 1);
        g.strokeCircle(x, y, 24);
        const g2 = this.add.graphics();
        g2.lineStyle(3, 0xfca5a5, 0.6);
        g2.strokeCircle(x, y, 14);
        this.tweens.add({ targets: g,  alpha: 0, scaleX: 3.2, scaleY: 3.2, duration: 440, ease: "Cubic.Out", onComplete: () => g.destroy() });
        this.tweens.add({ targets: g2, alpha: 0, scaleX: 4.2, scaleY: 4.2, duration: 540, ease: "Cubic.Out", onComplete: () => g2.destroy() });
        break;
      }
      case "whitehat": {
        // White Hat: golden laser beam toward facing direction
        const ex = x + Math.cos(facing) * 150;
        const ey = y + Math.sin(facing) * 150;
        const beam = this.add.graphics();
        beam.lineStyle(3, 0xfbbf24, 1);
        beam.lineBetween(x, y, ex, ey);
        const glow = this.add.graphics();
        glow.lineStyle(9, 0xfde047, 0.22);
        glow.lineBetween(x, y, ex, ey);
        const dot = this.add.graphics();
        dot.fillStyle(0xfbbf24, 1);
        dot.fillCircle(ex, ey, 8);
        this.tweens.add({
          targets: [beam, glow, dot], alpha: 0, duration: 340,
          onComplete: () => { beam.destroy(); glow.destroy(); dot.destroy(); },
        });
        break;
      }
      case "algorithm": {
        // Algorithm: purple AOE expanding ring + flying sparks
        const ring = this.add.graphics();
        ring.lineStyle(4, 0xa855f7, 0.9);
        ring.strokeCircle(x, y, 22);
        const fill = this.add.graphics();
        fill.fillStyle(0xa855f7, 0.14);
        fill.fillCircle(x, y, 22);
        this.tweens.add({ targets: ring, alpha: 0, scaleX: 5.5, scaleY: 5.5, duration: 560, ease: "Cubic.Out", onComplete: () => ring.destroy() });
        this.tweens.add({ targets: fill, alpha: 0, scaleX: 5.5, scaleY: 5.5, duration: 460, ease: "Cubic.Out", onComplete: () => fill.destroy() });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const spark = this.add.graphics();
          spark.fillStyle(0xd946ef, 1);
          spark.fillCircle(0, 0, 4);
          spark.setPosition(x, y);
          this.tweens.add({ targets: spark, x: x + Math.cos(a) * 100, y: y + Math.sin(a) * 100, alpha: 0, duration: 520, ease: "Cubic.Out", onComplete: () => spark.destroy() });
        }
        break;
      }
      case "support": {
        // Eng Support: green healing pulse radiating outward
        const pulse = this.add.graphics();
        pulse.lineStyle(3, 0x4ade80, 0.8);
        pulse.strokeCircle(x, y, 20);
        this.tweens.add({ targets: pulse, alpha: 0, scaleX: 4.2, scaleY: 4.2, duration: 620, ease: "Sine.Out", onComplete: () => pulse.destroy() });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const dot = this.add.graphics();
          dot.fillStyle(0x4ade80, 1);
          dot.fillCircle(0, 0, 5);
          dot.setPosition(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
          this.tweens.add({ targets: dot, x: x + Math.cos(a) * 85, y: y + Math.sin(a) * 85, alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 660, ease: "Sine.Out", onComplete: () => dot.destroy() });
        }
        break;
      }
    }
  }

  private spawnStunEffect(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const star = this.add.text(x + Math.cos(a) * 22, y + Math.sin(a) * 22 - 8, "★", {
        fontSize: "13px", color: "#facc15",
      }).setOrigin(0.5);
      this.tweens.add({ targets: star, x: x + Math.cos(a) * 48, y: y + Math.sin(a) * 48 - 24, alpha: 0, duration: 650, onComplete: () => star.destroy() });
    }
  }

  private createPlayerSprite(x: number, y: number, team: TeamId, name: string, playerClass: PlayerClass = "user"): Phaser.GameObjects.Container {
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
    playerClass: PlayerClass = "user",
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
      user:      color,
      sysadmin:  team === "red" ? 0xfb923c : 0x34d399,
      redteamer: team === "red" ? 0xdc2626 : 0x1d4ed8,
      whitehat:  team === "red" ? 0xfbbf24 : 0x93c5fd,
      algorithm: team === "red" ? 0xa855f7 : 0x7c3aed,
      support:   team === "red" ? 0xf472b6 : 0x4ade80,
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

    const attackPressed  = Phaser.Input.Keyboard.JustDown(k.SPACE) || this.touch.attack;
    const interactPressed = Phaser.Input.Keyboard.JustDown(k.E)    || this.touch.interact;
    const dropPressed    = Phaser.Input.Keyboard.JustDown(k.Q)     || this.touch.drop;

    // Track facing direction for directional attack visuals
    const fdx = (k.D.isDown || k.RIGHT.isDown || this.touch.right ? 1 : 0) - (k.A.isDown || k.LEFT.isDown || this.touch.left ? 1 : 0);
    const fdy = (k.S.isDown || k.DOWN.isDown  || this.touch.down  ? 1 : 0) - (k.W.isDown || k.UP.isDown   || this.touch.up   ? 1 : 0);
    if (fdx !== 0 || fdy !== 0) this.localFacing = Math.atan2(fdy, fdx);

    if (attackPressed) {
      const lp = this.room.state.players.get(this.room.sessionId);
      if (lp && lp.attackCooldown <= 0) {
        this.playAttackVisual(lp.x, lp.y, lp.playerClass as PlayerClass, lp.team as TeamId, this.localFacing);
      }
    }

    const input = {
      left:     k.A.isDown || k.LEFT.isDown  || this.touch.left,
      right:    k.D.isDown || k.RIGHT.isDown || this.touch.right,
      up:       k.W.isDown || k.UP.isDown    || this.touch.up,
      down:     k.S.isDown || k.DOWN.isDown  || this.touch.down,
      interact: interactPressed,
      drop:     dropPressed,
      attack:   attackPressed,
      tick:     ++this.tickCounter,
    };

    this.touch.interact = false;
    this.touch.drop = false;
    this.touch.attack = false;

    this.room.send("input", input);
  }
}
