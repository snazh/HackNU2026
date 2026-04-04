import type { Json, LiveMap } from "@liveblocks/client";

declare global {
  interface Liveblocks {
    /** Tldraw sync adds arbitrary record ids as keys; values must stay JSON-serializable. */
    Presence: {
      presence?: Json | null;
      isAgentThinking?: boolean;
      [key: string]: Json | null | undefined;
    };
    Storage: {
      records: LiveMap<string, Json>;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar?: string;
      };
    };
  }
}

export {};
