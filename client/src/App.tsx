import React, { useEffect, useRef, useState } from "react";
import { initDiscord } from "./discord/sdk";
import { GameManager } from "./game/GameManager";
import LobbyUI from "./components/LobbyUI";
import HUD from "./components/HUD";
import VictoryScreen from "./components/VictoryScreen";
import type { TeamId, GamePhase } from "@brain-heist/shared";

export interface UserInfo {
  userId: string;
  username: string;
  avatarUrl: string;
}

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [team, setTeam] = useState<TeamId>("red");
  const [winner, setWinner] = useState<{ team: TeamId; reason: string } | null>(null);
  const [gameReady, setGameReady] = useState(false);
  const [redIdeas, setRedIdeas] = useState(0);
  const [blueIdeas, setBlueIdeas] = useState(0);
  const [redLevel, setRedLevel] = useState(1);
  const [blueLevel, setBlueLevel] = useState(1);
  const [matchTimer, setMatchTimer] = useState(300000);
  const [brainQuote, setBrainQuote] = useState<{ team: TeamId; text: string } | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<GameManager | null>(null);

  useEffect(() => {
    initDiscord().then(setUser).catch(console.error);
  }, []);

  useEffect(() => {
    if (!user || !gameContainerRef.current) return;

    const manager = new GameManager(gameContainerRef.current, user, {
      onPhaseChange: setPhase,
      onTeamChange: setTeam,
      onWinner: (t, r) => setWinner({ team: t, reason: r }),
      onStatsUpdate: (ri, bi, rl, bl, mt) => {
        setRedIdeas(ri);
        setBlueIdeas(bi);
        setRedLevel(rl);
        setBlueLevel(bl);
        setMatchTimer(mt);
      },
      onBrainQuote: (t, text) => {
        setBrainQuote({ team: t, text });
        setTimeout(() => setBrainQuote(null), 3000);
      },
    });
    managerRef.current = manager;
    manager.init().then(() => setGameReady(true));

    return () => manager.destroy();
  }, [user]);

  const handleJoinTeam = (t: TeamId) => {
    managerRef.current?.joinTeam(t);
  };

  const handleRestart = () => {
    setWinner(null);
    managerRef.current?.requestRestart();
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#1a0a2e" }}>
      <div ref={gameContainerRef} style={{ width: "100%", height: "100%" }} />

      {gameReady && phase === "lobby" && (
        <LobbyUI user={user} onJoinTeam={handleJoinTeam} />
      )}

      {phase === "playing" && (
        <HUD
          team={team}
          redIdeas={redIdeas}
          blueIdeas={blueIdeas}
          redLevel={redLevel}
          blueLevel={blueLevel}
          matchTimer={matchTimer}
          brainQuote={brainQuote}
        />
      )}

      {phase === "victory" && winner && (
        <VictoryScreen winner={winner.team} reason={winner.reason} onRestart={handleRestart} />
      )}
    </div>
  );
}
