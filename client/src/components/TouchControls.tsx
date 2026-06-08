import React, { useEffect, useRef, useCallback } from "react";

interface Props {
  onInput: (input: { left: boolean; right: boolean; up: boolean; down: boolean; interact: boolean; drop: boolean }) => void;
}

export default function TouchControls({ onInput }: Props) {
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeTouch = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const dirRef = useRef({ left: false, right: false, up: false, down: false });

  const DEAD = 15;
  const MAX_R = 44;

  const emit = useCallback((interact = false, drop = false) => {
    onInput({ ...dirRef.current, interact, drop });
  }, [onInput]);

  useEffect(() => {
    const el = stickRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      if (activeTouch.current !== null) return;
      const t = e.changedTouches[0];
      activeTouch.current = t.identifier;
      const rect = el.getBoundingClientRect();
      centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      if (activeTouch.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier !== activeTouch.current) continue;
        const dx = t.clientX - centerRef.current.x;
        const dy = t.clientY - centerRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(dist, MAX_R);
        const angle = Math.atan2(dy, dx);
        if (knobRef.current) {
          knobRef.current.style.transform =
            `translate(${Math.cos(angle) * clamped}px, ${Math.sin(angle) * clamped}px)`;
        }
        dirRef.current = {
          left: dx < -DEAD,
          right: dx > DEAD,
          up: dy < -DEAD,
          down: dy > DEAD,
        };
        emit();
      }
    };

    const onEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouch.current) {
          activeTouch.current = null;
          if (knobRef.current) knobRef.current.style.transform = "translate(0,0)";
          dirRef.current = { left: false, right: false, up: false, down: false };
          emit();
        }
      }
    };

    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: false });
    el.addEventListener("touchcancel", onEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [emit]);

  const btnStyle = (color: string): React.CSSProperties => ({
    width: 64, height: 64, borderRadius: "50%",
    background: color, border: "3px solid rgba(255,255,255,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, color: "#fff", fontWeight: 900,
    userSelect: "none", WebkitUserSelect: "none",
    touchAction: "none",
  });

  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      display: "flex", justifyContent: "space-between", alignItems: "flex-end",
      padding: "0 24px 32px",
      pointerEvents: "none",
    }}>
      {/* Left: joystick */}
      <div
        ref={stickRef}
        style={{
          width: 110, height: 110, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: "2px solid rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", touchAction: "none", pointerEvents: "all",
        }}
      >
        <div
          ref={knobRef}
          style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "rgba(168,85,247,0.8)",
            border: "2px solid rgba(255,255,255,0.4)",
            transition: "transform 0.05s",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Right: action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, pointerEvents: "all" }}>
        <div
          style={btnStyle("rgba(168,85,247,0.8)")}
          onTouchStart={(e) => { e.preventDefault(); emit(true, false); }}
          onTouchEnd={(e) => { e.preventDefault(); emit(false, false); }}
        >
          ⚡
        </div>
        <div
          style={btnStyle("rgba(100,100,100,0.7)")}
          onTouchStart={(e) => { e.preventDefault(); emit(false, true); }}
          onTouchEnd={(e) => { e.preventDefault(); emit(false, false); }}
        >
          ↓
        </div>
      </div>
    </div>
  );
}
