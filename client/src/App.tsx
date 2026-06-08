import React, { useEffect, useRef, useState } from "react";
import { initDiscord } from "./discord/sdk";
import { GameManager } from "./game/GameManager";
import LobbyUI from "./components/LobbyUI";
import HUD from "./components/HUD";
import VictoryScreen from "./components/VictoryScreen";
import TouchControls from "./components/TouchControls";
import type { TeamId, GamePhase } from "@brain-heist/shared";

export interface UserInfo {
  userId: string;
  username: string;
  avatarUrl: string;
}

type ConnectState = "connecting" | "ready" | "error";

export default function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [team, setTeam] = useState<TeamId>("red");
  const [winner, setWinner] = useState<{ team: TeamId; reason: string } | null>(null);
  const [connectState, setConnectState] = useState<ConnectState>("connecting");
  const [connectMsg, setConnectMsg] = useState("Waking up server…");
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
        setRedIdeas(ri); setBlueIdeas(bi);
        setRedLevel(rl); setBlueLevel(bl);
        setMatchTimer(mt);
      },
      onBrainQuote: (t, text) => {
        setBrainQuote({ team: t, text });
        setTimeout(() => setBrainQuote(null), 3000);
      },
    });
    managerRef.current = manager;

    // Ticking status messages while server wakes up (Render free tier cold start)
    const msgs = [
      "Waking up server…",
      "Brewing coffee ☕…",
      "Loading brains 🧠…",
      "Almost there…",
    ];
    let i = 0;
    const ticker = setInterval(() => {
      i = Math.min(i + 1, msgs.length - 1);
      setConnectMsg(msgs[i]);
    }, 5000);

    manager.init()
      .then(() => {
        clearInterval(ticker);
        setConnectState("ready");
      })
      .catch(() => {
        clearInterval(ticker);
        setConnectState("error");
        setConnectMsg("Could not reach server. Is it deployed?");
      });

    return () => { clearInterval(ticker); manager.destroy(); };
  }, [user]);

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  const handleJoinTeam = (t: TeamId) => managerRef.current?.joinTeam(t);
  const handleRestart = () => { setWinner(null); managerRef.current?.requestRestart(); };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#1a0a2e" }}>
      <div ref={gameContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Loading / error overlay */}
      {connectState !== "ready" && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(10,4,30,0.96)", color: "#fff",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 12,
            textShadow: "0 0 20px #a855f7" }}>BRAIN HEIST</div>
          <div style={{ fontSize: 16, opacity: 0.7, marginBottom: 32 }}>{connectMsg}</div>
          {connectState === "connecting" && (
            <div style={{ display: "flex", gap: 8 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 12, height: 12, borderRadius: "50%",
                  background: "#a855f7",
                  animation: `bounce 0.9s ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          )}
          {connectState === "error" && (
            <button onClick={() => window.location.reload()} style={{
              marginTop: 16, padding: "12px 32px", borderRadius: 10,
              background: "#7c3aed", border: "none", color: "#fff",
              fontSize: 16, fontWeight: 700, cursor: "pointer",
            }}>Retry</button>
          )}
          <div style={{ marginTop: 48, fontSize: 12, opacity: 0.35, textAlign: "center" }}>
            Free server may take ~30s to wake up on first visit
          </div>
        </div>
      )}

      {connectState === "ready" && phase === "lobby" && (
        <LobbyUI user={user} onJoinTeam={handleJoinTeam} onStartGame={handleRestart} />
      )}

      {phase === "playing" && (
        <>
          <HUD team={team} redIdeas={redIdeas} blueIdeas={blueIdeas}
            redLevel={redLevel} blueLevel={blueLevel}
            matchTimer={matchTimer} brainQuote={brainQuote} />
          {isMobile && (
            <TouchControls onInput={(input) => managerRef.current?.sendTouchInput(input)} />
          )}
        </>
      )}

      {phase === "victory" && winner && (
        <VictoryScreen winner={winner.team} reason={winner.reason} onRestart={handleRestart} />
      )}

      <style>{`
        @keyframes bounce {
          0%,80%,100% { transform: scale(0.6); opacity:0.4; }
          40% { transform: scale(1); opacity:1; }
        }
      `}</style>
    </div>
  );
}
