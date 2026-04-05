"use client";

import {
  Tldraw,
  computed,
  defaultUserPreferences,
  setUserPreferences,
} from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useSelf } from "@liveblocks/react/suspense";
import { useMemo } from "react";
import { useStorageStore } from "../hooks/useStorageStore";
import { TldrawOverlays } from "./TldrawOverlays";

/** tldraw ожидает hex; Liveblocks иногда отдаёт другое — подставляем валидный цвет. */
function collaboratorColor(input: string | undefined): string {
  if (input && /^#[0-9A-Fa-f]{6}$/i.test(input)) return input;
  if (input && /^#[0-9A-Fa-f]{3}$/i.test(input)) {
    const h = input.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return "#e879f9";
}

export function CollaborativeCanvas() {
  const id = useSelf((me) => me.id);
  const info = useSelf((me) => me.info);

  const user = useMemo(
    () => ({
      id,
      color: collaboratorColor(info?.color),
      name: info?.name?.trim() || "Guest",
    }),
    [id, info?.color, info?.name]
  );

  const tldrawUser = useMemo(
    () => ({
      userPreferences: computed(`lb-user-${id}`, () => ({
        ...defaultUserPreferences,
        id: user.id,
        name: user.name,
        color: user.color,
      })),
      setUserPreferences,
    }),
    [id, user.id, user.name, user.color]
  );

  const storeWithStatus = useStorageStore({ user });

  if (storeWithStatus.status === "loading") {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#6b7280",
        }}
      >
        Подключение к доске…
      </div>
    );
  }

  const collab =
    storeWithStatus.status === "synced-remote" ? "Совместная доска" : "Локальная доска";

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 12,
          zIndex: 997,
          fontSize: 11,
          color: "#9ca3af",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {collab}
      </div>
      <Tldraw licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY} 
        user={tldrawUser}
        store={storeWithStatus.store}
        autoFocus
        inferDarkMode
        onMount={(editor) => {
          (window as unknown as { tldrawEditor?: typeof editor }).tldrawEditor =
            editor;
        }}
      >
        <TldrawOverlays />
      </Tldraw>
    </div>
  );
}
