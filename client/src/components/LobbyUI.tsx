import React from "react";
import type { TeamId } from "@brain-heist/shared";
import type { UserInfo } from "../App";

interface Props {
  user: UserInfo | null;
  onJoinTeam: (team: TeamId) => void;
}

export default function LobbyUI({ user, onJoinTeam }: Props) {
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "rgba(10,4,30,0.92)", color: "#fff", userSelect: "none",
    }}>
      <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: 2, marginBottom: 6,
        textShadow: "0 0 30px #a855f7, 0 0 60px #7c3aed" }}>
        🧠 BRAIN HEIST
      </div>
      <div style={{ fontSize: 16, opacity: 0.6, marginBottom: 36 }}>
        Steal the enemy brain. Evolve yours. Don't get pushed around.
      </div>
      {user && (
        <div style={{ marginBottom: 28, fontSize: 15, opacity: 0.8 }}>
          Playing as <strong>{user.username}</strong>
        </div>
      )}
      <div style={{ display: "flex", gap: 24 }}>
        <TeamButton team="red" label="🔴 RED TEAM" color="#ef4444" hoverColor="#dc2626" onJoin={onJoinTeam} />
        <TeamButton team="blue" label="🔵 BLUE TEAM" color="#3b82f6" hoverColor="#2563eb" onJoin={onJoinTeam} />
      </div>
      <div style={{ marginTop: 48, fontSize: 12, opacity: 0.4, textAlign: "center", lineHeight: 1.9 }}>
        WASD / joystick to move &nbsp;|&nbsp; SPACE / ⚡ to pick up &nbsp;|&nbsp; E / ↓ to drop<br/>
        Deliver Creative Artifacts to your Brain to evolve it<br/>
        Reach Level 5 or capture the enemy Brain to win!
      </div>
    </div>
  );
}

function TeamButton({ team, label, color, hoverColor, onJoin }: {
  team: TeamId; label: string; color: string; hoverColor: string; onJoin: (t: TeamId) => void;
}) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={() => onJoin(team)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? hoverColor : color,
        border: "none", borderRadius: 16, padding: "18px 40px",
        fontSize: 20, fontWeight: 800, color: "#fff", cursor: "pointer",
        transform: hov ? "scale(1.07)" : "scale(1)",
        transition: "all 0.15s", boxShadow: `0 0 24px ${color}88`,
      }}
    >
      {label}
    </button>
  );
}
