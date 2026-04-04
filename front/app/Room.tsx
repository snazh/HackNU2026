"use client";

import { LiveMap } from "@liveblocks/client";
import { ReactNode } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { getOrCreateLiveblocksIdentity } from "../lib/liveblocksIdentity";

const PUBLIC_KEY =
  process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY ??
  "pk_dev_ET-2WQx-xp81eoztwDMjCtnG7UBnMzseM3JXLrOhBp4Op63vIovwzgzs6DmfFEHI";

/** Set to `"true"` and add LIVEBLOCKS_SECRET_KEY in .env.local so the same browser reuses one Liveblocks user id (fixes duplicate “guest” avatars). */
const USE_AUTH = process.env.NEXT_PUBLIC_LIVEBLOCKS_USE_AUTH === "true";

export const LIVEBLOCKS_ROOM_ID =
  process.env.NEXT_PUBLIC_LIVEBLOCKS_ROOM_ID ?? "hackathon-ai-brainstorm-room";

async function liveblocksAuthEndpoint(room?: string) {
  const id = getOrCreateLiveblocksIdentity();
  const res = await fetch("/api/liveblocks-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room: room ?? "",
      userId: id.userId,
      name: id.name,
      color: id.color,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Liveblocks auth failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<{ token: string }>;
}

export function Room({
  children,
  roomId,
}: {
  children: ReactNode;
  /** When set, isolates storage/presence for this meeting or workspace. */
  roomId?: string;
}) {
  const id = roomId ?? LIVEBLOCKS_ROOM_ID;
  return (
    <LiveblocksProvider
      {...(USE_AUTH
        ? { authEndpoint: liveblocksAuthEndpoint }
        : { publicApiKey: PUBLIC_KEY })}
    >
      <RoomProvider
        id={id}
        initialPresence={{
          presence: null,
          isAgentThinking: false,
          micOn: false,
        }}
        initialStorage={() => ({ records: new LiveMap() })}
      >
        <ClientSideSuspense fallback={<div>Loading…</div>}>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
