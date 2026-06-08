import React from "react";
import type { TeamId } from "@brain-heist/shared";
import { BRAIN_LEVELS, BRAIN_CAPTURE_TIME } from "@brain-heist/shared";

interface Props {
  team: TeamId;
  redIdeas: number;
  blueIdeas: number;
  redLevel: number;
  blueLevel: number;
  matchTimer: number;
  brainQuote: { team: TeamId; text: string } | null;
  redCaptureProgress: number;
  blueCaptureProgress: number;
  redBrainCarried: boolean;
  blueBrainCarried: boolean;
}

function formatTime(ms: number) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function BrainBar({ ideas, level, color, label }: { ideas: number; level: number; color: string; label: string }) {
  const current = BRAIN_LEVELS[level - 1];
  const next = BRAIN_LEVELS[level] ?? BRAIN_LEVELS[level - 1];
  const progress = level >= 5 ? 1 : (ideas - current.ideasRequired) / (next.ideasRequired - current.ideasRequired);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 220 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
        <span style={{ color }}>{label} — Lv.{level} {current.name}</span>
        <span style={{ opacity: 0.7 }}>{ideas} tokens</span>
      </div>
      <div style={{ height: 12, background: "rgba(255,255,255,0.1)", borderRadius: 6, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${Math.min(100, progress * 100)}%`,
          background: color, borderRadius: 6,
          transition: "width 0.3s",
          boxShadow: `0 0 8px ${color}`,
        }} />
      </div>
    </div>
  );
}

export default function HUD({ team, redIdeas, blueIdeas, redLevel, blueLevel, matchTimer, brainQuote, redCaptureProgress, blueCaptureProgress, redBrainCarried, blueBrainCarried }: Props) {
  return (
    <>
      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "10px 20px", pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
      }}>
        <BrainBar ideas={redIdeas} level={redLevel} color="#ef4444" label="🔴 Red AI" />

        <div style={{
          fontSize: 32, fontWeight: 900, color: matchTimer < 30000 ? "#ef4444" : "#fff",
          textShadow: "0 2px 8px rgba(0,0,0,0.8)",
          animation: matchTimer < 10000 ? "pulse 0.5s infinite" : undefined,
        }}>
          {formatTime(matchTimer)}
        </div>

        <BrainBar ideas={blueIdeas} level={blueLevel} color="#3b82f6" label="🔵 Blue AI" />
      </div>

      {/* Brain alert */}
      {(() => {
        const myCapture = team === "red" ? redCaptureProgress : blueCaptureProgress;
        const myCarried = team === "red" ? redBrainCarried : blueBrainCarried;
        const enemyCapture = team === "red" ? blueCaptureProgress : redCaptureProgress;
        const enemyCarried = team === "red" ? blueBrainCarried : redBrainCarried;
        const myColor = team === "red" ? "#ef4444" : "#3b82f6";
        const enemyColor = team === "red" ? "#3b82f6" : "#ef4444";
        const secLeft = Math.ceil((1 - myCapture) * BRAIN_CAPTURE_TIME / 1000);
        return (
          <>
            {(myCarried || myCapture > 0) && (
              <div style={{
                position: "absolute", top: 72, left: "50%", transform: "translateX(-50%)",
                background: "rgba(0,0,0,0.9)", border: `2px solid ${myCapture > 0 ? "#ef4444" : "#facc15"}`,
                borderRadius: 12, padding: "10px 28px", textAlign: "center",
                pointerEvents: "none", minWidth: 300,
                animation: "alertPulse 0.5s infinite",
              }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: myCapture > 0 ? "#ef4444" : "#facc15", marginBottom: myCapture > 0 ? 8 : 0 }}>
                  {myCapture > 0 ? "🔒 YOUR AI IS BEING LOCKED DOWN!" : "⚠️ YOUR AI HAS BEEN STOLEN!"}
                </div>
                {myCapture > 0 && (
                  <>
                    <div style={{ height: 8, background: "rgba(255,255,255,0.15)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${myCapture * 100}%`, background: "#ef4444", borderRadius: 4, transition: "width 0.2s" }} />
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4, color: "#fff" }}>{secLeft}s until captured</div>
                  </>
                )}
              </div>
            )}
            {(enemyCarried || enemyCapture > 0) && !(myCarried || myCapture > 0) && (
              <div style={{
                position: "absolute", top: 72, left: "50%", transform: "translateX(-50%)",
                background: "rgba(0,0,0,0.85)", border: `2px solid ${enemyColor}`,
                borderRadius: 12, padding: "8px 24px", textAlign: "center",
                pointerEvents: "none", fontSize: 12, color: "#4ade80", fontWeight: 700,
              }}>
                {enemyCapture > 0 ? "✅ LOCKING DOWN ENEMY AI!" : "⚡ ENEMY AI CAPTURED — GET IT TO YOUR SANDBOX!"}
              </div>
            )}
          </>
        );
      })()}

      {/* Team indicator */}
      <div style={{
        position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
        fontSize: 13, fontWeight: 700, opacity: 0.7, pointerEvents: "none",
        color: team === "red" ? "#ef4444" : "#3b82f6",
        textShadow: "0 1px 4px rgba(0,0,0,0.9)",
      }}>
        {team === "red" ? "🔴 RED TEAM" : "🔵 BLUE TEAM"} &nbsp;|&nbsp; SPACE: interact &nbsp;|&nbsp; E: drop
      </div>

      {/* Brain quote bubble */}
      {brainQuote && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: brainQuote.team === "red" ? "rgba(239,68,68,0.9)" : "rgba(59,130,246,0.9)",
          color: "#fff", borderRadius: 16, padding: "16px 28px",
          fontSize: 20, fontWeight: 700, textAlign: "center",
          boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
          pointerEvents: "none",
          animation: "fadeInOut 3s ease-in-out",
        }}>
          🤖 "{brainQuote.text}"
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes fadeInOut { 0%,100% { opacity:0; } 10%,80% { opacity:1; } }
        @keyframes alertPulse { 0%,100% { opacity:1; box-shadow:none; } 50% { opacity:0.85; box-shadow: 0 0 12px rgba(239,68,68,0.5); } }
      `}</style>
    </>
  );
}
