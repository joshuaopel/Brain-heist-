import React, { useEffect, useState } from "react";
import type { TeamId } from "@brain-heist/shared";

interface Props {
  winner: TeamId;
  reason: string;
  onRestart: () => void;
}

export default function VictoryScreen({ winner, reason, onRestart }: Props) {
  const [countdown, setCountdown] = useState(10);
  const color = winner === "red" ? "#ef4444" : "#3b82f6";
  const label = winner === "red" ? "🔴 RED TEAM" : "🔵 BLUE TEAM";

  useEffect(() => {
    const interval = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(ellipse at center, ${color}33 0%, rgba(10,4,30,0.95) 70%)`,
      color: "#fff", userSelect: "none",
    }}>
      <div style={{ fontSize: 18, opacity: 0.7, marginBottom: 12, letterSpacing: 4, textTransform: "uppercase" }}>
        Victory!
      </div>
      <div style={{
        fontSize: 64, fontWeight: 900, color,
        textShadow: `0 0 40px ${color}, 0 0 80px ${color}88`,
        marginBottom: 16,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 22, opacity: 0.85, marginBottom: 48, textAlign: "center", maxWidth: 500 }}>
        {reason}
      </div>
      <button
        onClick={onRestart}
        style={{
          background: color, border: "none", borderRadius: 12,
          padding: "16px 40px", fontSize: 20, fontWeight: 800,
          color: "#fff", cursor: "pointer",
          boxShadow: `0 0 20px ${color}88`,
        }}
      >
        Play Again
      </button>
      <div style={{ marginTop: 16, opacity: 0.5, fontSize: 14 }}>
        Auto-restart in {countdown}s
      </div>
    </div>
  );
}
