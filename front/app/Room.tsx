"use client";

import { LiveMap } from "@liveblocks/client";
import { ReactNode } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";

const PUBLIC_KEY =
  process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY ??
  "pk_dev_ET-2WQx-xp81eoztwDMjCtnG7UBnMzseM3JXLrOhBp4Op63vIovwzgzs6DmfFEHI";

export const LIVEBLOCKS_ROOM_ID =
  process.env.NEXT_PUBLIC_LIVEBLOCKS_ROOM_ID ?? "hackathon-ai-brainstorm-room";

export function Room({ children }: { children: ReactNode }) {
  return (
    <LiveblocksProvider publicApiKey={PUBLIC_KEY}>
      <RoomProvider
        id={LIVEBLOCKS_ROOM_ID}
        initialPresence={{ presence: null, isAgentThinking: false }}
        initialStorage={() => ({ records: new LiveMap() })}
      >
        <ClientSideSuspense fallback={<div>Loading…</div>}>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}