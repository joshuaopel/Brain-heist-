import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import type { GameState } from "./scenes/types";
import { ArenaScene } from "./scenes/ArenaScene";
import type { UserInfo } from "../App";
import type { TeamId, GamePhase, PlayerClass } from "@brain-heist/shared";

interface Callbacks {
  onPhaseChange: (phase: GamePhase) => void;
  onTeamChange: (team: TeamId) => void;
  onWinner: (team: TeamId, reason: string) => void;
  onStatsUpdate: (ri: number, bi: number, rl: number, bl: number, mt: number) => void;
  onBrainQuote: (team: TeamId, text: string) => void;
}

export class GameManager {
  private game!: Phaser.Game;
  private room!: Room<GameState>;
  private user: UserInfo;
  private container: HTMLElement;
  private callbacks: Callbacks;
  private currentTeam: TeamId = "red";

  constructor(container: HTMLElement, user: UserInfo, callbacks: Callbacks) {
    this.container = container;
    this.user = user;
    this.callbacks = callbacks;
  }

  async init() {
    // When served from Render or Discord proxy, connect back to same host.
    // When served from GitHub Pages, use the explicit env var.
    const serverUrl = import.meta.env.VITE_SERVER_URL ||
      `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;
    const client = new Client(serverUrl);

    try {
      this.room = await client.joinOrCreate<GameState>("brain_heist");
    } catch (e) {
      console.error("Failed to connect to server:", e);
      throw e;
    }

    this.room.onStateChange((state) => {
      const phase = state.phase as GamePhase;
      this.callbacks.onPhaseChange(phase);

      if (state.winner && phase === "victory") {
        this.callbacks.onWinner(state.winner as TeamId, state.winReason);
      }

      this.callbacks.onStatsUpdate(
        state.redBrain.ideas,
        state.blueBrain.ideas,
        state.redBrain.level,
        state.blueBrain.level,
        state.matchTimer,
      );
    });

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.container,
      width: 1280,
      height: 720,
      backgroundColor: "#1a0a2e",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: {
        touch: false, // React handles touch; Phaser handles keyboard only
      },
      physics: { default: "none" },
      scene: [ArenaScene],
    });

    this.game.scene.start("ArenaScene", {
      room: this.room,
      user: this.user,
      getTeam: () => this.currentTeam,
      onBrainQuote: this.callbacks.onBrainQuote,
    });
  }

  sendTouchInput(input: { left: boolean; right: boolean; up: boolean; down: boolean; interact: boolean; drop: boolean; attack: boolean }) {
    const scene = this.game?.scene.getScene("ArenaScene") as import("./scenes/ArenaScene").ArenaScene | null;
    scene?.setTouchInput(input);
  }

  joinTeam(team: TeamId, playerClass: PlayerClass = "coder") {
    this.currentTeam = team;
    this.callbacks.onTeamChange(team);
    this.room.send("join_team", {
      team, playerClass,
      name: this.user.username,
      avatarUrl: this.user.avatarUrl,
    });
  }

  requestRestart() {
    this.room.send("start_game");
  }

  destroy() {
    this.game?.destroy(true);
    this.room?.leave();
  }
}
