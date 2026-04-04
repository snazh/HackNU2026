"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CollaborativeCanvas } from "../../components/CollaborativeCanvas";
import { MeetingBar } from "../../components/MeetingBar";
import { Room } from "../Room";

function MeetInner() {
  const searchParams = useSearchParams();
  const param = searchParams.get("room");
  const raw = param && param.trim() ? param.trim() : null;
  const [localRoom, setLocalRoom] = useState("");

  if (!raw) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 400,
            width: "100%",
            background: "#1e293b",
            borderRadius: 16,
            padding: 24,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h1 style={{ margin: "0 0 8px", fontSize: 22, color: "#f8fafc" }}>
            Start or join a meeting
          </h1>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#94a3b8", lineHeight: 1.5 }}>
            Everyone who opens the same link shares one canvas. Pick a room name and share the URL
            with your team.
          </p>
          <input
            type="text"
            placeholder="e.g. design-sync"
            value={localRoom}
            onChange={(e) => setLocalRoom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && localRoom.trim()) {
                const slug = localRoom.trim().replace(/\s+/g, "-");
                window.location.href = `/meet?room=${encodeURIComponent(slug)}`;
              }
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#f8fafc",
              fontSize: 15,
              marginBottom: 14,
            }}
          />
          <button
            type="button"
            disabled={!localRoom.trim()}
            onClick={() => {
              const slug = localRoom.trim().replace(/\s+/g, "-");
              window.location.href = `/meet?room=${encodeURIComponent(slug)}`;
            }}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: localRoom.trim() ? "#4f46e5" : "#475569",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              cursor: localRoom.trim() ? "pointer" : "not-allowed",
            }}
          >
            Open shared canvas
          </button>
        </div>
      </div>
    );
  }

  const roomSlug = raw.replace(/\s+/g, "-");
  const liveblocksRoomId = `meet-${roomSlug}`;

  return (
    <Room roomId={liveblocksRoomId}>
      <main
        style={{
          width: "100vw",
          height: "100vh",
          position: "relative",
          paddingTop: 72,
          boxSizing: "border-box",
        }}
      >
        <MeetingBar roomSlug={roomSlug} />
        <div style={{ width: "100%", height: "calc(100vh - 72px)" }}>
          <CollaborativeCanvas />
        </div>
      </main>
    </Room>
  );
}

export default function MeetPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f172a",
            color: "#94a3b8",
            fontSize: 15,
          }}
        >
          Loading meeting…
        </div>
      }
    >
      <MeetInner />
    </Suspense>
  );
}
