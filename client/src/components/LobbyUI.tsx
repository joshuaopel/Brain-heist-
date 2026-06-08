import React, { useState } from "react";
import type { TeamId, PlayerClass } from "@brain-heist/shared";
import { CLASSES } from "@brain-heist/shared";
import type { UserInfo } from "../App";

interface Props {
  user: UserInfo | null;
  onJoinTeam: (team: TeamId, cls: PlayerClass) => void;
}

export default function LobbyUI({ user, onJoinTeam }: Props) {
  const [step, setStep] = useState<"team" | "class">("team");
  const [team, setTeam] = useState<TeamId>("red");

  const handleTeam = (t: TeamId) => { setTeam(t); setStep("class"); };
  const handleClass = (cls: PlayerClass) => onJoinTeam(team, cls);

  const teamColor = team === "red" ? "#ef4444" : "#3b82f6";

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "rgba(10,4,30,0.93)", color: "#fff", userSelect: "none",
    }}>
      <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: 2, marginBottom: 6,
        textShadow: "0 0 30px #a855f7, 0 0 60px #7c3aed" }}>
        🧠 BRAIN HEIST
      </div>
      <div style={{ fontSize: 14, opacity: 0.55, marginBottom: 28 }}>
        Steal the enemy brain. Evolve yours.
      </div>
      {user && <div style={{ marginBottom: 20, fontSize: 14, opacity: 0.7 }}>
        <strong>{user.username}</strong>
      </div>}

      {step === "team" && (
        <>
          <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 20, letterSpacing: 2, textTransform: "uppercase" }}>Pick your team</div>
          <div style={{ display: "flex", gap: 24 }}>
            <TeamBtn team="red"  label="🔴 Red Team"  color="#ef4444" onPick={handleTeam} />
            <TeamBtn team="blue" label="🔵 Blue Team" color="#3b82f6" onPick={handleTeam} />
          </div>
        </>
      )}

      {step === "class" && (
        <>
          <div style={{ fontSize: 13, marginBottom: 16, opacity: 0.6 }}>
            <span style={{ color: teamColor, fontWeight: 700 }}>{team === "red" ? "🔴 Red" : "🔵 Blue"}</span>
            {" "}— Pick your class
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            {(Object.keys(CLASSES) as PlayerClass[]).map((cls) => (
              <ClassCard key={cls} cls={cls} color={teamColor} onPick={handleClass} />
            ))}
          </div>
          <div onClick={() => setStep("team")} style={{ marginTop: 20, fontSize: 12, opacity: 0.4, cursor: "pointer", textDecoration: "underline" }}>
            ← change team
          </div>
        </>
      )}

      <div style={{ marginTop: 40, fontSize: 11, opacity: 0.35, textAlign: "center", lineHeight: 2 }}>
        WASD / joystick — move &nbsp;|&nbsp; SPACE / ⚡ — pick up &amp; deposit &nbsp;|&nbsp; Q / 🥊 — attack &nbsp;|&nbsp; E / ↓ — drop
      </div>
    </div>
  );
}

function TeamBtn({ team, label, color, onPick }: { team: TeamId; label: string; color: string; onPick: (t: TeamId) => void }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={() => onPick(team)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: color, border: "none", borderRadius: 14, padding: "16px 40px",
        fontSize: 19, fontWeight: 800, color: "#fff", cursor: "pointer",
        transform: hov ? "scale(1.07)" : "scale(1)",
        transition: "all 0.12s", boxShadow: `0 0 20px ${color}88`,
      }}>
      {label}
    </button>
  );
}

function ClassCard({ cls, color, onPick }: { cls: PlayerClass; color: string; onPick: (c: PlayerClass) => void }) {
  const [hov, setHov] = React.useState(false);
  const info = CLASSES[cls];
  return (
    <button onClick={() => onPick(cls)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? `${color}33` : "rgba(255,255,255,0.05)",
        border: `2px solid ${hov ? color : "rgba(255,255,255,0.15)"}`,
        borderRadius: 14, padding: "16px 20px", width: 160,
        color: "#fff", cursor: "pointer", textAlign: "left",
        transform: hov ? "scale(1.05)" : "scale(1)",
        transition: "all 0.12s",
      }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{info.emoji} {info.name}</div>
      <div style={{ fontSize: 11, opacity: 0.65, lineHeight: 1.7 }}>
        {info.desc}<br/>
        🏃 {info.speed >= 1.3 ? "Fast" : info.speed <= 0.9 ? "Slow" : "Normal"}
        &nbsp;·&nbsp; 📦 Carry {info.carry}
      </div>
    </button>
  );
}
