"use client";

import { useOthers } from "@liveblocks/react/suspense";
import type { CSSProperties } from "react";

const wrap: CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "rgba(255,255,255,0.92)",
  padding: "8px 14px 8px 10px",
  borderRadius: 999,
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  border: "1px solid #f3f4f6",
  zIndex: 10,
  pointerEvents: "none",
};

export default function AIAvatar() {
  const othersThinking = useOthers((others) =>
    others.some((other) => Boolean(other.presence?.isAgentThinking))
  );

  return (
    <div style={wrap}>
      <div style={{ position: "relative", width: 40, height: 40 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          AI
        </div>
        {othersThinking ? (
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "2px solid #6366f1",
              animation: "lb-ping 1.2s ease-out infinite",
            }}
          />
        ) : null}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#111827" }}>
          Claude Agent
        </p>
        <p style={{ margin: 0, fontSize: 10, color: "#6b7280" }}>
          {othersThinking ? "Печатает идеи…" : "В сети"}
        </p>
      </div>
      <style>{`@keyframes lb-ping { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.35); opacity: 0; } }`}</style>
    </div>
  );
}
