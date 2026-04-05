"use client";

import {
  useMyPresence,
  useOthers,
  useSelf,
  useSyncStatus,
} from "@liveblocks/react/suspense";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMeetingMicrophone } from "../hooks/useMeetingMicrophone";
import { useMeetingWebRTC } from "../hooks/useMeetingWebRTC";

function collaboratorColor(input: string | undefined): string {
  if (input && /^#[0-9A-Fa-f]{6}$/i.test(input)) return input;
  if (input && /^#[0-9A-Fa-f]{3}$/i.test(input)) {
    const h = input.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return "#6366f1";
}

type ParticipantRow = {
  dedupeKey: string;
  name: string;
  color: string;
  micOn: boolean;
};

/**
 * Local shape used by this component.
 * Your Liveblocks config should ideally define these globally too,
 * but this keeps this file type-safe on its own.
 */
type MeetingUser = {
  id?: string;
  connectionId: number;
  info?: {
    name?: string;
    color?: string;
  };
  presence?: {
    micOn?: boolean;
  };
};

function mergeParticipants(
  self: MeetingUser | null | undefined,
  others: readonly MeetingUser[]
): ParticipantRow[] {
  const map = new Map<string, ParticipantRow>();

  const add = (u: MeetingUser) => {
    const dedupeKey =
      typeof u.id === "string" && u.id.length > 0 ? u.id : `conn:${u.connectionId}`;

    const name = u.info?.name?.trim() || "Guest";
    const color = collaboratorColor(u.info?.color);
    const micOn = Boolean(u.presence?.micOn);

    const prev = map.get(dedupeKey);
    if (!prev) {
      map.set(dedupeKey, { dedupeKey, name, color, micOn });
    } else {
      prev.micOn = prev.micOn || micOn;
    }
  };

  if (self) add(self);
  for (const u of others) add(u);

  return [...map.values()];
}

export function MeetingBar({ roomSlug }: { roomSlug: string }) {
  const [myPresence, updateMyPresence] = useMyPresence();
  const self = useSelf() as MeetingUser | null;
  const others = useOthers() as readonly MeetingUser[];
  const syncStatus = useSyncStatus();

  const { toggleMic, localStream } = useMeetingMicrophone(
    Boolean(myPresence?.micOn),
    updateMyPresence
  );

  const { remoteStreams } = useMeetingWebRTC({
    micOn: Boolean(myPresence?.micOn),
    localStream,
  });

  const participants = useMemo(() => mergeParticipants(self, others), [self, others]);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/meet?room=${encodeURIComponent(roomSlug)}`
      : "";

  const copyLink = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
    } catch {
      window.prompt("Copy meeting link:", joinUrl);
    }
  };

  const connected = syncStatus === "synchronized";

  /** Browsers block remote audio until a user gesture; unlock on first tap or explicit control. */
  const [remoteAudioUnlocked, setRemoteAudioUnlocked] = useState(false);

  const playAllRemoteAudio = useCallback(() => {
    document.querySelectorAll("audio[data-meeting-remote='1']").forEach((node) => {
      const el = node as HTMLAudioElement;
      el.volume = 1;
      void el.play().catch(() => {});
    });
  }, []);

  useEffect(() => {
    const unlock = () => setRemoteAudioUnlocked(true);

    window.addEventListener("pointerdown", unlock, { capture: true, once: true });
    window.addEventListener("keydown", unlock, { capture: true, once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!remoteAudioUnlocked) return;
    playAllRemoteAudio();
  }, [remoteAudioUnlocked, remoteStreams, playAllRemoteAudio]);

  const hasRemoteAudio = Object.keys(remoteStreams).length > 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.75) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        pointerEvents: "auto",
        flexWrap: "wrap",
      }}
    >
      {Object.entries(remoteStreams).map(([connId, stream]) => (
        <RemoteMeetingAudio key={connId} stream={stream} />
      ))}

      {hasRemoteAudio && !remoteAudioUnlocked && (
        <button
          type="button"
          onClick={() => setRemoteAudioUnlocked(true)}
          style={{
            position: "absolute",
            top: 52,
            left: 14,
            zIndex: 501,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid rgba(251,191,36,0.5)",
            background: "rgba(251,191,36,0.15)",
            color: "#fcd34d",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Click to hear others (browser blocked sound)
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 120 }}>
        <span
          style={{
            fontSize: 11,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Meeting
        </span>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#f8fafc" }}>{roomSlug}</span>
      </div>

      <div
        style={{
          width: 1,
          height: 28,
          background: "rgba(255,255,255,0.12)",
          margin: "0 4px",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, color: "#94a3b8", marginRight: 4 }}>On canvas</span>

        <div style={{ display: "flex", alignItems: "center" }}>
          {participants.map((user, i) => (
            <div
              key={user.dedupeKey}
              title={`${user.name}${user.micOn ? " · mic on" : ""}`}
              style={{
                position: "relative",
                marginLeft: i > 0 ? -8 : 0,
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: user.color,
                border: "2px solid #0f172a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
              }}
            >
              {user.name.slice(0, 1).toUpperCase()}
              <span
                style={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: user.micOn ? "#22c55e" : "#64748b",
                  border: "2px solid #0f172a",
                }}
              />
            </div>
          ))}
        </div>

        <span style={{ fontSize: 12, color: "#cbd5e1", marginLeft: 8 }}>
          {participants.length} online
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 11,
            padding: "4px 8px",
            borderRadius: 999,
            background: connected ? "rgba(34,197,94,0.2)" : "rgba(251,191,36,0.2)",
            color: connected ? "#86efac" : "#fcd34d",
          }}
        >
          {connected ? "Canvas synced" : "Connecting…"}
        </span>

        <button
          type="button"
          title="Uses your mic; others hear you via WebRTC when unmuted."
          onClick={() => void toggleMic()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            background: myPresence?.micOn ? "#22c55e" : "#334155",
            color: "#fff",
          }}
        >
          <span aria-hidden>{myPresence?.micOn ? "🎤" : "🎙️"}</span>
          {myPresence?.micOn ? "Mute" : "Unmute"}
        </button>

        <button
          type="button"
          onClick={() => void copyLink()}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent",
            color: "#e2e8f0",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Copy invite link
        </button>
      </div>
    </div>
  );
}

function RemoteMeetingAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.srcObject = stream;
    el.volume = 1;

    const tryPlay = () => {
      void el.play().catch(() => {});
    };

    tryPlay();

    const tracks = stream.getAudioTracks();
    const onUnmute = () => tryPlay();

    for (const t of tracks) {
      t.addEventListener("unmute", onUnmute);
    }

    return () => {
      for (const t of tracks) {
        t.removeEventListener("unmute", onUnmute);
      }
    };
  }, [stream]);

  return (
    <audio
      ref={ref}
      data-meeting-remote="1"
      autoPlay
      playsInline
      muted={false}
      style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
      aria-hidden
    />
  );
}